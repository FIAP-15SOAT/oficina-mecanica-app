import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApplicationException } from '@application/exceptions/application.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

@Catch(ApplicationException)
export class ApplicationExceptionFilter implements ExceptionFilter {
  catch(exception: ApplicationException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, error } = this.resolveHttpStatus(exception);

    response.status(status).json({
      statusCode: status,
      error,
      message: exception.message,
    });
  }

  private resolveHttpStatus(exception: ApplicationException): { status: number; error: string } {
    if (exception instanceof ResourceNotFoundException) {
      return { status: HttpStatus.NOT_FOUND, error: 'Não Encontrado' };
    }

    if (exception instanceof ResourceConflictException) {
      return { status: HttpStatus.CONFLICT, error: 'Conflito' };
    }

    if (exception instanceof UnauthorizedAccessException) {
      return { status: HttpStatus.UNAUTHORIZED, error: 'Não Autorizado' };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Erro da Aplicação' };
  }
}
