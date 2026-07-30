import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-supabase')
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const BACKEND_API_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Upload selfie photo blob to private bucket 'attendance-photos'
 * Returns file path or data URL fallback
 */
export async function uploadSelfiePhoto(
  userId: string,
  blob: Blob
): Promise<string> {
  if (supabase) {
    const filename = `${userId}/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!error && data) {
      return data.path; // Return relative storage path for private signed URL generation
    }
    console.warn('Supabase storage upload failed, falling back to data URL:', error);
  }

  // Fallback: Convert Blob to Data URL for instant local demo photo viewing
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch a short-lived 5-minute signed URL for viewing private selfie photos
 */
export async function getSignedPhotoUrl(photoPath: string): Promise<string> {
  if (!photoPath) return '';
  if (photoPath.startsWith('data:image') || photoPath.startsWith('http')) {
    return photoPath;
  }

  try {
    const response = await fetch(
      `${BACKEND_API_URL}/api/attendance/signed-url?path=${encodeURIComponent(photoPath)}`
    );
    const data = await response.json();
    return data.signedUrl || photoPath;
  } catch (err) {
    console.warn('Failed to fetch signed URL:', err);
    return photoPath;
  }
}
