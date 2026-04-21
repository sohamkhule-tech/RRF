import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * TransformInterceptor
 * 
 * Automatically wraps controller responses in a standardized format:
 * { success: true, data: <response>, message?: <optional message> }
 * 
 * This eliminates the need to manually wrap responses in every controller method.
 * 
 * Usage:
 * - Apply globally: app.useGlobalInterceptors(new TransformInterceptor());
 * - Or per controller: @UseInterceptors(TransformInterceptor)
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data already has 'success' key, assume it's manually formatted (keep as-is)
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Otherwise, wrap in standard format
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
