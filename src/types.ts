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

export type CheckType = 'in' | 'out' | 'on_duty_in' | 'on_duty_out';
export type AttendanceStatus = 'valid' | 'out_of_range' | 'pending_approval' | 'rejected';

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
  remarks?: string;
  admin_notes?: string;
  is_on_duty?: boolean;
  is_auto_logout?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
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
