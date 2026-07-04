-- Freeze vendor profile on quotes for consistent PDFs and historical branding
-- Run after 009_organization_audit_log.sql

alter table public.quotes
  add column if not exists vendor_snapshot jsonb;