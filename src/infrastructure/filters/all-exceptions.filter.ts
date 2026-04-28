import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = this.resolveStatus(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unexpected error',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : 'Bad Request',
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'An unexpected error occurred'
          : exception instanceof HttpException
            ? exception.message
            : 'Bad request',
    });
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    // Express body-parser attaches a numeric `status` to SyntaxError on malformed JSON
    if (exception instanceof SyntaxError && 'status' in exception && (exception as NodeJS.ErrnoException).code !== undefined) {
      return HttpStatus.BAD_REQUEST;
    }
    if (exception instanceof SyntaxError && 'body' in exception) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
