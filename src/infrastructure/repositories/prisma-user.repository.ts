import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities';
import { UserRole } from '../../domain/enums';
import { IUserRepository } from '../../domain/interfaces';
import { PrismaService } from '../database/prisma';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: User): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const created = await this.prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.toDomain(created);
  }

  async findById(id: string): Promise<User | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const record = await this.prisma.user.findUnique({ where: { id } });

    if (!record) return null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.toDomain(record);
  }

  async findByEmail(email: string): Promise<User | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const record = await this.prisma.user.findUnique({ where: { email } });

    if (!record) return null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.toDomain(record);
  }

  async findAll(): Promise<User[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const records = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return records.map((r: Record<string, unknown>) => this.toDomain(r));
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.passwordHash !== undefined && { passwordHash: data.passwordHash }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.user.delete({ where: { id } });
  }

  private toDomain(record: Record<string, unknown>): User {
    return new User({
      id: record.id as string,
      name: record.name as string,
      email: record.email as string,
      passwordHash: record.passwordHash as string,
      role: record.role as UserRole,
      isActive: record.isActive as boolean,
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
    });
  }
}
