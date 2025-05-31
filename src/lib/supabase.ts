import { createClient } from '@supabase/supabase-js';

// Environment variables are defined in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Create a single supabase client for the entire app
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

// Type definitions for Supabase tables
export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type RoomImage = {
  id: string;
  user_id: string;
  file_path: string;
  uploaded_at: string;
};

export type FurnitureItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  dimensions: string;
  material: string;
  tags: string[];
  image_urls: string[];
  stock_status: boolean;
  category: string;
  purchase_link: string;
};

export type UserSession = {
  id: string;
  user_id: string;
  uploaded_image_id: string;
  selected_furniture_ids: string[];
  generated_image_url: string;
  created_at: string;
};

export type FurniturePlacementMetadata = {
  id: string;
  generated_image_id: string;
  furniture_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};