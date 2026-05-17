import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';

/**
 * Attaches a JWT Bearer token to every outbound HTTP request.
 *
 * Token retrieval is delegated entirely to AuthService.getToken(), which
 * handles both SSR safety (returns null on the server) and expiry validation
 * (returns null for expired tokens). No direct localStorage access here.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {

  const token = inject(AuthService).getToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    })
  );
};
