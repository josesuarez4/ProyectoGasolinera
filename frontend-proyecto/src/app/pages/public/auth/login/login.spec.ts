import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Login } from './login';
import { AuthService } from '../../../../services/auth/auth.service';
import { of, throwError } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';

describe('Login Component', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    // Mocks de dependencias
    mockAuthService = {
      login: jest.fn(),
      currentRole: jest.fn().mockReturnValue('CLIENT'),
      defaultRouteForRole: jest.fn().mockReturnValue('/home')
    };

    mockRouter = {
      navigateByUrl: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Login, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ returnUrl: '/dashboard' }),
            },
            queryParamMap: of(convertToParamMap({ registered: 'true' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería inicializarse con el mensaje de éxito si el queryParam "registered" es true', () => {
    expect(component['registrationSuccess']()).toBe(true);
  });

  it('debería invalidar el formulario si los campos están vacíos', () => {
    component['form'].setValue({ email: '', password: '' });
    expect(component['form'].valid).toBeFalsy();
  });

  it('debería validar correctamente un email y password válidos', () => {
    component['form'].setValue({ email: 'test@example.com', password: 'password123' });
    expect(component['form'].valid).toBeTruthy();
  });

  it('debería marcar todos los campos como tocados si el formulario es inválido al hacer submit', () => {
    const markAllAsTouchedSpy = jest.spyOn(component['form'], 'markAllAsTouched');
    component['submit']();
    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(component['submitting']()).toBeFalsy();
  });

  it('debería llamar a AuthService.login y navegar en caso de éxito', fakeAsync(() => {
    const credentials = { email: 'user@test.com', password: 'password123' };
    component['form'].setValue(credentials);
    mockAuthService.login.mockReturnValue(of({ success: true }));
    component['submit']();

    tick(); 
    expect(mockAuthService.login).toHaveBeenCalledWith(credentials.email, credentials.password);
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(component['submitting']()).toBeFalsy();
  }));

  it('debería usar la ruta por defecto del rol si no hay returnUrl', () => {
    // Simulamos que no hay returnUrl en el snapshot
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot.queryParamMap.get as jest.Mock) = jest.fn().mockReturnValue(null);
    
    component['form'].setValue({ email: 'user@test.com', password: 'password123' });
    mockAuthService.login.mockReturnValue(of({}));

    component['submit']();

    expect(mockAuthService.login).toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('debería manejar errores de login y mostrar el mensaje de error', () => {
    component['form'].setValue({ email: 'wrong@test.com', password: 'wrongpassword' });
    const errorMsg = 'Login failed. Please try again.';
    mockAuthService.login.mockReturnValue(throwError(() => ({ error: { message: errorMsg } })));

    component['submit']();

    expect(component['errorMessage']()).toBe(errorMsg);
    expect(component['submitting']()).toBeFalsy();
  });

  it('debería mostrar un mensaje genérico si el error del servidor no trae mensaje', () => {
    component['form'].setValue({ email: 'wrong@test.com', password: 'wrongpassword' });
    mockAuthService.login.mockReturnValue(throwError(() => new Error()));

    component['submit']();

    expect(component['errorMessage']()).toBe('Login failed. Please try again.');
  });
});