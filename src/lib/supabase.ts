/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// 1. Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Check if the variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in .env.local");
}

// 3. Export the initialized client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
