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
import { Badge } from "@/components/ui/badge";
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
import { useClientes, useContasReceber, useNotasFiscais } from "@/lib/finance";
import { brl, dateBR, downloadCSV, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notas-fiscais")({
  head: () => ({
    meta: [
      { title: "Notas Fiscais | Gestão Financeira" },
      {
        name: "description",
        content: "Registro manual de notas fiscais emitidas, vínculo com contas a receber e controle de status.",
      },
      { property: "og:title", content: "Notas Fiscais | Gestão Financeira" },
      { property: "og:description", content: "Controle de emissão, cancelamento e conciliação de notas fiscais." },
    ],
  }),
  component: NotasPage,
});

const STATUS = ["emitida", "paga", "cancelada"] as const;

function NotasPage() {
  const qc = useQueryClient();
  const { data: notas = [] } = useNotasFiscais();
  const { data: clientes = [] } = useClientes();
  const { data: receber = [] } = useContasReceber();
  const [aberto, setAberto] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [mes, setMes] = useState(todayISO().slice(0, 7));

  const [form, setForm] = useState({
    numero: "",
    valor: "",
    data_emissao: todayISO(),
    cliente_id: "",
    conta_receber_id: "",
    arquivo_url: "",
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notas_fiscais").insert({
        numero: form.numero,
        valor: Number(form.valor.replace(",", ".")),
        data_emissao: form.data_emissao,
        cliente_id: form.cliente_id || null,
        conta_receber_id: form.conta_receber_id || null,
        arquivo_url: form.arquivo_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota fiscal registrada");
      setAberto(false);
      setForm({ numero: "", valor: "", data_emissao: todayISO(), cliente_id: "", conta_receber_id: "", arquivo_url: "" });
      qc.invalidateQueries({ queryKey: ["notas_fiscais"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mudarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("notas_fiscais").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notas_fiscais"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas_fiscais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notas_fiscais"] }),
  });

  const filtradas = useMemo(
    () =>
      notas.filter(
        (n) =>
          (filtroStatus === "todos" || n.status === filtroStatus) &&
          (!mes || n.data_emissao.slice(0, 7) === mes),
      ),
    [notas, filtroStatus, mes],
  );

  const totalMes = filtradas.filter((n) => n.status !== "cancelada").reduce((s, n) => s + Number(n.valor), 0);
  const pendentes = filtradas.filter((n) => n.status === "emitida").length;

  return (
    <>
      <PageHeader
        titulo="Notas Fiscais"
        descricao="Registro manual das notas emitidas e conciliação com os recebimentos."
        acao={
          <Dialog open={aberto} onOpenChange={setAberto}>
            <DialogTrigger asChild><Button><Plus className="size-4" /> Nova nota</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar nota fiscal</DialogTitle></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data de emissão</Label>
                  <Input type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Vincular a conta a receber</Label>
                  <Select value={form.conta_receber_id} onValueChange={(v) => setForm({ ...form, conta_receber_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {receber.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.descricao} — {brl(Number(r.valor))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Link do arquivo (opcional)</Label>
                  <Input value={form.arquivo_url} onChange={(e) => setForm({ ...form, arquivo_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => criar.mutate()} disabled={!form.numero || !form.valor}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Total faturado no filtro" valor={brl(totalMes)} tom="positivo" />
        <KpiCard titulo="Notas emitidas" valor={String(filtradas.length)} tom="neutral" />
        <KpiCard titulo="Aguardando pagamento" valor={String(pendentes)} tom="alerta" />
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Competência</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {STATUS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="secondary"
            className="ml-auto"
            onClick={() =>
              downloadCSV(
                `notas-fiscais-${mes}.csv`,
                filtradas.map((n) => ({
                  Numero: n.numero,
                  Emissao: dateBR(n.data_emissao),
                  Cliente: clientes.find((c) => c.id === n.cliente_id)?.nome ?? "",
                  Valor: Number(n.valor).toFixed(2).replace(".", ","),
                  Status: n.status,
                })),
              )
            }
          >
            <Download className="size-4" /> Exportar CSV
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma nota fiscal no período.
                </TableCell>
              </TableRow>
            )}
            {filtradas.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="num font-medium">
                  {n.arquivo_url ? (
                    <a href={n.arquivo_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                      {n.numero}
                    </a>
                  ) : (
                    n.numero
                  )}
                </TableCell>
                <TableCell className="num">{dateBR(n.data_emissao)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {clientes.find((c) => c.id === n.cliente_id)?.nome ?? "—"}
                </TableCell>
                <TableCell className="num text-right">{brl(Number(n.valor))}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      n.status === "paga"
                        ? "border-success/40 bg-success/15 text-success"
                        : n.status === "cancelada"
                          ? "border-destructive/40 bg-destructive/15 text-destructive"
                          : "border-warning/40 bg-warning/15 text-warning"
                    }
                  >
                    {n.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Select value={n.status} onValueChange={(status) => mudarStatus.mutate({ id: n.id, status })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => excluir.mutate(n.id)}>
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </>
  );
}
