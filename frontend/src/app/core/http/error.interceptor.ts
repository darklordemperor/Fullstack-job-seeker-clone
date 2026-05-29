import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/ui/toast/toast.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      toast.error(error.error?.message ?? error.message ?? 'Request failed');
      return throwError(() => error);
    }),
  );
};
