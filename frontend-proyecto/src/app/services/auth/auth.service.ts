import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { CartService } from '../cart/cart.service';

// ── Domain types ──────────────────────────────────────────────────────────────

/** Roles recognised by the application. Spring Security may prefix them with 'ROLE_'. */
export type AppRole = 'ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'CLIENT';

/** Raw JWT payload structure (without 'ROLE_' prefix) */
interface JwtPayload {
  sub: string;
  id?: number;
  name: string;
  role: string;
  exp: number;
  points?: number;
}

/** Backend response body for POST /auth/login. */
interface AuthResponse {
  token: string;
}

/** User data decoded from the JWT payload and kept in memory for the session. */
export interface SessionUser {
  id?: number; // optional — may not be present in all JWT configurations
  email: string;
  name: string;
  role: AppRole;
  exp: number; // Unix timestamp (seconds) — copied from the JWT 'exp' claim
  points?: number;
}

/** Raw JWT payload structure 
// ── Service ───────────────────────────────────────────────────────────────────

/**
 * AuthService — single source of truth for authentication state.
 *
 * Architecture rules:
 * - Only this service reads or writes localStorage for the auth token.
 * - All other files (interceptors, guards, components) use the public API.
 * - `isAuthenticated` and `currentRole` are computed Signals — no boolean
 *   flag management elsewhere in the app.
 * - localStorage is the persistence layer (survives page reload).
 *   Signals are the in-memory reactive layer (reset on reload, restored by
 *   restoreSession() in the constructor).
 *
 * SSR safety:
 * - restoreSession() is guarded with isPlatformBrowser — no localStorage
 *   access during server-side rendering.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly BASE_URL = 'http://localhost:8080';

  /** localStorage key for the JWT. */
  private static readonly TOKEN_KEY = 'token';

  // ── Private mutable signals ───────────────────────────────────────────────

  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<SessionUser | null>(null);
  private readonly cart = inject(CartService);

  // ── Public reactive state ─────────────────────────────────────────────────

  /** Raw JWT string. Null when unauthenticated or during SSR. */
  readonly token = this.tokenSignal.asReadonly();

  /** Decoded user object. Null when unauthenticated or during SSR. */
  readonly currentUser = this.userSignal.asReadonly();

  /**
   * True only when both the token string and decoded user are present in memory.
   * This is the canonical auth signal consumed by the Header, Guards, and app.ts.
   */
  readonly isAuthenticated = computed(
    () => this.tokenSignal() !== null && this.userSignal() !== null,
  );

  /** Current role derived from the decoded user — no JWT re-decode on every call. */
  readonly currentRole = computed(() => this.userSignal()?.role ?? null);

  /** Human-readable role label for staff-facing UI. */
  readonly currentRoleLabel = computed(() => {
    const role = this.currentRole();

    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'MANAGER':
        return 'Manager';
      case 'EMPLOYEE':
        return 'Employee';
      case 'CLIENT':
        return 'Client';
      default:
        return null;
    }
  });

  constructor() {
    // Restore session from localStorage on startup (SSR-guarded internally).
    this.restoreSession();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns the current JWT from the in-memory signal.
   * Returns null during SSR (restoreSession is a no-op on the server)
   * and when the user is not authenticated.
   *
   * Used exclusively by jwtInterceptor — no other file reads the token directly.
   */
  getToken(): string | null {
    return this.tokenSignal();
  }

  /**
   * Authenticates the user against the backend and opens a session.
   *
   * Storage layer : localStorage.setItem(TOKEN_KEY, jwt)
   * Reactive layer: tokenSignal + userSignal updated via applyToken()
   */
  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.BASE_URL}/auth/login`, { email, password })
      .pipe(tap((response) => this.applyToken(response.token)));
  }

  /**
   * Registers a new client account.
   * No auto-login on success — the caller redirects to /login.
   */
  register(name: string, email: string, password: string, birthDate: string) {
    return this.http.post<void>(`${this.BASE_URL}/auth/register`, {
      name,
      email,
      password,
      birthDate,
    });
  }

  /**
   * Clears the session and optionally navigates to /login.
   *
   * Pass `redirect = false` when the caller handles navigation itself
   * (e.g. errorInterceptor for 403, which redirects to home instead).
   *
   * Storage layer : localStorage.removeItem(TOKEN_KEY)
   * Reactive layer: tokenSignal.set(null), userSignal.set(null)
   */
  logout(redirect = true): void {
    this.clearSession();
    this.cart.clearCart();
    if (redirect) {
      void this.router.navigate(['/login']);
    }
  }

  /**
   * Returns true if the authenticated user has the specified role.
   * Useful for conditional rendering in templates.
   */
  hasRole(role: AppRole): boolean {
    return this.currentRole() === role;
  }

  /**
   * Returns the appropriate landing route for a given role after login.
   * Falls back to '/' for unauthenticated or unrecognised roles.
   */
  defaultRouteForRole(role: AppRole | null): string {
    if (role === 'ADMIN' || role === 'MANAGER' || role === 'EMPLOYEE') return '/staff';
    if (role === 'CLIENT') return '/client/catalog';
    return '/';
  }

  /**
   * Reads the token from localStorage, validates its expiry, and restores
   * both signals. Called once from the constructor.
   *
   * If the stored token is expired or malformed it is removed immediately,
   * preventing the "flash of authenticated content" on reload.
   */
  restoreSession(): void {
    if (!isPlatformBrowser(this.platformId)) return; // SSR guard

    const storedToken = localStorage.getItem(AuthService.TOKEN_KEY);
    if (!storedToken) return;

    const user = this.decodeSession(storedToken);

    if (!user || user.exp * 1000 <= Date.now()) {
      this.clearSession(); // discard stale or malformed token
      return;
    }

    this.tokenSignal.set(storedToken);
    this.userSignal.set(user);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Validates the token, persists it to localStorage, and updates both signals.
   * Single entry-point for all "set authenticated" operations.
   */
  private applyToken(token: string): void {
    const user = this.decodeSession(token);

    if (!user) {
      throw new Error('Invalid token received from server');
    }

    localStorage.setItem(AuthService.TOKEN_KEY, token); // persist
    this.tokenSignal.set(token); // reactive
    this.userSignal.set(user); // reactive
  }

  /**
   * Removes the token from storage and nulls both signals atomically.
   * Always use this instead of touching signals or localStorage individually.
   */
  private clearSession(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY); // persist
    this.tokenSignal.set(null); // reactive
    this.userSignal.set(null); // reactive
  }

  /**
   * Decodes a raw JWT and maps it to a validated `SessionUser`.
   * Returns null if required claims are absent or the role is unrecognised.
   */
  private decodeSession(token: string): SessionUser | null {
    const payload = this.decodeJwt(token);

    if (!payload?.sub || !payload.name || !payload.role || !payload.exp) {
      return null;
    }

    const role = this.normalizeRole(payload.role);
    if (!role) return null;

    return {
      id: payload.id,
      email: payload.sub,
      name: payload.name,
      role,
      exp: payload.exp,
      points: typeof payload.points === 'number' ? payload.points : undefined,
    };
  }

  /**
   * Returns the `points` claim decoded from the currently stored session token
   * if present. This is a snapshot value (may be stale) intended for immediate
   * UI rendering only. For live values prefer calling the backend.
   */
  getTokenPoints(): number | null {
    const user = this.userSignal();
    return typeof user?.points === 'number' ? user!.points! : null;
  }

  /**
   * Base64url-decodes the JWT payload segment into a typed object.
   * Returns null for tokens with fewer than 3 segments or invalid JSON.
   */
  private decodeJwt(token: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
      const payload = this.decodeBase64Url(parts[1]);
      return JSON.parse(payload) as JwtPayload;
    } catch {
      return null;
    }
  }

  /** Normalizes Base64URL payloads used in JWTs and decodes them to text. */
  private decodeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return atob(padded);
  }

  /**
   * Strips the 'ROLE_' prefix added by Spring Security and normalises the
   * value to one of the known AppRole literals.
   *
   * Examples: 'ROLE_ADMIN' → 'ADMIN',  'EMPLOYEE' → 'EMPLOYEE',  'MANAGER' → 'MANAGER',  'CLIENT' → 'CLIENT',  'USER' → null
   */
  private normalizeRole(rawRole: string): AppRole | null {
    const normalized = rawRole.replace(/^ROLE_/, '').toUpperCase();

    if (
      normalized === 'ADMIN' ||
      normalized === 'EMPLOYEE' ||
      normalized === 'MANAGER' ||
      normalized === 'CLIENT'
    ) {
      return normalized as AppRole;
    }

    return null;
  }
}
