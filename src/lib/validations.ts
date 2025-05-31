import { z } from 'zod';

/**
 * Validation schemas for API endpoints and form data
 */

// User validation schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  created_at: z.string().datetime(),
});

export const UserCreateSchema = UserSchema.omit({ id: true, created_at: true });
export const UserUpdateSchema = UserCreateSchema.partial();

// Auth validation schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const SignupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Room image validation schemas
export const RoomImageSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  file_path: z.string(),
  uploaded_at: z.string().datetime(),
});

export const ImageUploadSchema = z.object({
  file: z.any()
    .refine((file) => {
      // Skip validation during server-side rendering
      if (typeof window === 'undefined') return true;
      return file instanceof File;
    }, { message: 'Please upload a file' })
    .refine((file) => {
      // Skip validation during server-side rendering
      if (typeof window === 'undefined') return true;
      return file.size <= 10 * 1024 * 1024;
    }, { message: 'File size must be less than 10MB' })
    .refine(
      (file) => {
        // Skip validation during server-side rendering
        if (typeof window === 'undefined') return true;
        return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      },
      { message: 'File must be a JPG, PNG, or WEBP image' }
    ),
});

// Furniture validation schemas
export const FurnitureItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  price: z.number().nonnegative('Price must be a positive number'),
  dimensions: z.string(),
  material: z.string(),
  tags: z.array(z.string()),
  image_urls: z.array(z.string().url('Invalid image URL')),
  stock_status: z.boolean(),
  category: z.string(),
  purchase_link: z.string().url('Invalid purchase link'),
});

export const FurnitureCreateSchema = FurnitureItemSchema.omit({ id: true });
export const FurnitureUpdateSchema = FurnitureCreateSchema.partial();

// Recommendation request validation schemas
export const RecommendationRequestSchema = z.object({
  room_image_id: z.string().uuid(),
  budget: z.number().nonnegative('Budget must be a positive number'),
  style: z.string().optional(),
  furniture_types: z.array(z.string()).min(1, 'At least one furniture type is required'),
});

// Room visualization validation schemas
export const RoomVisualizationRequestSchema = z.object({
  room_image_id: z.string().uuid(),
  furniture_item_ids: z.array(z.string().uuid()).min(1, 'At least one furniture item is required'),
});

// Furniture placement metadata validation schemas
export const FurniturePlacementMetadataSchema = z.object({
  id: z.string().uuid(),
  generated_image_id: z.string().uuid(),
  furniture_id: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive('Width must be a positive number'),
  height: z.number().positive('Height must be a positive number'),
});

// User session validation schemas
export const UserSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  uploaded_image_id: z.string().uuid(),
  selected_furniture_ids: z.array(z.string().uuid()),
  generated_image_url: z.string().url('Invalid generated image URL'),
  created_at: z.string().datetime(),
});

// API response validation schemas
export const ApiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});

export const ApiSuccessSchema = z.object({
  success: z.boolean(),
  data: z.any(),
});