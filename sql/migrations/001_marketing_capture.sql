create extension if not exists pgcrypto;

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null unique,
  email_original text not null,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  submission_count integer not null default 1
);

create table if not exists chat_prompts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  session_id text,
  page_path text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chat_prompts_created_at
  on chat_prompts (created_at desc);

create table if not exists download_submissions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  cta_variant text not null,
  page_path text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_download_submissions_contact_id
  on download_submissions (contact_id);

create table if not exists donation_intents (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  selected_tier_id text not null,
  display_amount_cents integer not null,
  currency text not null default 'USD',
  status text not null check (status in ('initiated', 'redirected', 'completed', 'failed', 'abandoned')),
  app_user_id text not null unique,
  revenuecat_customer_id text,
  page_path text,
  redirected_at timestamptz,
  completed_at timestamptz,
  requested_custom_amount_cents integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_donation_intents_contact_id
  on donation_intents (contact_id);

create index if not exists idx_donation_intents_status
  on donation_intents (status);

create table if not exists donation_events (
  id uuid primary key default gen_random_uuid(),
  donation_intent_id uuid not null references donation_intents(id) on delete cascade,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_donation_events_intent_id
  on donation_events (donation_intent_id);

alter table contacts enable row level security;
alter table chat_prompts enable row level security;
alter table download_submissions enable row level security;
alter table donation_intents enable row level security;
alter table donation_events enable row level security;
