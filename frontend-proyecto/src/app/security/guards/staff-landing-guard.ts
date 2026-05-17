import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

export const staffLandingGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const role = authService.currentRole();

  if (role === 'ADMIN' || role === 'MANAGER' || role === 'EMPLOYEE') {
    return router.createUrlTree(['/staff/dashboard']);
  }

  return router.createUrlTree([authService.defaultRouteForRole(role)]);
};
