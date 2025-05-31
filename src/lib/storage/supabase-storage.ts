import supabase from '@/lib/supabase';
import { apiLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Utility for managing file uploads to Supabase Storage
 */

// Define allowed image mime types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Error types
export class StorageError extends Error {
  public code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
  }
}

/**
 * Validates a file before upload
 */
export const validateFile = (file: File): { valid: boolean; error?: StorageError } => {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: new StorageError(
        'Invalid file type. Only JPG, PNG, and WEBP are allowed.',
        'invalid_file_type'
      ),
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: new StorageError(
        'File too large. Maximum size is 10MB.',
        'file_too_large'
      ),
    };
  }

  return { valid: true };
};

/**
 * Uploads a room image to Supabase Storage
 */
export const uploadRoomImage = async (
  file: File,
  userId: string
): Promise<{ path: string; id: string }> => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw validation.error;
    }

    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload file to Supabase Storage
    apiLogger.info('Uploading room image to Supabase Storage', {
      userId,
      fileName,
      fileSize: file.size,
      fileType: file.type,
    });

    const { data, error } = await supabase.storage
      .from('room-uploads')
      .upload(filePath, file);

    if (error) {
      apiLogger.error('Error uploading to Supabase Storage', { error });
      throw new StorageError(
        `Failed to upload image: ${error.message}`,
        'upload_failed'
      );
    }

    // Create a record in the room_images table
    const { data: roomImage, error: dbError } = await supabase
      .from('room_images')
      .insert([
        {
          user_id: userId,
          file_path: data.path,
        },
      ])
      .select()
      .single();

    if (dbError) {
      apiLogger.error('Error creating room_images record', { error: dbError });
      
      // Attempt to delete the uploaded file since we couldn't create the database record
      await supabase.storage.from('room-uploads').remove([filePath]);
      
      throw new StorageError(
        `Failed to save image metadata: ${dbError.message}`,
        'database_error'
      );
    }

    apiLogger.success('Room image uploaded successfully', {
      imageId: roomImage.id,
      path: data.path,
    });

    return {
      path: data.path,
      id: roomImage.id,
    };
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    
    apiLogger.error('Unexpected error during image upload', { error });
    throw new StorageError(
      'An unexpected error occurred during upload',
      'unexpected_error'
    );
  }
};

/**
 * Gets a public URL for a stored image
 */
export const getImageUrl = (path: string): string => {
  const { data } = supabase.storage.from('room-uploads').getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Deletes a room image from storage
 */
export const deleteRoomImage = async (imageId: string, userId: string): Promise<boolean> => {
  try {
    // Get the image record to find the file path
    const { data: image, error: fetchError } = await supabase
      .from('room_images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', userId) // Security check: ensure the user owns this image
      .single();

    if (fetchError) {
      apiLogger.error('Error fetching room image for deletion', { error: fetchError });
      throw new StorageError(
        `Failed to find image: ${fetchError.message}`,
        'not_found'
      );
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('room-uploads')
      .remove([image.file_path]);

    if (storageError) {
      apiLogger.error('Error deleting file from storage', { error: storageError });
      throw new StorageError(
        `Failed to delete image file: ${storageError.message}`,
        'storage_delete_failed'
      );
    }

    // Delete the database record
    const { error: dbError } = await supabase
      .from('room_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', userId);

    if (dbError) {
      apiLogger.error('Error deleting room image record', { error: dbError });
      throw new StorageError(
        `Failed to delete image record: ${dbError.message}`,
        'database_delete_failed'
      );
    }

    apiLogger.success('Room image deleted successfully', { imageId });
    return true;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    
    apiLogger.error('Unexpected error during image deletion', { error });
    throw new StorageError(
      'An unexpected error occurred during deletion',
      'unexpected_error'
    );
  }
};