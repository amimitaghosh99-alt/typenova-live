-- ============================================================================
-- TypeNova - Patron Contributions & Razorpay Payment Tracking
-- Creates the `patron_contributions` table, RLS policies, and fulfillment RPC.
-- ============================================================================

-- 1. Create patron_contributions table
create table if not exists public.patron_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  donor_name text not null,
  amount numeric not null,
  currency text not null default 'INR',
  amount_inr numeric not null,
  tier_id text,
  gateway text not null default 'razorpay',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  status text not null default 'created', -- 'created', 'captured', 'failed'
  perk_granted boolean not null default false,
  message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for fast lookup by order, payment, and user
create index if not exists idx_patron_order_id on public.patron_contributions (razorpay_order_id);
create index if not exists idx_patron_payment_id on public.patron_contributions (razorpay_payment_id);
create index if not exists idx_patron_user_id on public.patron_contributions (user_id);
create index if not exists idx_patron_status on public.patron_contributions (status);
create index if not exists idx_patron_created_at on public.patron_contributions (created_at desc);

-- 3. Row Level Security (RLS)
alter table public.patron_contributions enable row level security;

drop policy if exists "patron_contributions: public read captured" on public.patron_contributions;
drop policy if exists "patron_contributions: users insert" on public.patron_contributions;
drop policy if exists "patron_contributions: users update own or service role" on public.patron_contributions;

-- Anyone can view captured contributions to populate the live Patron Wall and goal progress
create policy "patron_contributions: public read captured" on public.patron_contributions
  for select
  using (status = 'captured');

-- Allow creation of pending contributions
create policy "patron_contributions: users insert" on public.patron_contributions
  for insert
  with check (true);

-- Allow updates (e.g. updating status on payment capture)
create policy "patron_contributions: users update own or service role" on public.patron_contributions
  for update
  using (true);

grant select, insert, update on public.patron_contributions to anon, authenticated;

-- 4. RPC Function to record and fulfill patron contribution
create or replace function public.record_patron_success(
  p_order_id text,
  p_payment_id text,
  p_donor_name text,
  p_amount numeric,
  p_currency text default 'INR',
  p_amount_inr numeric default null,
  p_user_id uuid default null,
  p_tier_id text default 'tier_supporter'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_entry_id uuid;
  v_inr numeric;
  v_title_id text;
begin
  v_inr := coalesce(p_amount_inr, p_amount);

  -- Determine title reward from tier
  v_title_id := case
    when p_tier_id = 'tier_legend' then 'eternal_benefactor'
    when p_tier_id = 'tier_scholar' then 'grand_architect'
    when p_tier_id = 'tier_sustainer' then 'server_sustainer'
    else 'cyber_patron'
  end;

  -- Upsert contribution record
  insert into public.patron_contributions (
    user_id,
    donor_name,
    amount,
    currency,
    amount_inr,
    tier_id,
    gateway,
    razorpay_order_id,
    razorpay_payment_id,
    status,
    perk_granted,
    updated_at
  )
  values (
    p_user_id,
    p_donor_name,
    p_amount,
    p_currency,
    v_inr,
    p_tier_id,
    'razorpay',
    p_order_id,
    p_payment_id,
    'captured',
    true,
    now()
  )
  on conflict (razorpay_order_id)
  do update set
    razorpay_payment_id = excluded.razorpay_payment_id,
    status = 'captured',
    perk_granted = true,
    updated_at = now()
  returning id into v_entry_id;

  return jsonb_build_object(
    'success', true,
    'id', v_entry_id,
    'title_id', v_title_id,
    'status', 'captured'
  );
end;
$$;

grant execute on function public.record_patron_success to anon, authenticated;
