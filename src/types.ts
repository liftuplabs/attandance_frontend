export type UserRole = 'employee' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  password?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
  created_at?: string;
}

export type CheckType = 'in' | 'out';
export type AttendanceStatus = 'valid' | 'out_of_range';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  office_id: string;
  check_type: CheckType;
  lat: number;
  lng: number;
  distance_meters: number;
  photo_url: string | null;
  status: AttendanceStatus;
  created_at: string;
  user_name?: string;
  profiles?: {
    full_name: string;
    phone: string;
    role: UserRole;
  };
  office_name?: string;
  offices?: {
    name: string;
    radius_meters: number;
  };
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}
