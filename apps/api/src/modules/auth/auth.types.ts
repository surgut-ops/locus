import { UserRole } from '@prisma/client';

export type RegisterDto = {
  email: string;
  password: string;
  name: string;
  referralCode?: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type JwtClaims = {
  userId: string;
  role: UserRole;
};

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    avatar: string | null;
    createdAt: Date;
  };
};

export class AuthModuleError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthModuleError';
    this.statusCode = statusCode;
  }
}
