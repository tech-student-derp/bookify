// Bookify — Auth types
export type UserRole = 'customer' | 'seller' | 'staff' | 'admin';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  contact_number?: string | null;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  contact_number?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  contact_number?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

export interface ApiSuccess<T = Record<string, unknown>> {
  success: true;
  message?: string;
  data?: T;
}
