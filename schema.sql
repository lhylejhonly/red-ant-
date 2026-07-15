-- =============================================
-- RED ANT STORE - Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- =============================================

create table if not exists users (
  id text primary key,
  name text not null,
  email text unique not null,
  role text not null,
  pin text not null,
  avatar_url text,
  is_2fa_enabled boolean default false
);

create table if not exists categories (
  id text primary key,
  name text not null,
  description text
);

create table if not exists suppliers (
  id text primary key,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  outstanding_balance numeric default 0,
  payment_history jsonb default '[]',
  documents jsonb default '[]'
);

create table if not exists products (
  id text primary key,
  sku text,
  barcode text,
  qr_code text,
  name text not null,
  description text,
  category_id text references categories(id),
  brand text,
  supplier_id text references suppliers(id),
  cost numeric default 0,
  selling_price numeric default 0,
  wholesale_price numeric default 0,
  tax_rate numeric default 0,
  discount_rate numeric default 0,
  expiration_date text,
  serial_numbers jsonb default '[]',
  warranty text,
  stock integer default 0,
  min_stock_alert integer default 5,
  is_archived boolean default false,
  is_essential boolean default false,
  is_digital boolean default false,
  is_combo boolean default false,
  variants jsonb default '{}',
  image text
);

create table if not exists orders (
  id text primary key,
  receipt_number text,
  timestamp timestamptz default now(),
  cashier_id text,
  cashier_name text,
  branch_id text,
  items jsonb default '[]',
  subtotal numeric default 0,
  tax_total numeric default 0,
  service_charge numeric default 0,
  discount_total numeric default 0,
  grand_total numeric default 0,
  payments jsonb default '[]',
  amount_paid numeric default 0,
  change_amount numeric default 0,
  status text default 'Completed',
  notes text,
  refund_reason text,
  exchange_details text
);

create table if not exists held_transactions (
  id text primary key,
  timestamp timestamptz default now(),
  items jsonb default '[]',
  notes text,
  cashier_name text
);

create table if not exists expenses (
  id text primary key,
  category text,
  description text,
  amount numeric default 0,
  date text,
  payment_method text,
  receipt_url text
);

create table if not exists employees (
  id text primary key,
  name text not null,
  email text,
  role text,
  phone text,
  attendance text default 'Off-Duty',
  last_clock_in timestamptz,
  last_clock_out timestamptz,
  monthly_salary numeric default 0,
  performance_score numeric default 90
);

create table if not exists shift_logs (
  id text primary key,
  employee_id text references employees(id),
  employee_name text,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  starting_cash numeric default 0,
  ending_cash numeric,
  actual_ending_cash numeric,
  notes text
);

create table if not exists settings (
  id integer primary key default 1,
  company_name text,
  address text,
  phone text,
  email text,
  tax_rate numeric default 12,
  service_charge_rate numeric default 5,
  currency text default '₱',
  timezone text,
  language text,
  store_logo_url text,
  receipt_logo_url text,
  receipt_footer text,
  enable_sms boolean default true,
  enable_email boolean default true,
  enable_2fa boolean default false,
  printer_ip text,
  barcode_format text
);

create table if not exists notifications (
  id text primary key,
  type text,
  title text,
  message text,
  timestamp timestamptz default now(),
  is_read boolean default false
);

create table if not exists audit_logs (
  id text primary key,
  timestamp timestamptz default now(),
  user_id text,
  user_name text,
  user_role text,
  action text,
  details text,
  ip_address text
);

create table if not exists sent_emails (
  id text primary key,
  "to" text,
  subject text,
  body text,
  timestamp timestamptz default now(),
  type text,
  recipient_name text,
  recipient_role text,
  is_simulated boolean default true
);

-- =============================================
-- EMPTY DATABASE - NO SEED DATA
-- =============================================
-- All tables are created empty. Use the Super Admin panel to add products, categories, and users.