-- heAlthy Supabase schema
-- Run in Supabase SQL Editor before starting the backend.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists users (
  _id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  avatar_url text,
  password_reset_token text,
  password_reset_expires timestamptz,
  is_premium boolean not null default false,
  premium_granted_at timestamptz,
  premium_granted_by text,
  friends uuid[] not null default '{}',
  friend_count integer not null default 0,
  profile jsonb not null default '{}'::jsonb,
  privacy jsonb not null default '{"showProgress":true,"showProfile":true,"showGoal":true}'::jsonb,
  reminders jsonb not null default '{"waterReminder":false,"mealReminders":false,"workoutReminders":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
before update on users
for each row
execute procedure set_updated_at();

create table if not exists signup_otps (
  _id uuid primary key default gen_random_uuid(),
  email text not null unique,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger signup_otps_set_updated_at
before update on signup_otps
for each row
execute procedure set_updated_at();

create table if not exists meal_plans (
  _id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(_id) on delete cascade,
  title text not null,
  type text not null default 'basic',
  duration text not null default '1day',
  plan jsonb not null default '{}'::jsonb,
  grocery_list text[] not null default '{}',
  total_calories numeric,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meal_plans_user_created on meal_plans(user_id, created_at desc);

create trigger meal_plans_set_updated_at
before update on meal_plans
for each row
execute procedure set_updated_at();

create table if not exists custom_meals (
  _id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(_id) on delete cascade,
  name text not null,
  description text,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  fiber numeric,
  serving text not null default '1 serving',
  ingredients text[] not null default '{}',
  category text not null default 'other',
  meal_time text not null default 'any',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_custom_meals_user_created on custom_meals(user_id, created_at desc);
create index if not exists idx_custom_meals_public_created on custom_meals(is_public, created_at desc);

create trigger custom_meals_set_updated_at
before update on custom_meals
for each row
execute procedure set_updated_at();

create table if not exists progress_entries (
  _id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(_id) on delete cascade,
  date timestamptz not null default now(),
  weight numeric,
  calories numeric,
  water numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  workout jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_progress_user_date on progress_entries(user_id, date desc);

create trigger progress_entries_set_updated_at
before update on progress_entries
for each row
execute procedure set_updated_at();

create table if not exists friend_requests (
  _id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references users(_id) on delete cascade,
  to_user_id uuid not null references users(_id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(from_user_id, to_user_id)
);

create index if not exists idx_friend_requests_to_status on friend_requests(to_user_id, status);
create index if not exists idx_friend_requests_from_status on friend_requests(from_user_id, status);

create trigger friend_requests_set_updated_at
before update on friend_requests
for each row
execute procedure set_updated_at();

create table if not exists posts (
  _id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(_id) on delete cascade,
  type text not null,
  content text,
  data jsonb not null default '{}'::jsonb,
  likes uuid[] not null default '{}',
  comments jsonb not null default '[]'::jsonb,
  visibility text not null default 'friends',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_user_created on posts(user_id, created_at desc);

create trigger posts_set_updated_at
before update on posts
for each row
execute procedure set_updated_at();

create table if not exists groups (
  _id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  creator_id uuid not null references users(_id) on delete cascade,
  members uuid[] not null default '{}',
  admins uuid[] not null default '{}',
  emoji text not null default 'Dumbbell',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_groups_created on groups(created_at desc);

create trigger groups_set_updated_at
before update on groups
for each row
execute procedure set_updated_at();

create table if not exists messages (
  _id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(_id) on delete cascade,
  recipient_id uuid references users(_id) on delete cascade,
  group_id uuid references groups(_id) on delete cascade,
  text text not null,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_messages_sender_recipient_created on messages(sender_id, recipient_id, created_at desc);
create index if not exists idx_messages_group_created on messages(group_id, created_at desc);
create index if not exists idx_messages_recipient_created on messages(recipient_id, created_at desc);

create trigger messages_set_updated_at
before update on messages
for each row
execute procedure set_updated_at();

create table if not exists payments (
  _id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(_id) on delete cascade,
  source_id text not null unique,
  payment_id text,
  amount integer not null,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_user on payments(user_id);
create index if not exists idx_payments_payment_id on payments(payment_id);
create index if not exists idx_payments_status on payments(status);

create trigger payments_set_updated_at
before update on payments
for each row
execute procedure set_updated_at();
