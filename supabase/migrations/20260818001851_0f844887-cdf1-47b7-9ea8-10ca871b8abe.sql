-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','colaborador');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- new user trigger: profile + first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''));
  IF (SELECT count(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Contas / caixas
CREATE TABLE public.contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'banco',
  saldo_inicial numeric(14,2) NOT NULL DEFAULT 0,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas TO authenticated;
GRANT ALL ON public.contas TO service_role;
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contas_all" ON public.contas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita','despesa')),
  grupo_dre text NOT NULL DEFAULT 'despesa_operacional',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_all" ON public.categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  documento text,
  contato text,
  email text,
  observacoes text,
  valor_contratado numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fornecedores_all" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  documento text,
  contato text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_all" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL,
  data date NOT NULL DEFAULT current_date,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  conta_id uuid REFERENCES public.contas(id) ON DELETE SET NULL,
  forma_pagamento text NOT NULL DEFAULT 'pix',
  observacoes text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lancamentos_all" ON public.lancamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER lancamentos_updated BEFORE UPDATE ON public.lancamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','atrasado')),
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  conta_id uuid REFERENCES public.contas(id) ON DELETE SET NULL,
  parcela int NOT NULL DEFAULT 1,
  total_parcelas int NOT NULL DEFAULT 1,
  recorrente boolean NOT NULL DEFAULT false,
  pago_em date,
  comprovante_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_pagar TO authenticated;
GRANT ALL ON public.contas_pagar TO service_role;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contas_pagar_all" ON public.contas_pagar FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER contas_pagar_updated BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contas_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','recebido','atrasado')),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  conta_id uuid REFERENCES public.contas(id) ON DELETE SET NULL,
  parcela int NOT NULL DEFAULT 1,
  total_parcelas int NOT NULL DEFAULT 1,
  recorrente boolean NOT NULL DEFAULT false,
  recebido_em date,
  comprovante_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_receber TO authenticated;
GRANT ALL ON public.contas_receber TO service_role;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contas_receber_all" ON public.contas_receber FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER contas_receber_updated BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  valor_alvo numeric(14,2) NOT NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metas_all" ON public.metas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  competencia date NOT NULL,
  valor_orcado numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categoria_id, competencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos TO authenticated;
GRANT ALL ON public.orcamentos TO service_role;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orcamentos_all" ON public.orcamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Folha (admin only)
CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cargo text,
  salario_fixo numeric(14,2) NOT NULL DEFAULT 0,
  percentual_comissao numeric(6,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores TO authenticated;
GRANT ALL ON public.colaboradores TO service_role;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colaboradores_admin" ON public.colaboradores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.pagamentos_folha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  competencia date NOT NULL,
  valor_fixo numeric(14,2) NOT NULL DEFAULT 0,
  valor_variavel numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago')),
  pago_em date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos_folha TO authenticated;
GRANT ALL ON public.pagamentos_folha TO service_role;
ALTER TABLE public.pagamentos_folha ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagamentos_folha_admin" ON public.pagamentos_folha FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  valor numeric(14,2) NOT NULL,
  data_emissao date NOT NULL DEFAULT current_date,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  conta_receber_id uuid REFERENCES public.contas_receber(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'emitida' CHECK (status IN ('emitida','pendente','cancelada')),
  arquivo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_fiscais TO authenticated;
GRANT ALL ON public.notas_fiscais TO service_role;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notas_fiscais_all" ON public.notas_fiscais FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.alertas_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dias_antes_vencimento int NOT NULL DEFAULT 3,
  whatsapp_destino text,
  alerta_pagar boolean NOT NULL DEFAULT true,
  alerta_receber boolean NOT NULL DEFAULT true,
  alerta_atraso boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas_config TO authenticated;
GRANT ALL ON public.alertas_config TO service_role;
ALTER TABLE public.alertas_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_config_admin" ON public.alertas_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seeds
INSERT INTO public.contas (nome, tipo, saldo_inicial) VALUES ('Conta PJ Principal','banco', 0);
INSERT INTO public.categorias (nome, tipo, grupo_dre) VALUES
  ('Comissão de Consórcio','receita','receita_bruta'),
  ('Taxa de Administração','receita','receita_bruta'),
  ('Outras Receitas','receita','receita_bruta'),
  ('Impostos sobre Vendas','despesa','deducao'),
  ('Comissões Pagas','despesa','custo'),
  ('Folha de Pagamento','despesa','despesa_operacional'),
  ('Marketing e Anúncios','despesa','despesa_operacional'),
  ('Aluguel','despesa','despesa_operacional'),
  ('Software e Assinaturas','despesa','despesa_operacional'),
  ('Despesas Administrativas','despesa','despesa_operacional');
INSERT INTO public.alertas_config (dias_antes_vencimento) VALUES (3);