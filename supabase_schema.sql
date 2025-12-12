-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Templates Table
create table if not exists templates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  thumbnail text,
  section_order text[] default '{}',
  custom_sections jsonb default '[]',
  global_theme jsonb default '{}',
  event_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Template Sections Table
create table if not exists template_sections (
  id uuid default uuid_generate_v4() primary key,
  template_id uuid references templates(id) on delete cascade not null,
  type text not null,
  is_visible boolean default true,
  background_color text,
  background_url text,
  overlay_opacity numeric default 0.3,
  animation text default 'fade-in',
  page_title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(template_id, type)
);

-- Template Elements Table
create table if not exists template_elements (
  id uuid default uuid_generate_v4() primary key,
  section_id uuid references template_sections(id) on delete cascade not null,
  type text not null,
  name text not null,
  position_x numeric not null,
  position_y numeric not null,
  width numeric not null,
  height numeric not null,
  z_index integer default 0,
  animation text default 'fade-in',
  loop_animation text,
  animation_delay integer default 0,
  animation_speed integer default 500,
  animation_duration integer default 1000,
  content text,
  image_url text,
  text_style jsonb,
  icon_style jsonb,
  countdown_config jsonb,
  rsvp_form_config jsonb,
  guest_wishes_config jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RSVP Responses Table
create table if not exists rsvp_responses (
  id uuid default uuid_generate_v4() primary key,
  template_id uuid references templates(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  message text,
  attendance text,
  is_public boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Optional - Enable if needed)
alter table templates enable row level security;
alter table template_sections enable row level security;
alter table template_elements enable row level security;
alter table rsvp_responses enable row level security;

-- Allow public access for now (for development)
create policy "Public templates access" on templates for all using (true);
create policy "Public sections access" on template_sections for all using (true);
create policy "Public elements access" on template_elements for all using (true);
create policy "Public rsvp access" on rsvp_responses for all using (true);
