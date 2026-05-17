import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import {
  buildPageParams,
  createEmptyPage,
  normalizePageResponse,
  PageRequest,
  PageResponse,
} from '../pagination';

export interface ProductResponseDTO {
  id: number;
  categoryId: number;
  categoryName: string;
  currentStock: number;
  name: string;
  description: string | null;
  salePrice: number | null;
}

export type ProductPageResponse = PageResponse<ProductResponseDTO>;

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/products';

  getAvailableProducts(): Observable<ProductResponseDTO[]> {
    return this.fetchAllProducts(`${this.baseUrl}/available`);
  }

  getAvailableProductsPage(request: PageRequest = {}): Observable<ProductPageResponse> {
    return this.requestProductPage(`${this.baseUrl}/available`, request);
  }

  private fetchAllProducts(endpoint: string): Observable<ProductResponseDTO[]> {
    return this.requestProductPage(endpoint).pipe(
      expand((page) => {
        if (page.last) {
          return EMPTY;
        }

        return this.requestProductPage(endpoint, {
          page: page.number + 1,
          size: page.size,
        });
      }),
      reduce((allProducts, page) => allProducts.concat(page.content), [] as ProductResponseDTO[]),
    );
  }

  private requestProductPage(
    endpoint: string,
    request: PageRequest = {},
  ): Observable<ProductPageResponse> {
    const params = buildPageParams(request);
    const pageNumber = request.page ?? 0;
    const pageSize = request.size ?? 20;

    return this.http
      .get<ProductPageResponse | ProductResponseDTO[] | null>(endpoint, { params })
      .pipe(map((page) => normalizePageResponse(page, pageNumber, pageSize)));
  }
}
