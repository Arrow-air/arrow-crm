import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill it in.",
  );
}

export const supabase = createClient(url, anonKey);

export type MemberStatus = "new" | "met" | "introduced" | "active" | "faded";

export interface Member {
  id: string;
  discord_id: string | null;
  name: string;
  joined_at: string;
  status: MemberStatus;
  met_by: string | null;
  projects: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Touchpoint {
  id: string;
  member_id: string;
  by_name: string;
  note: string | null;
  created_at: string;
}
