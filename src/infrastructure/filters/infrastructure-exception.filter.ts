import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { InfrastructureException } from '../exceptions/infrastructure.exception';
import { AuthenticationFailedException } from '../exceptions/authentication-failed.exception';
import { DatabaseOperationException } from '../exceptions/database-operation.exception';

@Catch(InfrastructureException)
export class InfrastructureExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(InfrastructureExceptionFilter.name);

  catch(exception: InfrastructureException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(exception.message, exception.stack);

    const { status, error } = this.resolveHttpStatus(exception);

    response.status(status).json({
      statusCode: status,
      error,
      message: exception.message,
    });
  }

  private resolveHttpStatus(exception: InfrastructureException): {
    status: number;
    error: string;
  } {
    if (exception instanceof AuthenticationFailedException) {
      return { status: HttpStatus.UNAUTHORIZED, error: 'Unauthorized' };
    }

    if (exception instanceof DatabaseOperationException) {
      return { status: HttpStatus.SERVICE_UNAVAILABLE, error: 'Service Unavailable' };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Internal Server Error' };
  }
}
