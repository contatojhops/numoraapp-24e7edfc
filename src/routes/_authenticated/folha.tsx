import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/app-shell";
import { KpiCard } from "@/components/app/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useColaboradores, useFornecedores, usePagamentosFolha } from "@/lib/finance";
import { brl, monthLabel, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/folha")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user?.id ?? "");
    if (!(roles ?? []).some((r) => r.role === "admin")) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Folha & Fornecedores | Gestão Financeira" },
      {
        name: "description",
        content: "Cadastro de colaboradores comissionados, pagamentos por competência e fornecedores recorrentes.",
      },
      { property: "og:title", content: "Folha & Fornecedores | Gestão Financeira" },
      { property: "og:description", content: "Folha de pagamento e relacionamento com fornecedores." },
    ],
  }),
  component: FolhaPage,
});

function FolhaPage() {
  return (
    <>
      <PageHeader
        titulo="Folha & Fornecedores"
        descricao="Módulo restrito ao Administrador."
      />
      <Tabs defaultValue="folha">
        <TabsList>
          <TabsTrigger value="folha">Folha de pagamento</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>
        <TabsContent value="folha"><Folha /></TabsContent>
        <TabsContent value="fornecedores"><Fornecedores /></TabsContent>
      </Tabs>
    </>
  );
}

