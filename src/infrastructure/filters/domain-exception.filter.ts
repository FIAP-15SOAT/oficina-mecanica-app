import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '@domain/exceptions/domain.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, error } = this.resolveHttpStatus(exception);

    response.status(status).json({
      statusCode: status,
      error,
      message: exception.message,
    });
  }

  private resolveHttpStatus(exception: DomainException): { status: number; error: string } {
    if (exception instanceof DomainValidationException) {
      return { status: HttpStatus.UNPROCESSABLE_ENTITY, error: 'Entidade Inválida' };
    }

    if (exception instanceof EntityNotFoundException) {
      return { status: HttpStatus.NOT_FOUND, error: 'Não Encontrado' };
    }

    if (exception instanceof BusinessRuleViolationException) {
      return { status: HttpStatus.CONFLICT, error: 'Violação de Regra de Negócio' };
    }

    return { status: HttpStatus.BAD_REQUEST, error: 'Erro de Domínio' };
  }
}
