import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';

/**
 * Handles HTTP error responses globally:
 *
 * - 401 Unauthorized: token expired or invalid → logout + redirect to /login.
 * - 403 Forbidden: insufficient permissions → redirect to home.
 *
 * Auth endpoints (/auth/login, /auth/register) are excluded from logout logic:
 * a 401 on login means wrong credentials, not an expired session.
 *
 * Only active in the browser — SSR requests are never authenticated.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {

  // Skip error handling during SSR.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router      = inject(Router);

  // Auth endpoints must not trigger logout on failure (e.g. wrong credentials).
  const isAuthEndpoint =
    req.url.includes('/auth/login') || req.url.includes('/auth/register');

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      console.error(`[HTTP Error] ${req.method} ${req.url}:`, err);

      if (!isAuthEndpoint && err.status === 401) {
        authService.logout();              // clears token + navigates to /login
      } else if (err.status === 403) {
        router.navigate(['/']);
      }
      // Re-throw so individual components can still handle the error locally.
      return throwError(() => err);
    })
  );
};
