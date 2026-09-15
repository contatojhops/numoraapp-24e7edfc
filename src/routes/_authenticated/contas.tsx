import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/app-shell";
import { KpiCard } from "@/components/app/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  statusEfetivo,
  useCategorias,
  useClientes,
  useContas,
  useContasPagar,
  useContasReceber,
  useFornecedores,
} from "@/lib/finance";
import { brl, dateBR, fimMesAtual, inicioMesAtual, todayISO } from "@/lib/format";

const FORMAS = ["pix", "boleto", "transferência", "cartão", "dinheiro"];

export const Route = createFileRoute("/_authenticated/contas")({
  head: () => ({
    meta: [
      { title: "Contas a Pagar e Receber | Gestão Financeira" },
      {
        name: "description",
        content: "Controle títulos a pagar e receber, parcelamentos, recorrências, baixas e comprovantes.",
      },
      { property: "og:title", content: "Contas a Pagar e Receber | Gestão Financeira" },
      { property: "og:description", content: "Títulos, vencimentos, conciliação e comprovantes em um só lugar." },
    ],
  }),
  component: ContasPage,
});

type Modo = "pagar" | "receber";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pago: "border-success/40 bg-success/15 text-success",
    recebido: "border-success/40 bg-success/15 text-success",
    atrasado: "border-destructive/40 bg-destructive/15 text-destructive",
    pendente: "border-warning/40 bg-warning/15 text-warning",
  };
  return <Badge variant="outline" className={map[status]}>{status}</Badge>;
}

