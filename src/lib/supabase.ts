import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bhgwsfsfmdyibpjdhzlf.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoaGdzZnNmbWR5aWJwamRoemxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NzYyNjUsImV4cCI6MjA2NzQ1MjI2NX0.awoWF8XeurBdAz3J6q8d2OE7Er2P2JEZhnbKn2QQxnk'

export const supabase = createClient(supabaseUrl, supabaseKey)
