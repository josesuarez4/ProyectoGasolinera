import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

function parseDateMs(value: unknown): number | null {
  if (!value) return null;
  const t = new Date(String(value)).getTime();
  return Number.isNaN(t) ? null : t;
}

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Validators, FormsModule } from '@angular/forms';
import { Table, TableAction, TableActionEvent, TableColumn, TableRowClickEvent } from '../../../components/table/table';
import { AuthService } from '../../../services/auth/auth.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminUserRecord, UserRole, UserService } from '../../../services/users/user.service';
import { GenericForm, FormFieldConfig } from '../../../components/generic-form/generic-form';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { NotificationService, UserNotification } from '../../../services/notification/notification.service';
import { DetailView, TagSeverity } from '../../../components/detail-view/detail-view';
import { Dialog } from 'primeng/dialog';
import { getErrorMessage } from '../../../utils/error-handler';

@Component({
  selector: 'app-staff-users-page',
  standalone: true,
  imports: [CommonModule, Table, GenericForm, ButtonModule, Dialog, FormsModule, DetailView, ConfirmDialog],
  templateUrl: './staff-users.html',
  styleUrl: './staff-users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffUsersPage {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currencyPipe = new CurrencyPipe('es-ES');

  protected readonly showNotificationDialog = signal(false);
  protected readonly notificationRecipient = signal<AdminUserRecord | null>(null);
  protected notificationMessage = '';
  protected readonly notificationService = inject(NotificationService);
  protected notificationType: UserNotification['type'] = 'ORDER_PICKUP';

  protected readonly rows = signal<AdminUserRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly deletingUserId = signal<number | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly emailFilter = signal('');
  protected readonly loyaltyCodeFilter = signal('');
  protected readonly roleFilter = signal<UserRole | ''>('');

  protected userDetails = signal<AdminUserRecord | null>(null);

  protected readonly roleOptions: Array<{ label: string; value: UserRole | '' }> = [
    { label: 'All roles', value: '' },
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Manager', value: 'MANAGER' },
    { label: 'Employee', value: 'EMPLOYEE' },
    { label: 'Client', value: 'CLIENT' },
  ];

  protected readonly hasActiveFilters = computed(() => {
    return (
      this.emailFilter().trim().length > 0 ||
      this.loyaltyCodeFilter().trim().length > 0 ||
      this.roleFilter().trim().length > 0
    );
  });

  protected readonly filteredRows = computed(() => {
    const emailTerm = this.emailFilter().trim().toLowerCase();
    const loyaltyTerm = this.loyaltyCodeFilter().trim().toLowerCase();
    const selectedRole = this.roleFilter().trim().toUpperCase();

    return this.rows().filter((user) => {
      const emailSource = String(user.email ?? '').toLowerCase();
      const loyaltySource = String(user.loyaltyCode ?? '').toLowerCase();
      const roleSource = String(user.role ?? '').toUpperCase();

      const matchesEmail = emailTerm.length === 0 || emailSource.includes(emailTerm);
      const matchesLoyalty = loyaltyTerm.length === 0 || loyaltySource.includes(loyaltyTerm);
      const matchesRole = selectedRole.length === 0 || roleSource === selectedRole;

      return matchesEmail && matchesLoyalty && matchesRole;
    });
  });

  protected readonly columns: TableColumn[] = [
    { field: 'id', header: 'ID', width: '5.5rem' },
    { field: 'name', header: 'Name', width: '15rem' },
    {
      field: 'role',
      header: 'Role',
      width: '10rem',
    },
    { 
      field: 'email', 
      header: 'Email', 
      width: '18rem'
    },
    {
      field: 'birthDate',
      header: 'Birth date',
      width: '10rem',
      formatter: (v) => {
        if (!v || v === '—') return '—';
        const dateStr = String(v);
        // If it's already DD/MM/YYYY, just return it
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
        // Try to parse and format
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr; // Return raw if unparseable
        return new DatePipe('en-US').transform(d, 'dd/MM/yyyy') ?? dateStr;
      }
    },
    {
      field: 'loyaltyCode',
      header: 'Loyalty code',
      width: '11rem',
      emptyValue: '—'
    },
    {
      field: 'points',
      header: 'Points',
      width: '7rem',
      align: 'right',
      formatter: (v) => v != null ? String(v) : '—'
    },
    {
      field: 'salary',
      header: 'Salary',
      width: '10rem',
      align: 'right',
      formatter: (v) => {
        if (!v || v === '—' || v === '-') return '—';
        const rawValue = typeof v === 'number' ? v : this.parseSalary(String(v));
        if (rawValue === null) return String(v);
        return this.currencyPipe.transform(rawValue, 'EUR') ?? String(v);
      }
    },
    {
      field: 'createdAt',
      header: 'Created at',
      width: '12rem',
      sortValue: (row) => parseDateMs(row['createdAt']),
      formatter: (v) => {
        if (!v || v === '—') return '—';
        const d = new Date(String(v));
        if (Number.isNaN(d.getTime())) return String(v);
        return new DatePipe('en-US').transform(d, 'dd/MM/yyyy HH:mm') ?? String(v);
      }
    }
  ];

  protected readonly actions: TableAction[] = [
    {
      id: 'delete-user',
      label: '',
      icon: 'pi pi-trash',
      severity: 'danger',
      appearance: 'outlined',
      disabled: (row) => {
        const rowId = Number(row.id);
        const currentUserId = this.auth.currentUser()?.id;

        return this.deletingUserId() === rowId || currentUserId === rowId;
      },
    },
    {
      id: 'edit',
      label: '',
      icon: 'pi pi-pencil',
      severity: 'info',
      appearance: 'outlined',
    },
  ];

  protected readonly showDialog = signal(false);
  protected readonly userToEdit = signal<AdminUserRecord | null>(null);

  // Configuración del Formulario
  protected readonly userFormConfig: FormFieldConfig[] = [
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
      showIf: () => !this.userToEdit()?.id,
    },
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'ADMIN' },
        { label: 'Manager', value: 'MANAGER' },
        { label: 'Employee', value: 'EMPLOYEE' },
        { label: 'Client', value: 'CLIENT' },
      ],
      validators: [Validators.required],
      colSpan: 'col-6',
    },
    {
      key: 'birthDate',
      label: 'Birth Date',
      type: 'date',
      colSpan: 'col-12',
      validators: [Validators.required],
    },
    // Campos específicos de empleado
    {
      key: 'salary',
      label: 'Salary',
      type: 'currency',
      colSpan: 'col-6',
      showIf: (f) => f.role !== 'CLIENT',
    },
    {
      key: 'days',
      label: 'Business Days',
      type: 'text',
      placeholder: 'L-V',
      colSpan: 'col-6',
      showIf: (f) => f.role !== 'CLIENT',
    },
    {
      key: 'startTime',
      label: 'Start Time',
      type: 'time',
      colSpan: 'col-6',
      showIf: (f) => f.role !== 'CLIENT',
    },
    {
      key: 'endTime',
      label: 'End Time',
      type: 'time',
      colSpan: 'col-6',
      showIf: (f) => f.role !== 'CLIENT',
    },
    // Campo específico de cliente
    {
      key: 'loyaltyCode',
      label: 'Loyalty Code',
      type: 'text',
      placeholder: 'FID-000000',
      validators: [Validators.required, Validators.pattern(/^FID-\d{6}$/)],
      colSpan: 'col-12 md:col-6',
      showIf: (formValue: any) => formValue.role === 'CLIENT',
    },
    {
      key: 'points',
      label: 'Loyalty Points',
      type: 'number',
      colSpan: 'col-12',
      showIf: (f) => f.role === 'CLIENT',
    },
  ];

  constructor() {
    this.loadUsers();
  }

  protected onEmailFilterChange(rawValue: string): void {
    this.emailFilter.set(rawValue);
  }

  protected onLoyaltyCodeFilterChange(rawValue: string): void {
    this.loyaltyCodeFilter.set(rawValue);
  }

  protected onRoleFilterChange(rawValue: string): void {
    const normalizedValue = rawValue.toUpperCase();

    if (normalizedValue === '') {
      this.roleFilter.set('');
      return;
    }

    if (this.isUserRole(normalizedValue)) {
      this.roleFilter.set(normalizedValue);
      return;
    }

    this.roleFilter.set('');
  }

  protected clearFilters(): void {
    this.emailFilter.set('');
    this.loyaltyCodeFilter.set('');
    this.roleFilter.set('');
  }

  protected openCreate(): void {
    // Inicializamos con valores por defecto para un nuevo usuario
    this.userToEdit.set({
      id: undefined, // Aseguramos que el ID es undefined
      role: 'CLIENT',
      loyaltyCode: this.generateLoyaltyCode(),
      points: 0,
      name: '',
      email: '',
      birthDate: '',
    } as any);

    this.showDialog.set(true);
  }

  protected handleAction(event: TableActionEvent): void {
    const user = event.row as AdminUserRecord;

    switch (event.action.id) {
      case 'edit':
        this.userToEdit.set({
          ...user,
          salary: this.parseSalary(user.salary),
          points: this.parseNumber(user.points),
          birthDate: this.normalizeDate(user.birthDate),
        } as any);
        this.showDialog.set(true);
        break;
      case 'delete-user':
        this.deleteUser(event);
        return;
      case 'notify':
        this.notificationRecipient.set(user);
        this.notificationMessage = '';
        this.notificationType = 'ORDER_PICKUP';
        this.showNotificationDialog.set(true);
        return;
    }

    // Placeholder while the status update endpoint is pending implementation.
  }

  protected handleRowClick(event: TableRowClickEvent): void {
    const user = event.row as AdminUserRecord;
    this.userDetails.set(user);
  }

  private deleteUser(event: TableActionEvent): void {
    const userId = Number(event.row.id);

    if (Number.isFinite(userId) === false) {
      this.errorMessage.set('Invalid user id.');
      return;
    }

    const currentUserId = this.auth.currentUser()?.id;
    if (typeof currentUserId === 'number' && currentUserId === userId) {
      return;
    }

    const targetName = typeof event.row['name'] === 'string' ? event.row['name'] : `#${userId}`;

    this.confirmationService.confirm({
      message: `Are you sure you want to PERMANENTLY delete user "${targetName}"? This action cannot be undone.`,
      header: 'Delete User',
      icon: 'pi pi-trash',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        severity: 'secondary',
        text: true,
      },
      acceptLabel: 'Delete',
      acceptButtonProps: {
        severity: 'danger',
      },
      accept: () => {
        this.errorMessage.set(null);
        this.statusMessage.set(`Deleting user ${targetName}...`);
        this.deletingUserId.set(userId);

        this.userService
          .deleteUser(userId)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.deletingUserId.set(null))
          )
          .subscribe({
            next: () => {
              this.rows.update((rows) => rows.filter((row) => row.id !== userId));
              this.statusMessage.set(`User ${targetName} deleted successfully.`);
              this.messageService.add({
                severity: 'error',
                summary: 'User Deleted',
                detail: `User ${targetName} has been permanently removed.`,
                life: 3000,
              });
            },
            error: (err) => {
              this.statusMessage.set(null);
              this.errorMessage.set(getErrorMessage(err, 'Could not delete user. Please try again.'));
            },
          });
      },
    });
  }

  private loadUsers(): void {
    this.loading.set(true);

    this.userService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        this.rows.set(users);
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

  private parseSalary(value: string | undefined | null): number | null {
    if (!value || value === '-') return null;
    // "2.500,00 €" → remove "€", spaces, dots (thousands), comma → decimal
    const cleaned = value.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isNaN(n) ? null : n;
  }

  private parseNumber(value: string | undefined | null): number | null {
    if (!value || value === '-') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  private generateLoyaltyCode(): string {
    const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 dígitos aleatorios
    return `FID-${randomDigits}`;
  }

  private isUserRole(value: string): value is UserRole {
    return value === 'ADMIN' || value === 'MANAGER' || value === 'EMPLOYEE' || value === 'CLIENT';
  }

  protected onSaveUser(formData: any): void {
    const userActual = this.userToEdit();
    const userId = userActual?.id;
    const isClient = formData.role === 'CLIENT';

    // 1. Preparamos la contraseña para que nunca esté vacía
    let finalPassword;
    if (userId) {
      // Si editamos, mandamos la que ya tiene el objeto (el hash que viene de la DB)
      // O un valor dummy que el backend ignorará si detecta que es un update
      finalPassword = userActual['password'] || 'DUMMY_PASS';
    } else {
      // Si creamos, lo que venga del form o el default
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

    const commonPayload = {
      name: formData.name,
      email: formData.email,
      password: finalPassword,
      birthDate: formattedDate,
    };

    // 3. Construcción de Payloads específicos
    let obs$: Observable<any>;

    if (isClient) {
      const clientPayload = {
        ...commonPayload,
        points: Number(formData.points || 0),
        loyaltyCode: userId
          ? userActual?.['loyaltyCode'] || formData.loyaltyCode
          : this.generateLoyaltyCode(),
      };
      obs$ = userId
        ? this.userService.updateClient(userId, clientPayload)
        : this.userService.createClient(clientPayload);
    } else {
      const employeePayload = {
        ...commonPayload,
        role: formData.role.toUpperCase(),
        salary: Number(formData.salary || 0),
        startTime: this.formatTimeToBackend(formData.startTime, '09:00:00'),
        endTime: this.formatTimeToBackend(formData.endTime, '18:00:00'),
        days: formData.days || 'L-V',
      };
      obs$ = userId
        ? this.userService.updateEmployee(userId, employeePayload)
        : this.userService.createEmployee(employeePayload);
    }

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
          this.loadUsers();
          const label = userId ? 'updated' : 'created';
          this.statusMessage.set(`User ${label} successfully!`);

          this.messageService.add({
            severity: userId ? 'warn' : 'success',
            summary: userId ? 'User Updated' : 'User Created',
            detail: `User ${formData.name} was successfully ${label}.`,
            life: 3000,
          });
        },
        error: (err) => {
          this.errorMessage.set(getErrorMessage(err, 'Check that all fields are correctly filled and try again.'));
          this.statusMessage.set(null);
        },
      });
  }

  private formatTimeToBackend(time: string | undefined | null, defaultTime: string): string {
    if (!time) return defaultTime;

    // Si el formato es HH:mm (longitud 5), le añadimos los segundos :00
    if (time.length === 5) {
      return `${time}:00`;
    }

    // Si ya tiene segundos o es un formato mayor, lo devolvemos tal cual (o truncamos si es necesario)
    return time.slice(0, 8);
  }

  protected sendNotification(): void {
    const recipient = this.notificationRecipient();
    if (!recipient?.id || !this.notificationMessage.trim()) return;

    this.notificationService.sendNotification(
      recipient.id,
      this.notificationMessage,
      this.notificationType
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.showNotificationDialog.set(false);
        this.statusMessage.set(`Notification sent to ${recipient.name}`);
      },
      error: (err) => {
        this.errorMessage.set(getErrorMessage(err, 'Error sending notification.'));
      }
    });
  }

  protected getRoleSeverity(role: string): TagSeverity {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'MANAGER': return 'warn';
      case 'EMPLOYEE': return 'secondary';
      default: return 'secondary';
    }
  }
}
