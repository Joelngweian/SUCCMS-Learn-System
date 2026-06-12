// Supabase Database Types
// Auto-generated based on schema.sql

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'student' | 'lecturer' | 'admin';
          program_or_department: string | null;
          faculty: string | null;
          programme: string | null;
          avatar_url: string | null;
          cover_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
          is_active: boolean;
          last_login_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'student' | 'lecturer' | 'admin';
          program_or_department?: string | null;
          faculty?: string | null;
          programme?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'student' | 'lecturer' | 'admin';
          program_or_department?: string | null;
          faculty?: string | null;
          programme?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          last_login_at?: string | null;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string;
          report_type: 'user' | 'story';
          story_id: string | null;
          reason: string;
          details: string | null;
          severity: 'low' | 'medium' | 'high';
          status: 'pending' | 'resolved';
          resolved_by: string | null;
          resolved_at: string | null;
          resolution_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id: string;
          report_type: 'user' | 'story';
          story_id?: string | null;
          reason: string;
          details?: string | null;
          severity?: 'low' | 'medium' | 'high';
          status?: 'pending' | 'resolved';
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reason?: string;
          details?: string | null;
          severity?: 'low' | 'medium' | 'high';
          status?: 'pending' | 'resolved';
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          code: string;
          course_code: string | null;
          name: string;
          chinese_name: string | null;
          description: string | null;
          lecturer_id: string | null;
          faculty: string | null;
          programme: string | null;
          course_type: string | null;
          credit_hours: number | null;
          credits: number | null;
          max_capacity: number | null;
          max_students: number | null;
          enrollment_key: string | null;
          status: string | null;
          semester: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          course_code?: string | null;
          name: string;
          chinese_name?: string | null;
          description?: string | null;
          lecturer_id?: string | null;
          faculty?: string | null;
          programme?: string | null;
          course_type?: string | null;
          credit_hours?: number | null;
          credits?: number | null;
          max_capacity?: number | null;
          max_students?: number | null;
          enrollment_key?: string | null;
          status?: string | null;
          semester?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          course_code?: string | null;
          name?: string;
          chinese_name?: string | null;
          description?: string | null;
          lecturer_id?: string | null;
          faculty?: string | null;
          programme?: string | null;
          course_type?: string | null;
          credit_hours?: number | null;
          credits?: number | null;
          max_capacity?: number | null;
          max_students?: number | null;
          enrollment_key?: string | null;
          status?: string | null;
          semester?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      academic_terms: {
        Row: {
          id: string;
          code: string;
          name: string;
          starts_at: string | null;
          ends_at: string | null;
          status: 'planned' | 'active' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: 'planned' | 'active' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: 'planned' | 'active' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
      };
      course_offerings: {
        Row: {
          id: string;
          course_id: string;
          academic_term_id: string;
          owner_id: string | null;
          section_code: string;
          enrollment_key: string;
          max_capacity: number | null;
          status: 'active' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          academic_term_id: string;
          owner_id?: string | null;
          section_code: string;
          enrollment_key: string;
          max_capacity?: number | null;
          status?: 'active' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          academic_term_id?: string;
          owner_id?: string | null;
          section_code?: string;
          enrollment_key?: string;
          max_capacity?: number | null;
          status?: 'active' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
      };
      course_enrollments: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          enrolled_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          enrolled_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          student_id?: string;
          enrolled_at?: string;
        };
      };
      course_instructors: {
        Row: {
          id: string;
          course_id: string;
          user_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          user_id: string;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          user_id?: string;
          assigned_at?: string;
        };
      };
      course_materials: {
        Row: {
          id: string;
          course_id: string;
          parent_id: string | null;
          title: string;
          description: string | null;
          file_path: string | null;
          file_url: string | null;
          file_type: string | null;
          size: number | null;
          ms_drive_id: string | null;
          ms_drive_item_id: string | null;
          ms_web_url: string | null;
          ms_edit_url: string | null;
          ms_last_synced_at: string | null;
          created_by: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
          downloads_count: number | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          parent_id?: string | null;
          title: string;
          description?: string | null;
          file_path?: string | null;
          file_url?: string | null;
          file_type?: string | null;
          size?: number | null;
          ms_drive_id?: string | null;
          ms_drive_item_id?: string | null;
          ms_web_url?: string | null;
          ms_edit_url?: string | null;
          ms_last_synced_at?: string | null;
          created_by?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
          downloads_count?: number | null;
        };
        Update: {
          id?: string;
          course_id?: string;
          parent_id?: string | null;
          title?: string;
          description?: string | null;
          file_path?: string | null;
          file_url?: string | null;
          file_type?: string | null;
          size?: number | null;
          ms_drive_id?: string | null;
          ms_drive_item_id?: string | null;
          ms_web_url?: string | null;
          ms_edit_url?: string | null;
          ms_last_synced_at?: string | null;
          created_by?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
          downloads_count?: number | null;
        };
      };
      course_posts: {
        Row: {
          id: string;
          course_id: string;
          author_id: string;
          author_name: string;
          content: string;
          attachments: Array<{ name: string; path: string; url: string; type: string; size: number }>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          author_id: string;
          author_name: string;
          content?: string;
          attachments?: Array<{ name: string; path: string; url: string; type: string; size: number }>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          author_id?: string;
          author_name?: string;
          content?: string;
          attachments?: Array<{ name: string; path: string; url: string; type: string; size: number }>;
          created_at?: string;
          updated_at?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          created_by: string;
          due_date: string;
          max_score: number;
          attachments: Array<{name: string, path: string}> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          created_by: string;
          due_date: string;
          max_score?: number;
          attachments?: Array<{name: string, path: string}> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          created_by?: string;
          due_date?: string;
          max_score?: number;
          attachments?: Array<{name: string, path: string}> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      assignment_submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          submission_file_url: string | null;
          submission_text: string | null;
          submitted_at: string;
          is_late: boolean;
          files: Array<{name: string, path: string}> | null;
          grade: number | null;
          feedback: string | null;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          submission_file_url?: string | null;
          submission_text?: string | null;
          submitted_at?: string;
          is_late?: boolean;
          files?: Array<{name: string, path: string}> | null;
          grade?: number | null;
          feedback?: string | null;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          submission_file_url?: string | null;
          submission_text?: string | null;
          submitted_at?: string;
          is_late?: boolean;
          files?: Array<{name: string, path: string}> | null;
          grade?: number | null;
          feedback?: string | null;
        };
      };
      student_grades: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          assignment_id: string | null;
          score: number;
          max_score: number;
          graded_by: string;
          feedback: string | null;
          graded_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          assignment_id?: string | null;
          score: number;
          max_score?: number;
          graded_by: string;
          feedback?: string | null;
          graded_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          student_id?: string;
          assignment_id?: string | null;
          score?: number;
          max_score?: number;
          graded_by?: string;
          feedback?: string | null;
          graded_at?: string;
        };
      };
      student_gpa: {
        Row: {
          id: string;
          student_id: string;
          gpa: number;
          total_credits: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          gpa?: number;
          total_credits?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          gpa?: number;
          total_credits?: number;
          updated_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          class_date: string;
          marked_present: boolean;
          marked_at: string;
          marked_by: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          class_date: string;
          marked_present?: boolean;
          marked_at?: string;
          marked_by: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          student_id?: string;
          class_date?: string;
          marked_present?: boolean;
          marked_at?: string;
          marked_by?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          course_id: string | null;
          author_id: string;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
          is_pinned: boolean;
          is_locked: boolean;
        };
        Insert: {
          id?: string;
          course_id?: string | null;
          author_id: string;
          title: string;
          content: string;
          created_at?: string;
          updated_at?: string;
          is_pinned?: boolean;
          is_locked?: boolean;
        };
        Update: {
          id?: string;
          course_id?: string | null;
          author_id?: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
          is_pinned?: boolean;
          is_locked?: boolean;
        };
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          parent_comment_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          parent_comment_id?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          parent_comment_id?: string | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          user_id: string;
          content: string | null;
          content_type: 'image' | 'video' | 'text' | 'assignment' | 'grade' | 'course' | null;
          media_url: string | null;
          image_url: string | null;
          title: string | null;
          description: string | null;
          created_at: string;
          expires_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          content?: string | null;
          content_type?: 'image' | 'video' | 'text' | 'assignment' | 'grade' | 'course' | null;
          media_url?: string | null;
          image_url?: string | null;
          title?: string | null;
          description?: string | null;
          created_at?: string;
          expires_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          content_type?: 'image' | 'video' | 'text' | 'assignment' | 'grade' | 'course';
          media_url?: string | null;
          image_url?: string | null;
          title?: string | null;
          description?: string | null;
          created_at?: string;
          expires_at?: string;
          is_active?: boolean;
        };
      };
      announcements: {
        Row: {
          id: string;
          admin_id: string;
          title: string;
          content: string;
          priority: 'low' | 'medium' | 'high';
          attachments: Array<{ name: string; path: string; url: string; type: string; size: number }>;
          created_at: string;
          updated_at: string;
          expires_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          admin_id: string;
          title: string;
          content: string;
          priority?: 'low' | 'medium' | 'high';
          attachments?: Array<{ name: string; path: string; url: string; type: string; size: number }>;
          created_at?: string;
          updated_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          admin_id?: string;
          title?: string;
          content?: string;
          priority?: 'low' | 'medium' | 'high';
          attachments?: Array<{ name: string; path: string; url: string; type: string; size: number }>;
          created_at?: string;
          updated_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          type: string;
          title: string;
          message: string;
          course_id: string | null;
          entity_type: string | null;
          entity_id: string | null;
          action_url: string | null;
          metadata: Record<string, unknown>;
          dedupe_key: string;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          type: string;
          title: string;
          message?: string;
          course_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          action_url?: string | null;
          metadata?: Record<string, unknown>;
          dedupe_key: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_code: string;
          name: string;
          description: string;
          rarity: 'common' | 'rare' | 'epic' | 'legendary';
          xp_reward: number;
          earned_at: string;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_code: string;
          name: string;
          description: string;
          rarity: 'common' | 'rare' | 'epic' | 'legendary';
          xp_reward?: number;
          earned_at?: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          name?: string;
          description?: string;
          rarity?: 'common' | 'rare' | 'epic' | 'legendary';
          xp_reward?: number;
          earned_at?: string;
          metadata?: Record<string, unknown>;
        };
      };
      leaderboard: {
        Row: {
          id: string;
          student_id: string;
          course_id: string | null;
          average_score: number;
          rank: number | null;
          total_assignments_completed: number;
          attendance_percentage: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id?: string | null;
          average_score?: number;
          rank?: number | null;
          total_assignments_completed?: number;
          attendance_percentage?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string | null;
          average_score?: number;
          rank?: number | null;
          total_assignments_completed?: number;
          attendance_percentage?: number;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          theme: string;
          compact_mode: boolean;
          animations_enabled: boolean;
          email_notifications: boolean;
          assignment_reminders: boolean;
          forum_replies: boolean;
          grade_updates: boolean;
          course_announcements: boolean;
          achievement_alerts: boolean;
          sound_enabled: boolean;
          profile_visibility: string;
          show_online_status: boolean;
          show_progress: boolean;
          show_leaderboard: boolean;
          language: string;
          timezone: string;
          date_format: string;
          high_contrast: boolean;
          large_text: boolean;
          reduce_motion: boolean;
          push_notifications: boolean;
          sms_notifications: boolean;
          weekly_summary: boolean;
          marketing_emails: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['user_settings']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['user_settings']['Row']>;
      };
      login_history: {
        Row: {
          id: string;
          user_id: string;
          device: string | null;
          browser: string | null;
          ip_address: string | null;
          login_time: string;
          location: string | null;
        };
        Insert: Partial<Database['public']['Tables']['login_history']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['login_history']['Row']>;
      };
    };
    Views: {
      course_summary: {
        Row: {
          id: string;
          code: string;
          name: string;
          lecturer_id: string;
          lecturer_name: string | null;
          enrolled_students: number | null;
          created_at: string;
        };
      };
      student_course_summary: {
        Row: {
          course_id: string;
          code: string;
          name: string;
          lecturer_name: string | null;
          student_id: string;
          average_score: number;
          grades_received: number | null;
          last_graded: string | null;
        };
      };
      post_engagement: {
        Row: {
          id: string;
          title: string;
          author_id: string;
          like_count: number | null;
          comment_count: number | null;
          view_count: number | null;
          last_activity: string;
        };
      };
      active_stories_summary: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          content_type: string;
          created_at: string;
          expires_at: string;
          view_count: number | null;
        };
      };
    };
  };
};
