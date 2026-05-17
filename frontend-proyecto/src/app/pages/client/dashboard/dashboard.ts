import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { AuthService } from '../../../services/auth/auth.service';
import { Card } from '../../../components/card/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, TableModule, TagModule, Card, ProgressSpinnerModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  clientSummary: { title: string; value: string }[] = [];
  recentActivity: any[] = [];
  loading = true;

  ngOnInit(): void {
    const clientId = this.auth.currentUser()?.id;
    if (!clientId) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    this.loadData(clientId);
  }
  isLoggedIn: boolean = false;

  loadData(clientId: number): void {
    this.dashboardService.getDashboardData(clientId).subscribe({
      next: (data) => {
        this.clientSummary = data.stats;
        this.recentActivity = data.activities;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getStatusSeverity(
    status: string,
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null | undefined {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'warn';
      case 'PICKED_UP':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'Pendiente';
      case 'PICKED_UP':
        return 'Recogido';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status ?? '';
    }
  }
}
