-- 1. Helper: usuário possui algum papel concedido
CREATE OR REPLACE FUNCTION public.tem_acesso(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

REVOKE ALL ON FUNCTION public.tem_acesso(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tem_acesso(uuid) TO authenticated;

-- 2. Novo cadastro: apenas o primeiro usuário vira admin; demais ficam pendentes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''));
  IF (SELECT count(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- 3. RLS: exigir papel concedido nas tabelas de dados da empresa
DROP POLICY IF EXISTS contas_all ON public.contas;
CREATE POLICY contas_all ON public.contas FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

DROP POLICY IF EXISTS categorias_all ON public.categorias;
CREATE POLICY categorias_all ON public.categorias FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

DROP POLICY IF EXISTS fornecedores_all ON public.fornecedores;
CREATE POLICY fornecedores_all ON public.fornecedores FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

DROP POLICY IF EXISTS clientes_all ON public.clientes;
CREATE POLICY clientes_all ON public.clientes FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

DROP POLICY IF EXISTS lancamentos_all ON public.lancamentos;
CREATE POLICY lancamentos_all ON public.lancamentos FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

DROP POLICY IF EXISTS contas_pagar_all ON public.contas_pagar;
CREATE POLICY contas_pagar_all ON public.contas_pagar FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

DROP POLICY IF EXISTS contas_receber_all ON public.contas_receber;
CREATE POLICY contas_receber_all ON public.contas_receber FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

DROP POLICY IF EXISTS metas_all ON public.metas;
CREATE POLICY metas_all ON public.metas FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

DROP POLICY IF EXISTS orcamentos_all ON public.orcamentos;
CREATE POLICY orcamentos_all ON public.orcamentos FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

DROP POLICY IF EXISTS notas_fiscais_all ON public.notas_fiscais;
CREATE POLICY notas_fiscais_all ON public.notas_fiscais FOR ALL TO authenticated
  USING (public.tem_acesso(auth.uid())) WITH CHECK (public.tem_acesso(auth.uid()));

-- 4. Administrador gerencia papéis
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

CREATE POLICY user_roles_admin_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_update ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_delete ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Vínculo entre título e lançamento de fluxo de caixa
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS lancamento_id uuid REFERENCES public.lancamentos(id) ON DELETE SET NULL;
ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS lancamento_id uuid REFERENCES public.lancamentos(id) ON DELETE SET NULL;
