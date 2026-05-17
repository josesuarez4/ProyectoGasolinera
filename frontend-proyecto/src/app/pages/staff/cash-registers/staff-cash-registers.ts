import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, finalize } from 'rxjs';
import { GenericForm, FormFieldConfig } from '../../../components/generic-form/generic-form';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Table, TableColumn, TableRow } from '../../../components/table/table';
import { AuthService } from '../../../services/auth/auth.service';
import {
  CashRegistersService,
  CashRegisterCloseRequestDTO,
  CashRegisterResponseDTO,
  CashRegisterOpenRequestDTO,
} from '../../../services/cash-registers/cash-registers.service';
import { ChartComponent } from '../../../components/chart/chart.component';
import { MessageService } from 'primeng/api';
@Component({
  selector: 'app-staff-cash-registers-page',
  standalone: true,
  imports: [GenericForm, ButtonModule, CommonModule, Table, ChartComponent],
  templateUrl: './staff-cash-registers.html',
  styleUrl: './staff-cash-registers.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffCashRegistersPage {
  private readonly authService = inject(AuthService);
  private readonly cashRegistersService = inject(CashRegistersService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeRegister = signal<CashRegisterResponseDTO | null>(null);
  protected readonly pastRegisters = signal<TableRow[]>([]);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly managerFilter = signal('');
  protected readonly startDateFilter = signal('');
  protected readonly endDateFilter = signal('');
  protected readonly showAnalysis = signal(false);

  protected readonly showDialog = signal(false);
  protected readonly dialogMode = signal<'OPEN' | 'CLOSE'>('OPEN');
  protected readonly formConfig = signal<FormFieldConfig[]>([]);
  protected readonly formInitialData = signal<any>(null);

  protected readonly hasActiveFilters = computed(() => {
    return (
      this.managerFilter().trim().length > 0 ||
      this.startDateFilter().trim().length > 0 ||
      this.endDateFilter().trim().length > 0
    );
  });

  protected readonly checkDescuadre = (row: TableRow): string => {
    if (!row['closedAt']) return '';
    
    const opening = Number(row['openingCash'] ?? 0);
    const cash = Number(row['cashAmount'] ?? 0);
    const closing = Number(row['closingCash'] ?? 0);
    const expected = opening + cash;
    
    if (Math.abs(closing - expected) > 0.01) {
      return 'row-descuadre';
    }
    return 'row-cuadre';
  };

  protected readonly filteredPastRegisters = computed(() => {
    const managerTerm = this.managerFilter().trim().toLowerCase();
    const startDate = this.startDateFilter().trim();
    const endDate = this.endDateFilter().trim();

    return this.pastRegisters().filter((register) => {
      const managerSource = String(register['employeeName'] ?? '').toLowerCase();
      const managerId = String(register['employeeId'] ?? '');
      const openedAtKey = this.getDateKey(register['openedAt']);

      const matchesManager = managerTerm.length === 0 || 
                             managerSource.includes(managerTerm) ||
                             managerId.includes(managerTerm);
      const matchesStart =
        startDate.length === 0 || (openedAtKey.length > 0 && openedAtKey >= startDate);
      const matchesEnd = endDate.length === 0 || (openedAtKey.length > 0 && openedAtKey <= endDate);

      return matchesManager && matchesStart && matchesEnd;
    });
  });

  protected readonly analysisStats = computed(() => {
    const data = this.filteredPastRegisters();
    if (data.length === 0) return null;

    let totalCash = 0;
    let totalCard = 0;
    let totalOpening = 0;
    let totalClosing = 0;
    let discrepancyCount = 0;
    let totalDiscrepancySum = 0;

    data.forEach((reg) => {
      const opening = Number(reg['openingCash'] ?? 0);
      const cash = Number(reg['cashAmount'] ?? 0);
      const card = Number(reg['cardAmount'] ?? 0);
      const closing = Number(reg['closingCash'] ?? 0);
      const expected = opening + cash;
      const diff = closing - expected;

      totalCash += cash;
      totalCard += card;
      totalOpening += opening;
      totalClosing += closing;

      if (Math.abs(diff) > 0.01) {
        discrepancyCount++;
        totalDiscrepancySum += Math.abs(diff);
      }
    });

    const accuracyRate = ((data.length - discrepancyCount) / data.length) * 100;

    // Prepare chart data (last 10 registers)
    const recent = data.slice(0, 10).reverse();
    const chartData = {
      labels: recent.map((r) => this.formatDateTime(String(r['closedAt'])).split(' ')[0]),
      datasets: [
        {
          label: 'Discrepancy (€)',
          data: recent.map((r) => {
            const exp = Number(r['openingCash'] ?? 0) + Number(r['cashAmount'] ?? 0);
            return Math.abs(Number(r['closingCash'] ?? 0) - exp);
          }),
          backgroundColor: '#ef444422',
          borderColor: '#ef4444',
          tension: 0.4,
          fill: true,
        },
      ],
    };

    const paymentMethodChartData = {
      labels: recent.map((r) => this.formatDateTime(String(r['closedAt'])).split(' ')[0]),
      datasets: [
        {
          label: 'Cash (€)',
          data: recent.map((r) => Number(r['cashAmount'] ?? 0)),
          borderColor: '#10b981',
          backgroundColor: '#10b98122',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Card (€)',
          data: recent.map((r) => Number(r['cardAmount'] ?? 0)),
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f622',
          tension: 0.4,
          fill: true,
        },
      ],
    };

    return {
      totalSales: totalCash + totalCard,
      totalCash,
      totalCard,
      discrepancyCount,
      totalDiscrepancySum,
      accuracyRate,
      totalRegisters: data.length,
      chartData,
      paymentMethodChartData,
    };
  });

  protected readonly pastRegisterColumns: TableColumn[] = [
    { field: 'id', header: 'ID', width: '5rem' },
    { field: 'employeeName', header: 'Manager', width: '14rem' },
    {
      field: 'openedAt',
      header: 'Opened At',
      width: '12rem',
      formatter: (value) => this.formatDateTime(value),
    },
    {
      field: 'closedAt',
      header: 'Closed At',
      width: '12rem',
      formatter: (value) => this.formatDateTime(value),
    },
    {
      field: 'openingCash',
      header: 'Opening Cash',
      width: '10rem',
      align: 'right',
      formatter: (value) => this.formatCurrency(value),
    },
    {
      field: 'closingCash',
      header: 'Closing Cash',
      width: '10rem',
      align: 'right',
      formatter: (value) => this.formatCurrency(value),
    },
    {
      field: 'cashAmount',
      header: 'Cash Total',
      width: '10rem',
      align: 'right',
      formatter: (value) => this.formatCurrency(value),
    },
    {
      field: 'cardAmount',
      header: 'Card Total',
      width: '10rem',
      align: 'right',
      formatter: (value) => this.formatCurrency(value),
    },
  ];

  constructor() {
    this.loadCashRegisters();
  }

  protected onManagerFilterChange(rawValue: string): void {
    this.managerFilter.set(rawValue);
  }

  protected onStartDateFilterChange(rawValue: string): void {
    this.startDateFilter.set(rawValue);
  }

  protected onEndDateFilterChange(rawValue: string): void {
    this.endDateFilter.set(rawValue);
  }

  protected clearFilters(): void {
    this.managerFilter.set('');
    this.startDateFilter.set('');
    this.endDateFilter.set('');
  }

  protected toggleAnalysis(): void {
    this.showAnalysis.update((v) => !v);
  }

  private loadCashRegisters(): void {
    this.loading.set(true);

    this.cashRegistersService
      .getAll()
      .pipe(
        map((registers) => {
          const activeRegister = registers.find((register) => register.closedAt === null) ?? null;
          const pastRegisters = registers
            .filter((register) => register.closedAt !== null)
            .sort((left, right) => right.id - left.id);

          return { activeRegister, pastRegisters };
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ activeRegister, pastRegisters }) => {
          this.activeRegister.set(activeRegister);
          this.pastRegisters.set(pastRegisters.map((register) => ({ ...register }) as TableRow));
        },
        error: () => {
          this.errorMessage.set('Error loading cash register data.');
        },
      });
  }

  protected onOpenRegister(): void {
    this.dialogMode.set('OPEN');
    this.formConfig.set([
      {
        key: 'openingCash',
        label: 'Opening Cash (€)',
        type: 'number',
        validators: [Validators.required, Validators.min(0)],
        colSpan: 'col-12',
      },
      {
        key: 'openedAt',
        label: 'Opening Time',
        type: 'datetime-local',
        validators: [Validators.required],
        colSpan: 'col-12',
      },
    ]);
    this.formInitialData.set({ openedAt: new Date().toISOString().slice(0, 16) });
    this.showDialog.set(true);
  }

  protected onCloseRegister(): void {
    const register = this.activeRegister();
    if (register === null) {
      return;
    }

    this.dialogMode.set('CLOSE');
    this.formConfig.set([
      {
        key: 'closingCash',
        label: 'Closing Cash (€)',
        type: 'number',
        validators: [Validators.required, Validators.min(0)],
        colSpan: 'col-12',
      },
      {
        key: 'closedAt',
        label: 'Closing Time',
        type: 'datetime-local',
        validators: [Validators.required],
        colSpan: 'col-12',
      },
    ]);
    this.formInitialData.set({ closedAt: new Date().toISOString().slice(0, 16) });
    this.showDialog.set(true);
  }

  protected onSave(formData: any): void {
    // FIX: Evita múltiples peticiones simultáneas que causaban el error 500
    if (this.loading()) return;

    this.loading.set(true);
    this.statusMessage.set('Saving...');
    this.errorMessage.set(null);

    const mode = this.dialogMode();
    const id = this.activeRegister()?.id;

    let request$;
    if (mode === 'OPEN') {
      const employeeId = this.authService.currentUser()?.id;

      if (employeeId === undefined) {
        this.loading.set(false);
        this.statusMessage.set(null);
        this.errorMessage.set('Unable to determine the current manager.');
        return;
      }

      const payload: CashRegisterOpenRequestDTO = {
        employeeId,
        openingCash: formData.openingCash,
        openedAt: formData.openedAt,
      };

      request$ = this.cashRegistersService.openRegister(payload);
    } else if (mode === 'CLOSE' && id) {
      const payload: CashRegisterCloseRequestDTO = {
        closingCash: formData.closingCash,
        closedAt: formData.closedAt,
      };

      request$ = this.cashRegistersService.closeRegister(id, payload);
    } else {
      this.loading.set(false);
      this.statusMessage.set(null);
      return;
    }

    request$
      .pipe(
        // ✅ FIX: Siempre resetea loading al terminar, tanto en éxito como en error
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (record) => {
          this.statusMessage.set(null);
          if (mode === 'OPEN') {
            this.activeRegister.set(record);
          } else {
            this.activeRegister.set(null);
            this.pastRegisters.update((registers) => [{ ...record } as TableRow, ...registers]);
          }
          this.showDialog.set(false);
          this.statusMessage.set('Cash register updated successfully.');
          this.messageService.add({
            severity: mode === 'OPEN' ? 'success' : 'error',
            summary: mode === 'OPEN' ? 'Register Opened' : 'Register Closed',
            detail: `Cash register successfully ${mode === 'OPEN' ? 'opened' : 'closed'}.`,
            life: 3000,
          });
        },
        error: () => {
          this.statusMessage.set(null);
          this.errorMessage.set('Error saving cash register data.');
        },
      });
  }

  protected formatCurrency(value: unknown): string {
    if (value === null || value === undefined) {
      return '—';
    }

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(value));
  }

  protected formatDateTime(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) {
      return '—';
    }

    return new Date(value).toLocaleString('es-ES');
  }

  private getDateKey(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  protected openCashRegisterTickets(register: TableRow): void {
    const registerId = Number(register.id);

    if (Number.isFinite(registerId)) {
      void this.router.navigate(['/staff/cash-registers', registerId, 'tickets']);
    }
  }
}
