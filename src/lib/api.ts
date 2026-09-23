/**
 * LiftUp Labs Attendance Module - API Utilities
 * Pure Express/PostgreSQL/Cloudinary client utilities.
 * (Supabase dependencies removed completely)
 */

export const BACKEND_API_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'http://localhost:5000');

/**
 * Upload selfie photo blob to backend Cloudinary service.
 * Returns the Cloudinary HTTPS URL or base64 fallback.
 */
export async function uploadSelfiePhoto(
  _userId: string,
  blob: Blob
): Promise<string> {
  const base64Data: string = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  try {
    const response = await fetch(`${BACKEND_API_URL}/api/attendance/upload-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Data }),
    });

    const data = await response.json();
    if (response.ok && data.url) {
      return data.url;
    }
  } catch (err) {
    console.warn('⚠️ Backend Cloudinary upload error:', err);
  }

  return base64Data;
}

/**
 * Helper to normalize photo URLs for display.
 */
export async function getSignedPhotoUrl(photoPath: string): Promise<string> {
  if (!photoPath) return '';
  return photoPath;
}
