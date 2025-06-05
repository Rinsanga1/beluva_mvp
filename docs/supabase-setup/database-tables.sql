-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_admin BOOLEAN DEFAULT false
);

-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can read their own data" 
  ON public.users 
  FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update their own data" 
  ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- Room images table
CREATE TABLE IF NOT EXISTS public.room_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_anonymous BOOLEAN DEFAULT false
);

-- Enable Row Level Security on room_images table
ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own room images
CREATE POLICY "Users can read their own room images" 
  ON public.room_images 
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own room images
CREATE POLICY "Users can insert their own room images" 
  ON public.room_images 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Furniture items table
CREATE TABLE IF NOT EXISTS public.furniture_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    dimensions TEXT,
    material TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    image_urls TEXT[] DEFAULT '{}'::TEXT[],
    stock_status BOOLEAN DEFAULT true,
    category TEXT,
    purchase_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on furniture_items table
ALTER TABLE public.furniture_items ENABLE ROW LEVEL SECURITY;

-- Create policy for all users to read furniture items
CREATE POLICY "All users can read furniture items" 
  ON public.furniture_items 
  FOR SELECT USING (true);

-- Create policy for admins to manage furniture items
CREATE POLICY "Admins can manage furniture items" 
  ON public.furniture_items 
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true));

-- User sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    uploaded_image_id UUID REFERENCES public.room_images(id) ON DELETE SET NULL,
    selected_furniture_ids UUID[] DEFAULT '{}'::UUID[],
    generated_image_url TEXT,
    preferences JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security on user_sessions table
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own sessions
CREATE POLICY "Users can read their own sessions" 
  ON public.user_sessions 
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own sessions
CREATE POLICY "Users can insert their own sessions" 
  ON public.user_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own sessions
CREATE POLICY "Users can update their own sessions" 
  ON public.user_sessions 
  FOR UPDATE USING (auth.uid() = user_id);

-- Furniture placement metadata table
CREATE TABLE IF NOT EXISTS public.furniture_placement_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generated_image_id UUID NOT NULL REFERENCES public.user_sessions(id) ON DELETE CASCADE,
    furniture_id UUID NOT NULL REFERENCES public.furniture_items(id) ON DELETE CASCADE,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security on furniture_placement_metadata table
ALTER TABLE public.furniture_placement_metadata ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own placement metadata
CREATE POLICY "Users can read their own placement metadata" 
  ON public.furniture_placement_metadata 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_sessions 
      WHERE id = furniture_placement_metadata.generated_image_id
    )
  );

-- Create policy for users to insert their own placement metadata
CREATE POLICY "Users can insert their own placement metadata" 
  ON public.furniture_placement_metadata 
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.user_sessions 
      WHERE id = furniture_placement_metadata.generated_image_id
    )
  );

-- Create policy for users to update their own placement metadata
CREATE POLICY "Users can update their own placement metadata" 
  ON public.furniture_placement_metadata 
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_sessions 
      WHERE id = furniture_placement_metadata.generated_image_id
    )
  );

-- Create Supabase storage buckets if not existing already
-- NOTE: You'll need to run these through the Supabase Dashboard or REST API
-- These are not standard SQL commands

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add the trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_furniture_items_updated_at
    BEFORE UPDATE ON public.furniture_items
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();