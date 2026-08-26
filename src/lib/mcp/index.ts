import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarLancamentos from "./tools/listar-lancamentos";
import criarLancamento from "./tools/criar-lancamento";
import listarTitulos from "./tools/listar-titulos";
import resumoFinanceiro from "./tools/resumo-financeiro";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "numora-app",
  title: "Numora App",
  version: "0.1.0",
  instructions:
    "Ferramentas do sistema de gestão financeira: consultar e criar lançamentos de fluxo de caixa, listar contas a pagar/receber e obter um resumo financeiro do período. Todas as ações são executadas como o usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listarLancamentos, criarLancamento, listarTitulos, resumoFinanceiro],
});
