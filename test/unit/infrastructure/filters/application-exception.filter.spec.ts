import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ApplicationException } from '@application/exceptions/application.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { ApplicationExceptionFilter } from '@infrastructure/filters/application-exception.filter';

class GenericApplicationException extends ApplicationException {
  constructor(message: string) {
    super(message);
  }
}

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

describe('ApplicationExceptionFilter', () => {
  let filter: ApplicationExceptionFilter;

  beforeEach(() => {
    filter = new ApplicationExceptionFilter();
  });

  it('should return 404 for ResourceNotFoundException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new ResourceNotFoundException('Usuário', 'uuid-123');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Não Encontrado',
      message: 'Usuário não encontrado(a) com identificador: uuid-123',
    });
  });

  it('should return 409 for ResourceConflictException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new ResourceConflictException('E-mail já cadastrado no sistema');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflito',
      message: 'E-mail já cadastrado no sistema',
    });
  });

  it('should return 401 for UnauthorizedAccessException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new UnauthorizedAccessException('Credenciais inválidas');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'Não Autorizado',
      message: 'Credenciais inválidas',
    });
  });

  it('should return 500 for generic ApplicationException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new GenericApplicationException('Erro inesperado na aplicação');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Erro da Aplicação',
      message: 'Erro inesperado na aplicação',
    });
  });
});
