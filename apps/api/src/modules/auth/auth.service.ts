import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

import { getQueueService } from '../infrastructure/queue/queue.service.js';
import type { AuthenticatedUser } from '../../utils/auth.js';
import { AuthRepository } from './auth.repository.js';
import { type AuthResponse, AuthModuleError, type JwtClaims, type LoginDto, type RegisterDto } from './auth.types.js';

const MIN_PASSWORD_LENGTH = 8;

export type ReferralServiceLike = {
  generateUniqueReferralCode(): Promise<string>;
  handleReferralOnRegistration(
    referralCode: string | undefined,
    referredUserId: string,
    referredUserName: string,
  ): Promise<void>;
};

export class AuthService {
  public constructor(
    private readonly repository: AuthRepository,
    private readonly referralService?: ReferralServiceLike,
  ) {}

  public async register(payload: unknown): Promise<AuthResponse> {
    const dto = parseRegisterPayload(payload);
    const existing = await this.repository.findUserByEmail(dto.email);
    if (existing) {
      throw new AuthModuleError('Email is already in use', 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const nameParts = splitName(dto.name);
    const referralCode =
      this.referralService ? await this.referralService.generateUniqueReferralCode() : undefined;
    const created = await this.repository.createUser({
      email: dto.email,
      passwordHash,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      role: UserRole.USER,
      referralCode,
    });

    if (this.referralService && dto.referralCode) {
      const referredUserName = `${nameParts.firstName} ${nameParts.lastName}`.trim() || 'Пользователь';
      await this.referralService
        .handleReferralOnRegistration(dto.referralCode, created.id, referredUserName)
        .catch(() => {});
    }

    const queueService = getQueueService();
    if (queueService) {
      const name = `${nameParts.firstName} ${nameParts.lastName}`.trim() || 'Пользователь';
      await queueService.addEmailJob({
        template: 'welcome',
        to: created.email,
        subject: 'Добро пожаловать в LOCUS',
        data: { name },
      });
    }

    return {
      token: signJwt({ userId: created.id, role: created.role }),
      user: toProfile(created),
    };
  }

  public async login(payload: unknown): Promise<AuthResponse> {
    const dto = parseLoginPayload(payload);
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user) {
      throw new AuthModuleError('Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new AuthModuleError('Invalid email or password', 401);
    }

    return {
      token: signJwt({ userId: user.id, role: user.role }),
      user: toProfile(user),
    };
  }

  public async getMyProfile(actor: AuthenticatedUser) {
    const user = await this.repository.findUserById(actor.id);
    if (!user) {
      throw new AuthModuleError('User not found', 404);
    }
    return toProfile(user);
  }
}

function parseRegisterPayload(payload: unknown): RegisterDto {
  if (!isObject(payload)) {
    throw new AuthModuleError('Invalid request body', 400);
  }

  const email = requireEmail(payload.email);
  const password = requirePassword(payload.password);
  const name = requireName(payload.name);
  const referralCode = optionalString(payload.referralCode);

  return { email, password, name, referralCode };
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.trim();
}

function parseLoginPayload(payload: unknown): LoginDto {
  if (!isObject(payload)) {
    throw new AuthModuleError('Invalid request body', 400);
  }

  const email = requireEmail(payload.email);
  const password = requirePassword(payload.password);
  return { email, password };
}

function signJwt(claims: JwtClaims): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AuthModuleError('JWT_SECRET is missing', 500);
  }
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
  return jwt.sign(claims, secret, { expiresIn });
}

function requireEmail(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AuthModuleError('Field "email" is required', 400);
  }
  const email = value.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new AuthModuleError('Field "email" must be valid', 400);
  }
  return email;
}

function requirePassword(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AuthModuleError('Field "password" is required', 400);
  }
  const password = value.trim();
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthModuleError(`Field "password" must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }
  return password;
}

function requireName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AuthModuleError('Field "name" is required', 400);
  }
  return value.trim();
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '-' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function toProfile(user: {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    role: normalizeRole(user.role),
    name: `${user.firstName} ${user.lastName}`.trim(),
    avatar: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

function normalizeRole(role: UserRole): UserRole {
  if (role === UserRole.ADMIN || role === UserRole.HOST) {
    return role;
  }
  return UserRole.USER;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
