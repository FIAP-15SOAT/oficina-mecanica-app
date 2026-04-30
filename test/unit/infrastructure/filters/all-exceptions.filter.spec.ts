import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from '@infrastructure/filters/all-exceptions.filter';

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

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('should return the HttpException status and message for 4xx errors', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new HttpException('Recurso não encontrado', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Bad Request',
      message: 'Recurso não encontrado',
    });
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('should return 500 and generic message for unknown Error instances', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new Error('Erro inesperado no sistema');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith('Erro inesperado no sistema', exception.stack);
  });

  it('should return 500 and log "Unexpected error" when a non-Error value is thrown', () => {
    const { host, statusFn, jsonFn } = createMockHost();

    filter.catch('string thrown as exception', host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith('Unexpected error', undefined);
  });

  it('should return 400 for SyntaxError with body property (malformed JSON body)', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = Object.assign(new SyntaxError('Unexpected token'), { body: '{ invalid' });

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Bad request',
    });
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('should return 400 for SyntaxError with status and code properties (Express body-parser)', () => {
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = Object.assign(new SyntaxError('Unexpected token'), { status: 400, code: 'INVALID_JSON' });

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonFn).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Bad request',
    });
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });
});