function ContasPage() {
  const { data: pagar = [] } = useContasPagar();
  const { data: receber = [] } = useContasReceber();
  const [fInicio, setFInicio] = useState(inicioMesAtual());
  const [fFim, setFFim] = useState(fimMesAtual());

  const noPeriodo = (venc: string) => (!fInicio || venc >= fInicio) && (!fFim || venc <= fFim);
  const totalPagar = pagar
    .filter((p) => p.status !== "pago" && noPeriodo(p.vencimento))
    .reduce((s, p) => s + Number(p.valor), 0);
  const totalReceber = receber
    .filter((r) => r.status !== "recebido" && noPeriodo(r.vencimento))
    .reduce((s, r) => s + Number(r.valor), 0);

  return (
    <>
      <PageHeader titulo="Contas a Pagar & Receber" descricao="Títulos, parcelas, recorrências e conciliação." />

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Total em aberto a pagar" valor={brl(totalPagar)} tom="negativo" />
        <KpiCard titulo="Total em aberto a receber" valor={brl(totalReceber)} tom="positivo" />
        <KpiCard
          titulo="Posição líquida"
          valor={brl(totalReceber - totalPagar)}
          tom={totalReceber - totalPagar >= 0 ? "positivo" : "negativo"}
        />
      </section>

      <Tabs defaultValue="pagar" className="mt-6">
        <TabsList>
          <TabsTrigger value="pagar">A pagar</TabsTrigger>
          <TabsTrigger value="receber">A receber</TabsTrigger>
        </TabsList>
        <TabsContent value="pagar">
          <Lista modo="pagar" fInicio={fInicio} fFim={fFim} setFInicio={setFInicio} setFFim={setFFim} />
        </TabsContent>
        <TabsContent value="receber">
          <Lista modo="receber" fInicio={fInicio} fFim={fFim} setFInicio={setFInicio} setFFim={setFFim} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Lista({
  modo,
  fInicio,
  fFim,
  setFInicio,
  setFFim,
}: {
  modo: Modo;
  fInicio: string;
  fFim: string;
  setFInicio: (v: string) => void;
  setFFim: (v: string) => void;
}) {
  const qc = useQueryClient();
  const tabela = modo === "pagar" ? "contas_pagar" : "contas_receber";
  const queryKey = [tabela];
  const { data: pagar = [] } = useContasPagar();
  const { data: receber = [] } = useContasReceber();
  const { data: categorias = [] } = useCategorias();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: clientes = [] } = useClientes();

  const itens = modo === "pagar" ? pagar : receber;
  const parceiros = modo === "pagar" ? fornecedores : clientes;
  const campoParceiro = modo === "pagar" ? "fornecedor_id" : "cliente_id";
  const statusPago = modo === "pagar" ? "pago" : "recebido";

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    vencimento: todayISO(),
    parceiro_id: "",
    categoria_id: "",
    total_parcelas: "1",
    recorrente: false,
  });

  const { data: contasBancarias = [] } = useContas();
  const [baixaItem, setBaixaItem] = useState<(typeof itens)[number] | null>(null);
  const [baixaForm, setBaixaForm] = useState({
    valor: "",
    data: todayISO(),
    conta_id: "",
    forma_pagamento: "pix",
  });

  function abrirBaixa(item: (typeof itens)[number]) {
    setBaixaForm({
      valor: String(Number(item.valor).toFixed(2)).replace(".", ","),
      data: todayISO(),
      conta_id: item.conta_id ?? contasBancarias[0]?.id ?? "",
      forma_pagamento: "pix",
    });
    setBaixaItem(item);
  }

  const [editItem, setEditItem] = useState<(typeof itens)[number] | null>(null);
  const [editarForm, setEditarForm] = useState({
    descricao: "",
    valor: "",
    vencimento: todayISO(),
    parceiro_id: "",
    categoria_id: "",
  });

  function abrirEditar(item: (typeof itens)[number]) {
    setEditarForm({
      descricao: item.descricao,
      valor: String(Number(item.valor).toFixed(2)).replace(".", ","),
      vencimento: item.vencimento,
      parceiro_id: ((item as Record<string, unknown>)[campoParceiro] as string | null) ?? "",
      categoria_id: item.categoria_id ?? "",
    });
    setEditItem(item);
  }

  // Vencidos pendentes aparecem sempre, mesmo fora do período filtrado.
  const visiveis = itens.filter((item) => {
    const st = statusEfetivo(item.status, item.vencimento, statusPago as "pago" | "recebido");
    if (st === "atrasado") return true;
    if (fInicio && item.vencimento < fInicio) return false;
    if (fFim && item.vencimento > fFim) return false;
    return true;
  });

  const criar = useMutation({
    mutationFn: async () => {
      const parcelas = Math.max(1, Number(form.total_parcelas || 1));
      const base = new Date(`${form.vencimento}T00:00:00`);
      const linhas = Array.from({ length: parcelas }, (_, i) => {
        const venc = new Date(base.getFullYear(), base.getMonth() + i, base.getDate());
        return {
          descricao: parcelas > 1 ? `${form.descricao} (${i + 1}/${parcelas})` : form.descricao,
          valor: Number(form.valor.replace(",", ".")),
          vencimento: venc.toISOString().slice(0, 10),
          categoria_id: form.categoria_id || null,
          [campoParceiro]: form.parceiro_id || null,
          parcela: i + 1,
          total_parcelas: parcelas,
          recorrente: form.recorrente,
        };
      });
      const { error } = await supabase.from(tabela as never).insert(linhas as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Título cadastrado");
      setAberto(false);
      setForm({ ...form, descricao: "", valor: "" });
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(tabela as never)
        .update({
          descricao: editarForm.descricao,
          valor: Number(editarForm.valor.replace(",", ".")),
          vencimento: editarForm.vencimento,
          [campoParceiro]: editarForm.parceiro_id || null,
          categoria_id: editarForm.categoria_id || null,
        } as never)
        .eq("id", editItem!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Título atualizado");
      setEditItem(null);
      qc.invalidateQueries({ queryKey });
      },
    onError: (e: Error) => toast.error(e.message),
  });

  const baixar = useMutation({
    mutationFn: async () => {
      const item = baixaItem!;
      const valor = Number(baixaForm.valor.replace(",", "."));
      const { data: userData } = await supabase.auth.getUser();
      const { data: lanc, error: erroLanc } = await supabase
        .from("lancamentos")
        .insert({
          tipo: modo === "pagar" ? "saida" : "entrada",
          descricao: item.descricao,
          valor,
          data: baixaForm.data,
          categoria_id: item.categoria_id,
          conta_id: baixaForm.conta_id,
          forma_pagamento: baixaForm.forma_pagamento,
          observacoes: modo === "pagar" ? "Baixa de conta a pagar" : "Baixa de conta a receber",
          criado_por: userData.user?.id ?? null,
        })
        .select("id")
        .single();
      if (erroLanc) throw erroLanc;

      const patch =
        modo === "pagar"
          ? { status: "pago", pago_em: baixaForm.data }
          : { status: "recebido", recebido_em: baixaForm.data };
      const { error } = await supabase
        .from(tabela as never)
        .update({ ...patch, conta_id: baixaForm.conta_id, lancamento_id: lanc.id } as never)
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(modo === "pagar" ? "Pagamento registrado no fluxo de caixa" : "Recebimento registrado no fluxo de caixa");
      setBaixaItem(null);
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
      qc.invalidateQueries({ queryKey: ["contas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tabela as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const anexar = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const path = `${tabela}/${id}-${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("comprovantes").upload(path, file);
      if (up.error) throw up.error;
      const { error } = await supabase
        .from(tabela as never)
        .update({ comprovante_url: path } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comprovante anexado");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function abrirComprovante(path: string) {
    const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Não foi possível abrir o comprovante");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex justify-end">
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Novo título
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{modo === "pagar" ? "Nova conta a pagar" : "Nova conta a receber"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição</Label>
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor da parcela (R$)</Label>
                <Input value={form.valor} inputMode="decimal" onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>1º vencimento</Label>
                <Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{modo === "pagar" ? "Fornecedor" : "Cliente"}</Label>
                <Select value={form.parceiro_id} onValueChange={(v) => setForm({ ...form, parceiro_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {parceiros.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categorias
                      .filter((c) => (modo === "pagar" ? c.tipo === "despesa" : c.tipo === "receita"))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.total_parcelas}
                  onChange={(e) => setForm({ ...form, total_parcelas: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <Label className="text-sm">Conta fixa mensal</Label>
                <Switch checked={form.recorrente} onCheckedChange={(v) => setForm({ ...form, recorrente: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => criar.mutate()} disabled={!form.descricao || !form.valor}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="glass mb-4 grid gap-3 rounded-2xl p-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Vencimento de</Label>
          <Input type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} />
        </div>
        <div className="flex items-end justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFInicio("");
              setFFim("");
            }}
          >
            Ver todos os períodos
          </Button>
        </div>
        <p className="text-xs text-muted-foreground md:col-span-3">
          Títulos vencidos e ainda em aberto aparecem sempre, mesmo fora do período filtrado.
        </p>
      </section>

      <div className="glass overflow-x-auto rounded-2xl p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>{modo === "pagar" ? "Fornecedor" : "Cliente"}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum título no período selecionado.
                </TableCell>
              </TableRow>
            )}
            {visiveis.map((item) => {
              const parceiroId = (item as Record<string, unknown>)[campoParceiro] as string | null;
              const parceiro = parceiros.find((p) => p.id === parceiroId)?.nome ?? "—";
              const st = statusEfetivo(item.status, item.vencimento, statusPago as "pago" | "recebido");
              return (
                <TableRow key={item.id}>
                  <TableCell className="num whitespace-nowrap">{dateBR(item.vencimento)}</TableCell>
                  <TableCell>
                    {item.descricao}
                    {item.recorrente && <span className="ml-2 text-xs text-muted-foreground">(fixa)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{parceiro}</TableCell>
                  <TableCell><StatusBadge status={st} /></TableCell>
                  <TableCell className="num text-right">{brl(Number(item.valor))}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEditar(item)}>
                        <Pencil className="size-4 text-muted-foreground" />
                      </Button>
                      {st !== statusPago && (
                        <Button variant="ghost" size="icon" title="Dar baixa" onClick={() => abrirBaixa(item)}>
                          <CheckCircle2 className="size-4 text-success" />
                        </Button>
                      )}
                      {item.comprovante_url ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver comprovante"
                          onClick={() => abrirComprovante(item.comprovante_url!)}
                        >
                          <Paperclip className="size-4 text-primary" />
                        </Button>
                      ) : (
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-md px-2 py-1 hover:bg-accent" title="Anexar comprovante">
                          <Paperclip className="size-4 text-muted-foreground" />
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) anexar.mutate({ id: item.id, file });
                            }}
                          />
                        </label>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => excluir.mutate(item.id)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!baixaItem} onOpenChange={(o) => !o && setBaixaItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modo === "pagar" ? "Confirmar pagamento" : "Confirmar recebimento"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {baixaItem?.descricao} — vencimento {dateBR(baixaItem?.vencimento)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                inputMode="decimal"
                value={baixaForm.valor}
                onChange={(e) => setBaixaForm({ ...baixaForm, valor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{modo === "pagar" ? "Data do pagamento" : "Data do recebimento"}</Label>
              <Input
                type="date"
                value={baixaForm.data}
                onChange={(e) => setBaixaForm({ ...baixaForm, data: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Conta bancária</Label>
              <Select
                value={baixaForm.conta_id}
                onValueChange={(v) => setBaixaForm({ ...baixaForm, conta_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {contasBancarias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select
                value={baixaForm.forma_pagamento}
                onValueChange={(v) => setBaixaForm({ ...baixaForm, forma_pagamento: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => baixar.mutate()}
              disabled={!baixaForm.valor || !baixaForm.conta_id || baixar.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
