create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id text primary key default encode(gen_random_bytes(12), 'hex'),
  username text not null unique,
  full_name text,
  follower_count integer,
  following_count integer,
  category text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.snapshots (
  id text primary key,
  snapshot_type text not null check (snapshot_type in ('followers', 'following')),
  imported_at timestamptz not null default now(),
  source_filename text not null,
  total_rows integer not null default 0
);

create table if not exists public.snapshot_entries (
  id text primary key,
  snapshot_id text not null references public.snapshots(id) on delete cascade,
  account_id text not null references public.accounts(id) on delete cascade,
  is_mutual boolean not null default false
);

create table if not exists public.posts (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  instagram_media_id text unique,
  caption text,
  posted_at timestamptz,
  like_count integer,
  comment_count integer,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id text primary key,
  post_id text references public.posts(id) on delete set null,
  commenter_account_id text not null references public.accounts(id) on delete cascade,
  instagram_comment_id text unique,
  comment_text text not null,
  created_at timestamptz not null default now(),
  webhook_payload jsonb
);

create table if not exists public.account_scores (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  window_days integer not null default 30,
  comments_last_30_days integer not null default 0,
  repeated_comments integer not null default 0,
  recency_score numeric(8,2) not null default 0,
  inactivity_penalty numeric(8,2) not null default 0,
  interaction_score numeric(8,2) not null default 0,
  bucket text not null check (bucket in ('keep', 'review', 'unfollow')),
  calculated_at timestamptz not null default now()
);

create table if not exists public.discovery_seeds (
  id text primary key,
  seed_type text not null check (seed_type in ('account', 'hashtag')),
  seed_value text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id text primary key,
  account_id text not null references public.accounts(id) on delete cascade,
  recommendation_date date not null default current_date,
  follower_band_score numeric(8,2) not null default 0,
  posting_recency_score numeric(8,2) not null default 0,
  posting_frequency_score numeric(8,2) not null default 0,
  engagement_proxy_score numeric(8,2) not null default 0,
  category_similarity_score numeric(8,2) not null default 0,
  recommendation_score numeric(8,2) not null default 0,
  rank integer not null default 0,
  status text not null default 'none' check (status in ('none', 'saved', 'hidden', 'bookmarked')),
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_actions (
  id text primary key,
  recommendation_id text not null references public.recommendations(id) on delete cascade,
  action text not null check (action in ('saved', 'hidden', 'bookmarked')),
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id text primary key,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists idx_accounts_username on public.accounts(username);
create index if not exists idx_comments_created_at on public.comments(created_at desc);
create index if not exists idx_account_scores_bucket on public.account_scores(bucket, window_days);
create index if not exists idx_recommendations_date_rank on public.recommendations(recommendation_date desc, rank asc);
