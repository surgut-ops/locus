import { UserRole, type PrismaClient } from '@prisma/client';

export class AuthRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  public async createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    referralCode?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        referralCode: data.referralCode,
      },
    });
  }

  public async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
}
