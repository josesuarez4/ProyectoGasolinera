import { TestBed } from '@angular/core/testing';
import { roleGuard } from './role-guard';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

describe('roleGuard', () => {
  let authService: any;
  let router: jest.Mocked<Router>;

  beforeEach(() => {
    authService = {
      isAuthenticated: jest.fn(),
      currentRole: jest.fn(),
      defaultRouteForRole: jest.fn(),
      logout: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: Router,
          useValue: { navigate: jest.fn(), navigateByUrl: jest.fn() },
        },
      ],
    });

    router = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  const executeGuard = (allowedRoles: string[]) =>
    TestBed.runInInjectionContext(() =>
      roleGuard(allowedRoles)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  const asRole = (role: string) => role;

  it('should allow access when user has the required role', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentRole.mockReturnValue(asRole('ADMIN'));

    const result = executeGuard(['ADMIN']);

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access when user role is one of multiple allowed roles', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentRole.mockReturnValue(asRole('MANAGER'));

    const result = executeGuard(['ADMIN', 'MANAGER']);

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect to login when user does not have the required role', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentRole.mockReturnValue(asRole('CLIENT'));
    authService.defaultRouteForRole.mockReturnValue('/client/dashboard');

    const result = executeGuard(['ADMIN']);

    expect(result).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/client/dashboard');
  });

  it('should deny access and redirect to login when user is not logged in', () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = executeGuard(['ADMIN']);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should deny access and redirect to login when role is null', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentRole.mockReturnValue(null);
    authService.defaultRouteForRole.mockReturnValue('/login');

    const result = executeGuard(['ADMIN']);

    expect(result).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('should allow CLIENT role to access client-only routes', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentRole.mockReturnValue(asRole('CLIENT'));

    const result = executeGuard(['CLIENT']);

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
