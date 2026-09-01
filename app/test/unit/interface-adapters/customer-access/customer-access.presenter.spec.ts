import { randomUUID } from 'node:crypto';

import { CustomerAccessPresenter } from '@interface-adapters/customer-access/customer-access.presenter';
import { GrantCustomerAccessOutputDto } from '@application/ports/input/customer-access/dto/grant-customer-access.dto';

describe('CustomerAccessPresenter', () => {
  describe('toDataResponse', () => {
    it('should wrap the grant result in a data property', () => {
      const result: GrantCustomerAccessOutputDto = {
        userId: randomUUID(),
        customerId: randomUUID(),
        initialPasswordSent: true,
      };

      expect(CustomerAccessPresenter.toDataResponse(result)).toEqual({ data: result });
    });
  });
});
