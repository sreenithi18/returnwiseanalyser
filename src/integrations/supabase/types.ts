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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      rw_order_lines: {
        Row: {
          category: string
          city: string | null
          dedupe_key: string
          discount: number
          flag: string | null
          id: number
          order_date: string
          order_ref: string
          payment_type: string | null
          platform: string
          price: number
          product_id: string
          product_name: string
          quantity: number
          reason_category: string | null
          return_date: string | null
          return_reason: string | null
          returned: boolean
          returned_qty: number
          session_id: string
          shipping_method: string | null
        }
        Insert: {
          category: string
          city?: string | null
          dedupe_key: string
          discount?: number
          flag?: string | null
          id?: number
          order_date: string
          order_ref: string
          payment_type?: string | null
          platform: string
          price: number
          product_id: string
          product_name: string
          quantity: number
          reason_category?: string | null
          return_date?: string | null
          return_reason?: string | null
          returned?: boolean
          returned_qty?: number
          session_id: string
          shipping_method?: string | null
        }
        Update: {
          category?: string
          city?: string | null
          dedupe_key?: string
          discount?: number
          flag?: string | null
          id?: number
          order_date?: string
          order_ref?: string
          payment_type?: string | null
          platform?: string
          price?: number
          product_id?: string
          product_name?: string
          quantity?: number
          reason_category?: string | null
          return_date?: string | null
          return_reason?: string | null
          returned?: boolean
          returned_qty?: number
          session_id?: string
          shipping_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rw_order_lines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rw_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_reason_cache: {
        Row: {
          confidence: string
          created_at: string
          id: number
          issue_label: string
          reason_key: string
          session_id: string
          theme: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          id?: number
          issue_label: string
          reason_key: string
          session_id: string
          theme: string
        }
        Update: {
          confidence?: string
          created_at?: string
          id?: number
          issue_label?: string
          reason_key?: string
          session_id?: string
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_reason_cache_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rw_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_rejected_rows: {
        Row: {
          file_name: string
          id: number
          kind: string
          reason: string
          row_number: number
          session_id: string
        }
        Insert: {
          file_name: string
          id?: number
          kind: string
          reason: string
          row_number: number
          session_id: string
        }
        Update: {
          file_name?: string
          id?: number
          kind?: string
          reason?: string
          row_number?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_rejected_rows_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rw_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_reports: {
        Row: {
          created_at: string
          id: string
          pdf_base64: string
          session_id: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          pdf_base64: string
          session_id: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          pdf_base64?: string
          session_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rw_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_sessions: {
        Row: {
          confirmed: boolean
          created_at: string
          expires_at: string
          file_count: number
          id: string
          is_demo: boolean
          stats: Json
          token_hash: string
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          expires_at?: string
          file_count?: number
          id?: string
          is_demo?: boolean
          stats?: Json
          token_hash: string
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          expires_at?: string
          file_count?: number
          id?: string
          is_demo?: boolean
          stats?: Json
          token_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rw_purge_expired: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
