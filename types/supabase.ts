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
      configuracao_turno_blocos: {
        Row: {
          configuracao_turno_id: string
          created_at: string | null
          descricao_bloco: string
          encerrado_em: string | null
          funcionarios_ativos: number
          id: string
          iniciado_em: string | null
          meta_grupo: number
          minutos_planejados: number
          origem_tp: string
          produto_id: string | null
          sequencia: number
          status: string
          tp_produto_min: number
          updated_at: string | null
        }
        Insert: {
          configuracao_turno_id: string
          created_at?: string | null
          descricao_bloco: string
          encerrado_em?: string | null
          funcionarios_ativos: number
          id?: string
          iniciado_em?: string | null
          meta_grupo: number
          minutos_planejados: number
          origem_tp: string
          produto_id?: string | null
          sequencia: number
          status: string
          tp_produto_min: number
          updated_at?: string | null
        }
        Update: {
          configuracao_turno_id?: string
          created_at?: string | null
          descricao_bloco?: string
          encerrado_em?: string | null
          funcionarios_ativos?: number
          id?: string
          iniciado_em?: string | null
          meta_grupo?: number
          minutos_planejados?: number
          origem_tp?: string
          produto_id?: string | null
          sequencia?: number
          status?: string
          tp_produto_min?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracao_turno_blocos_configuracao_turno_id_fkey"
            columns: ["configuracao_turno_id"]
            isOneToOne: false
            referencedRelation: "configuracao_turno"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracao_turno_blocos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_mensais: {
        Row: {
          competencia: string
          created_at: string | null
          dias_produtivos: number
          id: string
          meta_pecas: number
          observacao: string | null
          updated_at: string | null
        }
        Insert: {
          competencia: string
          created_at?: string | null
          dias_produtivos: number
          id?: string
          meta_pecas: number
          observacao?: string | null
          updated_at?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string | null
          dias_produtivos?: number
          id?: string
          meta_pecas?: number
          observacao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      turno_operadores: {
        Row: {
          created_at: string | null
          id: string
          operador_id: string
          setor_id: string | null
          turno_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          operador_id: string
          setor_id?: string | null
          turno_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          operador_id?: string
          setor_id?: string | null
          turno_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turno_operadores_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_operadores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_operadores_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      turno_ops: {
        Row: {
          created_at: string | null
          encerrado_em: string | null
          id: string
          iniciado_em: string | null
          numero_op: string
          produto_id: string
          quantidade_planejada: number
          quantidade_planejada_original: number
          quantidade_planejada_remanescente: number
          quantidade_realizada: number
          status: string
          turno_op_origem_id: string | null
          turno_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          numero_op: string
          produto_id: string
          quantidade_planejada: number
          quantidade_planejada_original?: number
          quantidade_planejada_remanescente?: number
          quantidade_realizada?: number
          status?: string
          turno_op_origem_id?: string | null
          turno_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          numero_op?: string
          produto_id?: string
          quantidade_planejada?: number
          quantidade_planejada_original?: number
          quantidade_planejada_remanescente?: number
          quantidade_realizada?: number
          status?: string
          turno_op_origem_id?: string | null
          turno_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turno_ops_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_ops_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_ops_turno_op_origem_id_fkey"
            columns: ["turno_op_origem_id"]
            isOneToOne: false
            referencedRelation: "turno_ops"
            referencedColumns: ["id"]
          },
        ]
      }
      turno_setor_demandas: {
        Row: {
          created_at: string | null
          encerrado_em: string | null
          id: string
          iniciado_em: string | null
          produto_id: string
          quantidade_planejada: number
          quantidade_realizada: number
          setor_id: string
          status: string
          turno_id: string
          turno_op_id: string
          turno_setor_id: string
          turno_setor_op_legacy_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          produto_id: string
          quantidade_planejada: number
          quantidade_realizada?: number
          setor_id: string
          status?: string
          turno_id: string
          turno_op_id: string
          turno_setor_id: string
          turno_setor_op_legacy_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          produto_id?: string
          quantidade_planejada?: number
          quantidade_realizada?: number
          setor_id?: string
          status?: string
          turno_id?: string
          turno_op_id?: string
          turno_setor_id?: string
          turno_setor_op_legacy_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turno_setor_demandas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_demandas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_demandas_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_demandas_turno_op_id_fkey"
            columns: ["turno_op_id"]
            isOneToOne: false
            referencedRelation: "turno_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_demandas_turno_setor_id_fkey"
            columns: ["turno_setor_id"]
            isOneToOne: false
            referencedRelation: "turno_setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_demandas_turno_setor_op_legacy_id_fkey"
            columns: ["turno_setor_op_legacy_id"]
            isOneToOne: true
            referencedRelation: "turno_setor_ops"
            referencedColumns: ["id"]
          },
        ]
      }
      turno_setores: {
        Row: {
          created_at: string | null
          encerrado_em: string | null
          id: string
          iniciado_em: string | null
          qr_code_token: string
          quantidade_planejada: number
          quantidade_realizada: number
          setor_id: string
          status: string
          turno_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          qr_code_token?: string
          quantidade_planejada?: number
          quantidade_realizada?: number
          setor_id: string
          status?: string
          turno_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          qr_code_token?: string
          quantidade_planejada?: number
          quantidade_realizada?: number
          setor_id?: string
          status?: string
          turno_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turno_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setores_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      turno_setor_ops: {
        Row: {
          created_at: string | null
          encerrado_em: string | null
          id: string
          iniciado_em: string | null
          qr_code_token: string
          quantidade_planejada: number
          quantidade_realizada: number
          setor_id: string
          status: string
          turno_id: string
          turno_op_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          qr_code_token?: string
          quantidade_planejada: number
          quantidade_realizada?: number
          setor_id: string
          status?: string
          turno_id: string
          turno_op_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          qr_code_token?: string
          quantidade_planejada?: number
          quantidade_realizada?: number
          setor_id?: string
          status?: string
          turno_id?: string
          turno_op_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turno_setor_ops_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_ops_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_ops_turno_op_id_fkey"
            columns: ["turno_op_id"]
            isOneToOne: false
            referencedRelation: "turno_ops"
            referencedColumns: ["id"]
          },
        ]
      }
      turno_setor_operacoes: {
        Row: {
          created_at: string | null
          encerrado_em: string | null
          id: string
          iniciado_em: string | null
          operacao_id: string
          produto_operacao_id: string
          quantidade_planejada: number
          quantidade_realizada: number
          sequencia: number
          setor_id: string
          status: string
          tempo_padrao_min_snapshot: number
          turno_id: string
          turno_setor_demanda_id: string | null
          turno_setor_id: string | null
          turno_op_id: string
          turno_setor_op_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          operacao_id: string
          produto_operacao_id: string
          quantidade_planejada: number
          quantidade_realizada?: number
          sequencia: number
          setor_id: string
          status?: string
          tempo_padrao_min_snapshot: number
          turno_id: string
          turno_setor_demanda_id?: string | null
          turno_setor_id?: string | null
          turno_op_id: string
          turno_setor_op_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string | null
          operacao_id?: string
          produto_operacao_id?: string
          quantidade_planejada?: number
          quantidade_realizada?: number
          sequencia?: number
          setor_id?: string
          status?: string
          tempo_padrao_min_snapshot?: number
          turno_id?: string
          turno_setor_demanda_id?: string | null
          turno_setor_id?: string | null
          turno_op_id?: string
          turno_setor_op_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turno_setor_operacoes_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_operacoes_produto_operacao_id_fkey"
            columns: ["produto_operacao_id"]
            isOneToOne: false
            referencedRelation: "produto_operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_operacoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_operacoes_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_operacoes_turno_setor_demanda_id_fkey"
            columns: ["turno_setor_demanda_id"]
            isOneToOne: false
            referencedRelation: "turno_setor_demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_operacoes_turno_setor_id_fkey"
            columns: ["turno_setor_id"]
            isOneToOne: false
            referencedRelation: "turno_setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_operacoes_turno_op_id_fkey"
            columns: ["turno_op_id"]
            isOneToOne: false
            referencedRelation: "turno_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_setor_operacoes_turno_setor_op_id_fkey"
            columns: ["turno_setor_op_id"]
            isOneToOne: false
            referencedRelation: "turno_setor_ops"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          created_at: string | null
          encerrado_em: string | null
          id: string
          iniciado_em: string
          minutos_turno: number
          observacao: string | null
          operadores_disponiveis: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string
          minutos_turno: number
          observacao?: string | null
          operadores_disponiveis: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string
          minutos_turno?: number
          observacao?: string | null
          operadores_disponiveis?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          setor_id: string | null
          tempo_padrao_min: number
          tipo_maquina_codigo: string | null
        }
        Insert: {
          ativa?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao: string
          id?: string
          meta_dia?: number | null
          meta_hora?: number | null
          qr_code_token?: string
          setor_id?: string | null
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
          setor_id?: string | null
          tempo_padrao_min?: number
          tipo_maquina_codigo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
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
          carga_horaria_min: number | null
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
          carga_horaria_min?: number | null
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
          carga_horaria_min?: number | null
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
      usuarios_sistema: {
        Row: {
          ativo: boolean | null
          auth_user_id: string
          created_at: string | null
          email: string
          id: string
          nome: string
          papel: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          auth_user_id: string
          created_at?: string | null
          email: string
          id?: string
          nome: string
          papel: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          auth_user_id?: string
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          papel?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      setores: {
        Row: {
          ativo: boolean | null
          codigo: number
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo?: number
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: number
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      registros_producao: {
        Row: {
          configuracao_turno_bloco_id: string | null
          created_at: string | null
          data_producao: string | null
          hora_registro: string | null
          id: string
          maquina_id: string | null
          observacao: string | null
          operacao_id: string | null
          operador_id: string
          origem_apontamento: string | null
          produto_id: string | null
          quantidade: number
          turno_op_id: string | null
          turno_setor_demanda_id: string | null
          turno_setor_operacao_id: string | null
          turno_setor_id: string | null
          turno_setor_op_id: string | null
          turno: string | null
          usuario_sistema_id: string | null
        }
        Insert: {
          configuracao_turno_bloco_id?: string | null
          created_at?: string | null
          data_producao?: string | null
          hora_registro?: string | null
          id?: string
          maquina_id?: string | null
          observacao?: string | null
          operacao_id?: string | null
          operador_id: string
          origem_apontamento?: string | null
          produto_id?: string | null
          quantidade?: number
          turno_op_id?: string | null
          turno_setor_demanda_id?: string | null
          turno_setor_operacao_id?: string | null
          turno_setor_id?: string | null
          turno_setor_op_id?: string | null
          turno?: string | null
          usuario_sistema_id?: string | null
        }
        Update: {
          configuracao_turno_bloco_id?: string | null
          created_at?: string | null
          data_producao?: string | null
          hora_registro?: string | null
          id?: string
          maquina_id?: string | null
          observacao?: string | null
          operacao_id?: string | null
          operador_id?: string
          origem_apontamento?: string | null
          produto_id?: string | null
          quantidade?: number
          turno_op_id?: string | null
          turno_setor_demanda_id?: string | null
          turno_setor_operacao_id?: string | null
          turno_setor_id?: string | null
          turno_setor_op_id?: string | null
          turno?: string | null
          usuario_sistema_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_producao_configuracao_turno_bloco_id_fkey"
            columns: ["configuracao_turno_bloco_id"]
            isOneToOne: false
            referencedRelation: "configuracao_turno_blocos"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "registros_producao_turno_op_id_fkey"
            columns: ["turno_op_id"]
            isOneToOne: false
            referencedRelation: "turno_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_producao_turno_setor_demanda_id_fkey"
            columns: ["turno_setor_demanda_id"]
            isOneToOne: false
            referencedRelation: "turno_setor_demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_producao_turno_setor_operacao_id_fkey"
            columns: ["turno_setor_operacao_id"]
            isOneToOne: false
            referencedRelation: "turno_setor_operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_producao_turno_setor_id_fkey"
            columns: ["turno_setor_id"]
            isOneToOne: false
            referencedRelation: "turno_setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_producao_turno_setor_op_id_fkey"
            columns: ["turno_setor_op_id"]
            isOneToOne: false
            referencedRelation: "turno_setor_ops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_producao_usuario_sistema_id_fkey"
            columns: ["usuario_sistema_id"]
            isOneToOne: false
            referencedRelation: "usuarios_sistema"
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
          descricao: string | null
          id: string | null
          minutos_sem_uso: number | null
          status: string | null
          ultimo_uso: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      buscar_turno_setor_op_scanner: {
        Args: {
          p_qr_code_token: string
        }
        Returns: {
          id: string
          numero_op: string
          produto_id: string
          produto_nome: string
          produto_referencia: string
          qr_code_token: string
          quantidade_planejada: number
          quantidade_realizada: number
          saldo_restante: number
          setor_id: string
          setor_nome: string
          status: string
          turno_id: string
          turno_iniciado_em: string
          turno_op_id: string
        }[]
      }
      registrar_producao_turno_setor_op: {
        Args: {
          p_maquina_id?: string | null
          p_operador_id: string
          p_quantidade: number
          p_turno_setor_op_id: string
        }
        Returns: {
          quantidade_realizada: number
          quantidade_registrada: number
          registro_id: string
          saldo_restante: number
          status_turno_setor_op: string
          turno_setor_op_id: string
        }[]
      }
      registrar_producao_turno_setor_operacao: {
        Args: {
          p_maquina_id?: string | null
          p_observacao?: string | null
          p_operador_id: string
          p_origem_apontamento?: string
          p_quantidade: number
          p_turno_setor_operacao_id: string
          p_usuario_sistema_id?: string | null
        }
        Returns: {
          quantidade_realizada_operacao: number
          quantidade_realizada_secao: number
          quantidade_realizada_turno_op: number
          quantidade_registrada: number
          registro_id: string
          saldo_restante_operacao: number
          saldo_restante_secao: number
          status_turno_op: string
          status_turno_setor_op: string
          status_turno_setor_operacao: string
          turno_setor_operacao_id: string
        }[]
      }
      registrar_producao_supervisor_em_lote: {
        Args: {
          p_lancamentos: Json
          p_turno_setor_op_id: string
          p_usuario_sistema_id: string
        }
        Returns: {
          quantidade_realizada_secao: number
          quantidade_realizada_turno_op: number
          saldo_restante_secao: number
          status_turno_op: string
          status_turno_setor_op: string
          total_lancamentos: number
        }[]
      }
      sincronizar_andamento_turno_setor_op: {
        Args: {
          p_turno_setor_op_id: string
        }
        Returns: {
          encerrado_em: string
          quantidade_realizada: number
          status: string
          turno_setor_op_id: string
        }[]
      }
      sincronizar_turno_setor_operacoes: {
        Args: {
          p_turno_setor_op_id: string
        }
        Returns: number
      }
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
