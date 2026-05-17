import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../../services/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    RouterModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  // ── Dependencies and state ───────────────────────────────────────────────

  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  // ── Form setup and submission ─────────────────────────────────────────

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    birthDate: ['', [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    // Extract form values

    const { name, email, password, birthDate } = this.form.getRawValue();

    // Call the AuthService to register the new user

    this.authService.register(name, email, password, birthDate).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { registered: 'true' } }),
      error: (err) => {
        this.errorMessage.set(
          err.status === 409
            ? 'Email already registered'
            : 'Registration failed. Please try again.',
        );
        this.submitting.set(false);
      },
    });
  }
}
