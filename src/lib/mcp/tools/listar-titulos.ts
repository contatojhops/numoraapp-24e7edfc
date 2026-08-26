import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "listar_titulos",
  title: "Listar contas a pagar/receber",
  description: "Lista títulos de contas a pagar ou a receber, com filtro por status e vencimento.",
  inputSchema: {
    tipo: z.enum(["pagar", "receber"]).describe("Qual carteira consultar."),
    status: z.string().optional().describe("Status do título (ex: pendente, pago, recebido)."),
    vencimento_ate: z.string().optional().describe("Somente títulos com vencimento até esta data (YYYY-MM-DD)."),
    limite: z.number().int().min(1).max(200).default(50).describe("Máximo de registros."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tipo, status, vencimento_ate, limite }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const tabela = tipo === "pagar" ? "contas_pagar" : "contas_receber";
    let query = supabaseForUser(ctx)
      .from(tabela)
      .select("id, descricao, valor, vencimento, status, parcela, total_parcelas, recorrente")
      .order("vencimento", { ascending: true })
      .limit(limite ?? 50);
    if (status) query = query.eq("status", status);
    if (vencimento_ate) query = query.lte("vencimento", vencimento_ate);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { titulos: data ?? [] },
    };
  },
});
