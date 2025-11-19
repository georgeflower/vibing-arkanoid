-- Create the high_scores table
create table public.high_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  score integer not null,
  level integer not null,
  difficulty text,
  beat_level_50 boolean default false,
  starting_lives integer default 3,
  created_at timestamptz default now() not null
);

-- Add indexes for fast leaderboard queries
create index idx_high_scores_score on public.high_scores (score desc);
create index idx_high_scores_created_at on public.high_scores (created_at desc);
create index idx_high_scores_leaderboard on public.high_scores (starting_lives asc, score desc);

-- Enable Row Level Security
alter table public.high_scores enable row level security;

-- RLS Policy: Anyone can read high scores (public leaderboard)
create policy "Anyone can view high scores"
  on public.high_scores
  for select
  using (true);

-- RLS Policy: Anyone can insert high scores (anonymous submissions)
create policy "Anyone can submit high scores"
  on public.high_scores
  for insert
  with check (true);