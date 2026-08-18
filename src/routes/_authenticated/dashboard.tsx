import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Percent, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app/app-shell";
import { KpiCard } from "@/components/app/kpi-card";
import {
  calcularSaldo,
  projetarSaldo,
  useContas,
  useContasPagar,
  useContasReceber,
  useLancamentos,
} from "@/lib/finance";
import { brl, brlCompact, dateBR, daysUntil, monthLabel, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Financeiro | Gestão Consórcio" },
      {
        name: "description",
        content:
          "Saldo consolidado, projeção de caixa, contas a pagar e receber e indicadores do mês em um só painel.",
      },
      { property: "og:title", content: "Dashboard Financeiro | Gestão Consórcio" },
      {
        property: "og:description",
        content: "Visão em tempo real da saúde financeira da empresa.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: contas = [] } = useContas();
  const { data: lancamentos = [] } = useLancamentos();
  const { data: pagar = [] } = useContasPagar();
  const { data: receber = [] } = useContasReceber();

  const saldo = calcularSaldo(contas, lancamentos);
  const projecao = projetarSaldo(saldo, pagar, receber, 6);

  const mesAtual = new Date().toISOString().slice(0, 7);
  const doMes = lancamentos.filter((l) => l.data.slice(0, 7) === mesAtual);
  const receita = doMes.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
  const despesa = doMes.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);
  const resultado = receita - despesa;
  const margem = receita > 0 ? resultado / receita : 0;

  const em30 = (iso: string) => daysUntil(iso) >= 0 && daysUntil(iso) <= 30;
  const aPagar30 = pagar.filter((p) => p.status !== "pago" && em30(p.vencimento)).reduce((s, p) => s + Number(p.valor), 0);
  const aReceber30 = receber.filter((r) => r.status !== "recebido" && em30(r.vencimento)).reduce((s, r) => s + Number(r.valor), 0);

  const alertas = [
    ...pagar
      .filter((p) => p.status !== "pago")
      .map((p) => ({
        id: p.id,
        tipo: "pagar" as const,
        descricao: p.descricao,
        valor: Number(p.valor),
        vencimento: p.vencimento,
        dias: daysUntil(p.vencimento),
      })),
    ...receber
      .filter((r) => r.status !== "recebido")
      .map((r) => ({
        id: r.id,
        tipo: "receber" as const,
        descricao: r.descricao,
        valor: Number(r.valor),
        vencimento: r.vencimento,
        dias: daysUntil(r.vencimento),
      })),
  ]
    .filter((a) => a.dias <= 7)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 8);

  const serieProjecao = projecao.map((p) => ({
    mes: monthLabel(p.competencia),
    saldo: Number(p.saldoAcumulado.toFixed(2)),
    entradas: p.entradas,
    saidas: p.saidas,
  }));

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        descricao="Visão consolidada da saúde financeira da empresa."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Saldo consolidado"
          valor={brl(saldo)}
          detalhe={`${contas.length} conta(s) cadastrada(s)`}
          icone={<Wallet className="size-4" />}
          tom={saldo >= 0 ? "positivo" : "negativo"}
        />
        <KpiCard
          titulo="A receber (30 dias)"
          valor={brl(aReceber30)}
          detalhe="Títulos em aberto com vencimento próximo"
          icone={<ArrowUpRight className="size-4" />}
          tom="positivo"
        />
        <KpiCard
          titulo="A pagar (30 dias)"
          valor={brl(aPagar30)}
          detalhe="Compromissos assumidos"
          icone={<ArrowDownRight className="size-4" />}
          tom="negativo"
        />
        <KpiCard
          titulo="Margem do mês"
          valor={pct(margem)}
          detalhe={`Resultado ${brl(resultado)}`}
          icone={<Percent className="size-4" />}
          tom={resultado >= 0 ? "positivo" : "negativo"}
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="glass rounded-2xl p-5 xl:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Projeção de saldo — próximos 6 meses
          </h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serieProjecao}>
                <defs>
                  <linearGradient id="areaSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v: number) => brlCompact(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => brl(v)}
                />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo projetado"
                  stroke="var(--color-primary)"
                  fill="url(#areaSaldo)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {projecao.slice(0, 3).map((p) => (
              <div key={p.competencia} className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">{monthLabel(p.competencia)}</p>
                <p
                  className={`num text-lg font-semibold ${p.saldoAcumulado >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {brl(p.saldoAcumulado)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="size-4 text-warning" /> Alertas ativos
          </h2>
          <ul className="mt-4 space-y-2">
            {alertas.length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhum vencimento crítico nos próximos 7 dias.</li>
            )}
            {alertas.map((a) => (
              <li
                key={a.tipo + a.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{a.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.tipo === "pagar" ? "A pagar" : "A receber"} · {dateBR(a.vencimento)} ·{" "}
                    {a.dias < 0 ? `${Math.abs(a.dias)}d em atraso` : a.dias === 0 ? "vence hoje" : `em ${a.dias}d`}
                  </p>
                </div>
                <span
                  className={`num shrink-0 text-sm ${a.dias < 0 ? "text-destructive" : a.tipo === "pagar" ? "text-warning" : "text-success"}`}
                >
                  {brl(a.valor)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Entradas x Saídas projetadas
        </h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serieProjecao}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickFormatter={(v: number) => brlCompact(v)}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                }}
                formatter={(v: number) => brl(v)}
              />
              <Bar dataKey="entradas" name="Entradas" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
