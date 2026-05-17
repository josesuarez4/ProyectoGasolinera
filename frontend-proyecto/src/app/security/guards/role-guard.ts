import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { isPlatformBrowser } from '@angular/common';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const platformId = inject(PLATFORM_ID);

    // deactivates the guard as long as there is an active token
    if (!isPlatformBrowser(platformId)) {
      return true;
    }

    const isPublicRoute = allowedRoles.every((r) => r.startsWith('!'));

    if (!authService.isAuthenticated()) {
      if (isPublicRoute) {
        return true; // ✅ usuario no autenticado puede acceder
      }
      router.navigate(['/login']);
      return false;
    }

    const role = authService.currentRole();

    // lógica de negación: bloquear si tiene algún rol prohibido
    if (isPublicRoute) {
      const isDenied = allowedRoles.some((r) => r.slice(1) === role);
      if (isDenied) {
        router.navigateByUrl(authService.defaultRouteForRole(role));
        return false;
      }
      return true;
    }

    if (role && allowedRoles.includes(role)) {
      return true;
    }

    router.navigateByUrl(authService.defaultRouteForRole(role));
    return false;
  };
};