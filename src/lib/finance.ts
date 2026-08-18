import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Lancamento = Tables<"lancamentos">;
export type Categoria = Tables<"categorias">;
export type Conta = Tables<"contas">;
export type ContaPagar = Tables<"contas_pagar">;
export type ContaReceber = Tables<"contas_receber">;
export type Fornecedor = Tables<"fornecedores">;
export type Cliente = Tables<"clientes">;
export type Meta = Tables<"metas">;
export type Orcamento = Tables<"orcamentos">;
export type Colaborador = Tables<"colaboradores">;
export type PagamentoFolha = Tables<"pagamentos_folha">;
export type NotaFiscal = Tables<"notas_fiscais">;

async function fetchAll<T>(table: string, order: string, asc = false): Promise<T[]> {
  const { data, error } = await supabase.from(table as never).select("*").order(order, { ascending: asc });
  if (error) throw error;
  return (data ?? []) as T[];
}

export const useCategorias = () =>
  useQuery({ queryKey: ["categorias"], queryFn: () => fetchAll<Categoria>("categorias", "nome", true) });

export const useContas = () =>
  useQuery({ queryKey: ["contas"], queryFn: () => fetchAll<Conta>("contas", "nome", true) });

export const useLancamentos = () =>
  useQuery({ queryKey: ["lancamentos"], queryFn: () => fetchAll<Lancamento>("lancamentos", "data") });

export const useContasPagar = () =>
  useQuery({ queryKey: ["contas_pagar"], queryFn: () => fetchAll<ContaPagar>("contas_pagar", "vencimento", true) });

export const useContasReceber = () =>
  useQuery({ queryKey: ["contas_receber"], queryFn: () => fetchAll<ContaReceber>("contas_receber", "vencimento", true) });

export const useFornecedores = () =>
  useQuery({ queryKey: ["fornecedores"], queryFn: () => fetchAll<Fornecedor>("fornecedores", "nome", true) });

export const useClientes = () =>
  useQuery({ queryKey: ["clientes"], queryFn: () => fetchAll<Cliente>("clientes", "nome", true) });

export const useMetas = () =>
  useQuery({ queryKey: ["metas"], queryFn: () => fetchAll<Meta>("metas", "periodo_inicio") });

export const useOrcamentos = () =>
  useQuery({ queryKey: ["orcamentos"], queryFn: () => fetchAll<Orcamento>("orcamentos", "competencia") });

export const useColaboradores = () =>
  useQuery({ queryKey: ["colaboradores"], queryFn: () => fetchAll<Colaborador>("colaboradores", "nome", true) });

export const usePagamentosFolha = () =>
  useQuery({ queryKey: ["pagamentos_folha"], queryFn: () => fetchAll<PagamentoFolha>("pagamentos_folha", "competencia") });

export const useNotasFiscais = () =>
  useQuery({ queryKey: ["notas_fiscais"], queryFn: () => fetchAll<NotaFiscal>("notas_fiscais", "data_emissao") });

/** Saldo consolidado: saldos iniciais + entradas - saídas */
export function calcularSaldo(contas: Conta[], lancamentos: Lancamento[]) {
  const inicial = contas.reduce((s, c) => s + Number(c.saldo_inicial), 0);
  const mov = lancamentos.reduce(
    (s, l) => s + (l.tipo === "entrada" ? Number(l.valor) : -Number(l.valor)),
    0,
  );
  return inicial + mov;
}

export type ProjecaoMes = {
  competencia: string;
  entradas: number;
  saidas: number;
  resultado: number;
  saldoAcumulado: number;
};

/** Projeção mês a mês combinando realizado + contas pendentes futuras */
export function projetarSaldo(
  saldoAtual: number,
  pagar: ContaPagar[],
  receber: ContaReceber[],
  meses = 6,
): ProjecaoMes[] {
  const hoje = new Date();
  const out: ProjecaoMes[] = [];
  let acumulado = saldoAtual;
  for (let i = 0; i < meses; i++) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
    const entradas = receber
      .filter((r) => r.status !== "recebido" && r.vencimento.slice(0, 7) === key)
      .reduce((s, r) => s + Number(r.valor), 0);
    const saidas = pagar
      .filter((p) => p.status !== "pago" && p.vencimento.slice(0, 7) === key)
      .reduce((s, p) => s + Number(p.valor), 0);
    acumulado += entradas - saidas;
    out.push({
      competencia: `${key}-01`,
      entradas,
      saidas,
      resultado: entradas - saidas,
      saldoAcumulado: acumulado,
    });
  }
  return out;
}

export function statusEfetivo(status: string, vencimento: string, pago: "pago" | "recebido") {
  if (status === pago) return pago;
  const venc = new Date(`${vencimento.slice(0, 10)}T23:59:59`);
  return venc < new Date() ? "atrasado" : "pendente";
}
