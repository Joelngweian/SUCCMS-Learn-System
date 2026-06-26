export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type Table<
  Row extends Record<string, unknown>,
  RequiredInsert extends keyof Row = never,
  Relationships extends Relationship[] = [],
> = {
  Row: Row
  Insert: Pick<Row, RequiredInsert> & Partial<Omit<Row, RequiredInsert>>
  Update: Partial<Row>
  Relationships: Relationships
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_terms: Table<
        {
          id: string
          code: string
          name: string
          starts_at: string | null
          ends_at: string | null
          status: string
          created_at: string
          updated_at: string
        },
        "code" | "name"
      >
      ai_recommendation_preferences: Table<
        {
          user_id: string
          recommendation_id: string
          title: string
          url: string
          is_bookmarked: boolean
          feedback: string | null
          created_at: string
          updated_at: string
        },
        "user_id" | "recommendation_id" | "title" | "url",
        [
          {
            foreignKeyName: "ai_recommendation_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      ai_grading_jobs: Table<
        {
          id: string
          assignment_id: string
          student_id: string
          requested_by: string
          status: "queued" | "processing" | "completed" | "failed"
          attempts: number
          max_attempts: number
          result: Json | null
          error_message: string | null
          model: string | null
          created_at: string
          started_at: string | null
          completed_at: string | null
          updated_at: string
        },
        "assignment_id" | "student_id" | "requested_by",
        [
          {
            foreignKeyName: "ai_grading_jobs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_grading_jobs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_grading_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      announcement_reads: Table<
        {
          id: string
          announcement_id: string
          user_id: string
          read_at: string
        },
        "announcement_id" | "user_id",
        [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      announcements: Table<
        {
          id: string
          admin_id: string
          title: string
          content: string
          priority: string
          created_at: string
          updated_at: string
          expires_at: string | null
          is_active: boolean | null
          attachments: Json
        },
        "admin_id" | "title" | "content",
        [
          {
            foreignKeyName: "announcements_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      assignment_submissions: Table<
        {
          id: string
          assignment_id: string
          student_id: string
          submission_file_url: string | null
          submission_text: string | null
          submitted_at: string
          is_late: boolean | null
          grade: number | null
          feedback: string | null
          files: Json | null
          rubric_grades: Json
        },
        "assignment_id" | "student_id",
        [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      assignments: Table<
        {
          id: string
          course_id: string
          assessment_type: string
          title: string
          description: string | null
          created_by: string
          due_date: string
          max_score: number | null
          created_at: string
          updated_at: string
          attachments: Json
          rubric: string | null
        },
        "course_id" | "title" | "created_by" | "due_date",
        [
          {
            foreignKeyName: "assignments_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      attendance: Table<
        {
          id: string
          course_id: string
          student_id: string
          class_date: string
          marked_present: boolean | null
          marked_at: string
          marked_by: string
          class_meeting_id: string | null
          session_id: string | null
          status: string
          check_in_at: string | null
          check_in_method: string | null
        },
        "course_id" | "student_id" | "class_date" | "marked_by",
        [
          {
            foreignKeyName: "attendance_class_meeting_id_fkey"
            columns: ["class_meeting_id"]
            isOneToOne: false
            referencedRelation: "attendance_class_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      >
      attendance_class_meetings: Table<
        {
          id: string
          course_id: string
          class_date: string
          starts_at: string
          ends_at: string
          slot_minutes: number
          total_slots: number
          created_by: string
          created_at: string
          updated_at: string
        },
        "course_id" | "starts_at" | "ends_at" | "created_by",
        [
          {
            foreignKeyName: "attendance_class_meetings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_class_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      attendance_sessions: Table<
        {
          id: string
          course_id: string
          class_meeting_id: string | null
          class_date: string
          slot_no: number
          slot_label: string | null
          check_in_code: string
          status: string
          starts_at: string
          ends_at: string
          check_in_window_minutes: number
          closed_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        },
        "course_id" | "class_date" | "check_in_code" | "ends_at" | "created_by",
        [
          {
            foreignKeyName: "attendance_sessions_class_meeting_id_fkey"
            columns: ["class_meeting_id"]
            isOneToOne: false
            referencedRelation: "attendance_class_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      campus_post_comments: Table<
        {
          id: string
          post_id: string
          author_id: string
          content: string
          attachments: Json
          created_at: string
          updated_at: string
        },
        "post_id" | "author_id",
        [
          {
            foreignKeyName: "campus_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "campus_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campus_post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      campus_post_reactions: Table<
        {
          post_id: string
          user_id: string
          reaction: "like" | "love" | "celebrate" | "support"
          created_at: string
        },
        "post_id" | "user_id",
        [
          {
            foreignKeyName: "campus_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "campus_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campus_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      campus_posts: Table<
        {
          id: string
          author_id: string
          content: string
          attachments: Json
          created_at: string
          updated_at: string
        },
        "author_id",
        [
          {
            foreignKeyName: "campus_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      course_enrollments: Table<
        {
          id: string
          course_id: string
          student_id: string
          enrolled_at: string
        },
        "course_id" | "student_id",
        [
          {
            foreignKeyName: "course_enrollments_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      course_assessment_items: Table<
        {
          id: string
          course_id: string
          item_type: string
          title: string
          max_marks: number
          weight_percentage: number
          position: number
          created_by: string
          updated_by: string
          created_at: string
          updated_at: string
        },
        | "course_id"
        | "item_type"
        | "title"
        | "max_marks"
        | "weight_percentage"
        | "position"
        | "created_by"
        | "updated_by",
        [
          {
            foreignKeyName: "course_assessment_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assessment_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assessment_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      course_creation_requests: Table<
        {
          id: string
          requested_by: string
          subject_code: string
          subject_name: string
          faculty: string | null
          programme: string | null
          credits: number | null
          reason: string
          status: string
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          generated_course_id: string | null
          created_at: string
          updated_at: string
        },
        "requested_by" | "subject_code" | "subject_name" | "reason",
        [
          {
            foreignKeyName: "course_creation_requests_generated_course_id_fkey"
            columns: ["generated_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_creation_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_creation_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      course_instructors: Table<
        {
          id: string
          course_id: string
          user_id: string
          assigned_at: string
        },
        "course_id" | "user_id",
        [
          {
            foreignKeyName: "course_instructors_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      course_materials: Table<
        {
          id: string
          course_id: string
          title: string
          description: string | null
          file_url: string | null
          file_type: string | null
          uploaded_by: string | null
          uploaded_at: string
          downloads_count: number | null
          ms_drive_id: string | null
          ms_drive_item_id: string | null
          ms_web_url: string | null
          ms_edit_url: string | null
          ms_last_synced_at: string | null
          parent_id: string | null
          file_path: string | null
          size: number | null
          created_by: string | null
        },
        "course_id" | "title",
        [
          {
            foreignKeyName: "course_materials_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      course_offerings: Table<
        {
          id: string
          course_id: string
          academic_term_id: string
          owner_id: string | null
          section_code: string
          enrollment_key: string
          max_capacity: number | null
          status: string
          created_at: string
          updated_at: string
        },
        "course_id" | "academic_term_id" | "section_code" | "enrollment_key",
        [
          {
            foreignKeyName: "course_offerings_academic_term_id_fkey"
            columns: ["academic_term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offerings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      course_posts: Table<
        {
          id: string
          course_id: string
          author_id: string
          author_name: string
          content: string
          attachments: Json
          created_at: string
          updated_at: string
        },
        "course_id" | "author_id" | "author_name",
        [
          {
            foreignKeyName: "course_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_posts_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
        ]
      >
      courses: Table<
        {
          id: string
          code: string
          name: string
          description: string | null
          lecturer_id: string | null
          credits: number | null
          max_students: number | null
          created_at: string
          updated_at: string
          course_code: string | null
          chinese_name: string | null
          faculty: string | null
          programme: string | null
          course_type: string | null
          credit_hours: number | null
          max_capacity: number | null
          enrollment_key: string | null
          status: string | null
        },
        "code" | "name",
        [
          {
            foreignKeyName: "courses_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      follows: Table<
        {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        },
        "follower_id" | "following_id",
        [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      forum_reactions: Table<
        {
          id: string
          thread_id: string
          user_id: string
          type: string
          created_at: string
        },
        "thread_id" | "user_id" | "type",
        [
          {
            foreignKeyName: "forum_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      forum_replies: Table<
        {
          id: string
          thread_id: string
          author_id: string
          parent_id: string | null
          content: string
          image_url: string | null
          created_at: string
          updated_at: string
        },
        "thread_id" | "author_id",
        [
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      >
      forum_reply_reactions: Table<
        {
          id: string
          reply_id: string
          user_id: string
          type: string
          created_at: string
        },
        "reply_id" | "user_id" | "type",
        [
          {
            foreignKeyName: "forum_reply_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reply_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      forum_threads: Table<
        {
          id: string
          course_id: string | null
          author_id: string
          title: string
          content: string
          category: string
          images: Json
          is_pinned: boolean
          is_locked: boolean
          created_at: string
          updated_at: string
        },
        "author_id" | "title" | "content",
        [
          {
            foreignKeyName: "forum_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
        ]
      >
      leaderboard: Table<
        {
          id: string
          student_id: string
          course_id: string | null
          average_score: number | null
          rank: number | null
          total_assignments_completed: number | null
          attendance_percentage: number | null
          total_xp: number
          weekly_xp: number
          level: number
          week_start_date: string | null
          updated_at: string
        },
        "student_id",
        [
          {
            foreignKeyName: "leaderboard_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      login_history: Table<{
        id: string
        user_id: string | null
        device: string | null
        browser: string | null
        ip_address: string | null
        login_time: string | null
        location: string | null
      }>
      notifications: Table<
        {
          id: string
          recipient_id: string
          actor_id: string | null
          type: string
          title: string
          message: string
          course_id: string | null
          entity_type: string | null
          entity_id: string | null
          action_url: string | null
          metadata: Json
          dedupe_key: string
          is_read: boolean
          read_at: string | null
          created_at: string
        },
        "recipient_id" | "type" | "title" | "dedupe_key",
        [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      presence_summary_cache: Table<{
        singleton: boolean
        online_count: number
        sample_users: Json
        refreshed_at: string
      }>
      reports: Table<
        {
          id: string
          reporter_id: string
          reported_user_id: string
          report_type: string
          story_id: string | null
          reason: string
          details: string | null
          severity: string
          status: string
          resolved_by: string | null
          resolved_at: string | null
          resolution_notes: string | null
          created_at: string
          updated_at: string
        },
        "reporter_id" | "reported_user_id" | "report_type" | "reason",
        [
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      >
      shared_cache_entries: Table<
        {
          cache_key: string
          value: Json
          expires_at: string
          stale_until: string
          refreshing_until: string | null
          updated_at: string
        },
        "cache_key" | "value" | "expires_at" | "stale_until"
      >
      social_activity_events: Table<
        {
          id: string
          actor_id: string
          course_id: string | null
          event_type: string
          source_table: string
          source_id: string
          title: string
          metadata: Json
          created_at: string
        },
        "actor_id" | "event_type" | "source_table" | "source_id" | "title",
        [
          {
            foreignKeyName: "social_activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_activity_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
        ]
      >
      study_group_members: Table<
        {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
        },
        "group_id" | "user_id",
        [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      study_group_posts: Table<
        {
          id: string
          group_id: string
          author_id: string
          post_type: string
          title: string | null
          content: string
          resource_url: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          attachment_size: number | null
          created_at: string
          updated_at: string
        },
        "group_id" | "author_id",
        [
          {
            foreignKeyName: "study_group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      study_group_session_attendees: Table<
        {
          id: string
          session_id: string
          user_id: string
          status: string
          responded_at: string
        },
        "session_id" | "user_id",
        [
          {
            foreignKeyName: "study_group_session_attendees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_session_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      study_group_sessions: Table<
        {
          id: string
          group_id: string
          created_by: string
          title: string
          description: string
          starts_at: string
          ends_at: string
          location_type: string
          location_text: string | null
          meeting_url: string | null
          max_attendees: number | null
          reminder_sent_at: string | null
          created_at: string
          updated_at: string
        },
        "group_id" | "created_by" | "title" | "starts_at" | "ends_at" | "location_type",
        [
          {
            foreignKeyName: "study_group_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      >
      study_groups: Table<
        {
          id: string
          course_id: string
          name: string
          description: string
          created_by: string
          max_members: number
          status: string
          created_at: string
          updated_at: string
        },
        "course_id" | "name" | "created_by",
        [
          {
            foreignKeyName: "study_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      stories: Table<
        {
          id: string
          user_id: string
          content: string | null
          content_type: string | null
          media_url: string | null
          title: string | null
          description: string | null
          created_at: string
          expires_at: string
          is_active: boolean
          image_url: string | null
        },
        "user_id",
        [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      story_views: Table<
        {
          id: string
          story_id: string
          viewed_by: string
          viewed_at: string
        },
        "story_id" | "viewed_by",
        [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewed_by_fkey"
            columns: ["viewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      student_gpa: Table<
        {
          id: string
          student_id: string
          gpa: number | null
          total_credits: number | null
          updated_at: string
        },
        "student_id",
        [
          {
            foreignKeyName: "student_gpa_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      student_grades: Table<
        {
          id: string
          course_id: string
          student_id: string
          assignment_id: string | null
          score: number
          max_score: number | null
          graded_by: string
          feedback: string | null
          graded_at: string
        },
        "course_id" | "student_id" | "score" | "graded_by",
        [
          {
            foreignKeyName: "student_grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_course_offering_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      student_xp_summary: Table<
        {
          student_id: string
          total_xp: number
          level: number
          updated_at: string
        },
        "student_id",
        [
          {
            foreignKeyName: "student_xp_summary_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      user_achievements: Table<
        {
          id: string
          user_id: string
          achievement_code: string
          name: string
          description: string
          rarity: string
          xp_reward: number
          earned_at: string
          metadata: Json
        },
        "user_id" | "achievement_code" | "name" | "description" | "rarity",
        [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      user_presence: Table<
        {
          user_id: string
          last_seen_at: string
        },
        "user_id"
      >
      user_profiles: Table<
        {
          id: string
          email: string
          full_name: string
          username: string | null
          role: string
          program_or_department: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
          is_active: boolean | null
          last_login_at: string | null
          cover_url: string | null
          faculty: string | null
          programme: string | null
        },
        "id" | "email" | "full_name" | "role"
      >
      user_settings: Table<
        {
          user_id: string
          theme: string | null
          compact_mode: boolean | null
          animations_enabled: boolean | null
          email_notifications: boolean | null
          assignment_reminders: boolean | null
          forum_replies: boolean | null
          grade_updates: boolean | null
          course_announcements: boolean | null
          achievement_alerts: boolean | null
          sound_enabled: boolean | null
          profile_visibility: string | null
          show_online_status: boolean | null
          show_progress: boolean | null
          show_leaderboard: boolean | null
          language: string | null
          timezone: string | null
          date_format: string | null
          high_contrast: boolean | null
          large_text: boolean | null
          reduce_motion: boolean | null
          push_notifications: boolean | null
          sms_notifications: boolean | null
          weekly_summary: boolean | null
          marketing_emails: boolean | null
          created_at: string | null
          updated_at: string | null
        },
        "user_id"
      >
      weekly_xp_summary: Table<
        {
          student_id: string
          week_start_date: string
          weekly_xp: number
          updated_at: string
        },
        "student_id" | "week_start_date",
        [
          {
            foreignKeyName: "weekly_xp_summary_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
      xp_events: Table<
        {
          id: string
          student_id: string
          source_type: string
          source_id: string
          xp_amount: number
          earned_at: string
          week_start_date: string
          created_at: string
          updated_at: string
        },
        | "student_id"
        | "source_type"
        | "source_id"
        | "xp_amount"
        | "earned_at"
        | "week_start_date",
        [
          {
            foreignKeyName: "xp_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      >
    }
    Views: {
      active_stories_summary: {
        Row: {
          id: string | null
          user_id: string | null
          user_name: string | null
          content_type: string | null
          created_at: string | null
          expires_at: string | null
          view_count: number | null
        }
        Relationships: []
      }
      course_summary: {
        Row: {
          id: string | null
          code: string | null
          name: string | null
          lecturer_id: string | null
          lecturer_name: string | null
          enrolled_students: number | null
          created_at: string | null
        }
        Relationships: []
      }
      student_course_summary: {
        Row: {
          course_id: string | null
          code: string | null
          name: string | null
          lecturer_name: string | null
          student_id: string | null
          average_score: number | null
          grades_received: number | null
          last_graded: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_user_achievement: {
        Args: {
          target_user_id: string
          target_code: string
          target_name: string
          target_description: string
          target_rarity: string
          target_xp_reward: number
          target_metadata?: Json
        }
        Returns: boolean
      }
      can_view_forum_course: {
        Args: { target_course_id: string }
        Returns: boolean
      }
      approve_course_creation_request: {
        Args: { p_request_id: string; p_admin_notes?: string | null }
        Returns: string
      }
      check_in_attendance: {
        Args: { p_course_id: string; p_code: string }
        Returns: Json
      }
      claim_shared_cache_refresh: {
        Args: { p_cache_key: string; p_lease_seconds?: number }
        Returns: {
          cache_value: Json
          cache_expires_at: string
          cache_stale_until: string
          lease_acquired: boolean
        }[]
      }
      correct_attendance_session_date: {
        Args: { p_session_id: string; p_new_date: string }
        Returns: Json
      }
      course_id_from_storage_path: {
        Args: { object_name: string }
        Returns: string | null
      }
      course_material_parent_matches: {
        Args: {
          target_parent_id: string | null
          target_course_id: string
        }
        Returns: boolean
      }
      create_study_group: {
        Args: {
          p_course_id: string
          p_name: string
          p_description?: string
          p_max_members?: number
        }
        Returns: string
      }
      create_course_offering: {
        Args: { p_course_id: string; p_academic_term_id?: string }
        Returns: string
      }
      create_course_offering_with_assessment: {
        Args: {
          p_course_id: string
          p_items: Json
          p_academic_term_id?: string | null
        }
        Returns: string
      }
      create_user_notification: {
        Args: {
          target_user_id: string
          source_actor_id: string
          notification_type: string
          notification_title: string
          notification_message: string
          target_course_id: string
          target_entity_type: string
          target_entity_id: string
          target_action_url: string
          notification_metadata: Json
          notification_dedupe_key: string
          preference_name?: string
        }
        Returns: undefined
      }
      delete_user_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_attendance_class: {
        Args: { p_session_id: string }
        Returns: Json
      }
      enroll_student_in_course: {
        Args: { p_course_id: string; p_enrollment_key: string }
        Returns: string
      }
      get_available_course_offerings: {
        Args: {
          p_search?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          template_id: string
          course_code: string
          code: string
          name: string
          chinese_name: string | null
          faculty: string
          programme: string
          course_type: string
          credit_hours: number
          max_capacity: number
          status: string
          semester: string
          created_at: string
          instructors: Json
          total_count: number
        }[]
      }
      get_course_posts_page: {
        Args: {
          p_course_id: string
          p_before_created_at: string | null
          p_before_id: string | null
          p_limit: number
        }
        Returns: {
          id: string
          course_id: string
          author_id: string
          author_name: string
          content: string
          attachments: Json
          created_at: string
          updated_at: string
        }[]
      }
      get_campus_posts_page: {
        Args: {
          p_before_created_at?: string | null
          p_before_id?: string | null
          p_limit?: number
        }
        Returns: {
          id: string
          author_id: string
          author_name: string
          author_avatar_url: string | null
          author_role: string
          content: string
          attachments: Json
          created_at: string
          updated_at: string
          reaction_count: number
          comment_count: number
          viewer_reaction: string | null
        }[]
      }
      search_campus_mention_courses: {
        Args: {
          p_search?: string | null
          p_limit?: number
        }
        Returns: {
          id: string
          course_code: string
          name: string
          chinese_name: string | null
        }[]
      }
      get_lecturer_analytics: {
        Args: {
          p_period_start: string
          p_bucket_start: string
        }
        Returns: Json
      }
      get_student_dashboard_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      drop_course_offering: {
        Args: { p_offering_id: string }
        Returns: boolean
      }
      dispatch_study_session_reminders: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      evaluate_achievement_from_activity: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      evaluate_user_achievements: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      expire_old_stories: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_course_members: {
        Args: { target_course_id: string }
        Returns: {
          id: string
          email: string
          full_name: string
          role: string
          faculty: string
          programme: string
          avatar_url: string
          course_role: string
          membership_id: string
          joined_at: string
        }[]
      }
      get_course_catalog_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          code: string
          name: string
          course_code: string | null
          chinese_name: string | null
          faculty: string | null
          programme: string | null
          course_type: string | null
          credits: number | null
          credit_hours: number | null
          status: string | null
        }[]
      }
      get_assignment_peer_benchmarks: {
        Args: Record<PropertyKey, never>
        Returns: {
          course_id: string
          course_code: string
          course_name: string
          student_average: number
          class_average: number
          percentile: number | null
          compared_students: number
          graded_assignments: number
        }[]
      }
      get_my_xp_progress: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_xp: number
          level: number
          weekly_xp: number
          weekly_rank: number | null
        }[]
      }
      get_course_offering_name: {
        Args: { target_offering_id: string }
        Returns: string
      }
      get_profile_visibility: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_social_activity_feed: {
        Args: {
          p_limit?: number
          p_before_created_at?: string | null
          p_before_id?: string | null
        }
        Returns: {
          id: string
          event_type: string
          source_id: string
          title: string
          metadata: Json
          created_at: string
          actor_id: string
          actor_name: string
          actor_avatar_url: string | null
          actor_role: string
          course_id: string | null
          course_code: string | null
          course_name: string | null
        }[]
      }
      get_weekly_xp_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          student_id: string
          full_name: string
          avatar_url: string | null
          weekly_xp: number
          total_xp: number
          level: number
          rank: number
        }[]
      }
      get_study_groups: {
        Args: {
          p_limit?: number
          p_before_created_at?: string | null
          p_before_id?: string | null
          p_course_id?: string | null
          p_search?: string | null
          p_joined_only?: boolean
        }
        Returns: {
          id: string
          course_id: string
          name: string
          description: string
          max_members: number
          status: string
          created_at: string
          creator_id: string
          creator_name: string
          creator_avatar_url: string | null
          course_code: string
          course_name: string
          member_count: number
          is_member: boolean
          is_owner: boolean
          next_session_start: string | null
          next_session_title: string | null
        }[]
      }
      get_my_upcoming_study_sessions: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          group_id: string
          group_name: string
          course_code: string
          title: string
          starts_at: string
          ends_at: string
          location_type: string
          location_text: string | null
          meeting_url: string | null
          attendee_count: number
          is_going: boolean
        }[]
      }
      reject_course_creation_request: {
        Args: { p_request_id: string; p_admin_notes?: string | null }
        Returns: boolean
      }
      save_course_assessment_structure: {
        Args: {
          p_course_id: string
          p_items: Json
        }
        Returns: Database["public"]["Tables"]["course_assessment_items"]["Row"][]
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      is_assignment_instructor: {
        Args: { target_assignment_id: string }
        Returns: boolean
      }
      is_assignment_student: {
        Args: { target_assignment_id: string; target_student_id: string }
        Returns: boolean
      }
      is_course_instructor: {
        Args: { target_course_id: string }
        Returns: boolean
      }
      is_course_manager: {
        Args: {
          target_course_id: string
          target_user_id?: string
        }
        Returns: boolean
      }
      is_course_member: {
        Args: {
          target_course_id: string
          target_user_id?: string
        }
        Returns: boolean
      }
      is_study_group_member: {
        Args: { target_group_id: string; target_user_id?: string }
        Returns: boolean
      }
      is_study_group_owner: {
        Args: { target_group_id: string; target_user_id?: string }
        Returns: boolean
      }
      join_study_group: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      leave_study_group: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      notification_preference_enabled: {
        Args: { target_user_id: string; preference_name: string }
        Returns: boolean
      }
      notify_admins_new_report: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_assignment_created: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_assignment_submission: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_course_enrollment_created: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_course_instructor_created: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_course_material_created: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_course_post_created: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      remove_study_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      set_study_session_attendance: {
        Args: { p_session_id: string; p_attending: boolean }
        Returns: boolean
      }
      notify_forum_reaction: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_forum_reply: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_student_grade: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      notify_user_followed: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      protect_user_account_status: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      set_report_severity: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: unknown
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

type PublicSchema = Database["public"]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Omit<Database, "__InternalSupabase"> },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Omit<Database, "__InternalSupabase">
  }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends {
  schema: keyof Omit<Database, "__InternalSupabase">
}
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Omit<Database, "__InternalSupabase"> },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Omit<Database, "__InternalSupabase">
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends {
  schema: keyof Omit<Database, "__InternalSupabase">
}
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Omit<Database, "__InternalSupabase"> },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Omit<Database, "__InternalSupabase">
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends {
  schema: keyof Omit<Database, "__InternalSupabase">
}
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Omit<Database, "__InternalSupabase"> },
  EnumName extends PublicEnumNameOrOptions extends {
    schema: keyof Omit<Database, "__InternalSupabase">
  }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends {
  schema: keyof Omit<Database, "__InternalSupabase">
}
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Omit<Database, "__InternalSupabase"> },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Omit<Database, "__InternalSupabase">
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Omit<Database, "__InternalSupabase">
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
