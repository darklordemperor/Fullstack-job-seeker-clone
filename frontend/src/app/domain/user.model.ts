export type UserRole = 'ROLE_ADMIN' | 'ROLE_EMPLOYER' | 'ROLE_JOB_SEEKER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  banned: boolean;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
}
