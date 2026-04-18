import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://fvhxhaitiveffbvghgdp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aHhoYWl0aXZlZmZidmdoZ2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjMwNTUsImV4cCI6MjA5MjA5OTA1NX0.G2diUckVgvrvus4Lsu2z6J4PA4tl0uMSb2n7IJR9z3Q";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
