import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "criar_lancamento",
  title: "Criar lançamento",
  description: "Registra um novo lançamento de entrada ou saída no fluxo de caixa.",
  inputSchema: {
    descricao: z.string().trim().min(1).describe("Descrição do lançamento."),
    valor: z.number().positive().describe("Valor em reais."),
    tipo: z.enum(["entrada", "saida"]).describe("Entrada (receita) ou saída (despesa)."),
    data: z.string().optional().describe("Data do lançamento (YYYY-MM-DD). Padrão: hoje."),
    forma_pagamento: z.string().optional().describe("Forma de pagamento (pix, dinheiro, cartao...)."),
    observacoes: z.string().optional().describe("Observações adicionais."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ descricao, valor, tipo, data, forma_pagamento, observacoes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const insert: Record<string, unknown> = {
      descricao,
      valor,
      tipo,
      criado_por: ctx.getUserId(),
    };
    if (data) insert['data'] = data;
    if (forma_pagamento) insert['forma_pagamento'] = forma_pagamento;
    if (observacoes) insert['observacoes'] = observacoes;

    const { data: rows, error } = await supabaseForUser(ctx)
      .from("lancamentos")
      .insert(insert as never)
      .select();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(rows?.[0] ?? null) }],
      structuredContent: { lancamento: rows?.[0] ?? null },
    };
  },
});
