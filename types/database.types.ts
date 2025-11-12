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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      class_codes: {
        Row: {
          class_code: string
          class_code_id: number
          class_id: number
          expires_at: string
        }
        Insert: {
          class_code: string
          class_code_id?: never
          class_id: number
          expires_at: string
        }
        Update: {
          class_code?: string
          class_code_id?: never
          class_id?: number
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_codes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
        ]
      }
      class_knowledge_graph: {
        Row: {
          class_id: number
          edges: string[]
          graph_id: number
          nodes: string[]
          react_flow_data: Json[]
        }
        Insert: {
          class_id: number
          edges: string[]
          graph_id?: never
          nodes: string[]
          react_flow_data: Json[]
        }
        Update: {
          class_id?: number
          edges?: string[]
          graph_id?: never
          nodes?: string[]
          react_flow_data?: Json[]
        }
        Relationships: [
          {
            foreignKeyName: "class_knowledge_graph_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
        ]
      }
      class_lesson_bank: {
        Row: {
          class_id: number
          lesson_id: number
          owner_id: string
        }
        Insert: {
          class_id: number
          lesson_id: number
          owner_id: string
        }
        Update: {
          class_id?: number
          lesson_id?: number
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_lesson_bank_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_lesson_bank_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "class_lesson_bank_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["professor_id"]
          },
        ]
      }
      class_question_bank: {
        Row: {
          class_id: number
          owner_id: string
          question_id: number
        }
        Insert: {
          class_id: number
          owner_id: string
          question_id: number
        }
        Update: {
          class_id?: number
          owner_id?: string
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_question_bank_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_question_bank_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["professor_id"]
          },
          {
            foreignKeyName: "class_question_bank_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["question_id"]
          },
        ]
      }
      classes: {
        Row: {
          class_id: number
          description: string | null
          level: number
          name: string
          section_number: string
        }
        Insert: {
          class_id?: never
          description?: string | null
          level?: number
          name: string
          section_number: string
        }
        Update: {
          class_id?: never
          description?: string | null
          level?: number
          name?: string
          section_number?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          class_id: number
          student_id: string
          student_name: string | null
        }
        Insert: {
          class_id: number
          student_id: string
          student_name?: string | null
        }
        Update: {
          class_id?: number
          student_id?: string
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      leitner_schedule: {
        Row: {
          box: number | null
          class_id: number | null
          created_at: string | null
          id: string
          last_quiz_attempts: number | null
          last_quiz_correct: number | null
          last_reviewed: string | null
          next_review: string | null
          node_label: string
          streak: number | null
          student_id: string
          total_attempts: number
          total_correct: number
        }
        Insert: {
          box?: number | null
          class_id?: number | null
          created_at?: string | null
          id?: string
          last_quiz_attempts?: number | null
          last_quiz_correct?: number | null
          last_reviewed?: string | null
          next_review?: string | null
          node_label: string
          streak?: number | null
          student_id: string
          total_attempts: number
          total_correct: number
        }
        Update: {
          box?: number | null
          class_id?: number | null
          created_at?: string | null
          id?: string
          last_quiz_attempts?: number | null
          last_quiz_correct?: number | null
          last_reviewed?: string | null
          next_review?: string | null
          node_label?: string
          streak?: number | null
          student_id?: string
          total_attempts?: number
          total_correct?: number
        }
        Relationships: [
          {
            foreignKeyName: "node_schedule_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "node_schedule_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      lesson_question_bank: {
        Row: {
          lesson_id: number
          owner_id: string
          question_id: number
        }
        Insert: {
          lesson_id: number
          owner_id: string
          question_id: number
        }
        Update: {
          lesson_id?: number
          owner_id?: string
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_question_bank_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "lesson_question_bank_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["professor_id"]
          },
          {
            foreignKeyName: "lesson_question_bank_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["question_id"]
          },
        ]
      }
      lessons: {
        Row: {
          lesson_id: number
          name: string
          topics: string[]
        }
        Insert: {
          lesson_id?: never
          name: string
          topics: string[]
        }
        Update: {
          lesson_id?: never
          name?: string
          topics?: string[]
        }
        Relationships: []
      }
      professor_courses: {
        Row: {
          class_id: number
          owner_id: string
        }
        Insert: {
          class_id: number
          owner_id: string
        }
        Update: {
          class_id?: number
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "professor_courses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["professor_id"]
          },
        ]
      }
      professor_lessons: {
        Row: {
          lesson_id: number
          owner_id: string
        }
        Insert: {
          lesson_id: number
          owner_id: string
        }
        Update: {
          lesson_id?: number
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "professor_lessons_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["professor_id"]
          },
        ]
      }
      professor_questions: {
        Row: {
          owner_id: string
          question_id: number
        }
        Insert: {
          owner_id: string
          question_id: number
        }
        Update: {
          owner_id?: string
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "professor_questions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["professor_id"]
          },
          {
            foreignKeyName: "professor_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["question_id"]
          },
        ]
      }
      professors: {
        Row: {
          professor_id: string
        }
        Insert: {
          professor_id: string
        }
        Update: {
          professor_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string
          answer_options: string[]
          image_url: string | null
          is_ai_generated: boolean
          owner_id: string | null
          prompt: string
          question_id: number
          question_type: string
          snippet: string | null
          topics: string[]
        }
        Insert: {
          answer: string
          answer_options: string[]
          image_url?: string | null
          is_ai_generated?: boolean
          owner_id?: string | null
          prompt: string
          question_id?: never
          question_type: string
          snippet?: string | null
          topics: string[]
        }
        Update: {
          answer?: string
          answer_options?: string[]
          image_url?: string | null
          is_ai_generated?: boolean
          owner_id?: string | null
          prompt?: string
          question_id?: never
          question_type?: string
          snippet?: string | null
          topics?: string[]
        }
        Relationships: []
      }
      student_knowledge_graph: {
        Row: {
          class_id: number
          edges: string[]
          graph_id: number
          nodes: string[]
          react_flow_data: Json[]
          student_id: string
        }
        Insert: {
          class_id: number
          edges: string[]
          graph_id?: never
          nodes: string[]
          react_flow_data: Json[]
          student_id: string
        }
        Update: {
          class_id?: number
          edges?: string[]
          graph_id?: never
          nodes?: string[]
          react_flow_data?: Json[]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_knowledge_graph_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "student_knowledge_graph_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_question_answers: {
        Row: {
          answer_id: number
          answered_at: string
          class_id: number | null
          is_correct: boolean
          lesson_id: number | null
          question_id: number | null
          raw_response: Json
          selected_answer: string
          student_id: string
        }
        Insert: {
          answer_id?: number
          answered_at?: string
          class_id?: number | null
          is_correct: boolean
          lesson_id?: number | null
          question_id?: number | null
          raw_response: Json
          selected_answer: string
          student_id: string
        }
        Update: {
          answer_id?: number
          answered_at?: string
          class_id?: number | null
          is_correct?: boolean
          lesson_id?: number | null
          question_id?: number | null
          raw_response?: Json
          selected_answer?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_question_answers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "student_question_answers_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["lesson_id"]
          },
          {
            foreignKeyName: "student_question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "student_question_answers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      students: {
        Row: {
          consent: boolean | null
          display_name: string | null
          email: string | null
          over_18: boolean | null
          student_id: string
        }
        Insert: {
          consent?: boolean | null
          display_name?: string | null
          email?: string | null
          over_18?: boolean | null
          student_id: string
        }
        Update: {
          consent?: boolean | null
          display_name?: string | null
          email?: string | null
          over_18?: boolean | null
          student_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          email: string | null
          last_sign_in_at: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          last_sign_in_at?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          last_sign_in_at?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_user_into_respective_table: {
        Args: { user_id: string; user_type: string }
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
  public: {
    Enums: {},
  },
} as const
