/**
 * Tipos do banco de dados Supabase.
 *
 * Após aplicar as migrations, regenere este arquivo com:
 *   npx supabase gen types typescript --project-id SEU_PROJECT_ID \
 *     > src/integrations/supabase/types.ts
 *
 * Enquanto as migrations não forem aplicadas, este stub garante
 * que o client seja tipado e o código compile sem erros.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          name: string;
          event_date: string | null;
          slug: string;
          default_guest_photo_limit: number;
          default_sponsor_photo_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          event_date?: string | null;
          slug: string;
          default_guest_photo_limit?: number;
          default_sponsor_photo_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          event_date?: string | null;
          slug?: string;
          default_guest_photo_limit?: number;
          default_sponsor_photo_limit?: number;
          updated_at?: string;
        };
      };
      guests: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          phone_digits: string;
          guest_type: Database["public"]["Enums"]["guest_type"];
          photo_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          phone_digits: string;
          guest_type?: Database["public"]["Enums"]["guest_type"];
          photo_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          phone_digits?: string;
          guest_type?: Database["public"]["Enums"]["guest_type"];
          photo_limit?: number;
          updated_at?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          event_id: string;
          guest_id: string;
          guest_name: string;
          guest_phone_digits: string;
          storage_path: string;
          selected: boolean;
          selected_at: string | null;
          selected_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          guest_id: string;
          guest_name: string;
          guest_phone_digits: string;
          storage_path: string;
          selected?: boolean;
          selected_at?: string | null;
          selected_by?: string | null;
          created_at?: string;
        };
        Update: {
          selected?: boolean;
          selected_at?: string | null;
          selected_by?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at?: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["app_role"];
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "couple";
      guest_type: "guest" | "sponsor";
    };
  };
};

/** Helpers de conveniência para as tabelas mais usadas */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
