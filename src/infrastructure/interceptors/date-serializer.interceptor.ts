import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor global que converte todos os objetos Date nas respostas
 * para o formato ISO 8601 com offset de Brasília (UTC-3).
 *
 * O Brasil não adota horário de verão desde 2019, portanto o offset
 * é fixo em -03:00.
 */
@Injectable()
export class DateSerializerInterceptor implements NestInterceptor {
  private readonly BRAZIL_OFFSET_MS = -3 * 60 * 60 * 1000;

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.transform(data)));
  }

  private transform(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (value instanceof Date) {
      const localMs = value.getTime() + this.BRAZIL_OFFSET_MS;
      return new Date(localMs).toISOString().replace('Z', '-03:00');
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item));
    }

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, this.transform(v)]),
      );
    }

    return value;
  }
}
