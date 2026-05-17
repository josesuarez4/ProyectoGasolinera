import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { buildPageParams, normalizePageResponse, PageRequest, PageResponse } from '../pagination';

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  currentStock: number;
  name: string;
  categoryId: number;
  description: string;
  active: boolean;
  salePrice?: number;
  isGasoline?: boolean;
  imageUrl?: string;
}

export interface ProductAndCurrentPriceResponseDTO {
  id: number;
  currentStock: number;
  name: string;
  categoryId: number;
  categoryName: string;
  description: string;
  salePrice: number;
  supplierPurchasePrice: number;
}

export type ProductPageResponse = PageResponse<Product>;
export type ProductCategoryPageResponse = PageResponse<ProductAndCurrentPriceResponseDTO>;

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  categoryId: number;
  salePrice?: number;
  currentStock?: number;
}

export interface UpdateProductRequest {
  name: string;
  description?: string;
  categoryId: number;
  salePrice?: number;
  currentStock?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(private readonly http: HttpClient) {}
  private readonly urlApi = 'http://localhost:8080/products';

  getAllProducts(params?: { categoryId?: number; name?: string }): Observable<Product[]> {
    return this.fetchAllProducts(`${this.urlApi}/available`, params);
  }

  getAllProductsPage(
    request: PageRequest = {},
    params?: { categoryId?: number; name?: string },
  ): Observable<ProductPageResponse> {
    return this.requestProductPage(`${this.urlApi}/available`, request, params);
  }

  getAllProductsAdmin(params?: {
    categoryId?: number;
    name?: string;
    active?: boolean;
    supplierName?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<Product[]> {
    const queryParams: any = {};
    if (params) {
      if (params.categoryId !== undefined) queryParams.categoryId = params.categoryId;
      if (params.name) queryParams.name = params.name;
      if (params.active !== undefined) queryParams.active = params.active;
      if (params.supplierName) queryParams.supplierName = params.supplierName;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    }
    return this.fetchAllProducts(`${this.urlApi}/admin`, queryParams);
  }

  getAllProductsAdminPage(
    request: PageRequest = {},
    params?: {
      categoryId?: number;
      name?: string;
      active?: boolean;
      supplierName?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Observable<ProductPageResponse> {
    const queryParams: any = {};
    if (params) {
      if (params.categoryId !== undefined) queryParams.categoryId = params.categoryId;
      if (params.name) queryParams.name = params.name;
      if (params.active !== undefined) queryParams.active = params.active;
      if (params.supplierName) queryParams.supplierName = params.supplierName;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    }

    return this.requestProductPage(`${this.urlApi}/admin`, request, queryParams);
  }

  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('http://localhost:8080/categories');
  }

  createCategory(dto: { name: string }): Observable<Category> {
    return this.http.post<Category>('http://localhost:8080/categories', dto);
  }

  createProduct(dto: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.urlApi, dto);
  }

  updateProduct(id: number, dto: UpdateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.urlApi}/${id}`, dto);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlApi}/${id}`);
  }

  getCategoryByName(categoryName: string): Observable<Category> {
    return this.http.get<Category>(`http://localhost:8080/categories/name/${categoryName}`);
  }

  getProductsByCategory(categoryId: number): Observable<ProductAndCurrentPriceResponseDTO[]> {
    return this.fetchAllCategoryProducts(`${this.urlApi}/category/${categoryId}`);
  }

  getProductsByCategoryPage(
    categoryId: number,
    request: PageRequest = {},
  ): Observable<ProductCategoryPageResponse> {
    return this.requestCategoryProductPage(`${this.urlApi}/category/${categoryId}`, request);
  }

  setProductActive(id: number, active: boolean): Observable<Product> {
    return this.http.patch<Product>(`${this.urlApi}/${id}/active`, null, {
      params: { active: String(active) },
    });
  }

  redeemWithPoints(clientId: number, productId: number, pointsCost: number): Observable<void> {
    return this.http.post<void>(`http://localhost:8080/clients/${clientId}/redeem`, {
      productId,
      pointsCost,
    });
  }

  private fetchAllProducts(
    endpoint: string,
    params?: {
      categoryId?: number;
      name?: string;
      active?: boolean;
      supplierName?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Observable<Product[]> {
    return this.requestProductPage(endpoint, {}, params).pipe(
      expand((page) => {
        if (page.last) {
          return EMPTY;
        }

        return this.requestProductPage(
          endpoint,
          {
            page: page.number + 1,
            size: page.size,
          },
          params,
        );
      }),
      reduce((allProducts, page) => allProducts.concat(page.content), [] as Product[]),
    );
  }

  private requestProductPage(
    endpoint: string,
    request: PageRequest = {},
    params?: Record<string, unknown>,
  ): Observable<ProductPageResponse> {
    let httpParams = buildPageParams(request);
    const pageNumber = request.page ?? 0;
    const pageSize = request.size ?? 20;

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (
          value !== undefined &&
          value !== null &&
          (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        ) {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }

    return this.http
      .get<ProductPageResponse | Product[] | null>(endpoint, { params: httpParams })
      .pipe(map((page) => normalizePageResponse(page, pageNumber, pageSize)));
  }

  private fetchAllCategoryProducts(
    endpoint: string,
  ): Observable<ProductAndCurrentPriceResponseDTO[]> {
    return this.requestCategoryProductPage(endpoint).pipe(
      expand((page) => {
        if (page.last) {
          return EMPTY;
        }

        return this.requestCategoryProductPage(endpoint, {
          page: page.number + 1,
          size: page.size,
        });
      }),
      reduce(
        (allProducts, page) => allProducts.concat(page.content),
        [] as ProductAndCurrentPriceResponseDTO[],
      ),
    );
  }

  private requestCategoryProductPage(
    endpoint: string,
    request: PageRequest = {},
  ): Observable<ProductCategoryPageResponse> {
    const params = buildPageParams(request);
    const pageNumber = request.page ?? 0;
    const pageSize = request.size ?? 20;

    return this.http
      .get<
        ProductCategoryPageResponse | ProductAndCurrentPriceResponseDTO[] | null
      >(endpoint, { params })
      .pipe(map((page) => normalizePageResponse(page, pageNumber, pageSize)));
  }
}
