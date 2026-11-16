const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MARKETING_MANAGER' | 'COMPLIANCE_REVIEWER';
  isActive: boolean;
  lastLoginAt?: string;
}

export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken?: string;
}

export class AuthService {
  private static TOKEN_KEY = 'cea_access_token';
  private static USER_KEY = 'cea_user_profile';

  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setSession(accessToken: string, user: UserProfile): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  static getStoredUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(this.USER_KEY);
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error?.message || 'Authentication failed');
    }

    const loginData: LoginResponse = data.data;
    this.setSession(loginData.accessToken, loginData.user);
    return loginData;
  }

  static async logout(): Promise<void> {
    const token = this.getAccessToken();
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });
    } catch {
      // Ignored
    } finally {
      this.clearSession();
    }
  }

  static async getMe(): Promise<UserProfile | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        this.clearSession();
        return null;
      }
      return data.data.user;
    } catch {
      return null;
    }
  }
}
