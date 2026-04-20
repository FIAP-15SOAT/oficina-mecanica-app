import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { DomainExceptionFilter } from '@infrastructure/filters/domain-exception.filter';

function createMockHost() {
  const jsonFn = jest.fn();
  const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
  const mockResponse = { status: statusFn };

  const host = {
    switchToHttp: () => ({
      getResponse: <T = typeof mockResponse>(): T => mockResponse as T,
      getRequest: jest.fn(),
      getNext: jest.fn(),
    }),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } satisfies ArgumentsHost;

  return { host, statusFn, jsonFn };
}

describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter;

  beforeEach(() => {
    filter = new DomainExceptionFilter();
  });

  it('deve retornar 422 para DomainValidationException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new DomainValidationException('Nome deve ter no mínimo 3 caracteres');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      error: 'Unprocessable Entity',
      message: 'Nome deve ter no mínimo 3 caracteres',
    });
  });

  it('deve retornar 404 para EntityNotFoundException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new EntityNotFoundException('Usuário', 'uuid-123');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Not Found',
      message: 'Usuário não encontrado(a) com identificador: uuid-123',
    });
  });

  it('deve retornar 409 para BusinessRuleViolationException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new BusinessRuleViolationException('Operação não permitida');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'Business Rule Violation',
      message: 'Operação não permitida',
    });
  });
});