function Folha() {
  const qc = useQueryClient();
  const { data: colaboradores = [] } = useColaboradores();
  const { data: pagamentos = [] } = usePagamentosFolha();
  const [colabAberto, setColabAberto] = useState(false);
  const [pagAberto, setPagAberto] = useState(false);
  const competenciaAtual = `${todayISO().slice(0, 7)}-01`;

  const [colab, setColab] = useState({ nome: "", cargo: "", salario_fixo: "", percentual_comissao: "" });
  const [pag, setPag] = useState({
    colaborador_id: "",
    competencia: competenciaAtual,
    valor_fixo: "",
    valor_variavel: "",
  });

  const criarColab = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("colaboradores").insert({
        nome: colab.nome,
        cargo: colab.cargo || null,
        salario_fixo: Number(colab.salario_fixo.replace(",", ".") || 0),
        percentual_comissao: Number(colab.percentual_comissao.replace(",", ".") || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colaborador cadastrado");
      setColabAberto(false);
      qc.invalidateQueries({ queryKey: ["colaboradores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarPag = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pagamentos_folha").insert({
        colaborador_id: pag.colaborador_id,
        competencia: pag.competencia,
        valor_fixo: Number(pag.valor_fixo.replace(",", ".") || 0),
        valor_variavel: Number(pag.valor_variavel.replace(",", ".") || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento registrado");
      setPagAberto(false);
      qc.invalidateQueries({ queryKey: ["pagamentos_folha"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pagarItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pagamentos_folha")
        .update({ status: "pago", pago_em: todayISO() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagamentos_folha"] }),
  });

  const excluirColab = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colaboradores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["colaboradores"] }),
  });

  const totalMes = pagamentos
    .filter((p) => p.competencia.slice(0, 7) === todayISO().slice(0, 7))
    .reduce((s, p) => s + Number(p.valor_fixo) + Number(p.valor_variavel), 0);
  const pendente = pagamentos
    .filter((p) => p.status === "pendente")
    .reduce((s, p) => s + Number(p.valor_fixo) + Number(p.valor_variavel), 0);

  return (
    <div className="mt-4 space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Folha do mês" valor={brl(totalMes)} tom="neutral" />
        <KpiCard titulo="Pendente de pagamento" valor={brl(pendente)} tom="alerta" />
        <KpiCard titulo="Colaboradores ativos" valor={String(colaboradores.filter((c) => c.ativo).length)} tom="neutral" />
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Colaboradores</h2>
          <Dialog open={colabAberto} onOpenChange={setColabAberto}>
            <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo colaborador</DialogTitle></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome</Label>
                  <Input value={colab.nome} onChange={(e) => setColab({ ...colab, nome: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Cargo</Label>
                  <Input value={colab.cargo} onChange={(e) => setColab({ ...colab, cargo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Salário fixo (R$)</Label>
                  <Input inputMode="decimal" value={colab.salario_fixo} onChange={(e) => setColab({ ...colab, salario_fixo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Comissão (%)</Label>
                  <Input inputMode="decimal" value={colab.percentual_comissao} onChange={(e) => setColab({ ...colab, percentual_comissao: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => criarColab.mutate()} disabled={!colab.nome}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Fixo</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {colaboradores.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Nenhum colaborador cadastrado.</TableCell></TableRow>
            )}
            {colaboradores.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.nome}</TableCell>
                <TableCell className="text-muted-foreground">{c.cargo ?? "—"}</TableCell>
                <TableCell className="num text-right">{brl(Number(c.salario_fixo))}</TableCell>
                <TableCell className="num text-right">{Number(c.percentual_comissao)}%</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => excluirColab.mutate(c.id)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pagamentos por competência
          </h2>
          <Dialog open={pagAberto} onOpenChange={setPagAberto}>
            <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Lançar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo pagamento de folha</DialogTitle></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Colaborador</Label>
                  <Select value={pag.colaborador_id} onValueChange={(v) => setPag({ ...pag, colaborador_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {colaboradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Competência</Label>
                  <Input type="month" value={pag.competencia.slice(0, 7)} onChange={(e) => setPag({ ...pag, competencia: `${e.target.value}-01` })} />
                </div>
                <div className="space-y-2">
                  <Label>Valor fixo (R$)</Label>
                  <Input inputMode="decimal" value={pag.valor_fixo} onChange={(e) => setPag({ ...pag, valor_fixo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Comissão (R$)</Label>
                  <Input inputMode="decimal" value={pag.valor_variavel} onChange={(e) => setPag({ ...pag, valor_variavel: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => criarPag.mutate()} disabled={!pag.colaborador_id}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead className="text-right">Fixo</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagamentos.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum pagamento lançado.</TableCell></TableRow>
            )}
            {pagamentos.map((p) => {
              const total = Number(p.valor_fixo) + Number(p.valor_variavel);
              return (
                <TableRow key={p.id}>
                  <TableCell className="num">{monthLabel(p.competencia)}</TableCell>
                  <TableCell>{colaboradores.find((c) => c.id === p.colaborador_id)?.nome ?? "—"}</TableCell>
                  <TableCell className="num text-right">{brl(Number(p.valor_fixo))}</TableCell>
                  <TableCell className="num text-right">{brl(Number(p.valor_variavel))}</TableCell>
                  <TableCell className="num text-right font-medium">{brl(total)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={p.status === "pago" ? "border-success/40 bg-success/15 text-success" : "border-warning/40 bg-warning/15 text-warning"}
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status !== "pago" && (
                      <Button variant="ghost" size="icon" onClick={() => pagarItem.mutate(p.id)}>
                        <CheckCircle2 className="size-4 text-success" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function Fornecedores() {
  const qc = useQueryClient();
  const { data: fornecedores = [] } = useFornecedores();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    documento: "",
    contato: "",
    email: "",
    valor_contratado: "",
    observacoes: "",
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fornecedores").insert({
        nome: form.nome,
        documento: form.documento || null,
        contato: form.contato || null,
        email: form.email || null,
        valor_contratado: form.valor_contratado ? Number(form.valor_contratado.replace(",", ".")) : null,
        observacoes: form.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor cadastrado");
      setAberto(false);
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores"] }),
  });

  return (
    <div className="glass mt-4 rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Fornecedores recorrentes
        </h2>
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo fornecedor</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ / CPF</Label>
                <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor contratado (R$)</Label>
                <Input inputMode="decimal" value={form.valor_contratado} onChange={(e) => setForm({ ...form, valor_contratado: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observações / contrato</Label>
                <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => criar.mutate()} disabled={!form.nome}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="text-right">Valor acordado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fornecedores.length === 0 && (
            <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</TableCell></TableRow>
          )}
          {fornecedores.map((f) => (
            <TableRow key={f.id}>
              <TableCell>{f.nome}</TableCell>
              <TableCell className="num text-muted-foreground">{f.documento ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{f.contato ?? f.email ?? "—"}</TableCell>
              <TableCell className="num text-right">{f.valor_contratado ? brl(Number(f.valor_contratado)) : "—"}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => excluir.mutate(f.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
