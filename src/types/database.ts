// Generated/manual Supabase database types.
// Regenerate with: npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type Database = {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          first_name: string;
          last_name: string | null;
          nick_name: string | null;
          suffix: string | null;
          bio: string | null;
          birthday: string | null;
          phones: { label: string; value: string }[];
          emails: { label: string; value: string }[];
          addresses: {
            label: string;
            country: string;
            province: string;
            district: string;
            sub_district: string;
            postal_code: string;
            street: string;
            value?: string;
          }[];
          socials: { platform: string; handle: string; url: string | null }[];
          orgs: {
            org_id: string | null;
            org_name: string;
            role: string | null;
            start_date: string | null;
            end_date: string | null;
            is_current: boolean;
            is_primary: boolean;
          }[];
          education: { school: string; degree: string | null; year: number | null }[];
          tier: 1 | 2 | 3 | null;
          tie_type: 'Strong' | 'Bridge' | 'Weak' | null;
          stage: string | null;
          followup_status: string | null;
          eng_current: string | null;
          eng_target: string | null;
          relationship_status: 'known' | 'prospect' | 'cold' | 'archived';
          priority: 'High' | 'Medium' | 'Low' | null;
          scenario: string | null;
          scenario_step: string | null;
          scenario_last_action_date: string | null;
          freq_days: number | null;
          last_contact_date: string | null;
          health: string | null;
          channel: string | null;
          avatar_url: string | null;
          birthday_notification_enabled: boolean;
          freq_unit: 'days' | 'weeks' | 'months' | 'years' | null;
          owner_id: string | null;
          backup_id: string | null;
          reviewer_id: string | null;
          met_story: string | null;
          value_exchange: string | null;
          relation_types: string[];
          tags: string[];
          custom_fields: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['contacts']['Row']> & {
          first_name: string;
        };
        Update: Partial<Database['public']['Tables']['contacts']['Row']>;
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          type: string | null;
          hq: string | null;
          size: string | null;
          founded: number | null;
          website: string | null;
          our_tier: 1 | 2 | 3 | null;
          health: string | null;
          relationship_status: 'known' | 'prospect' | 'cold' | 'archived';
          notes: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['organizations']['Row']> & {
          name: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Row']>;
      };
      opportunities: {
        Row: {
          id: string;
          track: 'apply' | 'act' | 'watch' | 'contract' | 'event';
          title: string;
          stage: string;
          status: string;
          priority: 'High' | 'Medium' | 'Low' | null;
          source_url: string | null;
          due_date: string | null;
          owner_id: string | null;
          reviewer_id: string | null;
          ai_summary: string | null;
          details: Record<string, unknown>;
          last_update_at: string;
          stale_since: string | null;
          archived_at: string | null;
          archived_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['opportunities']['Row']> & {
          track: 'apply' | 'act' | 'watch' | 'contract' | 'event';
          title: string;
          stage: string;
        };
        Update: Partial<Database['public']['Tables']['opportunities']['Row']>;
      };
      interactions: {
        Row: {
          id: string;
          contact_id: string;
          date: string;
          channel: string | null;
          direction: 'inbound' | 'outbound' | null;
          linked_scenario_step: string | null;
          summary: string;
          outcome: string | null;
          logged_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['interactions']['Row']> & {
          contact_id: string;
          summary: string;
        };
        Update: Partial<Database['public']['Tables']['interactions']['Row']>;
      };
      commitments: {
        Row: {
          id: string;
          contact_id: string;
          direction: 'i_owe' | 'they_owe';
          description: string;
          date_made: string;
          due_date: string | null;
          status: 'open' | 'done' | 'cancelled';
          linked_interaction_id: string | null;
          evidence_link: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['commitments']['Row']> & {
          contact_id: string;
          direction: 'i_owe' | 'they_owe';
          description: string;
        };
        Update: Partial<Database['public']['Tables']['commitments']['Row']>;
      };
      notes: {
        Row: {
          id: string;
          scope: 'contact' | 'org' | 'opportunity';
          target_id: string;
          date: string;
          text: string;
          tags: string[];
          is_future: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notes']['Row']> & {
          scope: 'contact' | 'org' | 'opportunity';
          target_id: string;
          text: string;
        };
        Update: Partial<Database['public']['Tables']['notes']['Row']>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          cadence_days: number | null;
          rule: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['groups']['Row']> & {
          name: string;
        };
        Update: Partial<Database['public']['Tables']['groups']['Row']>;
      };
      group_members: {
        Row: {
          group_id: string;
          contact_id: string;
          added_at: string;
        };
        Insert: {
          group_id: string;
          contact_id: string;
        };
        Update: Partial<Database['public']['Tables']['group_members']['Row']>;
      };
      relations: {
        Row: {
          id: string;
          from_contact_id: string;
          to_contact_id: string | null;
          to_org_id: string | null;
          to_opportunity_id: string | null;
          type: string;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['relations']['Row']> & {
          from_contact_id: string;
          type: string;
        };
        Update: Partial<Database['public']['Tables']['relations']['Row']>;
      };
      contact_opportunities: {
        Row: {
          contact_id: string;
          opportunity_id: string;
          role: string | null;
          created_at: string;
        };
        Insert: {
          contact_id: string;
          opportunity_id: string;
          role?: string | null;
        };
        Update: Partial<Database['public']['Tables']['contact_opportunities']['Row']>;
      };
      team_members: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          initials: string | null;
          avatar_url: string | null;
          role: 'admin' | 'member';
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['team_members']['Row']> & {
          id: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['team_members']['Row']>;
      };
      opportunity_people: {
        Row: {
          id: string;
          opportunity_id: string;
          contact_id: string | null;
          org_id: string | null;
          role: 'organizer' | 'attendee';
          status: 'VVIP' | 'Invitee' | 'Audience' | 'Speaker' | 'Sponsor' | 'Other' | null;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['opportunity_people']['Row']> & {
          opportunity_id: string;
          role: 'organizer' | 'attendee';
        };
        Update: Partial<Database['public']['Tables']['opportunity_people']['Row']>;
      };
      milestones: {
        Row: {
          id: string;
          contact_id: string;
          side: 'them' | 'us' | 'shared';
          title: string;
          date: string | null;
          description: string | null;
          achieved: boolean;
          achieved_at: string | null;
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['milestones']['Row']> & {
          contact_id: string;
          side: 'them' | 'us' | 'shared';
          title: string;
        };
        Update: Partial<Database['public']['Tables']['milestones']['Row']>;
      };
      track_settings: {
        Row: {
          track: 'apply' | 'act' | 'watch' | 'contract' | 'event';
          stale_threshold_days: number | null;
          ping_enabled: boolean;
          email_notifications: boolean;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['track_settings']['Row']> & {
          track: 'apply' | 'act' | 'watch' | 'contract' | 'event';
        };
        Update: Partial<Database['public']['Tables']['track_settings']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
