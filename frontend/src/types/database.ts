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
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_financial_summary: { Args: { p_job_id?: string }; Returns: Json }
      get_tenant_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
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
