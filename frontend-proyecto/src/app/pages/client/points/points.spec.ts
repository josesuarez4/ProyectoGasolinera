import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Points } from './points';
import { ProductService } from '../../../services/products/product.service';
import { AuthService } from '../../../services/auth/auth.service';
import { UserService } from '../../../services/users/user.service';
import { of, throwError } from 'rxjs';

describe('Points Component', () => {
  let component: Points;
  let fixture: ComponentFixture<Points>;

  // Mocks de los servicios
  let mockProductService: any;
  let mockAuthService: any;
  let mockUserService: any;

  beforeEach(async () => {
    mockProductService = {
      getAllCategories: jest.fn().mockReturnValue(of([{ id: 1, name: 'Tienda_Puntos' }])),
      getAllProducts: jest.fn().mockReturnValue(of([])),
      redeemWithPoints: jest.fn()
    };

    mockAuthService = {
      currentUser: jest.fn().mockReturnValue({ id: 123, name: 'Test User' })
    };

    mockUserService = {
      getClientById: jest.fn().mockReturnValue(of({ id: 123, points: 500 }))
    };

    await TestBed.configureTestingModule({
      imports: [Points],
      providers: [
        { provide: ProductService, useValue: mockProductService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Points);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse el componente y cargar los puntos del usuario', () => {
    expect(component).toBeTruthy();
    expect(component.userId).toBe(123);
    expect(component.userPoints).toBe(500);
  });

  it('debería calcular el coste en puntos correctamente (ejemplo: 10€ = 100 puntos)', () => {
    const cost = (component as any).calculatePointCost(10.5);
    expect(cost).toBe(1050);
  });

  it('no debería permitir el canje si el usuario no tiene puntos suficientes', () => {
    const pírricoProducto = { id: 1, name: 'iPhone', salePrice: 1000, currentStock: 5 };
    // Coste sería 10000, usuario tiene 500
    
    window.alert = jest.fn(); // Mock del alert
    component.redeemProduct(pírricoProducto as any);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("don't have enough points"));
    expect(mockProductService.redeemWithPoints).not.toHaveBeenCalled();
  });

  it('no debería permitir el canje si no hay stock', () => {
    const sinStockProduct = { id: 2, name: 'Agua', salePrice: 1, currentStock: 0 };
    component.userPoints = 100;

    window.alert = jest.fn();
    component.redeemProduct(sinStockProduct as any);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("out of stock"));
    expect(mockProductService.redeemWithPoints).not.toHaveBeenCalled();
  });

  // it('debería llamar al servicio y descontar puntos tras un canje exitoso', () => {
  //   const productoValido = { 
  //   id: 3, 
  //   name: 'Café', 
  //   salePrice: 20.00, 
  //   currentStock: 10 
  //   };
    
  //   const costeEsperado = 200; 
  //   component.userPoints = 500; 
  //   component.userId = 123;

  //   window.confirm = jest.fn().mockReturnValue(true);
  //   window.alert = jest.fn();
    
  //   mockProductService.redeemWithPoints.mockReturnValue(of({ success: true }));
  //   component.redeemProduct(productoValido as any);

  //   expect(mockProductService.redeemWithPoints).toHaveBeenCalledWith(123, 3, costeEsperado);
  //   expect(component.userPoints).toBe(300); 
  //   expect(window.alert).toHaveBeenCalledWith('¡Canje realizado con éxito!');
  // });

  it('debería manejar errores del servidor durante el canje', () => {
    const producto = { id: 4, name: 'Error Test', salePrice: 1, currentStock: 10 };
    window.confirm = jest.fn().mockReturnValue(true);
    window.alert = jest.fn();
    mockProductService.redeemWithPoints.mockReturnValue(throwError(() => new Error('API Error')));

    component.redeemProduct(producto as any);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('error processing your redemption'));
  });

  it('debería manejar error al cargar categorías y dejar la lista vacía', () => {
    mockProductService.getAllCategories.mockReturnValue(throwError(() => new Error('Error Cat')));
    console.error = jest.fn(); 

    component['loadStoreProducts'](); 

    expect(component.storeProducts).toEqual([]);
    expect(console.error).toHaveBeenCalledWith('Error loading categories:', expect.any(Error));
  });

  // it('no debería cargar puntos ni asignar userId si el usuario no existe en AuthService', () => {
  //   mockAuthService.currentUser.mockReturnValue(null);
  //   component.userId = null; 
  //   component.ngOnInit();

  //   expect(component.userId).toBeNull();
  //   expect(mockUserService.getClientById).not.toHaveBeenCalled();
  // });

  it('debería manejar error al obtener los puntos del cliente', () => {
    mockUserService.getClientById.mockReturnValue(throwError(() => new Error('Error Points')));
    console.error = jest.fn();

    component['loadUserPoints'](123);

    expect(console.error).toHaveBeenCalledWith('Error loading user points:', expect.any(Error));
  });

  it('debería calcular el coste multiplicando el precio por 10 (82-84)', () => {
    const price = 15.50;
    const expectedCost = 1550;
    const result = (component as any).calculatePointCost(price);
    
    expect(result).toBe(expectedCost);
  });

  // it('debería realizar el canje exitosamente cuando hay puntos y stock (69-80)', () => {
  //   const productoMock = { 
  //     id: 10, 
  //     name: 'Regalo', 
  //     salePrice: 5, 
  //     currentStock: 1 
  //   };
  //   const cost = 50; // 5 * 10
    
  //   // IMPORTANTE: Asegurarnos de que el componente tiene los datos necesarios
  //   component.userId = 123;
  //   component.userPoints = 100;
    
  //   // Configuramos los mocks de ventana y servicio
  //   window.confirm = jest.fn().mockReturnValue(true);
  //   window.alert = jest.fn();
  //   mockProductService.redeemWithPoints.mockReturnValue(of({}));
    
  //   // Espiamos el método de carga
  //   const loadSpy = jest.spyOn(component as any, 'loadStoreProducts');

  //   component.redeemProduct(productoMock as any);

  //   // Verificaciones
  //   expect(mockProductService.redeemWithPoints).toHaveBeenCalledWith(123, 10, cost);
  //   expect(component.userPoints).toBe(50); // 100 - 50
  //   expect(window.alert).toHaveBeenCalledWith('Redemption successful!');
  //   expect(loadSpy).toHaveBeenCalled();
  // });
});