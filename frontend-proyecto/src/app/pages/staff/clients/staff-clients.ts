import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { Table, TableColumn } from '../../../components/table/table';
import { AdminUserRecord, UserService } from '../../../services/users/user.service';
import { AuthService } from '../../../services/auth/auth.service';
import { Validators } from '@angular/forms';
import { GenericForm, FormFieldConfig } from '../../../components/generic-form/generic-form';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-staff-clients-page',
  imports: [Table, GenericForm, ButtonModule],
  templateUrl: './staff-clients.html',
  styleUrl: './staff-clients.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffClientsPage {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly rows = signal<AdminUserRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly emailFilter = signal('');
  protected readonly loyaltyCodeFilter = signal('');

  protected readonly hasActiveFilters = computed(() => {
    return this.emailFilter().trim().length > 0 || this.loyaltyCodeFilter().trim().length > 0;
  });

  protected readonly filteredRows = computed(() => {
    const emailTerm = this.emailFilter().trim().toLowerCase();
    const loyaltyTerm = this.loyaltyCodeFilter().trim().toLowerCase();

    return this.rows().filter((client) => {
      const emailSource = String(client.email ?? '').toLowerCase();
      const loyaltySource = String(client.loyaltyCode ?? '').toLowerCase();

      const matchesEmail = emailTerm.length === 0 || emailSource.includes(emailTerm);
      const matchesLoyalty = loyaltyTerm.length === 0 || loyaltySource.includes(loyaltyTerm);

      return matchesEmail && matchesLoyalty;
    });
  });

  protected readonly columns: TableColumn[] = [
    { field: 'id', header: 'ID', width: '5.5rem' },
    { field: 'name', header: 'Name', width: '15rem' },
    { field: 'email', header: 'Email', width: '18rem' },
    { field: 'birthDate', header: 'Birth date', width: '10rem' },
    { field: 'loyaltyCode', header: 'Loyalty code', width: '12rem' },
    { field: 'points', header: 'Points', width: '8rem', align: 'right' },
    { field: 'createdAt', header: 'Created at', width: '12rem' },
    { field: 'updatedAt', header: 'Updated at', width: '12rem' },
  ];

  protected readonly showDialog = signal(false);
  protected readonly clientToEdit = signal<AdminUserRecord | null>(null);

  protected readonly canCreateClient = computed(() => {
    const currentRole = this.auth.currentRole();
    return currentRole === 'MANAGER' || currentRole === 'EMPLOYEE';
  });

  protected readonly clientFormConfig: FormFieldConfig[] = [
    {
      key: 'name',
      label: 'Full Name',
      type: 'text',
      validators: [Validators.required],
      colSpan: 'col-12',
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      validators: [Validators.required, Validators.email],
      colSpan: 'col-6',
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      validators: [Validators.minLength(6)],
      colSpan: 'col-6',
    },
    {
      key: 'birthDate',
      label: 'Birth Date',
      type: 'date',
      colSpan: 'col-12',
      validators: [Validators.required],
    },
    {
      key: 'loyaltyCode',
      label: 'Loyalty Code',
      type: 'text',
      placeholder: 'FID-000000',
      validators: [Validators.required, Validators.pattern(/^FID-\d{6}$/)],
      colSpan: 'col-12 md:col-6',
    },
    {
      key: 'points',
      label: 'Accumulated Points',
      type: 'number',
      colSpan: 'col-12 md:col-6',
    },
  ];

  constructor() {
    this.loadClients();
  }

  protected onEmailFilterChange(rawValue: string): void {
    this.emailFilter.set(rawValue);
  }

  protected onLoyaltyCodeFilterChange(rawValue: string): void {
    this.loyaltyCodeFilter.set(rawValue);
  }

  protected clearFilters(): void {
    this.emailFilter.set('');
    this.loyaltyCodeFilter.set('');
  }

  protected openCreate(): void {
    this.clientToEdit.set({
      id: undefined,
      loyaltyCode: this.generateLoyaltyCode(),
      points: 0,
      name: '',
      email: '',
      birthDate: '',
    } as any);

    this.showDialog.set(true);
  }

  private loadClients(): void {
    this.loading.set(true);

    this.userService
      .getClients()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clients) => {
        this.rows.set(clients);
        this.loading.set(false);
      });
  }

  private normalizeDate(value: string | undefined | null): string {
    if (!value || value === '-') return '';
    // Already ISO: "YYYY-MM-DD..."
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    // Spanish locale: "DD/MM/YYYY"
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/');
      return `${year}-${month}-${day}`;
    }
    // Fallback: try generic Date parse
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  private parseNumber(value: string | undefined | null): number | null {
    if (!value || value === '-') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  private generateLoyaltyCode(): string {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `FID-${randomDigits}`;
  }

  protected onSaveClient(formData: any): void {
    const clientActual = this.clientToEdit();
    const clientId = clientActual?.id;

    // 1. Preparamos la contraseña
    let finalPassword;
    if (clientId) {
      finalPassword = clientActual['password'] || 'DUMMY_PASS';
    } else {
      finalPassword = formData.password || '123456';
    }

    let formattedDate = '';
    if (formData.birthDate) {
      const dateObj = new Date(formData.birthDate);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      formattedDate = `${year}-${month}-${day}`;
    }

    const clientPayload = {
      name: formData.name,
      email: formData.email,
      password: finalPassword,
      birthDate: formattedDate,
      points: Number(formData.points || 0),
      loyaltyCode: clientId
        ? clientActual?.['loyaltyCode'] || formData.loyaltyCode
        : this.generateLoyaltyCode(),
    };

    const obs$: Observable<any> = clientId
      ? this.userService.updateClient(clientId, clientPayload)
      : this.userService.createClient(clientPayload);

    this.errorMessage.set(null);
    this.statusMessage.set('Saving...');

    obs$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.statusMessage.set(null)),
      )
      .subscribe({
        next: () => {
          this.showDialog.set(false);
          this.loadClients();
          this.statusMessage.set('Saved successfully!');
        },
        error: (err) => {
          console.error('Detailed server error:', err);

          let detailedMessage = 'Error while saving: ';

          if (err.status === 400 && err.error?.errors) {
            const fieldErrors = Object.entries(err.error.errors)
              .map(([field, msg]) => `${field}: ${msg}`)
              .join(' | ');
            detailedMessage += fieldErrors;
          } else if (err.error?.message) {
            detailedMessage += err.error.message;
          } else {
            detailedMessage += 'Check that all fields are correctly filled and try again.';
          }

          this.errorMessage.set(detailedMessage);
          this.statusMessage.set(null);
        },
      });
  }
}
