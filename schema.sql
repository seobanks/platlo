-- ==========================================
-- PLATLO DATABASE SCHEMA FOR SUPABASE
-- ==========================================

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. USER PROFILES TABLE (Extends auth.users)
create table public.users_profile (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  role text default 'user' check (role in ('user', 'agent', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on users_profile
alter table public.users_profile enable row level security;

-- RLS Policies for users_profile
create policy "Allow public read access to profiles" on public.users_profile
  for select using (true);

create policy "Allow users to update their own profile" on public.users_profile
  for update using (auth.uid() = id);

-- Trigger to automatically create users_profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users_profile (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'phone',
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger (drop first to prevent duplicate errors)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. PROPERTY LISTINGS TABLE
create table public.properties (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users on delete cascade,
  title text not null,
  description text,
  listing_type text not null check (listing_type in ('sell', 'rent')),
  property_type text not null check (property_type in ('apartment', 'house', 'plot', 'commercial', 'pg')),
  price numeric not null,
  bedrooms integer default 0,
  bathrooms integer default 0,
  balconies integer default 0,
  carpet_area numeric not null, -- in sq ft
  city text not null,
  locality text not null,
  address text not null,
  society text,
  furnishing text default 'unfurnished' check (furnishing in ('unfurnished', 'semi-furnished', 'fully-furnished')),
  parking text default 'none' check (parking in ('none', 'bike', 'car', 'both')),
  floor integer default 0,
  total_floors integer default 0,
  images text[] default '{}'::text[],
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  views_count integer default 0,
  status text default 'active' check (status in ('active', 'inactive', 'sold')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on properties
alter table public.properties enable row level security;

-- RLS Policies for properties
create policy "Allow public read access to active properties" on public.properties
  for select using (status = 'active');

create policy "Allow authenticated users to insert properties" on public.properties
  for insert with check (auth.role() = 'authenticated');

create policy "Allow owners to update their own properties" on public.properties
  for update using (auth.uid() = owner_id);

create policy "Allow owners to delete their own properties" on public.properties
  for delete using (auth.uid() = owner_id);


-- 3. ENQUIRIES TABLE (Leads sent to property owners)
create table public.enquiries (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties on delete cascade not null,
  sender_name text not null,
  sender_phone text not null,
  sender_email text,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on enquiries
alter table public.enquiries enable row level security;

-- RLS Policies for enquiries
-- Anyone can insert an enquiry (even unauthenticated leads/buyers)
create policy "Allow anyone to create enquiries" on public.enquiries
  for insert with check (true);

-- Only the owner of the listing can view their enquiries
create policy "Allow listing owners to view enquiries" on public.enquiries
  for select using (
    exists (
      select 1 from public.properties
      where properties.id = enquiries.property_id
        and properties.owner_id = auth.uid()
    )
  );


-- 4. SAVED PROPERTIES TABLE (User bookmarks)
create table public.saved_properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  property_id uuid references public.properties on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, property_id)
);

-- Enable RLS on saved_properties
alter table public.saved_properties enable row level security;

-- RLS Policies for saved_properties
create policy "Allow users to view their own saved properties" on public.saved_properties
  for select using (auth.uid() = user_id);

create policy "Allow users to save properties" on public.saved_properties
  for insert with check (auth.uid() = user_id);

create policy "Allow users to remove saved properties" on public.saved_properties
  for delete using (auth.uid() = user_id);


-- 5. PERFORMANCE INDEXES
create index if not exists idx_properties_city_locality on public.properties(city, locality);
create index if not exists idx_properties_listing_type on public.properties(listing_type);
create index if not exists idx_properties_price on public.properties(price);
create index if not exists idx_enquiries_property_id on public.enquiries(property_id);
create index if not exists idx_saved_properties_user_id on public.saved_properties(user_id);
