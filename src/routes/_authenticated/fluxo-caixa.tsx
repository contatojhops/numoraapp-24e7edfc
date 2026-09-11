import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/app-shell";
import { KpiCard } from "@/components/app/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcularSaldo, useCategorias, useContas, useLancamentos } from "@/lib/finance";
import { brl, dateBR, downloadCSV, fimMesAtual, inicioMesAtual, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fluxo-caixa")({
  head: () => ({
    meta: [
      { title: "Fluxo de Caixa | Gestão Financeira" },
      {
        name: "description",
        content: "Registre entradas e saídas, filtre por período, categoria e conta e acompanhe o saldo.",
      },
      { property: "og:title", content: "Fluxo de Caixa | Gestão Financeira" },
      { property: "og:description", content: "Lançamentos de entradas e saídas com saldo consolidado." },
    ],
  }),
  component: FluxoCaixa,
});

const FORMAS = ["pix", "boleto", "transferência", "cartão", "dinheiro"];

function FluxoCaixa() {
  const qc = useQueryClient();
  const { data: lancamentos = [] } = useLancamentos();
  const { data: categorias = [] } = useCategorias();
  const { data: contas = [] } = useContas();

  const [aberto, setAberto] = useState(false);
  const [fTipo, setFTipo] = useState("todos");
  const [fCategoria, setFCategoria] = useState("todas");
  const [fConta, setFConta] = useState("todas");
  const [fInicio, setFInicio] = useState(inicioMesAtual());
  const [fFim, setFFim] = useState(fimMesAtual());

  const [form, setForm] = useState({
    tipo: "entrada",
    descricao: "",
    valor: "",
    data: todayISO(),
    categoria_id: "",
    conta_id: "",
    forma_pagamento: "pix",
    observacoes: "",
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("lancamentos").insert({
        tipo: form.tipo,
        descricao: form.descricao,
        valor: Number(form.valor.replace(",", ".")),
        data: form.data,
        categoria_id: form.categoria_id || null,
        conta_id: form.conta_id || null,
        forma_pagamento: form.forma_pagamento,
        observacoes: form.observacoes || null,
        criado_por: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento registrado");
      setAberto(false);
      setForm({ ...form, descricao: "", valor: "", observacoes: "" });
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento excluído");
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
    },
  });

  const filtrados = useMemo(
    () =>
      lancamentos.filter((l) => {
        if (fTipo !== "todos" && l.tipo !== fTipo) return false;
        if (fCategoria !== "todas" && l.categoria_id !== fCategoria) return false;
        if (fConta !== "todas" && l.conta_id !== fConta) return false;
        if (fInicio && l.data < fInicio) return false;
        if (fFim && l.data > fFim) return false;
        return true;
      }),
    [lancamentos, fTipo, fCategoria, fConta, fInicio, fFim],
  );

  const entradas = filtrados.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
  const saidas = filtrados.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);
  const saldoTotal = calcularSaldo(contas, lancamentos);
  const nomeCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? "—";
  const nomeConta = (id: string | null) => contas.find((c) => c.id === id)?.nome ?? "—";

  return (
    <>
      <PageHeader
        titulo="Fluxo de Caixa"
        descricao="Entradas e saídas com filtros por período, categoria e conta."
        acao={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  "fluxo-de-caixa.csv",
                  filtrados.map((l) => ({
                    Data: dateBR(l.data),
                    Tipo: l.tipo,
                    Descrição: l.descricao,
                    Categoria: nomeCategoria(l.categoria_id),
                    Conta: nomeConta(l.conta_id),
                    Forma: l.forma_pagamento,
                    Valor: Number(l.valor).toFixed(2).replace(".", ","),
                  })),
                )
              }
            >
              <Download className="size-4" /> CSV
            </Button>
            <Dialog open={aberto} onOpenChange={setAberto}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" /> Novo lançamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo lançamento</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} inputMode="decimal" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Descrição</Label>
                    <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Forma de pagamento</Label>
                    <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMAS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
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
                          .filter((c) => (form.tipo === "entrada" ? c.tipo === "receita" : c.tipo === "despesa"))
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Conta / caixa</Label>
                    <Select value={form.conta_id} onValueChange={(v) => setForm({ ...form, conta_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {contas.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Observações</Label>
                    <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
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
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Entradas (filtro)" valor={brl(entradas)} tom="positivo" />
        <KpiCard titulo="Saídas (filtro)" valor={brl(saidas)} tom="negativo" />
        <KpiCard
          titulo="Saldo consolidado"
          valor={brl(saldoTotal)}
          tom={saldoTotal >= 0 ? "positivo" : "negativo"}
        />
      </section>

      <section className="glass mt-6 grid gap-3 rounded-2xl p-4 md:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={fTipo} onValueChange={setFTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Categoria</Label>
          <Select value={fCategoria} onValueChange={setFCategoria}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Conta</Label>
          <Select value={fConta} onValueChange={setFConta}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {contas.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">De</Label>
          <Input type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} />
        </div>
        <div className="md:col-span-5 flex justify-end">
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
      </section>

      <section className="glass mt-6 overflow-x-auto rounded-2xl p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtrados.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="num whitespace-nowrap">{dateBR(l.data)}</TableCell>
                <TableCell>{l.descricao}</TableCell>
                <TableCell className="text-muted-foreground">{nomeCategoria(l.categoria_id)}</TableCell>
                <TableCell className="text-muted-foreground">{nomeConta(l.conta_id)}</TableCell>
                <TableCell className="text-muted-foreground">{l.forma_pagamento}</TableCell>
                <TableCell
                  className={`num text-right ${l.tipo === "entrada" ? "text-success" : "text-destructive"}`}
                >
                  {l.tipo === "entrada" ? "+" : "−"} {brl(Number(l.valor))}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => excluir.mutate(l.id)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </>
  );
}
