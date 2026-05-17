import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProductService, CreateProductRequest, UpdateProductRequest } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:8080/products';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), 
        provideHttpClientTesting()
      ],
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Asegura que no queden peticiones pendientes
  });

  it('should get all products', () => {
    const mockProducts = [{ id: 1, name: 'Product A' }];
    service.getAllProducts().subscribe(products => {
      expect(products.length).toBe(1);
      expect(products).toEqual(mockProducts);
    });

    const req = httpMock.expectOne(`${apiUrl}/available`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);
  });

  it('should create a product', () => {
    const newProduct: CreateProductRequest = { name: 'New', categoryId: 1 };
    service.createProduct(newProduct).subscribe(res => {
      expect(res.name).toBe('New');
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newProduct);
    req.flush({ id: 99, ...newProduct });
  });

  it('should update a product', () => {
    const updateDto: UpdateProductRequest = { name: 'Updated', categoryId: 1 };
    service.updateProduct(1, updateDto).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 1, ...updateDto });
  });

  it('should delete a product', () => {
    service.deleteProduct(1).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should fetch categories', () => {
    service.getAllCategories().subscribe();
    const req = httpMock.expectOne('http://localhost:8080/categories');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should patch product active status', () => {
    service.setProductActive(1, false).subscribe();
    // Verifica que se envíen los query params correctamente
    const req = httpMock.expectOne(r => r.url === `${apiUrl}/1/active` && r.params.has('active'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('active')).toBe('false');
    req.flush({});
  });
});
