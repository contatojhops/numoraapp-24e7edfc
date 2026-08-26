import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "resumo_financeiro",
  title: "Resumo financeiro",
  description: "Resume entradas, saídas e resultado do período, além de contas pendentes a pagar e a receber.",
  inputSchema: {
    data_inicio: z.string().describe("Data inicial do período (YYYY-MM-DD)."),
    data_fim: z.string().describe("Data final do período (YYYY-MM-DD)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ data_inicio, data_fim }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [lanc, pagar, receber] = await Promise.all([
      supabase.from("lancamentos").select("tipo, valor").gte("data", data_inicio).lte("data", data_fim),
      supabase.from("contas_pagar").select("valor").neq("status", "pago"),
      supabase.from("contas_receber").select("valor").neq("status", "recebido"),
    ]);
    const erro = lanc.error ?? pagar.error ?? receber.error;
    if (erro) return { content: [{ type: "text", text: erro.message }], isError: true };

    const entradas = (lanc.data ?? [])
      .filter((l) => l.tipo === "entrada")
      .reduce((s, l) => s + Number(l.valor), 0);
    const saidas = (lanc.data ?? [])
      .filter((l) => l.tipo === "saida")
      .reduce((s, l) => s + Number(l.valor), 0);
    const resumo = {
      periodo: { inicio: data_inicio, fim: data_fim },
      entradas,
      saidas,
      resultado: entradas - saidas,
      a_pagar_pendente: (pagar.data ?? []).reduce((s, c) => s + Number(c.valor), 0),
      a_receber_pendente: (receber.data ?? []).reduce((s, c) => s + Number(c.valor), 0),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(resumo) }],
      structuredContent: resumo,
    };
  },
});
