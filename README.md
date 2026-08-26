# Numora App

Prompt para Lovable — Sistema de Gestão Financeira Empresarial

Copie e cole o conteúdo abaixo diretamente no Lovable para iniciar o projeto (ou usar como prompt de refinamento em um projeto já existente).

Contexto do projeto

Construa um sistema de gestão financeira empresarial para uso interno de uma pequena empresa do setor de consórcio (sem departamentos formais, equipe enxuta). O sistema deve dar visão clara e em tempo real da saúde financeira do negócio: quanto entra, quanto sai, quanto vai sobrar (ou faltar) nos próximos meses, e indicadores de resultado — tudo em uma interface rápida de usar no dia a dia, sem burocracia de planilha.

Esta é uma adaptação empresarial de um app de gestão financeira familiar já existente, então o sistema deve reaproveitar a lógica de fluxo de caixa e alertas, mas com a profundidade analítica (DRE, KPIs, folha de pagamento, notas fiscais) que uma empresa exige e uma família não.

Público e uso

Equipe pequena (dono/a + colaboradores), sem estrutura de departamentos ou centros de custo.

Uso multiusuário, com dois níveis de permissão:

Administrador (dono/a): acesso total — cadastros, lançamentos, relatórios, configurações, gestão de usuários.

Colaborador/Financeiro: lança e edita movimentações, contas a pagar/receber e fornecedores; visualiza dashboards e relatórios; não acessa folha de pagamento nem configurações de usuários.

Acesso via login individual (e-mail/senha), sem necessidade de múltiplas filiais.

Stack técnica recomendada

Frontend: React + TypeScript + Tailwind CSS.

Backend/dados: Supabase (Postgres + Auth + Row Level Security para separar o que cada papel de usuário pode ver/editar; Edge Functions para dispar os alertas de WhatsApp em horários programados).

Gráficos: Recharts (fluxo de caixa, DRE, evolução de KPIs).

Alertas WhatsApp: integração via API do WhatsApp Business (ou provedor tipo Twilio/Z-API) disparada por Edge Function/cron, para vencimentos de contas a pagar, contas a receber em atraso e recebimentos confirmados.

Identidade visual

Reaproveite a identidade já usada no CRM de consórcio da empresa, para manter consistência de marca entre as ferramentas internas:

Tema escuro premium com efeito glassmorphism.

Sistema de cores semânticas (verde = positivo/saudável, vermelho = negativo/atenção, âmbar = alerta).

Ícones 3D em CSS puro, sidebar retrátil, cards de KPI com borda em gradiente.

Tipografia DM Sans (texto) e DM Mono (números, valores monetários, códigos).

Se preferir uma identidade visual diferente para diferenciar a ferramenta financeira do CRM comercial, isso pode ser ajustado — mas o padrão sugerido é reaproveitar o design system existente para reduzir esforço e manter a marca coesa.

Módulos funcionais

1. Dashboard

Visão geral com: saldo consolidado atual, projeção de saldo para os próximos 3–6 meses (sinalizado em verde/vermelho conforme positivo ou negativo), total a pagar e a receber nos próximos 30 dias, principais KPIs do mês (receita, despesa, resultado, margem), e alertas ativos (vencimentos próximos, contas em atraso).

2. Fluxo de Caixa & Projeção

Lançamento de entradas e saídas, com categoria, data, forma de pagamento e conta/caixa de origem.

Projeção automática de saldo mês a mês, com indicação visual verde (saldo positivo projetado) ou vermelho (saldo negativo projetado).

Filtros por período, categoria e conta.

Suporte a múltiplas contas/caixas (ex: conta PJ, caixa físico) se necessário no futuro — deixar a estrutura de dados preparada, mesmo que a v1 use só uma conta.

3. Contas a Pagar & Receber

Cadastro de fornecedores e clientes vinculados a cada lançamento.

Parcelamento, recorrência (contas fixas mensais) e status (pendente, pago/recebido, atrasado).

Alertas automáticos via WhatsApp:

X dias antes do vencimento de uma conta a pagar.

No dia do vencimento de uma conta a receber.

Quando uma conta entra em atraso.

Tela de conciliação simples: marcar como pago/recebido, anexar comprovante (upload de arquivo).

4. Metas Financeiras & Orçamento

Definição de metas de faturamento mensal/trimestral.

Orçamento por categoria de despesa, com acompanhamento do realizado vs. orçado (barra de progresso, alerta quando ultrapassar o limite).

Histórico de metas atingidas/não atingidas por período.

5. DRE & Indicadores (KPIs) — novo

Demonstração de Resultado do Exercício (DRE) simplificada, gerada automaticamente a partir dos lançamentos: receita bruta, deduções, receita líquida, custos, despesas operacionais, resultado líquido.

KPIs relevantes para o negócio de consórcio: ticket médio de comissão, margem líquida, custo de aquisição por venda (se houver dados de origem do lead), evolução mês a mês.

Comparativo entre períodos (mês atual vs. mês anterior, ano atual vs. ano anterior).

6. Folha de Pagamento & Fornecedores — novo

Cadastro de colaboradores/comissionados com valor fixo e/ou variável (ex: comissão sobre venda de consórcio).

Cálculo e histórico de pagamentos por competência (mês de referência).

Cadastro de fornecedores recorrentes (separado do módulo de contas a pagar, com histórico de relacionamento e contratos/valores acordados).

Este módulo é visível apenas para o papel Administrador.

7. Notas Fiscais — novo

Registro manual de notas fiscais emitidas (número, valor, cliente, data, status: emitida/pendente/cancelada).

Vínculo opcional com o lançamento de conta a receber correspondente.

Não é necessário integrar com emissor de NF-e na v1 — o controle pode ser manual, com espaço para anexar o PDF da nota.

8. Configurações & Usuários

Gestão de usuários e permissões (somente Administrador).

Cadastro de categorias de receita/despesa.

Configuração dos gatilhos de alerta via WhatsApp (quantos dias antes do vencimento, número de WhatsApp de destino).

Modelo de dados (sugestão inicial)

Tabelas principais no Supabase:

usuarios (papel: admin | colaborador)

contas (contas/caixas da empresa)

categorias (receita/despesa)

lancamentos (entradas e saídas, vinculadas a conta, categoria, usuário)

contas_pagar / contas_receber (com status, vencimento, fornecedor/cliente)

fornecedores / clientes

metas (período, valor-alvo, categoria quando aplicável)

orcamentos (categoria, período, valor orçado)

colaboradores (dados de folha de pagamento)

pagamentos_folha (competência, colaborador, valor, status)

notas_fiscais (número, valor, status, vínculo com conta a receber)

alertas_config (regras de disparo de WhatsApp)

Requisitos não funcionais

Responsivo (uso frequente pelo celular para consultar saldo e aprovar pagamentos).

Row Level Security no Supabase garantindo que Colaborador não acesse dados de folha de pagamento nem configurações.

Exportação de relatórios (DRE, fluxo de caixa) em CSV/PDF.

Todos os valores monetários em Real (R$), formatação pt-BR.

Fora de escopo na v1

Módulo de investimentos/aplicações (presente na versão familiar, mas não priorizado aqui).

Múltiplas filiais/centros de custo.

Integração automática com emissor de nota fiscal eletrônica (NF-e) — controle manual por enquanto.

Conciliação bancária automática (importação de extrato) — pode ser lançamento manual na v1.

Observação: este prompt foi estruturado para constar como especificação completa do projeto no Lovable. Ajuste os módulos "fora de escopo" caso queira incluí-los já na primeira versão.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/130a6759-66bd-4528-88c4-40535d5228d3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
