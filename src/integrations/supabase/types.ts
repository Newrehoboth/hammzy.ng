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
      log_items: {
        Row: {
          created_at: string
          credential: string
          id: string
          product_id: string
          sold: boolean
          sold_at: string | null
          sold_to: string | null
        }
        Insert: {
          created_at?: string
          credential: string
          id?: string
          product_id: string
          sold?: boolean
          sold_at?: string | null
          sold_to?: string | null
        }
        Update: {
          created_at?: string
          credential?: string
          id?: string
          product_id?: string
          sold?: boolean
          sold_at?: string | null
          sold_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "log_products"
            referencedColumns: ["id"]
          },
        ]
      }
      log_products: {
        Row: {
          account_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          followers: string | null
          id: string
          platform: string
          preview_links: string[] | null
          price: number
          subcategory: string | null
          type: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          followers?: string | null
          id?: string
          platform: string
          preview_links?: string[] | null
          price?: number
          subcategory?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          followers?: string | null
          id?: string
          platform?: string
          preview_links?: string[] | null
          price?: number
          subcategory?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      log_purchases: {
        Row: {
          created_at: string
          credential: string
          id: string
          item_id: string | null
          platform: string | null
          price: number
          product_id: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credential: string
          id?: string
          item_id?: string | null
          platform?: string | null
          price?: number
          product_id?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credential?: string
          id?: string
          item_id?: string | null
          platform?: string | null
          price?: number
          product_id?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          country: string | null
          created_at: string
          id: string
          number: string
          price: number
          provider: string | null
          reference: string | null
          service: string | null
          status: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          number: string
          price?: number
          provider?: string | null
          reference?: string | null
          service?: string | null
          status?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          number?: string
          price?: number
          provider?: string | null
          reference?: string | null
          service?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          reference: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reference: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reference?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paystack_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          pocketfi_account_name: string | null
          pocketfi_account_number: string | null
          pocketfi_bank_name: string | null
          suspended: boolean
          updated_at: string
          username: string | null
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id: string
          pocketfi_account_name?: string | null
          pocketfi_account_number?: string | null
          pocketfi_bank_name?: string | null
          suspended?: boolean
          updated_at?: string
          username?: string | null
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          pocketfi_account_name?: string | null
          pocketfi_account_number?: string | null
          pocketfi_bank_name?: string | null
          suspended?: boolean
          updated_at?: string
          username?: string | null
          wallet_balance?: number
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
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          purpose: string
          token: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          purpose: string
          token?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
          token?: string
          used?: boolean
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
      rpc_admin_add_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      rpc_admin_get_product_stats: {
        Args: never
        Returns: {
          product_id: string
          total_count: number
          unsold_count: number
        }[]
      }
      rpc_create_reset_token: {
        Args: { p_email: string; p_expires_at: string }
        Returns: {
          profile_email: string
          token: string
        }[]
      }
      rpc_create_signup_code: {
        Args: { p_code: string; p_email: string; p_expires_at: string }
        Returns: {
          already_verified: boolean
          profile_email: string
        }[]
      }
      rpc_get_unsold_stock: {
        Args: { p_product_ids: string[] }
        Returns: {
          product_id: string
          stock_count: number
        }[]
      }
      rpc_process_webhook_payment: {
        Args: {
          p_account_number: string
          p_amount: number
          p_email: string
          p_reference: string
        }
        Returns: number
      }
      rpc_purchase_log: {
        Args: { p_product_id: string }
        Returns: {
          credential: string
          new_balance: number
          platform: string
          price: number
          type: string
        }[]
      }
      rpc_refund_order: {
        Args: { p_order_id: string; p_status: string }
        Returns: {
          new_balance: number
          refunded: boolean
          status_updated: boolean
        }[]
      }
      rpc_reset_password_with_token: {
        Args: { p_password: string; p_token: string }
        Returns: boolean
      }
      rpc_verify_and_credit_payment: {
        Args: { p_amount: number; p_reference: string; p_user_id: string }
        Returns: number
      }
      rpc_verify_signup_code: {
        Args: { p_code: string; p_email: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
