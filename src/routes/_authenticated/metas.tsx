import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { useCategorias, useLancamentos, useMetas, useOrcamentos } from "@/lib/finance";
import type { Meta, Orcamento } from "@/lib/finance";
import { brl, dateBR, monthLabel, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas & Orçamento | Gestão Financeira" },
      {
        name: "description",
        content: "Defina metas de faturamento e orçamentos por categoria, acompanhando realizado versus planejado.",
      },
      { property: "og:title", content: "Metas & Orçamento | Gestão Financeira" },
      { property: "og:description", content: "Metas de faturamento e controle orçamentário por categoria." },
    ],
  }),
  component: MetasPage,
});

function MetasPage() {
  const qc = useQueryClient();
  const { data: metas = [] } = useMetas();
  const { data: orcamentos = [] } = useOrcamentos();
  const { data: categorias = [] } = useCategorias();
  const { data: lancamentos = [] } = useLancamentos();

  const [metaAberta, setMetaAberta] = useState(false);
  const [orcAberto, setOrcAberto] = useState(false);
  const competenciaAtual = `${todayISO().slice(0, 7)}-01`;

  const [metaForm, setMetaForm] = useState({
    titulo: "",
    periodo_inicio: competenciaAtual,
    periodo_fim: todayISO(),
    valor_alvo: "",
  });
  const [orcForm, setOrcForm] = useState({
    categoria_id: "",
    competencia: competenciaAtual,
    valor_orcado: "",
  });

  const criarMeta = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("metas").insert({
        titulo: metaForm.titulo,
        periodo_inicio: metaForm.periodo_inicio,
        periodo_fim: metaForm.periodo_fim,
        valor_alvo: Number(metaForm.valor_alvo.replace(",", ".")),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta criada");
      setMetaAberta(false);
      qc.invalidateQueries({ queryKey: ["metas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarOrcamento = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orcamentos").upsert(
        {
          categoria_id: orcForm.categoria_id,
          competencia: orcForm.competencia,
          valor_orcado: Number(orcForm.valor_orcado.replace(",", ".")),
        },
        { onConflict: "categoria_id,competencia" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento salvo");
      setOrcAberto(false);
      qc.invalidateQueries({ queryKey: ["orcamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMeta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas"] }),
  });

  const excluirOrcamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orcamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orcamentos"] }),
  });

  const realizadoMeta = (inicio: string, fim: string) =>
    lancamentos
      .filter((l) => l.tipo === "entrada" && l.data >= inicio && l.data <= fim)
      .reduce((s, l) => s + Number(l.valor), 0);

  const realizadoCategoria = (categoriaId: string, competencia: string) =>
    lancamentos
      .filter(
        (l) =>
          l.tipo === "saida" &&
          l.categoria_id === categoriaId &&
          l.data.slice(0, 7) === competencia.slice(0, 7),
      )
      .reduce((s, l) => s + Number(l.valor), 0);

  return (
    <>
      <PageHeader
        titulo="Metas & Orçamento"
        descricao="Metas de faturamento e limites de gasto por categoria."
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Metas de faturamento
            </h2>
            <Dialog open={metaAberta} onOpenChange={setMetaAberta}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="size-4" /> Nova meta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={metaForm.titulo} onChange={(e) => setMetaForm({ ...metaForm, titulo: e.target.value })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Início</Label>
                      <Input type="date" value={metaForm.periodo_inicio} onChange={(e) => setMetaForm({ ...metaForm, periodo_inicio: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim</Label>
                      <Input type="date" value={metaForm.periodo_fim} onChange={(e) => setMetaForm({ ...metaForm, periodo_fim: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor-alvo (R$)</Label>
                    <Input inputMode="decimal" value={metaForm.valor_alvo} onChange={(e) => setMetaForm({ ...metaForm, valor_alvo: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => criarMeta.mutate()} disabled={!metaForm.titulo || !metaForm.valor_alvo}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <ul className="space-y-3">
            {metas.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</li>}
            {metas.map((m) => {
              const realizado = realizadoMeta(m.periodo_inicio, m.periodo_fim);
              const alvo = Number(m.valor_alvo);
              const perc = alvo > 0 ? Math.min(100, (realizado / alvo) * 100) : 0;
              const atingida = realizado >= alvo;
              const encerrada = m.periodo_fim < todayISO();
              return (
                <li key={m.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{m.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {dateBR(m.periodo_inicio)} — {dateBR(m.periodo_fim)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {encerrada && (
                        <Badge
                          variant="outline"
                          className={atingida ? "border-success/40 bg-success/15 text-success" : "border-destructive/40 bg-destructive/15 text-destructive"}
                        >
                          {atingida ? "atingida" : "não atingida"}
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => excluirMeta.mutate(m.id)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={perc} className="mt-3" />
                  <p className="num mt-2 text-sm">
                    <span className={atingida ? "text-success" : "text-foreground"}>{brl(realizado)}</span>
                    <span className="text-muted-foreground"> / {brl(alvo)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Orçamento por categoria
            </h2>
            <Dialog open={orcAberto} onOpenChange={setOrcAberto}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="size-4" /> Novo orçamento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Orçamento da categoria</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Categoria de despesa</Label>
                    <Select value={orcForm.categoria_id} onValueChange={(v) => setOrcForm({ ...orcForm, categoria_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {categorias.filter((c) => c.tipo === "despesa").map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Competência</Label>
                    <Input type="month" value={orcForm.competencia.slice(0, 7)} onChange={(e) => setOrcForm({ ...orcForm, competencia: `${e.target.value}-01` })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor orçado (R$)</Label>
                    <Input inputMode="decimal" value={orcForm.valor_orcado} onChange={(e) => setOrcForm({ ...orcForm, valor_orcado: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => criarOrcamento.mutate()} disabled={!orcForm.categoria_id || !orcForm.valor_orcado}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <ul className="space-y-3">
            {orcamentos.length === 0 && <li className="text-sm text-muted-foreground">Nenhum orçamento definido.</li>}
            {orcamentos.map((o) => {
              const cat = categorias.find((c) => c.id === o.categoria_id);
              const realizado = realizadoCategoria(o.categoria_id, o.competencia);
              const orcado = Number(o.valor_orcado);
              const perc = orcado > 0 ? (realizado / orcado) * 100 : 0;
              const estourou = realizado > orcado;
              return (
                <li key={o.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{cat?.nome ?? "Categoria"}</p>
                      <p className="text-xs text-muted-foreground">{monthLabel(o.competencia)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {estourou && (
                        <Badge variant="outline" className="border-destructive/40 bg-destructive/15 text-destructive">
                          limite ultrapassado
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => excluirOrcamento.mutate(o.id)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={Math.min(100, perc)} className="mt-3" />
                  <p className="num mt-2 text-sm">
                    <span className={estourou ? "text-destructive" : "text-foreground"}>{brl(realizado)}</span>
                    <span className="text-muted-foreground"> / {brl(orcado)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
