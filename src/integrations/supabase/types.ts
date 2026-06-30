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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      pubg_accounts: {
        Row: {
          cards: number
          created_at: string
          email_level: number
          gmail: string
          id: string
          mix_pop: number
          uc: number
          updated_at: string
        }
        Insert: {
          cards?: number
          created_at?: string
          email_level?: number
          gmail: string
          id?: string
          mix_pop?: number
          uc?: number
          updated_at?: string
        }
        Update: {
          cards?: number
          created_at?: string
          email_level?: number
          gmail?: string
          id?: string
          mix_pop?: number
          uc?: number
          updated_at?: string
        }
        Relationships: []
      }
      pubg_event_account_popularity: {
        Row: {
          account_id: string
          created_at: string
          event_id: string
          global_popularity: number
          global_spent_popularity: number
          id: string
          kr_popularity: number
          kr_spent_popularity: number
          spent_popularity: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          event_id: string
          global_popularity?: number
          global_spent_popularity?: number
          id?: string
          kr_popularity?: number
          kr_spent_popularity?: number
          spent_popularity?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          event_id?: string
          global_popularity?: number
          global_spent_popularity?: number
          id?: string
          kr_popularity?: number
          kr_spent_popularity?: number
          spent_popularity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pubg_event_account_popularity_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "pubg_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pubg_event_account_popularity_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "pubg_events"
            referencedColumns: ["id"]
          },
        ]
      }
      pubg_events: {
        Row: {
          created_at: string
          fixed_popularity: number
          id: string
          mode: string
          name: string
          reward_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fixed_popularity?: number
          id?: string
          mode?: string
          name: string
          reward_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fixed_popularity?: number
          id?: string
          mode?: string
          name?: string
          reward_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      pubg_sales_entries: {
        Row: {
          amount: number
          created_at: string
          entry_type: string
          gmail: string
          id: string
          note: string
          sold_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          entry_type: string
          gmail: string
          id?: string
          note?: string
          sold_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_type?: string
          gmail?: string
          id?: string
          note?: string
          sold_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
