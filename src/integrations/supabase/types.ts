export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      alertas_config: {
        Row: {
          alerta_atraso: boolean
          alerta_pagar: boolean
          alerta_receber: boolean
          dias_antes_vencimento: number
          id: string
          updated_at: string
          whatsapp_destino: string | null
        }
        Insert: {
          alerta_atraso?: boolean
          alerta_pagar?: boolean
          alerta_receber?: boolean
          dias_antes_vencimento?: number
          id?: string
          updated_at?: string
          whatsapp_destino?: string | null
        }
        Update: {
          alerta_atraso?: boolean
          alerta_pagar?: boolean
          alerta_receber?: boolean
          dias_antes_vencimento?: number
          id?: string
          updated_at?: string
          whatsapp_destino?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          created_at: string
          grupo_dre: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          created_at?: string
          grupo_dre?: string
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          created_at?: string
          grupo_dre?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          contato: string | null
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
        }
        Insert: {
          contato?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome: string
        }
        Update: {
          contato?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          id: string
          nome: string
          percentual_comissao: number
          salario_fixo: number
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          id?: string
          nome: string
          percentual_comissao?: number
          salario_fixo?: number
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          id?: string
          nome?: string
          percentual_comissao?: number
          salario_fixo?: number
        }
        Relationships: []
      }
      contas: {
        Row: {
          ativa: boolean
          created_at: string
          id: string
          nome: string
          saldo_inicial: number
          tipo: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          id?: string
          nome: string
          saldo_inicial?: number
          tipo?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          id?: string
          nome?: string
          saldo_inicial?: number
          tipo?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          categoria_id: string | null
          comprovante_url: string | null
          conta_id: string | null
          created_at: string
          descricao: string
          fornecedor_id: string | null
          id: string
          pago_em: string | null
          parcela: number
          recorrente: boolean
          status: string
          total_parcelas: number
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          categoria_id?: string | null
          comprovante_url?: string | null
          conta_id?: string | null
          created_at?: string
          descricao: string
          fornecedor_id?: string | null
          id?: string
          pago_em?: string | null
          parcela?: number
          recorrente?: boolean
          status?: string
          total_parcelas?: number
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          categoria_id?: string | null
          comprovante_url?: string | null
          conta_id?: string | null
          created_at?: string
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          pago_em?: string | null
          parcela?: number
          recorrente?: boolean
          status?: string
          total_parcelas?: number
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          categoria_id: string | null
          cliente_id: string | null
          comprovante_url: string | null
          conta_id: string | null
          created_at: string
          descricao: string
          id: string
          parcela: number
          recebido_em: string | null
          recorrente: boolean
          status: string
          total_parcelas: number
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          categoria_id?: string | null
          cliente_id?: string | null
          comprovante_url?: string | null
          conta_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          parcela?: number
          recebido_em?: string | null
          recorrente?: boolean
          status?: string
          total_parcelas?: number
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          categoria_id?: string | null
          cliente_id?: string | null
          comprovante_url?: string | null
          conta_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          parcela?: number
          recebido_em?: string | null
          recorrente?: boolean
          status?: string
          total_parcelas?: number
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          contato: string | null
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          valor_contratado: number | null
        }
        Insert: {
          contato?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          valor_contratado?: number | null
        }
        Update: {
          contato?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          valor_contratado?: number | null
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          categoria_id: string | null
          conta_id: string | null
          created_at: string
          criado_por: string | null
          data: string
          descricao: string
          forma_pagamento: string
          id: string
          observacoes: string | null
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          conta_id?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          conta_id?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          categoria_id: string | null
          created_at: string
          id: string
          periodo_fim: string
          periodo_inicio: string
          titulo: string
          valor_alvo: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          id?: string
          periodo_fim: string
          periodo_inicio: string
          titulo: string
          valor_alvo: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          id?: string
          periodo_fim?: string
          periodo_inicio?: string
          titulo?: string
          valor_alvo?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          arquivo_url: string | null
          cliente_id: string | null
          conta_receber_id: string | null
          created_at: string
          data_emissao: string
          id: string
          numero: string
          status: string
          valor: number
        }
        Insert: {
          arquivo_url?: string | null
          cliente_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_emissao?: string
          id?: string
          numero: string
          status?: string
          valor: number
        }
        Update: {
          arquivo_url?: string | null
          cliente_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_emissao?: string
          id?: string
          numero?: string
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          categoria_id: string
          competencia: string
          created_at: string
          id: string
          valor_orcado: number
        }
        Insert: {
          categoria_id: string
          competencia: string
          created_at?: string
          id?: string
          valor_orcado: number
        }
        Update: {
          categoria_id?: string
          competencia?: string
          created_at?: string
          id?: string
          valor_orcado?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_folha: {
        Row: {
          colaborador_id: string
          competencia: string
          created_at: string
          id: string
          pago_em: string | null
          status: string
          valor_fixo: number
          valor_variavel: number
        }
        Insert: {
          colaborador_id: string
          competencia: string
          created_at?: string
          id?: string
          pago_em?: string | null
          status?: string
          valor_fixo?: number
          valor_variavel?: number
        }
        Update: {
          colaborador_id?: string
          competencia?: string
          created_at?: string
          id?: string
          pago_em?: string | null
          status?: string
          valor_fixo?: number
          valor_variavel?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_folha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          nome?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "colaborador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "colaborador"],
    },
  },
} as const
