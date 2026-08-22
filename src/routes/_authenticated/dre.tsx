import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/app/app-shell";
import { KpiCard } from "@/components/app/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useCategorias, useLancamentos } from "@/lib/finance";
import { brl, brlCompact, downloadCSV, monthLabel, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dre")({
  head: () => ({
    meta: [
      { title: "DRE & Indicadores | Gestão Financeira" },
      {
        name: "description",
        content: "Demonstração de resultado simplificada e KPIs do negócio de consórcio, com comparativo entre períodos.",
      },
      { property: "og:title", content: "DRE & Indicadores | Gestão Financeira" },
      { property: "og:description", content: "DRE automática, margem líquida, ticket médio e evolução mês a mês." },
    ],
  }),
  component: DrePage,
});

type Dre = {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custos: number;
  despesas: number;
  resultado: number;
  margem: number;
  qtdReceitas: number;
};

function DrePage() {
  const { data: lancamentos = [] } = useLancamentos();
  const { data: categorias = [] } = useCategorias();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));

  const grupoDe = useMemo(() => {
    const map = new Map<string, string>();
    categorias.forEach((c) => map.set(c.id, c.grupo_dre));
    return map;
  }, [categorias]);

  const calcular = (mes: string): Dre => {
    const itens = lancamentos.filter((l) => l.data.slice(0, 7) === mes);
    let receitaBruta = 0, deducoes = 0, custos = 0, despesas = 0, qtdReceitas = 0;
    itens.forEach((l) => {
      const valor = Number(l.valor);
      const grupo = grupoDe.get(l.categoria_id ?? "") ?? (l.tipo === "entrada" ? "receita_bruta" : "despesa_operacional");
      if (l.tipo === "entrada") {
        receitaBruta += valor;
        qtdReceitas += 1;
      } else if (grupo === "deducao") deducoes += valor;
      else if (grupo === "custo") custos += valor;
      else despesas += valor;
    });
    const receitaLiquida = receitaBruta - deducoes;
    const resultado = receitaLiquida - custos - despesas;
    return {
      receitaBruta,
      deducoes,
      receitaLiquida,
      custos,
      despesas,
      resultado,
      margem: receitaBruta > 0 ? resultado / receitaBruta : 0,
      qtdReceitas,
    };
  };

  const atual = calcular(competencia);
  const anteriorMes = (() => {
    const d = new Date(`${competencia}-01T00:00:00`);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();
  const anterior = calcular(anteriorMes);

  const evolucao = useMemo(() => {
    const base = new Date(`${competencia}-01T00:00:00`);
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (11 - i), 1);
      const mes = d.toISOString().slice(0, 7);
      const r = calcular(mes);
      return {
        mes: monthLabel(`${mes}-01`),
        receita: r.receitaBruta,
        despesa: r.deducoes + r.custos + r.despesas,
        resultado: r.resultado,
        margem: Number((r.margem * 100).toFixed(1)),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lancamentos, categorias, competencia]);

  const variacao = (a: number, b: number) => (b === 0 ? (a > 0 ? 1 : 0) : (a - b) / Math.abs(b));
  const ticketMedio = atual.qtdReceitas > 0 ? atual.receitaBruta / atual.qtdReceitas : 0;

  const linhas: [string, number, boolean?][] = [
    ["Receita bruta", atual.receitaBruta],
    ["(−) Deduções e impostos", -atual.deducoes],
    ["(=) Receita líquida", atual.receitaLiquida, true],
    ["(−) Custos (comissões)", -atual.custos],
    ["(−) Despesas operacionais", -atual.despesas],
    ["(=) Resultado líquido", atual.resultado, true],
  ];

  return (
    <>
      <PageHeader
        titulo="DRE & Indicadores"
        descricao="Resultado do exercício gerado automaticamente a partir dos lançamentos."
        acao={
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Competência</Label>
              <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  `dre-${competencia}.csv`,
                  linhas.map(([label, valor]) => ({
                    Linha: label,
                    Valor: valor.toFixed(2).replace(".", ","),
                  })),
                )
              }
            >
              <Download className="size-4" /> CSV
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Receita bruta"
          valor={brl(atual.receitaBruta)}
          detalhe={`${pct(variacao(atual.receitaBruta, anterior.receitaBruta))} vs. mês anterior`}
          tom="positivo"
        />
        <KpiCard
          titulo="Resultado líquido"
          valor={brl(atual.resultado)}
          detalhe={`Mês anterior: ${brl(anterior.resultado)}`}
          tom={atual.resultado >= 0 ? "positivo" : "negativo"}
        />
        <KpiCard
          titulo="Margem líquida"
          valor={pct(atual.margem)}
          detalhe={`Mês anterior: ${pct(anterior.margem)}`}
          tom={atual.margem >= 0 ? "positivo" : "negativo"}
        />
        <KpiCard
          titulo="Ticket médio de receita"
          valor={brl(ticketMedio)}
          detalhe={`${atual.qtdReceitas} entrada(s) no mês`}
          tom="neutral"
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            DRE — {monthLabel(`${competencia}-01`)}
          </h2>
          <Table className="mt-3">
            <TableBody>
              {linhas.map(([label, valor, destaque]) => (
                <TableRow key={label} className={destaque ? "bg-accent/40" : ""}>
                  <TableCell className={destaque ? "font-semibold" : ""}>{label}</TableCell>
                  <TableCell
                    className={`num text-right ${destaque ? "font-semibold" : ""} ${valor < 0 ? "text-destructive" : "text-success"}`}
                  >
                    {brl(valor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Receita x Despesa — 12 meses
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v: number) => brlCompact(v)} />
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                  formatter={(v: number) => brl(v)}
                />
                <Bar dataKey="receita" name="Receita" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Evolução da margem líquida (%)
        </h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                formatter={(v: number) => `${v}%`}
              />
              <Line type="monotone" dataKey="margem" name="Margem" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
