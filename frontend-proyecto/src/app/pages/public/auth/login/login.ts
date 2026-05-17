import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    RouterModule,
    RouterLink,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly registrationSuccess = signal(false);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.registrationSuccess.set(params.get('registered') === 'true');
    });
  }

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    this.authService.login(email, password).subscribe({
      next: () =>
        this.router.navigateByUrl(
          returnUrl ?? this.authService.defaultRouteForRole(this.authService.currentRole()),
        ),
      error: (err) => {
        this.errorMessage.set(
          err.status === 401 ? 'Invalid credentials' : 'Login failed. Please try again.',
        );
        this.submitting.set(false);
      },
      complete: () => this.submitting.set(false),
    });
  }
}
