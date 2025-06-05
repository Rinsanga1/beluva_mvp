-- Beluva Database Setup Script
-- Run this in the Supabase SQL Editor to set up your database

-- Check if the users table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        -- Create the users table if it doesn't exist
        CREATE TABLE public.users (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            is_admin BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );

        -- Set up row-level security policies
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

        -- Allow public access for inserts (needed for signups)
        CREATE POLICY "Allow public insert access" ON public.users
            FOR INSERT TO anon
            WITH CHECK (true);

        -- Allow users to read their own data
        CREATE POLICY "Allow users to read their own data" ON public.users
            FOR SELECT TO authenticated
            USING (auth.uid() = id);

        -- Allow users to update their own data
        CREATE POLICY "Allow users to update their own data" ON public.users
            FOR UPDATE TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);

        -- Allow admin access to all rows
        CREATE POLICY "Allow admin full access" ON public.users
            FOR ALL TO authenticated
            USING (auth.jwt() ->> 'role' = 'service_role' OR (SELECT is_admin FROM public.users WHERE id = auth.uid()));

        -- Grant privileges to authenticated and anon roles
        GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated, anon;
        
        RAISE NOTICE 'Created users table with security policies';
    ELSE
        RAISE NOTICE 'Users table already exists, checking structure...';
        
        -- Check if columns exist and add them if needed
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_admin'
        ) THEN
            ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT false;
            RAISE NOTICE 'Added is_admin column';
        END IF;
        
        -- Ensure RLS is enabled
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Check and create policies if they don't exist
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'users' AND policyname = 'Allow public insert access'
        ) THEN
            CREATE POLICY "Allow public insert access" ON public.users
                FOR INSERT TO anon
                WITH CHECK (true);
            RAISE NOTICE 'Added public insert policy';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'users' AND policyname = 'Allow users to read their own data'
        ) THEN
            CREATE POLICY "Allow users to read their own data" ON public.users
                FOR SELECT TO authenticated
                USING (auth.uid() = id);
            RAISE NOTICE 'Added user read policy';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'users' AND policyname = 'Allow users to update their own data'
        ) THEN
            CREATE POLICY "Allow users to update their own data" ON public.users
                FOR UPDATE TO authenticated
                USING (auth.uid() = id)
                WITH CHECK (auth.uid() = id);
            RAISE NOTICE 'Added user update policy';
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'users' AND policyname = 'Allow admin full access'
        ) THEN
            CREATE POLICY "Allow admin full access" ON public.users
                FOR ALL TO authenticated
                USING (auth.jwt() ->> 'role' = 'service_role' OR (SELECT is_admin FROM public.users WHERE id = auth.uid()));
            RAISE NOTICE 'Added admin access policy';
        END IF;
        
        -- Ensure permissions are set
        GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated, anon;
        RAISE NOTICE 'Granted permissions to authenticated and anon roles';
    END IF;
END$$;

-- Create the debug function (separate from the DO block)
CREATE OR REPLACE FUNCTION public.debug_table_info(table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'table_exists', EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = debug_table_info.table_name
    ),
    'columns', (
      SELECT jsonb_agg(jsonb_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable
      ))
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = debug_table_info.table_name
    ),
    'constraints', (
      SELECT jsonb_agg(jsonb_build_object(
        'constraint_name', tc.constraint_name,
        'constraint_type', tc.constraint_type
      ))
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public' AND tc.table_name = debug_table_info.table_name
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.debug_table_info(text) TO authenticated, anon;

-- Run this query to check the current structure of the users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users';

-- Run this to check the policies on the users table
SELECT policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- Display current user count
SELECT count(*) FROM public.users;