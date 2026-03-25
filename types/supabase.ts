export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      configuracao_turno: {
        Row: {
          created_at: string | null
          data: string
          funcionarios_ativos: number
          id: string
          meta_grupo: number | null
          minutos_turno: number
          produto_id: string | null
          tp_produto_min: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: string
          funcionarios_ativos: number
          id?: string
          meta_grupo?: number | null
          minutos_turno: number
          produto_id?: string | null
          tp_produto_min?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          funcionarios_ativos?: number
          id?: string
          meta_grupo?: number | null
          minutos_turno?: number
          produto_id?: string | null
          tp_produto_min?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracao_turno_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinas: {
        Row: {
          codigo: string
          created_at: string | null
          id: string
          marca: string | null
          modelo: string | null
          numero_patrimonio: string | null
          qr_code_token: string
          setor: string | null
          status: string | null
          tipo_maquina_codigo: string | null
          updated_at: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_patrimonio?: string | null
          qr_code_token?: string
          setor?: string | null
          status?: string | null
          tipo_maquina_codigo?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_patrimonio?: string | null
          qr_code_token?: string
          setor?: string | null
          status?: string | null
          tipo_maquina_codigo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maquinas_tipo_maquina_codigo_fkey"
            columns: ["tipo_maquina_codigo"]
            isOneToOne: false
            referencedRelation: "tipos_maquina"
            referencedColumns: ["codigo"]
          },
        ]
      }
      operacoes: {
        Row: {
          ativa: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          meta_dia: number | null
          meta_hora: number | null
          qr_code_token: string
          tempo_padrao_min: number
          tipo_maquina_codigo: string | null
        }
        Insert: {
          ativa?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          meta_dia?: number | null
          meta_hora?: number | null
          qr_code_token?: string
          tempo_padrao_min: number
          tipo_maquina_codigo?: string | null
        }
        Update: {
          ativa?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          meta_dia?: number | null
          meta_hora?: number | null
          qr_code_token?: string
          tempo_padrao_min?: number
          tipo_maquina_codigo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_tipo_maquina_codigo_fkey"
            columns: ["tipo_maquina_codigo"]
            isOneToOne: false
            referencedRelation: "tipos_maquina"
            referencedColumns: ["codigo"]
          },
        ]
      }
      operadores: {
        Row: {
          created_at: string | null
          foto_url: string | null
          funcao: string | null
          id: string
          matricula: string
          nome: string
          qr_code_token: string
          setor: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          foto_url?: string | null
          funcao?: string | null
          id?: string
          matricula: string
          nome: string
          qr_code_token?: string
          setor?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          foto_url?: string | null
          funcao?: string | null
          id?: string
          matricula?: string
          nome?: string
          qr_code_token?: string
          setor?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      produto_operacoes: {
        Row: {
          id: string
          operacao_id: string | null
          produto_id: string | null
          sequencia: number
        }
        Insert: {
          id?: string
          operacao_id?: string | null
          produto_id?: string | null
          sequencia: number
        }
        Update: {
          id?: string
          operacao_id?: string | null
          produto_id?: string | null
          sequencia?: number
        }
        Relationships: [
          {
            foreignKeyName: "produto_operacoes_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_operacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          imagem_url: string | null
          nome: string
          referencia: string
          tp_produto_min: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          referencia: string
          tp_produto_min?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          referencia?: string
          tp_produto_min?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      registros_producao: {
        Row: {
          created_at: string | null
          data_producao: string | null
          hora_registro: string | null
          id: string
          maquina_id: string | null
          observacao: string | null
          operacao_id: string
          operador_id: string
          produto_id: string | null
          quantidade: number
          turno: string | null
        }
        Insert: {
          created_at?: string | null
          data_producao?: string | null
          hora_registro?: string | null
          id?: string
          maquina_id?: string | null
          observacao?: string | null
          operacao_id: string
          operador_id: string
          produto_id?: string | null
          quantidade?: number
          turno?: string | null
        }
        Update: {
          created_at?: string | null
          data_producao?: string | null
          hora_registro?: string | null
          id?: string
          maquina_id?: string | null
          observacao?: string | null
          operacao_id?: string
          operador_id?: string
          produto_id?: string | null
          quantidade?: number
          turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_producao_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_producao_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "vw_status_maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_producao_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_producao_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_producao_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "vw_producao_hoje"
            referencedColumns: ["operador_id"]
          },
          {
            foreignKeyName: "registros_producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_maquina: {
        Row: {
          codigo: string
          descricao: string | null
          nome: string
        }
        Insert: {
          codigo: string
          descricao?: string | null
          nome: string
        }
        Update: {
          codigo?: string
          descricao?: string | null
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_producao_hoje: {
        Row: {
          eficiencia_pct: number | null
          minutos_produtivos: number | null
          operador_id: string | null
          operador_nome: string | null
          operador_status: string | null
          total_pecas: number | null
          total_registros: number | null
        }
        Relationships: []
      }
      vw_producao_por_hora: {
        Row: {
          hora: string | null
          total_pecas: number | null
          total_registros: number | null
        }
        Relationships: []
      }
      vw_status_maquinas: {
        Row: {
          codigo: string | null
          id: string | null
          minutos_sem_uso: number | null
          status: string | null
          tipo_nome: string | null
          ultimo_uso: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
