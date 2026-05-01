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
      accounts: {
        Row: {
          active_users: number
          arr: number
          assigned_csm_id: string | null
          contact_email: string
          contact_name: string
          created_at: string
          days_since_signup: number
          first_task_created: boolean
          id: string
          invites_sent: number
          last_activity_days: number
          last_outreach_sent_at: string | null
          last_outreach_sent_by: string | null
          minutes_to_first_task: number | null
          name: string
          outreach_count: number
          plan: string
          quote_source: string | null
          quote_text: string | null
          risk: Database["public"]["Enums"]["risk_level"]
          signup_date: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          active_users?: number
          arr?: number
          assigned_csm_id?: string | null
          contact_email: string
          contact_name: string
          created_at?: string
          days_since_signup?: number
          first_task_created?: boolean
          id?: string
          invites_sent?: number
          last_activity_days?: number
          last_outreach_sent_at?: string | null
          last_outreach_sent_by?: string | null
          minutes_to_first_task?: number | null
          name: string
          outreach_count?: number
          plan?: string
          quote_source?: string | null
          quote_text?: string | null
          risk?: Database["public"]["Enums"]["risk_level"]
          signup_date: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          active_users?: number
          arr?: number
          assigned_csm_id?: string | null
          contact_email?: string
          contact_name?: string
          created_at?: string
          days_since_signup?: number
          first_task_created?: boolean
          id?: string
          invites_sent?: number
          last_activity_days?: number
          last_outreach_sent_at?: string | null
          last_outreach_sent_by?: string | null
          minutes_to_first_task?: number | null
          name?: string
          outreach_count?: number
          plan?: string
          quote_source?: string | null
          quote_text?: string | null
          risk?: Database["public"]["Enums"]["risk_level"]
          signup_date?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_assigned_csm_id_fkey"
            columns: ["assigned_csm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          account_id: string | null
          account_name: string
          action: string
          created_at: string
          id: string
          note: string | null
          type: Database["public"]["Enums"]["activity_action_type"]
          user_label: string
        }
        Insert: {
          account_id?: string | null
          account_name: string
          action: string
          created_at?: string
          id?: string
          note?: string | null
          type: Database["public"]["Enums"]["activity_action_type"]
          user_label?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string
          action?: string
          created_at?: string
          id?: string
          note?: string | null
          type?: Database["public"]["Enums"]["activity_action_type"]
          user_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmarks: {
        Row: {
          comparator_pct: number | null
          computed_at: string
          copy_template: string
          id: string
          key: string
          sample_size: number
          value_pct: number
        }
        Insert: {
          comparator_pct?: number | null
          computed_at?: string
          copy_template: string
          id?: string
          key: string
          sample_size?: number
          value_pct: number
        }
        Update: {
          comparator_pct?: number | null
          computed_at?: string
          copy_template?: string
          id?: string
          key?: string
          sample_size?: number
          value_pct?: number
        }
        Relationships: []
      }
      events: {
        Row: {
          account_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      outreach_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_templates_user_id_fkey"
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
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          daily_digest: boolean
          email_alerts_high_risk: boolean
          risk_thresholds: Json
          show_guided_tour_buttons: boolean
          slack_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_digest?: boolean
          email_alerts_high_risk?: boolean
          risk_thresholds?: Json
          show_guided_tour_buttons?: boolean
          slack_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_digest?: boolean
          email_alerts_high_risk?: boolean
          risk_thresholds?: Json
          show_guided_tour_buttons?: boolean
          slack_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      account_status:
        | "needs_action"
        | "contacted"
        | "reviewed"
        | "snoozed"
        | "follow_up_needed"
      activity_action_type:
        | "send_outreach"
        | "prompt_invite"
        | "mark_reviewed"
        | "snooze"
        | "save_outcome"
        | "seed"
      app_role: "csm" | "admin"
      event_type:
        | "session_start"
        | "action_committed"
        | "outreach_send_attempt"
        | "outreach_send_success"
        | "outreach_send_failure"
        | "outreach_retry"
        | "ai_suggestion_used"
        | "ai_suggestion_edited"
        | "ai_suggestion_discarded"
        | "filter_applied"
        | "filter_zero_results"
        | "next_account_prompt_shown"
        | "next_account_accepted"
        | "activity_log_write_failed"
        | "guided_flow_started"
        | "highest_risk_cta_clicked"
        | "account_detail_opened_from_guided_flow"
        | "outreach_modal_opened_from_guided_flow"
        | "outreach_sent_from_guided_flow"
        | "guided_flow_exited"
      risk_level: "high" | "medium" | "low"
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
      account_status: [
        "needs_action",
        "contacted",
        "reviewed",
        "snoozed",
        "follow_up_needed",
      ],
      activity_action_type: [
        "send_outreach",
        "prompt_invite",
        "mark_reviewed",
        "snooze",
        "save_outcome",
        "seed",
      ],
      app_role: ["csm", "admin"],
      event_type: [
        "session_start",
        "action_committed",
        "outreach_send_attempt",
        "outreach_send_success",
        "outreach_send_failure",
        "outreach_retry",
        "ai_suggestion_used",
        "ai_suggestion_edited",
        "ai_suggestion_discarded",
        "filter_applied",
        "filter_zero_results",
        "next_account_prompt_shown",
        "next_account_accepted",
        "activity_log_write_failed",
        "guided_flow_started",
        "highest_risk_cta_clicked",
        "account_detail_opened_from_guided_flow",
        "outreach_modal_opened_from_guided_flow",
        "outreach_sent_from_guided_flow",
        "guided_flow_exited",
      ],
      risk_level: ["high", "medium", "low"],
    },
  },
} as const
