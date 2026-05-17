import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Landing } from './landing';
import { AuthService } from '../../../services/auth/auth.service';
import { provideRouter } from '@angular/router';

describe('Landing Component', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let authService: AuthService;

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: jest.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
  });

  it('should show nothing when logged in', fakeAsync(() => {
    (authService.isAuthenticated as unknown as jest.Mock).mockReturnValue(true);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('p-button');
    expect(buttons.length).toBe(2);
  }));

  it('should show login buttons when not logged in', fakeAsync(() => {
    (authService.isAuthenticated as unknown as jest.Mock).mockReturnValue(false);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const heroContainer = fixture.nativeElement.querySelector('.hero-btns');
    const registerBtn = heroContainer?.querySelector('p-button');

    // En caso de no estar logueados, el botón debe estar ahí
    expect(registerBtn).toBeTruthy();
    expect(registerBtn.textContent).toContain('Create account');
  }));
});
