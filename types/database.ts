export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        ]
      }
      service_recommendations: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          estimated_cost: number | null
          id: string
          priority: string | null
          recommended_date: string | null
          recommended_mileage: number | null
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
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          recommended_date?: string | null
          recommended_mileage?: number | null
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
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          recommended_date?: string | null
          recommended_mileage?: number | null
          shop_id?: string
          status?: string
          title?: string
          updated_at?: string
          vehicle_id?: string
          work_order_id?: string | null
        }
        Relationships: [
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
      work_order_services: {
        Row: {
          created_at: string
          description: string
          id: string
          labor_amount: number | null
          labor_hours: number | null
          labor_rate: number | null
          service_category: string | null
          shop_id: string
          status: string
          technician_id: string | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          labor_amount?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          service_category?: string | null
          shop_id: string
          status?: string
          technician_id?: string | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          labor_amount?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          service_category?: string | null
          shop_id?: string
          status?: string
          technician_id?: string | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
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
      list_shop_technicians: {
        Args: { p_shop_id: string }
        Returns: {
          id: string
          label: string
        }[]
      }
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
