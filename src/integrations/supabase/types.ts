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
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      clothing_items: {
        Row: {
          back_image_url: string | null
          category: string
          color: string
          created_at: string
          estimated_price: number | null
          fabric: string
          id: string
          image_url: string
          is_private: boolean
          name: string
          notes: string
          size: string
          tags: string[]
          user_id: string
        }
        Insert: {
          back_image_url?: string | null
          category: string
          color?: string
          created_at?: string
          estimated_price?: number | null
          fabric?: string
          id?: string
          image_url: string
          is_private?: boolean
          name: string
          notes?: string
          size?: string
          tags?: string[]
          user_id: string
        }
        Update: {
          back_image_url?: string | null
          category?: string
          color?: string
          created_at?: string
          estimated_price?: number | null
          fabric?: string
          id?: string
          image_url?: string
          is_private?: boolean
          name?: string
          notes?: string
          size?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          type: string
          user_id: string
          votes: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          type: string
          user_id: string
          votes?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          type?: string
          user_id?: string
          votes?: number | null
        }
        Relationships: []
      }
      feedback_votes: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_votes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      fit_pics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_private: boolean
          outfit_id: string | null
          pic_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_private?: boolean
          outfit_id?: string | null
          pic_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_private?: boolean
          outfit_id?: string | null
          pic_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fit_pics_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          target_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          flag_reason: string | null
          id: string
          is_flagged: boolean
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          from_user_id: string | null
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          message: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      outfit_items: {
        Row: {
          clothing_item_id: string
          id: string
          outfit_id: string
        }
        Insert: {
          clothing_item_id: string
          id?: string
          outfit_id: string
        }
        Update: {
          clothing_item_id?: string
          id?: string
          outfit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_items_clothing_item_id_fkey"
            columns: ["clothing_item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_items_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      outfits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string | null
          occasion: string
          privacy: string
          reasoning: string
          saved: boolean | null
          style_tips: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          occasion: string
          privacy?: string
          reasoning?: string
          saved?: boolean | null
          style_tips?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          occasion?: string
          privacy?: string
          reasoning?: string
          saved?: boolean | null
          style_tips?: string | null
          user_id?: string
        }
        Relationships: []
      }
      planned_outfits: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          outfit_id: string | null
          planned_date: string
          user_id: string
          worn: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          outfit_id?: string | null
          planned_date: string
          user_id: string
          worn?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          outfit_id?: string | null
          planned_date?: string
          user_id?: string
          worn?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "planned_outfits_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_position: string
          avatar_url: string | null
          bio: string | null
          body_type: string | null
          created_at: string
          currency_preference: string
          display_name: string | null
          email: string | null
          fashion_goals: string | null
          id: string
          is_public: boolean
          onboarding_completed: boolean
          preferred_colors: string[] | null
          skin_tone: string | null
          style_preference: string | null
          updated_at: string
          username: string | null
          username_changed_at: string | null
        }
        Insert: {
          avatar_position?: string
          avatar_url?: string | null
          bio?: string | null
          body_type?: string | null
          created_at?: string
          currency_preference?: string
          display_name?: string | null
          email?: string | null
          fashion_goals?: string | null
          id: string
          is_public?: boolean
          onboarding_completed?: boolean
          preferred_colors?: string[] | null
          skin_tone?: string | null
          style_preference?: string | null
          updated_at?: string
          username?: string | null
          username_changed_at?: string | null
        }
        Update: {
          avatar_position?: string
          avatar_url?: string | null
          bio?: string | null
          body_type?: string | null
          created_at?: string
          currency_preference?: string
          display_name?: string | null
          email?: string | null
          fashion_goals?: string | null
          id?: string
          is_public?: boolean
          onboarding_completed?: boolean
          preferred_colors?: string[] | null
          skin_tone?: string | null
          style_preference?: string | null
          updated_at?: string
          username?: string | null
          username_changed_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reference_id: string | null
          report_type: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reference_id?: string | null
          report_type?: string
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reference_id?: string | null
          report_type?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      social_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          caption: string | null
          comments_count: number
          created_at: string
          id: string
          image_urls: string[]
          likes_count: number
          outfit_id: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          image_urls?: string[]
          likes_count?: number
          outfit_id?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          image_urls?: string[]
          likes_count?: number
          outfit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      social_stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      wardrobe_items: {
        Row: {
          category: string
          created_at: string
          cutout_path: string | null
          error_message: string | null
          id: string
          name: string
          original_path: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          cutout_path?: string | null
          error_message?: string | null
          id?: string
          name?: string
          original_path: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          cutout_path?: string | null
          error_message?: string | null
          id?: string
          name?: string
          original_path?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wardrobe_service_requests: {
        Row: {
          address: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          preferred_date: string
          status: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          preferred_date: string
          status?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          preferred_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          clothing_item_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          clothing_item_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clothing_item_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_clothing_item_id_fkey"
            columns: ["clothing_item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      can_view_user: {
        Args: { target_user_id: string; viewer_id: string }
        Returns: boolean
      }
      decrement_feedback_votes: {
        Args: { feedback_id_param: string }
        Returns: undefined
      }
      decrement_post_likes: {
        Args: { post_id_param: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      increment_feedback_votes: {
        Args: { feedback_id_param: string }
        Returns: undefined
      }
      increment_post_likes: {
        Args: { post_id_param: string }
        Returns: undefined
      }
      is_blocked: {
        Args: { checker_id: string; target_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
