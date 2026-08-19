/**
 * Hand-written to mirror supabase/migrations/0001_core_schema.sql exactly.
 *
 * Once you have the Supabase CLI linked to your project, you can replace
 * this file with a fully auto-generated one:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/lib/types/database.ts
 * Until then, keep this file in sync by hand whenever a migration changes
 * a table's shape.
 */

export type Role = "superadmin" | "school_admin" | "teacher" | "parent";

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schools"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: Role;
          school_id: string | null;
          full_name: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: Role;
          school_id?: string | null;
          full_name: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          school_id: string;
          grade: number;
          section: string;
          name: string;
          teacher_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          grade: number;
          section: string;
          name: string;
          teacher_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["classes"]["Insert"]>;
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          school_id: string;
          class_id: string | null;
          name: string;
          father_name: string | null;
          roll_no: number | null;
          gender: string | null;
          dob: string | null;
          date_of_admission: string | null;
          contact: string | null;
          address: string | null;
          monthly_fee: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_id?: string | null;
          name: string;
          father_name?: string | null;
          roll_no?: number | null;
          gender?: string | null;
          dob?: string | null;
          date_of_admission?: string | null;
          contact?: string | null;
          address?: string | null;
          monthly_fee?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
        Relationships: [];
      };
      parent_student_links: {
        Row: { parent_id: string; student_id: string };
        Insert: { parent_id: string; student_id: string };
        Update: Partial<
          Database["public"]["Tables"]["parent_student_links"]["Insert"]
        >;
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          school_id: string;
          class_id: string;
          student_id: string;
          date: string;
          status: "present" | "absent" | "leave";
          marked_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_id: string;
          student_id: string;
          date: string;
          status: "present" | "absent" | "leave";
          marked_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Insert"]>;
        Relationships: [];
      };
      marks: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          subject: string;
          first: number | null;
          mid: number | null;
          final: number | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          subject: string;
          first?: number | null;
          mid?: number | null;
          final?: number | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["marks"]["Insert"]>;
        Relationships: [];
      };
      homework: {
        Row: {
          id: string;
          school_id: string;
          class_id: string;
          subject: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_id: string;
          subject?: string | null;
          title: string;
          description?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["homework"]["Insert"]>;
        Relationships: [];
      };
      homework_completions: {
        Row: {
          id: string;
          homework_id: string;
          student_id: string;
          completed_by: string | null;
          photo_url: string | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          homework_id: string;
          student_id: string;
          completed_by?: string | null;
          photo_url?: string | null;
          completed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["homework_completions"]["Insert"]>;
        Relationships: [];
      };
      student_remarks: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          class_id: string;
          teacher_id: string | null;
          remark: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          class_id: string;
          teacher_id?: string | null;
          remark: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_remarks"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          school_id: string;
          parent_id: string;
          student_id: string | null;
          type: string;
          title: string;
          message: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          parent_id: string;
          student_id?: string | null;
          type: string;
          title: string;
          message?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      fees: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          month: string;
          status: "paid" | "unpaid";
          paid_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          month: string;
          status?: "paid" | "unpaid";
          paid_at?: string | null;
          verified_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["fees"]["Insert"]>;
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          school_id: string;
          category: string;
          name: string;
          serial_key: string | null;
          os: string | null;
          classroom: string | null;
          assigned_users: string[] | null;
          quantity: number;
          publisher: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          deletion_requested: boolean;
          deletion_requested_by: string | null;
          deletion_requested_at: string | null;
          image_url: string | null;
          purchase_date: string | null;
          allocation_date: string | null;
          supplier: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          category: string;
          name: string;
          serial_key?: string | null;
          os?: string | null;
          classroom?: string | null;
          assigned_users?: string[] | null;
          quantity?: number;
          publisher?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          deletion_requested?: boolean;
          deletion_requested_by?: string | null;
          deletion_requested_at?: string | null;
          image_url?: string | null;
          purchase_date?: string | null;
          allocation_date?: string | null;
          supplier?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string | null;
          actor_role: Role | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          target_label: string | null;
          school_id: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          actor_role?: Role | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          target_label?: string | null;
          school_id?: string | null;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      assessment_components: {
        Row: {
          id: string;
          school_id: string;
          class_id: string;
          subject: string;
          name: string;
          weight: number;
          included: boolean;
          is_default: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_id: string;
          subject: string;
          name: string;
          weight?: number;
          included?: boolean;
          is_default?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assessment_components"]["Insert"]>;
        Relationships: [];
      };
      mark_entries: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          component_id: string;
          score: number | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          component_id: string;
          score?: number | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mark_entries"]["Insert"]>;
        Relationships: [];
      };
      subject_assignments: {
        Row: {
          id: string;
          school_id: string;
          class_id: string;
          subject: string;
          teacher_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_id: string;
          subject: string;
          teacher_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subject_assignments"]["Insert"]>;
        Relationships: [];
      };
      funding: {
        Row: {
          id: string;
          school_id: string;
          amount: number;
          purpose: string | null;
          allocated_by: string | null;
          allocated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          amount: number;
          purpose?: string | null;
          allocated_by?: string | null;
          allocated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["funding"]["Insert"]>;
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          school_id: string;
          funding_id: string | null;
          amount: number;
          description: string | null;
          file_url: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          funding_id?: string | null;
          amount: number;
          description?: string | null;
          file_url?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bills"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: Role;
    };
  };
}
