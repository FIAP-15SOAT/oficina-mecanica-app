import { randomUUID } from 'node:crypto';
import { FindAccessibleCustomerIdsForUserUseCase } from '@application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

describe('FindAccessibleCustomerIdsForUserUseCase', () => {
  let useCase: FindAccessibleCustomerIdsForUserUseCase;
  let accessRepository: { findByUserId: jest.Mock };

  beforeEach(() => {
    accessRepository = { findByUserId: jest.fn() };
    useCase = new FindAccessibleCustomerIdsForUserUseCase(accessRepository as never);
  });

  it('should return the customerIds linked to the user (SELF and REPRESENTATIVE)', async () => {
    const userId = randomUUID();
    const selfCustomerId = randomUUID();
    const representedCustomerId = randomUUID();

    accessRepository.findByUserId.mockResolvedValue([
      UserCustomerAccess.create({
        userId,
        customerId: selfCustomerId,
        relationship: AccessRelationship.SELF,
      }),
      UserCustomerAccess.create({
        userId,
        customerId: representedCustomerId,
        relationship: AccessRelationship.REPRESENTATIVE,
      }),
    ]);

    const result = await useCase.execute(userId);

    expect(result).toEqual([selfCustomerId, representedCustomerId]);
    expect(accessRepository.findByUserId).toHaveBeenCalledWith(userId);
  });

  it('should return an empty array when the user has no access links', async () => {
    accessRepository.findByUserId.mockResolvedValue([]);

    const result = await useCase.execute(randomUUID());

    expect(result).toEqual([]);
  });
});
