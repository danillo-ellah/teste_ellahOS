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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_budget_estimates: {
        Row: {
          breakdown: Json
          confidence: string
          created_at: string
          duration_ms: number | null
          id: string
          input_hash: string
          input_tokens: number
          job_id: string
          model_used: string
          output_tokens: number
          override_context: Json | null
          reasoning: string | null
          requested_by: string
          similar_jobs: Json | null
          suggested_total: number | null
          tenant_id: string
          warnings: Json | null
        }
        Insert: {
          breakdown?: Json
          confidence?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          input_hash: string
          input_tokens?: number
          job_id: string
          model_used?: string
          output_tokens?: number
          override_context?: Json | null
          reasoning?: string | null
          requested_by: string
          similar_jobs?: Json | null
          suggested_total?: number | null
          tenant_id: string
          warnings?: Json | null
        }
        Update: {
          breakdown?: Json
          confidence?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          input_hash?: string
          input_tokens?: number
          job_id?: string
          model_used?: string
          output_tokens?: number
          override_context?: Json | null
          reasoning?: string | null
          requested_by?: string
          similar_jobs?: Json | null
          suggested_total?: number | null
          tenant_id?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_budget_estimates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_budget_estimates_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_budget_estimates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          duration_ms: number | null
          id: string
          input_tokens: number | null
          model_used: string | null
          output_tokens: number | null
          role: string
          sources: Json | null
          tenant_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          input_tokens?: number | null
          model_used?: string | null
          output_tokens?: number | null
          role: string
          sources?: Json | null
          tenant_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          input_tokens?: number | null
          model_used?: string | null
          output_tokens?: number | null
          role?: string
          sources?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversation_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          job_id: string | null
          last_message_at: string | null
          message_count: number
          model_used: string
          tenant_id: string
          title: string | null
          total_input_tokens: number
          total_output_tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          message_count?: number
          model_used?: string
          tenant_id: string
          title?: string | null
          total_input_tokens?: number
          total_output_tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          message_count?: number
          model_used?: string
          tenant_id?: string
          title?: string | null
          total_input_tokens?: number
          total_output_tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number | null
          feature: string
          id: string
          input_tokens: number
          metadata: Json | null
          model_used: string
          output_tokens: number
          status: string
          tenant_id: string
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          feature: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model_used: string
          output_tokens?: number
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          feature?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model_used?: string
          output_tokens?: number
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          state: string | null
          tenant_id: string
          trading_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          state?: string | null
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          state?: string | null
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      allocations: {
        Row: {
          allocation_end: string
          allocation_start: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          job_id: string
          job_team_id: string | null
          notes: string | null
          people_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allocation_end: string
          allocation_start: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          job_id: string
          job_team_id?: string | null
          notes?: string | null
          people_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allocation_end?: string
          allocation_start?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          job_id?: string
          job_team_id?: string | null
          notes?: string | null
          people_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_job_team_id_fkey"
            columns: ["job_team_id"]
            isOneToOne: false
            referencedRelation: "job_team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_people_id_fkey"
            columns: ["people_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_ip: string | null
          actor_type: string
          approval_request_id: string
          comment: string | null
          created_at: string
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_ip?: string | null
          actor_type: string
          approval_request_id: string
          comment?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_ip?: string | null
          actor_type?: string
          approval_request_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_logs_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          approval_type: string
          approved_at: string | null
          approved_ip: string | null
          approver_email: string | null
          approver_people_id: string | null
          approver_phone: string | null
          approver_type: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          expires_at: string
          file_url: string | null
          id: string
          job_id: string
          rejection_reason: string | null
          status: string
          tenant_id: string
          title: string
          token: string
          updated_at: string
        }
        Insert: {
          approval_type: string
          approved_at?: string | null
          approved_ip?: string | null
          approver_email?: string | null
          approver_people_id?: string | null
          approver_phone?: string | null
          approver_type: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          expires_at: string
          file_url?: string | null
          id?: string
          job_id: string
          rejection_reason?: string | null
          status?: string
          tenant_id: string
          title: string
          token?: string
          updated_at?: string
        }
        Update: {
          approval_type?: string
          approved_at?: string | null
          approved_ip?: string | null
          approver_email?: string | null
          approver_people_id?: string | null
          approver_phone?: string | null
          approver_type?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          expires_at?: string
          file_url?: string | null
          id?: string
          job_id?: string
          rejection_reason?: string | null
          status?: string
          tenant_id?: string
          title?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_approver_people_id_fkey"
            columns: ["approver_people_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          category: string
          created_at: string
          deleted_at: string | null
          description: string
          display_order: number | null
          id: string
          notes: string | null
          quantity: number
          tenant_id: string
          total_value: number | null
          unit_value: number
          updated_at: string
        }
        Insert: {
          budget_id: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          description: string
          display_order?: number | null
          id?: string
          notes?: string | null
          quantity?: number
          tenant_id: string
          total_value?: number | null
          unit_value?: number
          updated_at?: string
        }
        Update: {
          budget_id?: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          display_order?: number | null
          id?: string
          notes?: string | null
          quantity?: number
          tenant_id?: string
          total_value?: number | null
          unit_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "job_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          deleted_at: string | null
          direction: string
          id: string
          idempotency_key: string | null
          job_id: string
          read_at: string | null
          sender_name: string
          sender_user_id: string | null
          session_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          deleted_at?: string | null
          direction: string
          id?: string
          idempotency_key?: string | null
          job_id: string
          read_at?: string | null
          sender_name: string
          sender_user_id?: string | null
          session_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          direction?: string
          id?: string
          idempotency_key?: string | null
          job_id?: string
          read_at?: string | null
          sender_name?: string
          sender_user_id?: string | null
          session_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "client_portal_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_sessions: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          job_id: string
          label: string | null
          last_accessed_at: string | null
          permissions: Json
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          job_id: string
          label?: string | null
          last_accessed_at?: string | null
          permissions?: Json
          tenant_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          job_id?: string
          label?: string | null
          last_accessed_at?: string | null
          permissions?: Json
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          segment: Database["public"]["Enums"]["client_segment"] | null
          state: string | null
          tenant_id: string
          trading_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          segment?: Database["public"]["Enums"]["client_segment"] | null
          state?: string | null
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          segment?: Database["public"]["Enums"]["client_segment"] | null
          state?: string | null
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          agency_id: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_folders: {
        Row: {
          created_at: string
          created_by: string | null
          folder_key: string
          google_drive_id: string | null
          id: string
          job_id: string
          parent_folder_id: string | null
          tenant_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_key: string
          google_drive_id?: string | null
          id?: string
          job_id: string
          parent_folder_id?: string | null
          tenant_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_key?: string
          google_drive_id?: string | null
          id?: string
          job_id?: string
          parent_folder_id?: string | null
          tenant_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "drive_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["financial_record_category"]
          created_at: string
          deleted_at: string | null
          description: string
          due_date: string | null
          id: string
          job_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          person_id: string | null
          status: Database["public"]["Enums"]["financial_record_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["financial_record_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["financial_record_category"]
          created_at?: string
          deleted_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          person_id?: string | null
          status?: Database["public"]["Enums"]["financial_record_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["financial_record_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["financial_record_category"]
          created_at?: string
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          person_id?: string | null
          status?: Database["public"]["Enums"]["financial_record_status"]
          tenant_id?: string
          type?: Database["public"]["Enums"]["financial_record_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          locked_at: string | null
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          result: Json | null
          started_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          locked_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          locked_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          due_date: string | null
          id: string
          issued_at: string | null
          job_id: string | null
          nf_number: string | null
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["invoice_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          issued_at?: string | null
          job_id?: string | null
          nf_number?: string | null
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          issued_at?: string | null
          job_id?: string | null
          nf_number?: string | null
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id?: string
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_budgets: {
        Row: {
          agency_id: string | null
          approved_at: string | null
          approved_by: string | null
          client_id: string | null
          content_md: string | null
          created_at: string
          deleted_at: string | null
          doc_url: string | null
          id: string
          job_id: string | null
          notes: string | null
          pdf_url: string | null
          status: string
          tenant_id: string
          title: string
          total_value: number | null
          updated_at: string
          version: number
        }
        Insert: {
          agency_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          content_md?: string | null
          created_at?: string
          deleted_at?: string | null
          doc_url?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          pdf_url?: string | null
          status?: string
          tenant_id: string
          title: string
          total_value?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          agency_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          content_md?: string | null
          created_at?: string
          deleted_at?: string | null
          doc_url?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          pdf_url?: string | null
          status?: string
          tenant_id?: string
          title?: string
          total_value?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_budgets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_budgets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_code_sequences: {
        Row: {
          created_at: string
          id: string
          last_index: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_index?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_index?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_code_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_deliverables: {
        Row: {
          created_at: string
          deleted_at: string | null
          delivery_date: string | null
          description: string
          display_order: number | null
          duration_seconds: number | null
          format: string | null
          id: string
          job_id: string
          link: string | null
          notes: string | null
          parent_id: string | null
          resolution: string | null
          status: Database["public"]["Enums"]["deliverable_status"]
          tenant_id: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          delivery_date?: string | null
          description: string
          display_order?: number | null
          duration_seconds?: number | null
          format?: string | null
          id?: string
          job_id: string
          link?: string | null
          notes?: string | null
          parent_id?: string | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["deliverable_status"]
          tenant_id: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          delivery_date?: string | null
          description?: string
          display_order?: number | null
          duration_seconds?: number | null
          format?: string | null
          id?: string
          job_id?: string
          link?: string | null
          notes?: string | null
          parent_id?: string | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["deliverable_status"]
          tenant_id?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_deliverables_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_deliverables_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "job_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_deliverables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_files: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          external_id: string | null
          external_source: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          job_id: string
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          external_id?: string | null
          external_source?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          job_id: string
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          external_id?: string | null
          external_source?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          job_id?: string
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_history: {
        Row: {
          created_at: string
          data_after: Json | null
          data_before: Json | null
          description: string | null
          event_type: Database["public"]["Enums"]["history_event_type"]
          id: string
          job_id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_after?: Json | null
          data_before?: Json | null
          description?: string | null
          event_type: Database["public"]["Enums"]["history_event_type"]
          id?: string
          job_id: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_after?: Json | null
          data_before?: Json | null
          description?: string | null
          event_type?: Database["public"]["Enums"]["history_event_type"]
          id?: string
          job_id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_shooting_dates: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number | null
          end_time: string | null
          id: string
          job_id: string
          location: string | null
          notes: string | null
          shooting_date: string
          start_time: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          end_time?: string | null
          id?: string
          job_id: string
          location?: string | null
          notes?: string | null
          shooting_date: string
          start_time?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          end_time?: string | null
          id?: string
          job_id?: string
          location?: string | null
          notes?: string | null
          shooting_date?: string
          start_time?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_shooting_dates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_shooting_dates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_team: {
        Row: {
          allocation_end: string | null
          allocation_start: string | null
          created_at: string
          deleted_at: string | null
          hiring_status: Database["public"]["Enums"]["hiring_status"]
          id: string
          is_responsible_producer: boolean
          job_id: string
          notes: string | null
          person_id: string
          rate: number | null
          role: Database["public"]["Enums"]["team_role"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allocation_end?: string | null
          allocation_start?: string | null
          created_at?: string
          deleted_at?: string | null
          hiring_status?: Database["public"]["Enums"]["hiring_status"]
          id?: string
          is_responsible_producer?: boolean
          job_id: string
          notes?: string | null
          person_id: string
          rate?: number | null
          role: Database["public"]["Enums"]["team_role"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allocation_end?: string | null
          allocation_start?: string | null
          created_at?: string
          deleted_at?: string | null
          hiring_status?: Database["public"]["Enums"]["hiring_status"]
          id?: string
          is_responsible_producer?: boolean
          job_id?: string
          notes?: string | null
          person_id?: string
          rate?: number | null
          role?: Database["public"]["Enums"]["team_role"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_team_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_team_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_team_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_delivery_date: string | null
          agency_contact_id: string | null
          agency_id: string | null
          ancine_number: string | null
          approval_date: string | null
          approval_type: Database["public"]["Enums"]["approval_type"] | null
          approved_by_email: string | null
          approved_by_name: string | null
          audio_company: string | null
          brand: string | null
          briefing_date: string | null
          briefing_text: string | null
          budget_letter_url: string | null
          budget_sent_date: string | null
          cancellation_reason: string | null
          cast_sheet_url: string | null
          client_approval_deadline: string | null
          client_contact_id: string | null
          client_id: string
          closed_value: number | null
          closing_art_url: string | null
          closing_costume_url: string | null
          closing_production_url: string | null
          code: string
          commercial_responsible: string | null
          complexity_level: string | null
          contracts_folder_url: string | null
          created_at: string
          created_by: string | null
          currency: string
          custom_fields: Json | null
          deleted_at: string | null
          display_order: number | null
          drive_folder_url: string | null
          expected_delivery_date: string | null
          final_delivery_url: string | null
          format: string | null
          gross_profit: number | null
          has_computer_graphics: boolean | null
          has_contracted_audio: boolean | null
          has_mockup_scenography: boolean | null
          health_score: number | null
          id: string
          index_number: number
          internal_approval_doc_url: string | null
          internal_notes: string | null
          is_archived: boolean
          is_parent_job: boolean
          job_aba: string
          kickoff_ppm_date: string | null
          margin_percentage: number | null
          media_type: string | null
          net_profit: number | null
          notes: string | null
          other_costs: number | null
          parent_job_id: string | null
          payment_date: string | null
          payment_terms: string | null
          po_number: string | null
          pos_sub_status: Database["public"]["Enums"]["pos_sub_status"] | null
          post_deadline: string | null
          post_start_date: string | null
          ppm_url: string | null
          pre_art_url: string | null
          pre_costume_url: string | null
          pre_production_url: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          production_cost: number | null
          production_sheet_url: string | null
          project_type: Database["public"]["Enums"]["project_type"]
          proposal_validity: string | null
          raw_material_url: string | null
          references_text: string | null
          risk_buffer: number | null
          schedule_url: string | null
          script_url: string | null
          segment: Database["public"]["Enums"]["client_segment"] | null
          shooting_dates: string[] | null
          status: Database["public"]["Enums"]["job_status"]
          status_updated_at: string | null
          status_updated_by: string | null
          tags: string[] | null
          tax_percentage: number
          tax_value: number | null
          team_form_url: string | null
          team_sheet_url: string | null
          tenant_id: string
          title: string
          total_duration_seconds: number | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          agency_contact_id?: string | null
          agency_id?: string | null
          ancine_number?: string | null
          approval_date?: string | null
          approval_type?: Database["public"]["Enums"]["approval_type"] | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          audio_company?: string | null
          brand?: string | null
          briefing_date?: string | null
          briefing_text?: string | null
          budget_letter_url?: string | null
          budget_sent_date?: string | null
          cancellation_reason?: string | null
          cast_sheet_url?: string | null
          client_approval_deadline?: string | null
          client_contact_id?: string | null
          client_id: string
          closed_value?: number | null
          closing_art_url?: string | null
          closing_costume_url?: string | null
          closing_production_url?: string | null
          code: string
          commercial_responsible?: string | null
          complexity_level?: string | null
          contracts_folder_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          display_order?: number | null
          drive_folder_url?: string | null
          expected_delivery_date?: string | null
          final_delivery_url?: string | null
          format?: string | null
          gross_profit?: number | null
          has_computer_graphics?: boolean | null
          has_contracted_audio?: boolean | null
          has_mockup_scenography?: boolean | null
          health_score?: number | null
          id?: string
          index_number: number
          internal_approval_doc_url?: string | null
          internal_notes?: string | null
          is_archived?: boolean
          is_parent_job?: boolean
          job_aba: string
          kickoff_ppm_date?: string | null
          margin_percentage?: number | null
          media_type?: string | null
          net_profit?: number | null
          notes?: string | null
          other_costs?: number | null
          parent_job_id?: string | null
          payment_date?: string | null
          payment_terms?: string | null
          po_number?: string | null
          pos_sub_status?: Database["public"]["Enums"]["pos_sub_status"] | null
          post_deadline?: string | null
          post_start_date?: string | null
          ppm_url?: string | null
          pre_art_url?: string | null
          pre_costume_url?: string | null
          pre_production_url?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          production_cost?: number | null
          production_sheet_url?: string | null
          project_type?: Database["public"]["Enums"]["project_type"]
          proposal_validity?: string | null
          raw_material_url?: string | null
          references_text?: string | null
          risk_buffer?: number | null
          schedule_url?: string | null
          script_url?: string | null
          segment?: Database["public"]["Enums"]["client_segment"] | null
          shooting_dates?: string[] | null
          status?: Database["public"]["Enums"]["job_status"]
          status_updated_at?: string | null
          status_updated_by?: string | null
          tags?: string[] | null
          tax_percentage?: number
          tax_value?: number | null
          team_form_url?: string | null
          team_sheet_url?: string | null
          tenant_id: string
          title: string
          total_duration_seconds?: number | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          agency_contact_id?: string | null
          agency_id?: string | null
          ancine_number?: string | null
          approval_date?: string | null
          approval_type?: Database["public"]["Enums"]["approval_type"] | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          audio_company?: string | null
          brand?: string | null
          briefing_date?: string | null
          briefing_text?: string | null
          budget_letter_url?: string | null
          budget_sent_date?: string | null
          cancellation_reason?: string | null
          cast_sheet_url?: string | null
          client_approval_deadline?: string | null
          client_contact_id?: string | null
          client_id?: string
          closed_value?: number | null
          closing_art_url?: string | null
          closing_costume_url?: string | null
          closing_production_url?: string | null
          code?: string
          commercial_responsible?: string | null
          complexity_level?: string | null
          contracts_folder_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          display_order?: number | null
          drive_folder_url?: string | null
          expected_delivery_date?: string | null
          final_delivery_url?: string | null
          format?: string | null
          gross_profit?: number | null
          has_computer_graphics?: boolean | null
          has_contracted_audio?: boolean | null
          has_mockup_scenography?: boolean | null
          health_score?: number | null
          id?: string
          index_number?: number
          internal_approval_doc_url?: string | null
          internal_notes?: string | null
          is_archived?: boolean
          is_parent_job?: boolean
          job_aba?: string
          kickoff_ppm_date?: string | null
          margin_percentage?: number | null
          media_type?: string | null
          net_profit?: number | null
          notes?: string | null
          other_costs?: number | null
          parent_job_id?: string | null
          payment_date?: string | null
          payment_terms?: string | null
          po_number?: string | null
          pos_sub_status?: Database["public"]["Enums"]["pos_sub_status"] | null
          post_deadline?: string | null
          post_start_date?: string | null
          ppm_url?: string | null
          pre_art_url?: string | null
          pre_costume_url?: string | null
          pre_production_url?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          production_cost?: number | null
          production_sheet_url?: string | null
          project_type?: Database["public"]["Enums"]["project_type"]
          proposal_validity?: string | null
          raw_material_url?: string | null
          references_text?: string | null
          risk_buffer?: number | null
          schedule_url?: string | null
          script_url?: string | null
          segment?: Database["public"]["Enums"]["client_segment"] | null
          shooting_dates?: string[] | null
          status?: Database["public"]["Enums"]["job_status"]
          status_updated_at?: string | null
          status_updated_by?: string | null
          tags?: string[] | null
          tax_percentage?: number
          tax_value?: number | null
          team_form_url?: string | null
          team_sheet_url?: string | null
          tenant_id?: string
          title?: string
          total_duration_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_agency_contact_id_fkey"
            columns: ["agency_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_contact_id_fkey"
            columns: ["client_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_status_updated_by_fkey"
            columns: ["status_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          muted_types: string[]
          preferences: Json
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_types?: string[]
          preferences?: Json
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_types?: string[]
          preferences?: Json
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          job_id: string | null
          metadata: Json | null
          priority: string
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          financial_record_id: string
          id: string
          notes: string | null
          paid_at: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          financial_record_id: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          financial_record_id?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          address: string | null
          bank_info: Json | null
          birth_date: string | null
          cep: string | null
          city: string | null
          cpf: string | null
          created_at: string
          ctps_number: string | null
          ctps_series: string | null
          default_rate: number | null
          default_role: Database["public"]["Enums"]["team_role"] | null
          deleted_at: string | null
          drt: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          is_internal: boolean
          notes: string | null
          phone: string | null
          profession: string | null
          profile_id: string | null
          rg: string | null
          state: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_info?: Json | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          ctps_number?: string | null
          ctps_series?: string | null
          default_rate?: number | null
          default_role?: Database["public"]["Enums"]["team_role"] | null
          deleted_at?: string | null
          drt?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_internal?: boolean
          notes?: string | null
          phone?: string | null
          profession?: string | null
          profile_id?: string | null
          rg?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_info?: Json | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          ctps_number?: string | null
          ctps_series?: string | null
          default_rate?: number | null
          default_role?: Database["public"]["Enums"]["team_role"] | null
          deleted_at?: string | null
          drt?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_internal?: boolean
          notes?: string | null
          phone?: string | null
          profession?: string | null
          profile_id?: string | null
          rg?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          deleted_at: string | null
          expires_at: string
          generated_at: string
          id: string
          parameters: Json
          report_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          deleted_at?: string | null
          expires_at: string
          generated_at?: string
          id?: string
          parameters?: Json
          report_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          deleted_at?: string | null
          expires_at?: string
          generated_at?: string
          id?: string
          parameters?: Json
          report_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cnpj: string | null
          created_at: string
          custom_fields: Json | null
          custom_statuses: Json | null
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          custom_fields?: Json | null
          custom_statuses?: Json | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          custom_fields?: Json | null
          custom_statuses?: Json | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          external_message_id: string | null
          id: string
          job_id: string | null
          message: string
          phone: string
          provider: string | null
          recipient_name: string | null
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          external_message_id?: string | null
          id?: string
          job_id?: string | null
          message: string
          phone: string
          provider?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          external_message_id?: string | null
          id?: string
          job_id?: string | null
          message?: string
          phone?: string
          provider?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_alerts: {
        Args: { p_limit?: number; p_tenant_id: string }
        Returns: Json
      }
      increment_conversation_counters: {
        Args: {
          p_conversation_id: string
          p_input_tokens: number
          p_message_count: number
          p_model_used: string
          p_output_tokens: number
        }
        Returns: undefined
      }
      get_dashboard_kpis: { Args: { p_tenant_id: string }; Returns: Json }
      get_financial_summary: { Args: { p_job_id?: string }; Returns: Json }
      get_pipeline_summary: { Args: { p_tenant_id: string }; Returns: Json }
      get_portal_timeline: {
        Args: { p_limit?: number; p_token: string }
        Returns: Json
      }
      get_recent_activity: {
        Args: { p_hours?: number; p_limit?: number; p_tenant_id: string }
        Returns: Json
      }
      get_report_financial_monthly: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: Json
      }
      get_report_performance: {
        Args: {
          p_end_date?: string
          p_group_by?: string
          p_start_date?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      get_report_team_utilization: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: Json
      }
      get_revenue_by_month: {
        Args: { p_months?: number; p_tenant_id: string }
        Returns: Json
      }
      get_tenant_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      lock_integration_events: {
        Args: { p_batch_size?: number }
        Returns: {
          attempts: number
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          locked_at: string | null
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          result: Json | null
          started_at: string | null
          status: string
          tenant_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "integration_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      read_secret: { Args: { secret_name: string }; Returns: string }
      write_secret: {
        Args: { secret_name: string; secret_value: string }
        Returns: undefined
      }
    }
    Enums: {
      approval_type: "interna" | "externa_cliente"
      client_segment:
        | "automotivo"
        | "varejo"
        | "fintech"
        | "alimentos_bebidas"
        | "moda"
        | "tecnologia"
        | "saude"
        | "educacao"
        | "governo"
        | "outro"
      deliverable_status:
        | "pendente"
        | "em_producao"
        | "aguardando_aprovacao"
        | "aprovado"
        | "entregue"
      financial_record_category:
        | "cache_equipe"
        | "locacao"
        | "equipamento"
        | "transporte"
        | "alimentacao"
        | "cenografia"
        | "figurino"
        | "pos_producao"
        | "musica_audio"
        | "seguro"
        | "taxa_administrativa"
        | "imposto"
        | "receita_cliente"
        | "adiantamento"
        | "reembolso"
        | "outro"
      financial_record_status: "pendente" | "pago" | "atrasado" | "cancelado"
      financial_record_type: "receita" | "despesa"
      hiring_status: "orcado" | "proposta_enviada" | "confirmado" | "cancelado"
      history_event_type:
        | "status_change"
        | "field_update"
        | "team_change"
        | "comment"
        | "file_upload"
        | "approval"
        | "financial_update"
      invoice_status: "emitida" | "paga" | "vencida" | "cancelada"
      invoice_type: "nf_servico" | "nf_produto" | "recibo" | "fatura"
      job_status:
        | "briefing_recebido"
        | "orcamento_elaboracao"
        | "orcamento_enviado"
        | "aguardando_aprovacao"
        | "aprovado_selecao_diretor"
        | "cronograma_planejamento"
        | "pre_producao"
        | "producao_filmagem"
        | "pos_producao"
        | "aguardando_aprovacao_final"
        | "entregue"
        | "finalizado"
        | "cancelado"
        | "pausado"
      payment_method:
        | "pix"
        | "transferencia"
        | "boleto"
        | "cartao_credito"
        | "cartao_debito"
        | "dinheiro"
        | "cheque"
        | "outro"
      pos_sub_status:
        | "edicao"
        | "cor"
        | "vfx"
        | "finalizacao"
        | "audio"
        | "revisao"
      priority_level: "alta" | "media" | "baixa"
      project_type:
        | "filme_publicitario"
        | "branded_content"
        | "videoclipe"
        | "documentario"
        | "conteudo_digital"
        | "evento_livestream"
        | "institucional"
        | "motion_graphics"
        | "fotografia"
        | "outro"
      team_role:
        | "diretor"
        | "produtor_executivo"
        | "coordenador_producao"
        | "dop"
        | "primeiro_assistente"
        | "editor"
        | "colorista"
        | "motion_designer"
        | "diretor_arte"
        | "figurinista"
        | "produtor_casting"
        | "produtor_locacao"
        | "gaffer"
        | "som_direto"
        | "maquiador"
        | "outro"
      user_role:
        | "admin"
        | "ceo"
        | "produtor_executivo"
        | "coordenador"
        | "diretor"
        | "financeiro"
        | "atendimento"
        | "comercial"
        | "freelancer"
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
      approval_type: ["interna", "externa_cliente"],
      client_segment: [
        "automotivo",
        "varejo",
        "fintech",
        "alimentos_bebidas",
        "moda",
        "tecnologia",
        "saude",
        "educacao",
        "governo",
        "outro",
      ],
      deliverable_status: [
        "pendente",
        "em_producao",
        "aguardando_aprovacao",
        "aprovado",
        "entregue",
      ],
      financial_record_category: [
        "cache_equipe",
        "locacao",
        "equipamento",
        "transporte",
        "alimentacao",
        "cenografia",
        "figurino",
        "pos_producao",
        "musica_audio",
        "seguro",
        "taxa_administrativa",
        "imposto",
        "receita_cliente",
        "adiantamento",
        "reembolso",
        "outro",
      ],
      financial_record_status: ["pendente", "pago", "atrasado", "cancelado"],
      financial_record_type: ["receita", "despesa"],
      hiring_status: ["orcado", "proposta_enviada", "confirmado", "cancelado"],
      history_event_type: [
        "status_change",
        "field_update",
        "team_change",
        "comment",
        "file_upload",
        "approval",
        "financial_update",
      ],
      invoice_status: ["emitida", "paga", "vencida", "cancelada"],
      invoice_type: ["nf_servico", "nf_produto", "recibo", "fatura"],
      job_status: [
        "briefing_recebido",
        "orcamento_elaboracao",
        "orcamento_enviado",
        "aguardando_aprovacao",
        "aprovado_selecao_diretor",
        "cronograma_planejamento",
        "pre_producao",
        "producao_filmagem",
        "pos_producao",
        "aguardando_aprovacao_final",
        "entregue",
        "finalizado",
        "cancelado",
        "pausado",
      ],
      payment_method: [
        "pix",
        "transferencia",
        "boleto",
        "cartao_credito",
        "cartao_debito",
        "dinheiro",
        "cheque",
        "outro",
      ],
      pos_sub_status: [
        "edicao",
        "cor",
        "vfx",
        "finalizacao",
        "audio",
        "revisao",
      ],
      priority_level: ["alta", "media", "baixa"],
      project_type: [
        "filme_publicitario",
        "branded_content",
        "videoclipe",
        "documentario",
        "conteudo_digital",
        "evento_livestream",
        "institucional",
        "motion_graphics",
        "fotografia",
        "outro",
      ],
      team_role: [
        "diretor",
        "produtor_executivo",
        "coordenador_producao",
        "dop",
        "primeiro_assistente",
        "editor",
        "colorista",
        "motion_designer",
        "diretor_arte",
        "figurinista",
        "produtor_casting",
        "produtor_locacao",
        "gaffer",
        "som_direto",
        "maquiador",
        "outro",
      ],
      user_role: [
        "admin",
        "ceo",
        "produtor_executivo",
        "coordenador",
        "diretor",
        "financeiro",
        "atendimento",
        "comercial",
        "freelancer",
      ],
    },
  },
} as const
