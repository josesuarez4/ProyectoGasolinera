import { HttpParams } from '@angular/common/http';

export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string | string[];
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  empty: boolean;
}

export function buildPageParams(request: PageRequest): HttpParams {
  let params = new HttpParams();

  if (request.page !== undefined) {
    params = params.set('page', `${request.page}`);
  }

  if (request.size !== undefined) {
    params = params.set('size', `${request.size}`);
  }

  if (request.sort !== undefined) {
    const sorts = Array.isArray(request.sort) ? request.sort : [request.sort];

    for (const sort of sorts) {
      params = params.append('sort', sort);
    }
  }

  return params;
}

export function createEmptyPage<T>(pageNumber: number, size: number): PageResponse<T> {
  return {
    content: [],
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    size,
    number: pageNumber,
    numberOfElements: 0,
    empty: true,
  };
}

export function normalizePageResponse<T>(
  response: PageResponse<T> | T[] | null,
  pageNumber: number,
  size: number,
): PageResponse<T> {
  if (Array.isArray(response)) {
    return {
      content: response,
      totalPages: response.length > 0 ? 1 : 0,
      totalElements: response.length,
      first: pageNumber === 0,
      last: true,
      size,
      number: pageNumber,
      numberOfElements: response.length,
      empty: response.length === 0,
    };
  }

  if (response === null) {
    return createEmptyPage<T>(pageNumber, size);
  }

  return response;
}
