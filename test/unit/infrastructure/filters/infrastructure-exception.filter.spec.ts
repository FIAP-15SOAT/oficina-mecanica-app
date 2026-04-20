import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { InfrastructureExceptionFilter } from '@infrastructure/filters/infrastructure-exception.filter';
import { AuthenticationFailedException } from '@infrastructure/exceptions/authentication-failed.exception';
import { DatabaseOperationException } from '@infrastructure/exceptions/database-operation.exception';
import { InfrastructureException } from '@infrastructure/exceptions/infrastructure.exception';

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

class GenericInfrastructureException extends InfrastructureException {
  constructor(message: string) {
    super(message);
  }
}

describe('InfrastructureExceptionFilter', () => {
  let filter: InfrastructureExceptionFilter;

  beforeEach(() => {
    filter = new InfrastructureExceptionFilter();
  });

  it('should return 401 for AuthenticationFailedException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new AuthenticationFailedException('Token inválido');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'Não Autorizado',
      message: 'Token inválido',
    });
  });

  it('should return 401 for AuthenticationFailedException with default message', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new AuthenticationFailedException();

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'Não Autorizado',
      message: 'Falha na autenticação',
    });
  });

  it('should return 503 for DatabaseOperationException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new DatabaseOperationException('INSERT', 'conexão recusada');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      error: 'Serviço Indisponível',
      message: 'Erro na operação INSERT: conexão recusada',
    });
  });

  it('should return 503 for DatabaseOperationException without detail', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new DatabaseOperationException('DELETE');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      error: 'Serviço Indisponível',
      message: 'Erro na operação DELETE',
    });
  });

  it('should return 500 for generic InfrastructureException', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new GenericInfrastructureException('Erro inesperado');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Erro Interno do Servidor',
      message: 'Erro inesperado',
    });
  });

  it('should log exception with logger.error', () => {
    const { host } = createMockHost();
    const exception = new DatabaseOperationException('SELECT', 'timeout');

    const loggerSpy = jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);

    filter.catch(exception, host);

    expect(loggerSpy).toHaveBeenCalledWith(exception.message, exception.stack);
  });
});
