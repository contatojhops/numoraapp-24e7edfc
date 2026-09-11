import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldQuestion } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pendente")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso pendente | Gestão Financeira" },
      {
        name: "description",
        content: "Sua conta foi criada e aguarda liberação de acesso por um administrador do sistema.",
      },
      { property: "og:title", content: "Acesso pendente | Gestão Financeira" },
      { property: "og:description", content: "Aguardando aprovação do administrador." },
    ],
  }),
  component: Pendente,
});

function Pendente() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: {}, replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldQuestion className="mx-auto size-10 text-primary" strokeWidth={1.5} />
        <h1 className="mt-4 text-xl font-semibold">Acesso pendente de aprovação</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sua conta foi criada com sucesso, mas ainda não tem permissão para ver os dados da empresa. Peça a um
          administrador para liberar seu acesso em Configurações → Usuários.
        </p>
        <Button className="mt-6 w-full" variant="secondary" onClick={sair}>
          Sair
        </Button>
      </div>
    </main>
  );
}
