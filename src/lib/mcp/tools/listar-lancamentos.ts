import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "listar_lancamentos",
  title: "Listar lançamentos",
  description: "Lista lançamentos do fluxo de caixa (entradas e saídas) por período e tipo.",
  inputSchema: {
    data_inicio: z.string().optional().describe("Data inicial (YYYY-MM-DD)."),
    data_fim: z.string().optional().describe("Data final (YYYY-MM-DD)."),
    tipo: z.enum(["entrada", "saida"]).optional().describe("Filtrar por tipo de lançamento."),
    limite: z.number().int().min(1).max(200).default(50).describe("Máximo de registros."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ data_inicio, data_fim, tipo, limite }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("lancamentos")
      .select("id, data, descricao, tipo, valor, forma_pagamento, observacoes")
      .order("data", { ascending: false })
      .limit(limite ?? 50);
    if (data_inicio) query = query.gte("data", data_inicio);
    if (data_fim) query = query.lte("data", data_fim);
    if (tipo) query = query.eq("tipo", tipo);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { lancamentos: data ?? [] },
    };
  },
});
