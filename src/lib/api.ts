/**
 * LiftUp Labs Attendance Module - API Utilities
 * Pure Express/PostgreSQL/Cloudinary client utilities.
 * (Supabase dependencies removed completely)
 */

const LOCALHOST_BACKEND_URL = 'http://localhost:5000';
const ENV_BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').trim();

/**
 * Resolve the backend API base URL across every environment:
 *
 * 1. `VITE_BACKEND_URL` is set to a real (non-localhost) URL → use it as-is.
 *    In production this value is injected at build time by the hosting platform
 *    (Vercel → Project Settings → Environment Variables) and must be the
 *    deployed HTTPS backend origin, e.g. `https://your-backend.onrender.com`.
 * 2. Running on localhost (development) → local backend on port 5000.
 * 3. Deployed domain without `VITE_BACKEND_URL` → the current page origin
 *    (`window.location.origin`) is used as fallback, assuming the backend is
 *    proxied or co-located. Because `origin` inherits the page protocol, an
 *    HTTPS page always targets an HTTPS backend (no mixed-content errors).
 */
function resolveBackendApiUrl(): string {
  const isLocalhost =
    typeof window === 'undefined' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  // 1. Explicit production/deployed backend URL from Vite env vars.
  //    `http://localhost:5000` is treated as "not configured" here so a stale
  //    dev value can never leak into a deployed build.
  if (ENV_BACKEND_URL && ENV_BACKEND_URL !== LOCALHOST_BACKEND_URL) {
    return ENV_BACKEND_URL.replace(/\/+$/, '');
  }

  // 2. Local development → local backend server.
  if (isLocalhost) {
    return LOCALHOST_BACKEND_URL;
  }

  // 3. Deployed domain → same origin (protocol-safe: https stays https).
  return typeof window !== 'undefined' ? window.location.origin : LOCALHOST_BACKEND_URL;
}

export const BACKEND_API_URL = resolveBackendApiUrl();

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
