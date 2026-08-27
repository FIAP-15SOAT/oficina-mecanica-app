import { PrismaUserCustomerAccessRepository } from '@infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

describe('PrismaUserCustomerAccessRepository', () => {
  let repository: PrismaUserCustomerAccessRepository;
  let prisma: { userCustomerAccess: Record<string, jest.Mock> };

  beforeEach(() => {
    prisma = {
      userCustomerAccess: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    repository = new PrismaUserCustomerAccessRepository(prisma as never);
  });

  it('should create an access link', async () => {
    const access = UserCustomerAccess.create({
      userId: 'user-1',
      customerId: 'customer-1',
      relationship: AccessRelationship.SELF,
    });

    prisma.userCustomerAccess.create.mockResolvedValue({
      id: access.id,
      userId: access.userId,
      customerId: access.customerId,
      relationship: access.relationship,
      createdAt: access.createdAt,
    });

    const result = await repository.create(access);

    expect(prisma.userCustomerAccess.create).toHaveBeenCalledWith({
      data: {
        id: access.id,
        userId: access.userId,
        customerId: access.customerId,
        relationship: access.relationship,
      },
    });
    expect(result.id).toBe(access.id);
  });

  it('should find all access links for a user', async () => {
    const now = new Date();
    prisma.userCustomerAccess.findMany.mockResolvedValue([
      {
        id: 'a1',
        userId: 'user-1',
        customerId: 'customer-1',
        relationship: 'SELF',
        createdAt: now,
      },
      {
        id: 'a2',
        userId: 'user-1',
        customerId: 'customer-2',
        relationship: 'REPRESENTATIVE',
        createdAt: now,
      },
    ]);

    const result = await repository.findByUserId('user-1');

    expect(prisma.userCustomerAccess.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.customerId)).toEqual(['customer-1', 'customer-2']);
  });

  it('should return null when no access link exists for the pair', async () => {
    prisma.userCustomerAccess.findUnique.mockResolvedValue(null);

    const result = await repository.findByUserIdAndCustomerId('user-1', 'customer-1');

    expect(prisma.userCustomerAccess.findUnique).toHaveBeenCalledWith({
      where: { userId_customerId: { userId: 'user-1', customerId: 'customer-1' } },
    });
    expect(result).toBeNull();
  });

  it('should throw ResourceConflictException when the pair already has a link', async () => {
    const { Prisma } = jest.requireActual('@generated/client');
    const access = UserCustomerAccess.create({
      userId: 'user-1',
      customerId: 'customer-1',
      relationship: AccessRelationship.SELF,
    });

    prisma.userCustomerAccess.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.8.0',
      }),
    );

    await expect(repository.create(access)).rejects.toThrow('já está vinculado');
  });
});
