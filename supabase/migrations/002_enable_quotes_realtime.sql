-- Enable Supabase Realtime for the quotes table.
-- Run in Supabase SQL Editor if not using the CLI migration workflow.

alter publication supabase_realtime add table public.quotes;