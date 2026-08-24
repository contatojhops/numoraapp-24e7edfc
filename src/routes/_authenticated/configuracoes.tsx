import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCategorias, useClientes, useContas } from "@/lib/finance";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user?.id ?? "");
    if (!(roles ?? []).some((r) => r.role === "admin")) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Configurações | Gestão Financeira" },
      {
        name: "description",
        content: "Gerencie contas bancárias, categorias, clientes, usuários e as regras de alerta de vencimento.",
      },
      { property: "og:title", content: "Configurações | Gestão Financeira" },
      { property: "og:description", content: "Contas, categorias, clientes, usuários e alertas do sistema." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <>
      <PageHeader titulo="Configurações" descricao="Cadastros base, usuários e alertas. Módulo restrito ao Administrador." />
      <Tabs defaultValue="contas">
        <TabsList className="flex-wrap">
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
        </TabsList>
        <TabsContent value="contas"><ContasTab /></TabsContent>
        <TabsContent value="categorias"><CategoriasTab /></TabsContent>
        <TabsContent value="clientes"><ClientesTab /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="alertas"><AlertasTab /></TabsContent>
      </Tabs>
    </>
  );
}

function Painel({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass mt-4 rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
        {acao}
      </div>
      {children}
    </div>
  );
}

function ContasTab() {
  const qc = useQueryClient();
  const { data: contas = [] } = useContas();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "banco", saldo_inicial: "" });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contas").insert({
        nome: form.nome,
        tipo: form.tipo,
        saldo_inicial: Number(form.saldo_inicial.replace(",", ".") || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta criada");
      setAberto(false);
      qc.invalidateQueries({ queryKey: ["contas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase.from("contas").update({ ativa }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contas"] }),
  });

  return (
    <Painel
      titulo="Contas bancárias e caixa"
      acao={
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Nova conta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banco">Banco</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="investimento">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo inicial (R$)</Label>
                <Input inputMode="decimal" value={form.saldo_inicial} onChange={(e) => setForm({ ...form, saldo_inicial: e.target.value })} />
              </div>
            </div>
            <DialogFooter><Button onClick={() => criar.mutate()} disabled={!form.nome}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Saldo inicial</TableHead>
            <TableHead className="text-right">Ativa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contas.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.nome}</TableCell>
              <TableCell className="text-muted-foreground">{c.tipo}</TableCell>
              <TableCell className="num text-right">{brl(Number(c.saldo_inicial))}</TableCell>
              <TableCell className="text-right">
                <Switch checked={c.ativa} onCheckedChange={(ativa) => alternar.mutate({ id: c.id, ativa })} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Painel>
  );
}

function CategoriasTab() {
  const qc = useQueryClient();
  const { data: categorias = [] } = useCategorias();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "despesa", grupo_dre: "despesa_operacional" });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categorias").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria criada");
      setAberto(false);
      qc.invalidateQueries({ queryKey: ["categorias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Painel
      titulo="Categorias de receita e despesa"
      acao={
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Nova categoria</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grupo no DRE</Label>
                <Select value={form.grupo_dre} onValueChange={(v) => setForm({ ...form, grupo_dre: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita_bruta">Receita bruta</SelectItem>
                    <SelectItem value="deducao">Dedução / imposto</SelectItem>
                    <SelectItem value="custo">Custo (comissões)</SelectItem>
                    <SelectItem value="despesa_operacional">Despesa operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={() => criar.mutate()} disabled={!form.nome}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Grupo DRE</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorias.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.nome}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={c.tipo === "receita" ? "border-success/40 bg-success/15 text-success" : "border-border"}
                >
                  {c.tipo}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{c.grupo_dre.replace(/_/g, " ")}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => excluir.mutate(c.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Painel>
  );
}

function ClientesTab() {
  const qc = useQueryClient();
  const { data: clientes = [] } = useClientes();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ nome: "", documento: "", contato: "", email: "" });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clientes").insert({
        nome: form.nome,
        documento: form.documento || null,
        contato: form.contato || null,
        email: form.email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado");
      setAberto(false);
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Painel
      titulo="Clientes"
      acao={
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Novo cliente</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CPF / CNPJ</Label>
                <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <DialogFooter><Button onClick={() => criar.mutate()} disabled={!form.nome}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.length === 0 && (
            <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado.</TableCell></TableRow>
          )}
          {clientes.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.nome}</TableCell>
              <TableCell className="num text-muted-foreground">{c.documento ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{c.contato ?? c.email ?? "—"}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => excluir.mutate(c.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Painel>
  );
}

function UsuariosTab() {
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-config"],
    queryFn: async () => {
      const [{ data: perfis, error: e1 }, { data: papeis, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email, created_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return (perfis ?? []).map((p) => ({
        ...p,
        role: (papeis ?? []).find((r) => r.user_id === p.id)?.role ?? "colaborador",
      }));
    },
  });

  return (
    <Painel titulo="Usuários do sistema">
      <p className="mb-4 text-sm text-muted-foreground">
        Novos usuários entram como colaboradores ao criar a conta. O primeiro cadastro do sistema recebe o papel de
        administrador.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead className="text-right">Papel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.nome}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={u.role === "admin" ? "border-primary/40 bg-primary/15 text-primary" : "border-border"}
                >
                  {u.role}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Painel>
  );
}

function AlertasTab() {
  const qc = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ["alertas_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alertas_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    dias_antes_vencimento: 3,
    whatsapp_destino: "",
    alerta_pagar: true,
    alerta_receber: true,
    alerta_atraso: true,
  });

  useEffect(() => {
    if (config) {
      setForm({
        dias_antes_vencimento: config.dias_antes_vencimento,
        whatsapp_destino: config.whatsapp_destino ?? "",
        alerta_pagar: config.alerta_pagar,
        alerta_receber: config.alerta_receber,
        alerta_atraso: config.alerta_atraso,
      });
    }
  }, [config]);

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = { ...form, whatsapp_destino: form.whatsapp_destino || null, updated_at: new Date().toISOString() };
      const { error } = config
        ? await supabase.from("alertas_config").update(payload).eq("id", config.id)
        : await supabase.from("alertas_config").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferências de alerta salvas");
      qc.invalidateQueries({ queryKey: ["alertas_config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Painel titulo="Alertas de vencimento">
      <div className="grid max-w-xl gap-5">
        <div className="space-y-2">
          <Label>Avisar quantos dias antes do vencimento</Label>
          <Input
            type="number"
            min={0}
            value={form.dias_antes_vencimento}
            onChange={(e) => setForm({ ...form, dias_antes_vencimento: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp de destino</Label>
          <Input
            placeholder="+55 11 90000-0000"
            value={form.whatsapp_destino}
            onChange={(e) => setForm({ ...form, whatsapp_destino: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Número usado para o envio dos avisos. Os alertas também aparecem no painel inicial.
          </p>
        </div>
        {([
          ["alerta_pagar", "Alertar contas a pagar próximas do vencimento"],
          ["alerta_receber", "Alertar contas a receber próximas do vencimento"],
          ["alerta_atraso", "Alertar títulos em atraso"],
        ] as const).map(([campo, label]) => (
          <div key={campo} className="flex items-center justify-between rounded-xl border border-border p-4">
            <span className="text-sm">{label}</span>
            <Switch checked={form[campo]} onCheckedChange={(v) => setForm({ ...form, [campo]: v })} />
          </div>
        ))}
        <Button className="w-fit" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          Salvar preferências
        </Button>
      </div>
    </Painel>
  );
}
