export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      b2b_employees: {
        Row: {
          b2b_partner_id: number | null
          b2b_partner_name: string
          created_at: string
          email: string | null
          employee_id: string
          first_name: string
          id: string
          last_name: string
          state: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          b2b_partner_id?: number | null
          b2b_partner_name: string
          created_at?: string
          email?: string | null
          employee_id: string
          first_name: string
          id?: string
          last_name: string
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          b2b_partner_id?: number | null
          b2b_partner_name?: string
          created_at?: string
          email?: string | null
          employee_id?: string
          first_name?: string
          id?: string
          last_name?: string
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_employees_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "B2B_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_b2b_partner"
            columns: ["b2b_partner_name"]
            isOneToOne: false
            referencedRelation: "B2B_partners"
            referencedColumns: ["name"]
          },
        ]
      }
      B2B_partners: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      blog_read_activity: {
        Row: {
          blog_id: string
          blog_link: string
          blog_title: string
          created_at: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          blog_id: string
          blog_link: string
          blog_title: string
          created_at?: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          blog_link?: string
          blog_title?: string
          created_at?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_departments: {
        Row: {
          b2b_partner_id: number
          created_at: string
          department_headcount: number
          department_name: string
          id: string
          job_type: string
          updated_at: string
        }
        Insert: {
          b2b_partner_id: number
          created_at?: string
          department_headcount?: number
          department_name: string
          id?: string
          job_type: string
          updated_at?: string
        }
        Update: {
          b2b_partner_id?: number
          created_at?: string
          department_headcount?: number
          department_name?: string
          id?: string
          job_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_departments_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "B2B_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_exercises: {
        Row: {
          assessment_id: string
          completed_at: string
          exercise_title: string
          id: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string
          exercise_title: string
          id?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string
          exercise_title?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_exercises_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "user_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_job_properties: {
        Row: {
          created_at: string
          department_id: string
          id: string
          job_property_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          job_property_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          job_property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_job_properties_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "company_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_job_properties_job_property_id_fkey"
            columns: ["job_property_id"]
            isOneToOne: false
            referencedRelation: "job_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      department_pain_trends: {
        Row: {
          avg_pain_level: number | null
          b2b_partner_id: number
          calculated_date: string
          created_at: string
          department_id: string
          id: string
          trend_direction: string | null
          user_id: string
        }
        Insert: {
          avg_pain_level?: number | null
          b2b_partner_id: number
          calculated_date?: string
          created_at?: string
          department_id: string
          id?: string
          trend_direction?: string | null
          user_id: string
        }
        Update: {
          avg_pain_level?: number | null
          b2b_partner_id?: number
          calculated_date?: string
          created_at?: string
          department_id?: string
          id?: string
          trend_direction?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_pain_trends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exercise_completion_clicks: {
        Row: {
          assessment_id: string
          clicked_at: string
          created_at: string
          exercise_title: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          assessment_id: string
          clicked_at?: string
          created_at?: string
          exercise_title: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          assessment_id?: string
          clicked_at?: string
          created_at?: string
          exercise_title?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      exercise_feedback: {
        Row: {
          created_at: string
          exercise_title: string
          feedback_value: number
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          exercise_title: string
          feedback_value: number
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          exercise_title?: string
          feedback_value?: number
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      exercise_swaps: {
        Row: {
          assessment_id: string | null
          created_at: string
          id: string
          original_video_id: string
          replacement_video_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          original_video_id: string
          replacement_video_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          original_video_id?: string
          replacement_video_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_blogs: {
        Row: {
          blog_description: string | null
          blog_id: string
          blog_image_url: string | null
          blog_link: string
          blog_title: string
          created_at: string
          id: string
          is_external: boolean
          user_id: string
        }
        Insert: {
          blog_description?: string | null
          blog_id: string
          blog_image_url?: string | null
          blog_link: string
          blog_title: string
          created_at?: string
          id?: string
          is_external?: boolean
          user_id: string
        }
        Update: {
          blog_description?: string | null
          blog_id?: string
          blog_image_url?: string | null
          blog_link?: string
          blog_title?: string
          created_at?: string
          id?: string
          is_external?: boolean
          user_id?: string
        }
        Relationships: []
      }
      favorite_exercises: {
        Row: {
          created_at: string
          description: string | null
          exercise_title: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exercise_title: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exercise_title?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      follow_up_responses: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          pain_level: number
          responses: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          pain_level: number
          responses?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          pain_level?: number
          responses?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "user_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_managers: {
        Row: {
          b2b_partner: number | null
          email: string
          "full name": string | null
          id: string
          password_hash: string | null
        }
        Insert: {
          b2b_partner?: number | null
          email: string
          "full name"?: string | null
          id?: string
          password_hash?: string | null
        }
        Update: {
          b2b_partner?: number | null
          email?: string
          "full name"?: string | null
          id?: string
          password_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_managers_b2b_partner_fkey"
            columns: ["b2b_partner"]
            isOneToOne: false
            referencedRelation: "B2B_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      job_properties: {
        Row: {
          created_at: string
          id: string
          property_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_name: string
        }
        Update: {
          created_at?: string
          id?: string
          property_name?: string
        }
        Relationships: []
      }
      mood_entries: {
        Row: {
          created_at: string
          id: string
          mood_date: string
          mood_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood_date: string
          mood_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood_date?: string
          mood_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      msk_profiles: {
        Row: {
          b2b_employee_id: string | null
          created_at: string
          id: string
          pain_areas: Json | null
          pain_level_improvement: number | null
          pain_level_initial: number | null
          resolved_bodyarea: Json | null
        }
        Insert: {
          b2b_employee_id?: string | null
          created_at?: string
          id?: string
          pain_areas?: Json | null
          pain_level_improvement?: number | null
          pain_level_initial?: number | null
          resolved_bodyarea?: Json | null
        }
        Update: {
          b2b_employee_id?: string | null
          created_at?: string
          id?: string
          pain_areas?: Json | null
          pain_level_improvement?: number | null
          pain_level_initial?: number | null
          resolved_bodyarea?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "msk_profiles_b2b_employee_id_fkey"
            columns: ["b2b_employee_id"]
            isOneToOne: false
            referencedRelation: "b2b_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      orebro_responses: {
        Row: {
          anonymous_id: string | null
          created_at: string
          id: string
          responses: Json
          risk_level: string | null
          total_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          id?: string
          responses: Json
          risk_level?: string | null
          total_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          id?: string
          responses?: Json
          risk_level?: string | null
          total_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          profile_picture_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          profile_picture_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          profile_picture_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      secondary_programs: {
        Row: {
          created_at: string
          id: string
          program_type: string
          secondary_exercise_name: string
          secondary_program: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_type: string
          secondary_exercise_name: string
          secondary_program: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_type?: string
          secondary_exercise_name?: string
          secondary_program?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_2_employees: {
        Row: {
          b2b_partner_id: number
          b2b_partner_name: string
          created_at: string
          email: string | null
          employee_id: string
          first_name: string
          id: string
          last_name: string
          state: string
          updated_at: string
        }
        Insert: {
          b2b_partner_id: number
          b2b_partner_name: string
          created_at?: string
          email?: string | null
          employee_id: string
          first_name: string
          id?: string
          last_name: string
          state?: string
          updated_at?: string
        }
        Update: {
          b2b_partner_id?: number
          b2b_partner_name?: string
          created_at?: string
          email?: string | null
          employee_id?: string
          first_name?: string
          id?: string
          last_name?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_2_employees_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "B2B_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_2_employees_b2b_partner_name_fkey"
            columns: ["b2b_partner_name"]
            isOneToOne: false
            referencedRelation: "B2B_partners"
            referencedColumns: ["name"]
          },
        ]
      }
      user_assessments: {
        Row: {
          id: string
          intial_pain_intensity: number | null
          pain_area: string
          primary_differential: string
          primary_mechanism: string
          program_ended_at: string | null
          program_start_date: string | null
          sin_group: string
          timestamp: string
          user_id: string
        }
        Insert: {
          id?: string
          intial_pain_intensity?: number | null
          pain_area: string
          primary_differential: string
          primary_mechanism: string
          program_ended_at?: string | null
          program_start_date?: string | null
          sin_group: string
          timestamp?: string
          user_id: string
        }
        Update: {
          id?: string
          intial_pain_intensity?: number | null
          pain_area?: string
          primary_differential?: string
          primary_mechanism?: string
          program_ended_at?: string | null
          program_start_date?: string | null
          sin_group?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          created_at: string
          goal_type: string
          id: string
          updated_at: string
          user_id: string
          weekly_exercises_goal: number
        }
        Insert: {
          created_at?: string
          goal_type: string
          id?: string
          updated_at?: string
          user_id: string
          weekly_exercises_goal: number
        }
        Update: {
          created_at?: string
          goal_type?: string
          id?: string
          updated_at?: string
          user_id?: string
          weekly_exercises_goal?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          b2b_partner_id: number | null
          b2b_partner_name: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          employee_id: string | null
          first_name: string | null
          gender: string | null
          id: string
          job_properties: string | null
          job_type: string | null
          last_name: string | null
          pain_area: string | null
          updated_at: string | null
          user_id: string
          year_birth: number | null
        }
        Insert: {
          b2b_partner_id?: number | null
          b2b_partner_name?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          job_properties?: string | null
          job_type?: string | null
          last_name?: string | null
          pain_area?: string | null
          updated_at?: string | null
          user_id: string
          year_birth?: number | null
        }
        Update: {
          b2b_partner_id?: number | null
          b2b_partner_name?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          job_properties?: string | null
          job_type?: string | null
          last_name?: string | null
          pain_area?: string | null
          updated_at?: string | null
          user_id?: string
          year_birth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_b2b_partner_id_fkey"
            columns: ["b2b_partner_id"]
            isOneToOne: false
            referencedRelation: "B2B_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_b2b_partner_name_fkey"
            columns: ["b2b_partner_name"]
            isOneToOne: false
            referencedRelation: "B2B_partners"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "user_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "company_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "b2b_employees"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      user_program_tracking: {
        Row: {
          assessment_id: string
          b2b_employee_id: string | null
          created_at: string
          exercise_goal_completion: number[] | null
          id: string
          initial_pain_level: number | null
          pain_area: string
          pain_level_ended: number | null
          pain_level_followup: number | null
          primary_differential: string
          primary_mechanism: string
          program_deleted_at: string | null
          program_ended_at: string | null
          program_started_at: string
          program_status: Database["public"]["Enums"]["program_status"]
          sin_group: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          b2b_employee_id?: string | null
          created_at?: string
          exercise_goal_completion?: number[] | null
          id?: string
          initial_pain_level?: number | null
          pain_area: string
          pain_level_ended?: number | null
          pain_level_followup?: number | null
          primary_differential: string
          primary_mechanism: string
          program_deleted_at?: string | null
          program_ended_at?: string | null
          program_started_at?: string
          program_status?: Database["public"]["Enums"]["program_status"]
          sin_group: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          b2b_employee_id?: string | null
          created_at?: string
          exercise_goal_completion?: number[] | null
          id?: string
          initial_pain_level?: number | null
          pain_area?: string
          pain_level_ended?: number | null
          pain_level_followup?: number | null
          primary_differential?: string
          primary_mechanism?: string
          program_deleted_at?: string | null
          program_ended_at?: string | null
          program_started_at?: string
          program_status?: Database["public"]["Enums"]["program_status"]
          sin_group?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_weekly_exercise_goals: {
        Row: {
          created_at: string
          fifth_month_week: number | null
          first_month_week: number | null
          fourth_month_week: number | null
          goal_type: string
          id: string
          month_year: string
          second_month_week: number | null
          third_month_week: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fifth_month_week?: number | null
          first_month_week?: number | null
          fourth_month_week?: number | null
          goal_type?: string
          id?: string
          month_year: string
          second_month_week?: number | null
          third_month_week?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fifth_month_week?: number | null
          first_month_week?: number | null
          fourth_month_week?: number | null
          goal_type?: string
          id?: string
          month_year?: string
          second_month_week?: number | null
          third_month_week?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          b2b_employee_id: string | null
          created_at: string
          hr_manager_id: string | null
          id: string
          updated_at: string
          user_type: string
        }
        Insert: {
          b2b_employee_id?: string | null
          created_at?: string
          hr_manager_id?: string | null
          id: string
          updated_at?: string
          user_type: string
        }
        Update: {
          b2b_employee_id?: string | null
          created_at?: string
          hr_manager_id?: string | null
          id?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_b2b_employee_id_fkey"
            columns: ["b2b_employee_id"]
            isOneToOne: false
            referencedRelation: "b2b_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_hr_manager_id_fkey"
            columns: ["hr_manager_id"]
            isOneToOne: false
            referencedRelation: "hr_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goal_completions: {
        Row: {
          created_at: string
          exercises_completed: number
          goal_met: boolean
          goal_target: number
          id: string
          updated_at: string
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          exercises_completed?: number
          goal_met?: boolean
          goal_target: number
          id?: string
          updated_at?: string
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          exercises_completed?: number
          goal_met?: boolean
          goal_target?: number
          id?: string
          updated_at?: string
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_department_avg_pain_level: {
        Args: { target_b2b_partner_id: number }
        Returns: {
          department_id: string
          department_name: string
          avg_pain_level: number
          employee_count: number
        }[]
      }
      calculate_exercise_goal_completion: {
        Args: { target_user_id: string; target_month: string }
        Returns: number[]
      }
      calculate_weekly_completion_percentage: {
        Args: {
          target_user_id: string
          week_start_date: string
          week_end_date: string
        }
        Returns: number
      }
      get_latest_pain_level: {
        Args: { assessment_id_param: string; user_id_param: string }
        Returns: {
          pain_level: number
          created_at: string
        }[]
      }
      get_user_b2b_partner_id: {
        Args: { user_id: string }
        Returns: number
      }
      get_user_program_stats: {
        Args: { target_user_id?: string }
        Returns: {
          user_id: string
          b2b_employee_id: string
          active_programs: number
          ended_programs: number
          deleted_programs: number
          total_programs: number
        }[]
      }
      get_week_of_month: {
        Args: { target_date: string; target_month_year: string }
        Returns: number
      }
      is_hr_manager: {
        Args: { user_id: string }
        Returns: boolean
      }
      populate_all_weekly_exercise_goals: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      populate_weekly_exercise_goals_for_user: {
        Args: {
          target_user_id: string
          start_month?: string
          end_month?: string
        }
        Returns: undefined
      }
      update_all_exercise_goal_completions: {
        Args: { target_month?: string }
        Returns: undefined
      }
      update_all_weekly_goal_completions: {
        Args: { target_week_start?: string }
        Returns: undefined
      }
      update_department_pain_trends: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_exercise_goal_completion: {
        Args: { target_user_id: string; target_month?: string }
        Returns: undefined
      }
      update_weekly_exercise_goals_for_month: {
        Args: { target_user_id: string; target_month_year: string }
        Returns: undefined
      }
      update_weekly_goal_completion: {
        Args: {
          target_user_id: string
          target_week_start: string
          target_week_end: string
        }
        Returns: undefined
      }
    }
    Enums: {
      program_status: "active" | "ended" | "deleted"
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
      program_status: ["active", "ended", "deleted"],
    },
  },
} as const
