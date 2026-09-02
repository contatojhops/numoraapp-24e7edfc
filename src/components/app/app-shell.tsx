import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ReceiptText,
  Target,
  BarChart3,
  Users,
  FileText,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, admin: false },
  { to: "/fluxo-caixa", label: "Fluxo de Caixa", icon: ArrowLeftRight, admin: false },
  { to: "/contas", label: "Pagar & Receber", icon: ReceiptText, admin: false },
  { to: "/metas", label: "Metas & Orçamento", icon: Target, admin: false },
  { to: "/dre", label: "DRE & KPIs", icon: BarChart3, admin: false },
  { to: "/folha", label: "Folha & Fornecedores", icon: Users, admin: true },
  { to: "/notas-fiscais", label: "Notas Fiscais", icon: FileText, admin: false },
  { to: "/configuracoes", label: "Configurações", icon: Settings, admin: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(true);
  const { isAdmin, session } = useRole();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: {} });
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "glass sticky top-0 hidden h-screen shrink-0 flex-col gap-2 rounded-none border-y-0 border-l-0 p-3 transition-[width] duration-300 md:flex",
          aberta ? "w-64" : "w-[76px]",
        )}
      >
        <div className="mb-4 flex items-center gap-3 px-1 py-2">
          <span className="icon3d size-10 shrink-0 text-primary">
            <Wallet className="size-5" />
          </span>
          {aberta && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Financeiro</p>
              <p className="truncate text-xs text-muted-foreground">Consórcio</p>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.filter((i) => !i.admin || isAdmin).map((item) => {
            const ativo = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  ativo
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_1px_0_oklch(1_0_0/12%)]"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-4 shrink-0", ativo && "text-primary")} />
                {aberta && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-border pt-3">
          {aberta && (
            <p className="truncate px-3 pb-1 text-xs text-muted-foreground">
              {session?.user.email} · {isAdmin ? "Administrador" : "Colaborador"}
            </p>
          )}
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={sair}>
            <LogOut className="size-4" />
            {aberta && "Sair"}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => setAberta((v) => !v)}
          >
            {aberta ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
            {aberta && "Recolher"}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-20 flex items-center gap-2 overflow-x-auto rounded-none border-x-0 border-t-0 px-3 py-2 md:hidden">
          {NAV.filter((i) => !i.admin || isAdmin).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs",
                pathname.startsWith(item.to)
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
