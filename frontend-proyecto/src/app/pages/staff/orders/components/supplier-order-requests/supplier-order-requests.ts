import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { Table, TableActionEvent, TableColumn, TableAction } from '../../../../../components/table/table';

@Component({
  selector: 'app-supplier-order-requests',
  standalone: true,
  imports: [Button, RouterLink, Table],
  templateUrl: './supplier-order-requests.html',
  styleUrl: './supplier-order-requests.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierOrderRequestsComponent {
  loading = input.required<boolean>();
  updatingOrderId = input.required<number | null>();
  rows = input.required<any[]>();
  columns = input.required<TableColumn[]>();
  actions = input.required<TableAction[]>();
  errorMessage = input<string | null>(null);
  successMessage = input<string | null>(null);

  actionTriggered = output<TableActionEvent>();
  rowClicked = output<any>();
}
