import { TestBed } from '@angular/core/testing';
import { authGuard, loggedInGuard } from './auth-guard';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

describe('Guards', () => {
  let authService: any;
  let router: jest.Mocked<Router>;

  beforeEach(() => {
    authService = {
      isAuthenticated: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: Router,
          useValue: { navigate: jest.fn() },
        },
      ],
    });

    router = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  describe('authGuard', () => {
    const executeGuard = () =>
      TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
      );

    it('should allow access when user is logged in', () => {
      authService.isAuthenticated.mockReturnValue(true);

      const result = executeGuard();

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access and redirect to login when user is not logged in', () => {
      authService.isAuthenticated.mockReturnValue(false);

      const result = executeGuard();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('loggedInGuard', () => {
    const executeGuard = () =>
      TestBed.runInInjectionContext(() =>
        loggedInGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
      );

    it('should allow access when user is not logged in', () => {
      authService.isAuthenticated.mockReturnValue(false);
      const result = executeGuard();
      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access and redirect to landing when user is already logged in', () => {
      authService.isAuthenticated.mockReturnValue(true);
      const result = executeGuard();
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
