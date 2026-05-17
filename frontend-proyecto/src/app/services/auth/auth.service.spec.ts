import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from './auth.service';

/** Builds a minimal well-formed JWT with a future expiry so decodeSession() accepts it. */
function makeJwt(role = 'CLIENT'): string {
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: 'test@test.com',
    name: 'Test User',
    role,
    exp: Math.floor(Date.now() / 1000) + 3600,
    id: 1,
  });

  return `${header}.${payload}.fake-signature`;
}

/** Builds a token that forces base64url normalization + padding during decode. */
function makeJwtWithUrlSafePayload(): string {
  const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  const payload =
    'eyJzdWIiOiJ0ZXN0QHRlc3QuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsInJvbGUiOiJST0xFX0FETUlOIiwiZXhwIjo0MTAyNDQ0ODAwLCJpZCI6MX0';
  return `${header}.${payload}.fake-signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login, store token and set isAuthenticated', () => {
    const token = makeJwt();

    service.login('test@test.com', 'password').subscribe();

    const req = httpMock.expectOne('http://localhost:8080/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@test.com', password: 'password' });
    req.flush({ token });

    expect(localStorage.getItem('token')).toBe(token);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('logout should remove token and clear isAuthenticated', () => {
    localStorage.setItem('token', makeJwt());
    service.restoreSession();

    service.logout(false);

    expect(localStorage.getItem('token')).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated should return true when valid token in storage', () => {
    localStorage.setItem('token', makeJwt());
    service.restoreSession();

    expect(service.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated should return false when no token', () => {
    localStorage.removeItem('token');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should expose the role from the JWT', () => {
    localStorage.setItem('token', makeJwt('ROLE_MANAGER'));
    service.restoreSession();

    expect(service.currentRole()).toBe('MANAGER');
    expect(service.currentRoleLabel()).toBe('Manager');
  });

  it('should restore session from url-safe token payload without padding', () => {
    localStorage.setItem('token', makeJwtWithUrlSafePayload());

    service.restoreSession();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentRole()).toBe('ADMIN');
  });
});
