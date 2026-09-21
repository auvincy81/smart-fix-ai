export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          customer_concern: string | null
          customer_id: string
          id: string
          internal_notes: string | null
          scheduled_end: string | null
          scheduled_start: string
          shop_id: string
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          customer_concern?: string | null
          customer_id: string
          id?: string
          internal_notes?: string | null
          scheduled_end?: string | null
          scheduled_start: string
          shop_id: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          customer_concern?: string | null
          customer_id?: string
          id?: string
          internal_notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string
          shop_id?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_fk"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "appointments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_customer_fk"
            columns: ["shop_id", "customer_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "customer_id", "id"]
          },
          {
            foreignKeyName: "appointments_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      customer_approval_audits: {
        Row: {
          acknowledgment: string
          approval_request_id: string
          approved_item_ids: string[]
          customer_name: string
          customer_note: string | null
          decisions: Json
          declined_item_ids: string[]
          estimate_id: string
          id: string
          method: string
          recorded_by: string | null
          responded_at: string
          shop_id: string
          work_order_id: string
        }
        Insert: {
          acknowledgment: string
          approval_request_id: string
          approved_item_ids: string[]
          customer_name: string
          customer_note?: string | null
          decisions: Json
          declined_item_ids: string[]
          estimate_id: string
          id?: string
          method: string
          recorded_by?: string | null
          responded_at?: string
          shop_id: string
          work_order_id: string
        }
        Update: {
          acknowledgment?: string
          approval_request_id?: string
          approved_item_ids?: string[]
          customer_name?: string
          customer_note?: string | null
          decisions?: Json
          declined_item_ids?: string[]
          estimate_id?: string
          id?: string
          method?: string
          recorded_by?: string | null
          responded_at?: string
          shop_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_approval_audits_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_approval_audits_shop_id_work_order_id_estimate_id_fkey"
            columns: [
              "shop_id",
              "work_order_id",
              "estimate_id",
              "approval_request_id",
            ]
            isOneToOne: false
            referencedRelation: "customer_approval_requests"
            referencedColumns: ["shop_id", "work_order_id", "estimate_id", "id"]
          },
        ]
      }
      customer_approval_requests: {
        Row: {
          created_at: string
          estimate_id: string
          expires_at: string
          id: string
          responded_at: string | null
          shop_id: string
          status: string
          token_hash: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          estimate_id: string
          expires_at: string
          id?: string
          responded_at?: string | null
          shop_id: string
          status?: string
          token_hash?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          estimate_id?: string
          expires_at?: string
          id?: string
          responded_at?: string | null
          shop_id?: string
          status?: string
          token_hash?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_approval_requests_shop_id_work_order_id_estimate__fkey"
            columns: ["shop_id", "work_order_id", "estimate_id"]
            isOneToOne: false
            referencedRelation: "work_order_estimates"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
        ]
      }
      customer_communications: {
        Row: {
          approval_request_id: string | null
          attempt_id: string | null
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string
          delivered_at: string | null
          document_link_id: string | null
          error_message: string | null
          id: string
          message: string
          provider: string | null
          provider_message_id: string | null
          recipient: string
          request_key: string
          sent_at: string | null
          shop_id: string
          status: string
          subject: string
          type: string
          vehicle_id: string | null
          work_order_id: string | null
        }
        Insert: {
          approval_request_id?: string | null
          attempt_id?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivered_at?: string | null
          document_link_id?: string | null
          error_message?: string | null
          id?: string
          message: string
          provider?: string | null
          provider_message_id?: string | null
          recipient: string
          request_key: string
          sent_at?: string | null
          shop_id: string
          status?: string
          subject: string
          type: string
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          approval_request_id?: string | null
          attempt_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivered_at?: string | null
          document_link_id?: string | null
          error_message?: string | null
          id?: string
          message?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string
          request_key?: string
          sent_at?: string | null
          shop_id?: string
          status?: string
          subject?: string
          type?: string
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "customer_approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_shop_id_customer_id_fkey"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_communications_shop_id_document_link_id_fkey"
            columns: ["shop_id", "document_link_id"]
            isOneToOne: false
            referencedRelation: "customer_document_links"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_communications_shop_id_vehicle_id_fkey"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_communications_shop_id_work_order_id_fkey"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_communications_shop_id_work_order_id_fkey"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      customer_document_links: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          document_id: string
          document_type: string
          expires_at: string
          id: string
          shop_id: string
          snapshot: Json
          status: string
          token_hash: string
          vehicle_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          document_id: string
          document_type: string
          expires_at: string
          id?: string
          shop_id: string
          snapshot: Json
          status?: string
          token_hash: string
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          document_id?: string
          document_type?: string
          expires_at?: string
          id?: string
          shop_id?: string
          snapshot?: Json
          status?: string
          token_hash?: string
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_document_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_document_links_shop_id_customer_id_fkey"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_document_links_shop_id_vehicle_id_fkey"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_document_links_shop_id_work_order_id_fkey"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_document_links_shop_id_work_order_id_fkey"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      customer_questions: {
        Row: {
          appointment_id: string | null
          created_at: string
          customer_id: string
          id: string
          message: string
          responded_at: string | null
          shop_id: string
          shop_response: string | null
          status: string
          subject: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          message: string
          responded_at?: string | null
          shop_id: string
          shop_response?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          message?: string
          responded_at?: string | null
          shop_id?: string
          shop_response?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_questions_appointment_fk"
            columns: ["shop_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_questions_appointment_fk"
            columns: ["shop_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_questions_customer_fk"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "customer_questions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_questions_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          shop_id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          shop_id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          shop_id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          ai_response: Json | null
          ai_summary: string | null
          confirmed_cause: string | null
          created_at: string
          diagnostic_codes: string | null
          id: string
          save_key: string | null
          severity: string | null
          shop_id: string
          symptoms: string | null
          technician_findings: string | null
          technician_id: string | null
          updated_at: string
          vehicle_id: string
          work_order_id: string
        }
        Insert: {
          ai_response?: Json | null
          ai_summary?: string | null
          confirmed_cause?: string | null
          created_at?: string
          diagnostic_codes?: string | null
          id?: string
          save_key?: string | null
          severity?: string | null
          shop_id: string
          symptoms?: string | null
          technician_findings?: string | null
          technician_id?: string | null
          updated_at?: string
          vehicle_id: string
          work_order_id: string
        }
        Update: {
          ai_response?: Json | null
          ai_summary?: string | null
          confirmed_cause?: string | null
          created_at?: string
          diagnostic_codes?: string | null
          id?: string
          save_key?: string | null
          severity?: string | null
          shop_id?: string
          symptoms?: string | null
          technician_findings?: string | null
          technician_id?: string | null
          updated_at?: string
          vehicle_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_job_vehicle_fk"
            columns: ["shop_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_job_vehicle_fk"
            columns: ["shop_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_technician_fk"
            columns: ["shop_id", "technician_id"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          category: string
          condition: string
          created_at: string
          critical: boolean
          id: string
          inspection_id: string
          item_name: string
          measurement: string | null
          recommendation: string | null
          required: boolean
          sort_order: number
          technician_note: string | null
          weight: number
        }
        Insert: {
          category: string
          condition?: string
          created_at?: string
          critical?: boolean
          id?: string
          inspection_id: string
          item_name: string
          measurement?: string | null
          recommendation?: string | null
          required?: boolean
          sort_order?: number
          technician_note?: string | null
          weight?: number
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          critical?: boolean
          id?: string
          inspection_id?: string
          item_name?: string
          measurement?: string | null
          recommendation?: string | null
          required?: boolean
          sort_order?: number
          technician_note?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_listing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          inspection_id: string
          inspection_item_id: string | null
          shop_id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_id: string
          inspection_item_id?: string | null
          shop_id: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inspection_id?: string
          inspection_item_id?: string | null
          shop_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_inspection_id_inspection_item_id_fkey"
            columns: ["inspection_id", "inspection_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["inspection_id", "id"]
          },
          {
            foreignKeyName: "inspection_photos_shop_id_inspection_id_fkey"
            columns: ["shop_id", "inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "inspection_photos_shop_id_inspection_id_fkey"
            columns: ["shop_id", "inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      inspections: {
        Row: {
          completed_at: string | null
          created_at: string
          criteria_version: string | null
          id: string
          inspection_type: string | null
          jurisdiction_state: string | null
          readiness_blockers: Json
          readiness_result: string | null
          readiness_score: number | null
          request_key: string | null
          shop_id: string
          status: string
          summary: string | null
          technician_id: string | null
          template_key: string | null
          updated_at: string
          vehicle_id: string
          work_order_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          criteria_version?: string | null
          id?: string
          inspection_type?: string | null
          jurisdiction_state?: string | null
          readiness_blockers?: Json
          readiness_result?: string | null
          readiness_score?: number | null
          request_key?: string | null
          shop_id: string
          status?: string
          summary?: string | null
          technician_id?: string | null
          template_key?: string | null
          updated_at?: string
          vehicle_id: string
          work_order_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          criteria_version?: string | null
          id?: string
          inspection_type?: string | null
          jurisdiction_state?: string | null
          readiness_blockers?: Json
          readiness_result?: string | null
          readiness_score?: number | null
          request_key?: string | null
          shop_id?: string
          status?: string
          summary?: string | null
          technician_id?: string | null
          template_key?: string | null
          updated_at?: string
          vehicle_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_job_vehicle_fk"
            columns: ["shop_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "inspections_job_vehicle_fk"
            columns: ["shop_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "inspections_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_technician_fk"
            columns: ["shop_id", "technician_id"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "inspections_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "inspections_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "inspections_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      repair_reports: {
        Row: {
          created_at: string
          customer_id: string
          finalized_at: string | null
          generated_at: string | null
          id: string
          report_number: string
          report_snapshot: Json | null
          report_status: string
          shop_id: string
          vehicle_id: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          finalized_at?: string | null
          generated_at?: string | null
          id?: string
          report_number: string
          report_snapshot?: Json | null
          report_status?: string
          shop_id: string
          vehicle_id: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          finalized_at?: string | null
          generated_at?: string | null
          id?: string
          report_number?: string
          report_snapshot?: Json | null
          report_status?: string
          shop_id?: string
          vehicle_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_reports_customer_fk"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "repair_reports_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_reports_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "repair_reports_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "repair_reports_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "reports_job_context"
            columns: ["shop_id", "customer_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "reports_job_context"
            columns: ["shop_id", "customer_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
        ]
      }
      service_recommendations: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          diagnosis_id: string | null
          estimated_cost: number | null
          id: string
          inspection_id: string | null
          inspection_item_id: string | null
          priority: string | null
          recommended_date: string | null
          recommended_mileage: number | null
          request_key: string | null
          shop_id: string
          status: string
          title: string
          updated_at: string
          vehicle_id: string
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          diagnosis_id?: string | null
          estimated_cost?: number | null
          id?: string
          inspection_id?: string | null
          inspection_item_id?: string | null
          priority?: string | null
          recommended_date?: string | null
          recommended_mileage?: number | null
          request_key?: string | null
          shop_id: string
          status?: string
          title: string
          updated_at?: string
          vehicle_id: string
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          diagnosis_id?: string | null
          estimated_cost?: number | null
          id?: string
          inspection_id?: string | null
          inspection_item_id?: string | null
          priority?: string | null
          recommended_date?: string | null
          recommended_mileage?: number | null
          request_key?: string | null
          shop_id?: string
          status?: string
          title?: string
          updated_at?: string
          vehicle_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_diagnosis_context"
            columns: ["shop_id", "work_order_id", "diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "recommendations_diagnosis_context"
            columns: ["shop_id", "work_order_id", "diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_listing"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "recommendations_inspection_context"
            columns: ["shop_id", "work_order_id", "inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_listing"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "recommendations_inspection_context"
            columns: ["shop_id", "work_order_id", "inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "recommendations_item_context"
            columns: ["inspection_id", "inspection_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["inspection_id", "id"]
          },
          {
            foreignKeyName: "recommendations_job_context"
            columns: ["shop_id", "customer_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "recommendations_job_context"
            columns: ["shop_id", "customer_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "service_recommendations_customer_fk"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "service_recommendations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recommendations_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "service_recommendations_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "service_recommendations_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      shop_members: {
        Row: {
          created_at: string
          id: string
          role: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          customer_id: string
          engine: string | null
          id: string
          license_plate: string | null
          make: string | null
          mileage: number | null
          model: string | null
          notes: string | null
          plate_state: string | null
          shop_id: string
          trim: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          customer_id: string
          engine?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          notes?: string | null
          plate_state?: string | null
          shop_id: string
          trim?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          customer_id?: string
          engine?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          notes?: string | null
          plate_state?: string | null
          shop_id?: string
          trim?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_fk"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "vehicles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_estimate_items: {
        Row: {
          category: string | null
          decision: string
          decision_at: string | null
          description: string
          estimate_id: string
          fees_amount: number
          id: string
          labor_amount: number
          labor_hours: number
          labor_rate: number
          line_number: number
          parts_amount: number
          parts_snapshot: Json
          shop_id: string
          total_amount: number
          work_order_id: string
          work_order_service_id: string
        }
        Insert: {
          category?: string | null
          decision?: string
          decision_at?: string | null
          description: string
          estimate_id: string
          fees_amount: number
          id?: string
          labor_amount: number
          labor_hours: number
          labor_rate: number
          line_number: number
          parts_amount: number
          parts_snapshot?: Json
          shop_id: string
          total_amount: number
          work_order_id: string
          work_order_service_id: string
        }
        Update: {
          category?: string | null
          decision?: string
          decision_at?: string | null
          description?: string
          estimate_id?: string
          fees_amount?: number
          id?: string
          labor_amount?: number
          labor_hours?: number
          labor_rate?: number
          line_number?: number
          parts_amount?: number
          parts_snapshot?: Json
          shop_id?: string
          total_amount?: number
          work_order_id?: string
          work_order_service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_estimate_items_shop_id_work_order_id_estimate_i_fkey"
            columns: ["shop_id", "work_order_id", "estimate_id"]
            isOneToOne: false
            referencedRelation: "work_order_estimates"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "work_order_estimate_items_shop_id_work_order_id_work_order_fkey"
            columns: ["shop_id", "work_order_id", "work_order_service_id"]
            isOneToOne: false
            referencedRelation: "work_order_services"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
        ]
      }
      work_order_estimates: {
        Row: {
          created_at: string
          created_by: string | null
          customer_note: string | null
          customer_snapshot: Json
          estimate_number: string
          fees_total: number
          grand_total: number
          id: string
          internal_note: string | null
          is_current: boolean
          labor_total: number
          parts_total: number
          presented_at: string | null
          responded_at: string | null
          shop_id: string
          status: string
          subtotal: number
          superseded_at: string | null
          tax_amount: number
          updated_at: string
          version: number
          work_order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_note?: string | null
          customer_snapshot?: Json
          estimate_number: string
          fees_total?: number
          grand_total?: number
          id?: string
          internal_note?: string | null
          is_current?: boolean
          labor_total?: number
          parts_total?: number
          presented_at?: string | null
          responded_at?: string | null
          shop_id: string
          status?: string
          subtotal?: number
          superseded_at?: string | null
          tax_amount?: number
          updated_at?: string
          version: number
          work_order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_note?: string | null
          customer_snapshot?: Json
          estimate_number?: string
          fees_total?: number
          grand_total?: number
          id?: string
          internal_note?: string | null
          is_current?: boolean
          labor_total?: number
          parts_total?: number
          presented_at?: string | null
          responded_at?: string | null
          shop_id?: string
          status?: string
          subtotal?: number
          superseded_at?: string | null
          tax_amount?: number
          updated_at?: string
          version?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_estimates_shop_id_work_order_id_fkey"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_order_estimates_shop_id_work_order_id_fkey"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      work_order_invoices: {
        Row: {
          amount_paid: number
          balance_due: number | null
          created_at: string
          customer_id: string
          customer_note: string | null
          fees_total: number
          id: string
          invoice_number: string
          issued_at: string | null
          labor_total: number
          paid_at: string | null
          parts_total: number
          shop_id: string
          snapshot: Json
          status: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
          vehicle_id: string
          work_order_id: string
        }
        Insert: {
          amount_paid?: number
          balance_due?: number | null
          created_at?: string
          customer_id: string
          customer_note?: string | null
          fees_total: number
          id?: string
          invoice_number: string
          issued_at?: string | null
          labor_total: number
          paid_at?: string | null
          parts_total: number
          shop_id: string
          snapshot: Json
          status?: string
          subtotal: number
          tax_amount?: number
          total: number
          updated_at?: string
          vehicle_id: string
          work_order_id: string
        }
        Update: {
          amount_paid?: number
          balance_due?: number | null
          created_at?: string
          customer_id?: string
          customer_note?: string | null
          fees_total?: number
          id?: string
          invoice_number?: string
          issued_at?: string | null
          labor_total?: number
          paid_at?: string | null
          parts_total?: number
          shop_id?: string
          snapshot?: Json
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          vehicle_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_invoices_shop_id_customer_id_vehicle_id_work_or_fkey"
            columns: ["shop_id", "customer_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "work_order_invoices_shop_id_customer_id_vehicle_id_work_or_fkey"
            columns: ["shop_id", "customer_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
        ]
      }
      work_order_parts: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          id: string
          part_name: string
          part_number: string | null
          quantity: number
          request_key: string
          shop_id: string
          status: string
          unit_cost: number | null
          unit_price: number
          updated_at: string
          work_order_id: string
          work_order_service_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          part_name: string
          part_number?: string | null
          quantity: number
          request_key: string
          shop_id: string
          status?: string
          unit_cost?: number | null
          unit_price: number
          updated_at?: string
          work_order_id: string
          work_order_service_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          part_name?: string
          part_number?: string | null
          quantity?: number
          request_key?: string
          shop_id?: string
          status?: string
          unit_cost?: number | null
          unit_price?: number
          updated_at?: string
          work_order_id?: string
          work_order_service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_shop_id_work_order_id_fkey"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_order_parts_shop_id_work_order_id_fkey"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_order_parts_shop_id_work_order_id_work_order_service__fkey"
            columns: ["shop_id", "work_order_id", "work_order_service_id"]
            isOneToOne: false
            referencedRelation: "work_order_services"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
        ]
      }
      work_order_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          note: string | null
          paid_at: string
          payment_method: string
          payment_reference: string | null
          recorded_by: string | null
          request_key: string
          shop_id: string
          work_order_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          note?: string | null
          paid_at?: string
          payment_method: string
          payment_reference?: string | null
          recorded_by?: string | null
          request_key: string
          shop_id: string
          work_order_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          note?: string | null
          paid_at?: string
          payment_method?: string
          payment_reference?: string | null
          recorded_by?: string | null
          request_key?: string
          shop_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_payments_shop_id_work_order_id_invoice_id_fkey"
            columns: ["shop_id", "work_order_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "work_order_invoices"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
        ]
      }
      work_order_receipts: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          payment_id: string
          receipt_number: string
          shop_id: string
          snapshot: Json
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          payment_id: string
          receipt_number: string
          shop_id: string
          snapshot: Json
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          payment_id?: string
          receipt_number?: string
          shop_id?: string
          snapshot?: Json
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_receipts_shop_id_work_order_id_invoice_id_payme_fkey"
            columns: ["shop_id", "work_order_id", "invoice_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "work_order_payments"
            referencedColumns: ["shop_id", "work_order_id", "invoice_id", "id"]
          },
        ]
      }
      work_order_services: {
        Row: {
          completed_at: string | null
          completion_note: string | null
          created_at: string
          customer_description: string | null
          description: string
          fees_amount: number
          id: string
          labor_amount: number | null
          labor_hours: number | null
          labor_rate: number | null
          parts_amount: number
          recommendation_id: string | null
          request_key: string | null
          service_category: string | null
          shop_id: string
          sort_order: number
          started_at: string | null
          status: string
          technician_id: string | null
          total_amount: number
          updated_at: string
          work_order_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          customer_description?: string | null
          description: string
          fees_amount?: number
          id?: string
          labor_amount?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          parts_amount?: number
          recommendation_id?: string | null
          request_key?: string | null
          service_category?: string | null
          shop_id: string
          sort_order?: number
          started_at?: string | null
          status?: string
          technician_id?: string | null
          total_amount?: number
          updated_at?: string
          work_order_id: string
        }
        Update: {
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          customer_description?: string | null
          description?: string
          fees_amount?: number
          id?: string
          labor_amount?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          parts_amount?: number
          recommendation_id?: string | null
          request_key?: string | null
          service_category?: string | null
          shop_id?: string
          sort_order?: number
          started_at?: string | null
          status?: string
          technician_id?: string | null
          total_amount?: number
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_recommendation_context"
            columns: ["shop_id", "work_order_id", "recommendation_id"]
            isOneToOne: false
            referencedRelation: "service_recommendations"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "services_recommendation_context"
            columns: ["shop_id", "work_order_id", "recommendation_id"]
            isOneToOne: false
            referencedRelation: "service_reminder_readiness"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "work_order_services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_services_technician_fk"
            columns: ["shop_id", "technician_id"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_order_services_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_order_services_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      work_orders: {
        Row: {
          appointment_id: string | null
          assigned_technician_id: string | null
          completed_at: string | null
          created_at: string
          customer_complaint: string | null
          customer_id: string
          id: string
          mileage_in: number | null
          mileage_out: number | null
          opened_at: string | null
          shop_id: string
          status: string
          technician_notes: string | null
          updated_at: string
          vehicle_id: string
          work_order_number: string
        }
        Insert: {
          appointment_id?: string | null
          assigned_technician_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_complaint?: string | null
          customer_id: string
          id?: string
          mileage_in?: number | null
          mileage_out?: number | null
          opened_at?: string | null
          shop_id: string
          status?: string
          technician_notes?: string | null
          updated_at?: string
          vehicle_id: string
          work_order_number?: string
        }
        Update: {
          appointment_id?: string | null
          assigned_technician_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_complaint?: string | null
          customer_id?: string
          id?: string
          mileage_in?: number | null
          mileage_out?: number | null
          opened_at?: string | null
          shop_id?: string
          status?: string
          technician_notes?: string | null
          updated_at?: string
          vehicle_id?: string
          work_order_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_appointment_context_fk"
            columns: ["shop_id", "customer_id", "vehicle_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment_listing"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "work_orders_appointment_context_fk"
            columns: ["shop_id", "customer_id", "vehicle_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "work_orders_appointment_fk"
            columns: ["shop_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_orders_appointment_fk"
            columns: ["shop_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_orders_customer_fk"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_technician_fk"
            columns: ["shop_id", "assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_customer_fk"
            columns: ["shop_id", "customer_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "customer_id", "id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
    }
    Views: {
      appointment_listing: {
        Row: {
          created_at: string | null
          customer_concern: string | null
          customer_id: string | null
          customer_name: string | null
          id: string | null
          internal_notes: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          shop_id: string | null
          status: string | null
          updated_at: string | null
          vehicle_id: string | null
          vehicle_name: string | null
          vin: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_fk"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "appointments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_customer_fk"
            columns: ["shop_id", "customer_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "customer_id", "id"]
          },
          {
            foreignKeyName: "appointments_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      diagnosis_listing: {
        Row: {
          ai_response: Json | null
          ai_summary: string | null
          confirmed_cause: string | null
          created_at: string | null
          customer_id: string | null
          diagnostic_codes: string | null
          id: string | null
          save_key: string | null
          severity: string | null
          shop_id: string | null
          symptoms: string | null
          technician_findings: string | null
          technician_id: string | null
          updated_at: string | null
          vehicle_id: string | null
          work_order_id: string | null
          work_order_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_job_vehicle_fk"
            columns: ["shop_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_job_vehicle_fk"
            columns: ["shop_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_technician_fk"
            columns: ["shop_id", "technician_id"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "diagnoses_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      inspection_listing: {
        Row: {
          completed_at: string | null
          created_at: string | null
          criteria_version: string | null
          customer_id: string | null
          customer_name: string | null
          id: string | null
          inspection_type: string | null
          jurisdiction_state: string | null
          readiness_blockers: Json | null
          readiness_result: string | null
          readiness_score: number | null
          request_key: string | null
          shop_id: string | null
          status: string | null
          summary: string | null
          technician_id: string | null
          template_key: string | null
          updated_at: string | null
          vehicle_id: string | null
          vehicle_name: string | null
          vin: string | null
          work_order_id: string | null
          work_order_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_job_vehicle_fk"
            columns: ["shop_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "inspections_job_vehicle_fk"
            columns: ["shop_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "inspections_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_technician_fk"
            columns: ["shop_id", "technician_id"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "inspections_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "inspections_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "inspections_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      service_reminder_readiness: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          date_state: string | null
          description: string | null
          diagnosis_id: string | null
          due_state: string | null
          estimated_cost: number | null
          id: string | null
          inspection_id: string | null
          inspection_item_id: string | null
          known_mileage: number | null
          mileage_state: string | null
          priority: string | null
          recommended_date: string | null
          recommended_mileage: number | null
          request_key: string | null
          shop_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          vehicle_id: string | null
          vehicle_name: string | null
          work_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_diagnosis_context"
            columns: ["shop_id", "work_order_id", "diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "recommendations_diagnosis_context"
            columns: ["shop_id", "work_order_id", "diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_listing"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "recommendations_inspection_context"
            columns: ["shop_id", "work_order_id", "inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_listing"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "recommendations_inspection_context"
            columns: ["shop_id", "work_order_id", "inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["shop_id", "work_order_id", "id"]
          },
          {
            foreignKeyName: "recommendations_item_context"
            columns: ["inspection_id", "inspection_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["inspection_id", "id"]
          },
          {
            foreignKeyName: "recommendations_job_context"
            columns: ["shop_id", "customer_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "recommendations_job_context"
            columns: ["shop_id", "customer_id", "vehicle_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "service_recommendations_customer_fk"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "service_recommendations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recommendations_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "service_recommendations_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "service_recommendations_work_order_fk"
            columns: ["shop_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
      work_order_listing: {
        Row: {
          appointment_id: string | null
          assigned_technician_id: string | null
          completed_at: string | null
          created_at: string | null
          customer_complaint: string | null
          customer_id: string | null
          customer_name: string | null
          id: string | null
          mileage_in: number | null
          mileage_out: number | null
          opened_at: string | null
          shop_id: string | null
          status: string | null
          technician_notes: string | null
          updated_at: string | null
          vehicle_id: string | null
          vehicle_name: string | null
          vin: string | null
          work_order_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_appointment_context_fk"
            columns: ["shop_id", "customer_id", "vehicle_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment_listing"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "work_orders_appointment_context_fk"
            columns: ["shop_id", "customer_id", "vehicle_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["shop_id", "customer_id", "vehicle_id", "id"]
          },
          {
            foreignKeyName: "work_orders_appointment_fk"
            columns: ["shop_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment_listing"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_orders_appointment_fk"
            columns: ["shop_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_orders_customer_fk"
            columns: ["shop_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_technician_fk"
            columns: ["shop_id", "assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "shop_members"
            referencedColumns: ["shop_id", "id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_customer_fk"
            columns: ["shop_id", "customer_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "customer_id", "id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_fk"
            columns: ["shop_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["shop_id", "id"]
          },
        ]
      }
    }
    Functions: {
      claim_communication: {
        Args: { p_id: string; p_token: string }
        Returns: Json
      }
      create_document_link: {
        Args: { p_id: string; p_kind: string }
        Returns: Json
      }
      create_initial_shop: {
        Args: {
          p_address?: string
          p_city?: string
          p_email?: string
          p_name: string
          p_phone?: string
          p_postal_code?: string
          p_state?: string
        }
        Returns: string
      }
      create_inspection: {
        Args: {
          p_request_key: string
          p_state: string
          p_technician: string
          p_type: string
          p_work_order: string
        }
        Returns: string
      }
      finish_communication: {
        Args: {
          p_attempt: string
          p_id: string
          p_provider_id: string
          p_success: boolean
        }
        Returns: undefined
      }
      list_shop_technicians: {
        Args: { p_shop_id: string }
        Returns: {
          id: string
          label: string
        }[]
      }
      manage_document: {
        Args: { p_action: string; p_data: Json; p_id: string; p_kind: string }
        Returns: Json
      }
      manage_repair: {
        Args: { p_action: string; p_data: Json; p_job: string }
        Returns: Json
      }
      prepare_communication: {
        Args: {
          p_channel: string
          p_id: string
          p_kind: string
          p_message: string
          p_recipient: string
          p_request: string
        }
        Returns: Json
      }
      preview_document: {
        Args: { p_id: string; p_kind: string }
        Returns: Json
      }
      read_customer_approval: { Args: { p_token: string }; Returns: Json }
      read_customer_document: { Args: { p_token: string }; Returns: Json }
      record_staff_approval: {
        Args: {
          p_ack: boolean
          p_decisions: Json
          p_estimate: string
          p_method: string
          p_name: string
          p_note: string
        }
        Returns: boolean
      }
      revoke_document_link: { Args: { p_id: string }; Returns: undefined }
      save_inspection: {
        Args: {
          p_acknowledge_unchecked: boolean
          p_complete: boolean
          p_id: string
          p_items: Json
          p_summary: string
          p_updated_at: string
        }
        Returns: string
      }
      submit_customer_approval: {
        Args: {
          p_ack: boolean
          p_decisions: Json
          p_name: string
          p_note: string
          p_token: string
        }
        Returns: boolean
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
