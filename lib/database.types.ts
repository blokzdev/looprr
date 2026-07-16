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
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          detail: Json | null
          id: string
          run_id: string | null
          ticket_id: string | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          detail?: Json | null
          id?: string
          run_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          detail?: Json | null
          id?: string
          run_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "routine_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      directives: {
        Row: {
          action: Database["public"]["Enums"]["directive_action"] | null
          addressed_at: string | null
          addressed_by: string | null
          author: string | null
          created_at: string
          id: string
          merge_after: boolean
          note: string | null
          options: Json | null
          status: Database["public"]["Enums"]["directive_status"]
          ticket_id: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["directive_action"] | null
          addressed_at?: string | null
          addressed_by?: string | null
          author?: string | null
          created_at?: string
          id?: string
          merge_after?: boolean
          note?: string | null
          options?: Json | null
          status?: Database["public"]["Enums"]["directive_status"]
          ticket_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["directive_action"] | null
          addressed_at?: string | null
          addressed_by?: string | null
          author?: string | null
          created_at?: string
          id?: string
          merge_after?: boolean
          note?: string | null
          options?: Json | null
          status?: Database["public"]["Enums"]["directive_status"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directives_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      revisions: {
        Row: {
          created_at: string
          created_by: string | null
          doc: Json
          id: string
          note: string | null
          schema_version: number
          summary: string | null
          ticket_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc: Json
          id?: string
          note?: string | null
          schema_version: number
          summary?: string | null
          ticket_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc?: Json
          id?: string
          note?: string | null
          schema_version?: number
          summary?: string | null
          ticket_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_runs: {
        Row: {
          created_at: string
          dispatched_by: string | null
          ended_at: string | null
          error: string | null
          id: string
          session_id: string | null
          session_url: string | null
          started_at: string
          status: string
          text_context: string | null
          ticket_id: string | null
          worker: string
        }
        Insert: {
          created_at?: string
          dispatched_by?: string | null
          ended_at?: string | null
          error?: string | null
          id?: string
          session_id?: string | null
          session_url?: string | null
          started_at?: string
          status?: string
          text_context?: string | null
          ticket_id?: string | null
          worker: string
        }
        Update: {
          created_at?: string
          dispatched_by?: string | null
          ended_at?: string | null
          error?: string | null
          id?: string
          session_id?: string | null
          session_url?: string | null
          started_at?: string
          status?: string
          text_context?: string | null
          ticket_id?: string | null
          worker?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_runs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_upstream_refs: {
        Row: {
          note: string | null
          role: Database["public"]["Enums"]["upstream_role"]
          ticket_id: string
          upstream_ref_id: string
        }
        Insert: {
          note?: string | null
          role?: Database["public"]["Enums"]["upstream_role"]
          ticket_id: string
          upstream_ref_id: string
        }
        Update: {
          note?: string | null
          role?: Database["public"]["Enums"]["upstream_role"]
          ticket_id?: string
          upstream_ref_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_upstream_refs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_upstream_refs_upstream_ref_id_fkey"
            columns: ["upstream_ref_id"]
            isOneToOne: false
            referencedRelation: "upstream_refs"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          branch: string | null
          claimed_by: string | null
          created_at: string
          deleted_at: string | null
          doc: Json
          id: string
          last_worker: string | null
          merge_after: boolean
          pr_number: number | null
          repo: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          schema_version: number
          slug: string
          status: Database["public"]["Enums"]["ticket_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          claimed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          doc: Json
          id?: string
          last_worker?: string | null
          merge_after?: boolean
          pr_number?: number | null
          repo?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_version?: number
          slug: string
          status?: Database["public"]["Enums"]["ticket_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          claimed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          doc?: Json
          id?: string
          last_worker?: string | null
          merge_after?: boolean
          pr_number?: number | null
          repo?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_version?: number
          slug?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      upstream_refs: {
        Row: {
          detail: string | null
          id: string
          kind: Database["public"]["Enums"]["upstream_kind"]
          raw_meta: Json | null
          retrieved_at: string
          title: string | null
          uid: string
          url: string | null
        }
        Insert: {
          detail?: string | null
          id?: string
          kind: Database["public"]["Enums"]["upstream_kind"]
          raw_meta?: Json | null
          retrieved_at?: string
          title?: string | null
          uid: string
          url?: string | null
        }
        Update: {
          detail?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["upstream_kind"]
          raw_meta?: Json | null
          retrieved_at?: string
          title?: string | null
          uid?: string
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      rejected_upstream_keys: {
        Row: {
          kind: Database["public"]["Enums"]["upstream_kind"] | null
          uid: string | null
        }
        Relationships: []
      }
      seen_upstream_keys: {
        Row: {
          kind: Database["public"]["Enums"]["upstream_kind"] | null
          uid: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      directive_action:
        | "revise"
        | "split"
        | "reprioritize"
        | "reassign"
        | "block"
        | "archive"
      directive_status: "open" | "addressed" | "dismissed"
      ticket_status:
        | "draft"
        | "planned"
        | "claimed"
        | "in_progress"
        | "in_review"
        | "changes_requested"
        | "approved"
        | "merged"
        | "rejected"
        | "archived"
      upstream_kind:
        | "client_request"
        | "spec"
        | "issue"
        | "design_doc"
        | "parent_ticket"
      upstream_role: "primary" | "supporting"
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
      directive_action: [
        "revise",
        "split",
        "reprioritize",
        "reassign",
        "block",
        "archive",
      ],
      directive_status: ["open", "addressed", "dismissed"],
      ticket_status: [
        "draft",
        "planned",
        "claimed",
        "in_progress",
        "in_review",
        "changes_requested",
        "approved",
        "merged",
        "rejected",
        "archived",
      ],
      upstream_kind: [
        "client_request",
        "spec",
        "issue",
        "design_doc",
        "parent_ticket",
      ],
      upstream_role: ["primary", "supporting"],
    },
  },
} as const
