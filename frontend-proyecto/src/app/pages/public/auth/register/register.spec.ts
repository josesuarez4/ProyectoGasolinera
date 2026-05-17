import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Register } from './register';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth.service';
import { of } from 'rxjs';

describe('RegisterPage (Jest)', () => {
  let fixture: ComponentFixture<Register>;
  let component: Register;
  let router: { navigateByUrl: jest.Mock; navigate: jest.Mock };
  let authServiceMock: { register: jest.Mock };

  beforeEach(async () => {
    router = {
      navigateByUrl: jest.fn(),
      navigate: jest.fn(),
    };

    authServiceMock = {
      register: jest.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form invalid when empty', () => {
    const form = (component as any).form;
    expect(form.invalid).toBe(true);
  });

  it('should not submit if form is invalid', () => {
    const form = (component as any).form;
    jest.spyOn(form, 'markAllAsTouched');

    (component as any).submit();

    expect(form.markAllAsTouched).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  it('should submit and navigate when form is valid', () => {
    const form = (component as any).form;

    form.setValue({
      name: 'Juan Pérez',
      email: 'juan@test.com',
      password: '123456',
      birthDate: '1990-01-01',
    });

    (component as any).submit();

    expect(authServiceMock.register).toHaveBeenCalledWith(
      'Juan Pérez',
      'juan@test.com',
      '123456',
      '1990-01-01',
    );

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: 'true' },
    });
    expect((component as any).submitting()).toBe(true);
  });

  it('should not submit if already submitting', () => {
    const form = (component as any).form;

    form.setValue({
      name: 'Juan Pérez',
      email: 'juan@test.com',
      password: '123456',
      birthDate: '1990-01-01',
    });

    (component as any).submitting.set(true);

    (component as any).submit();
    expect(authServiceMock.register).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
