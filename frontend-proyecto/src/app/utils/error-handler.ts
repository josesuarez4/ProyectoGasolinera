import { HttpErrorResponse } from '@angular/common/http';
import { ErrorResponse } from '../models/error-response.model';

/**
 * Extracts a human-readable error message from an API response.
 * 
 * Priority:
 * 1. `err.error.message` (from ErrorResponse DTO)
 * 2. `err.error` (if it's a plain string)
 * 3. `err.message` (standard Error object)
 * 4. Fallback string
 */
export function getErrorMessage(err: any, fallback: string = 'An unexpected error occurred'): string {
  const body = err instanceof HttpErrorResponse ? err.error : (err?.error || err);

  if (body && typeof body === 'object') {
    if ('message' in body && body.message) {
      return body.message;
    }
    if ('errors' in body && body.errors) {
      const errors = body.errors as Record<string, string>;
      return Object.entries(errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
    }
  }

  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Could not connect to the server. Please check your internet connection.';
    }
    if (err.status === 404) {
      return 'The requested resource was not found.';
    }
  }

  if (typeof body === 'string' && body.length > 0) {
    return body;
  }

  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'string' && err.length > 0) {
    return err;
  }

  return fallback;
}
