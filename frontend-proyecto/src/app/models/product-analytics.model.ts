import { TableRow } from '../components/table/table';

export interface ProductAnalytics extends TableRow {
  id: number;
  name: string;
  categoryName: string;
  currentStock: number;
  currentPrice: number;
  monthlySalesCount: number;
  monthlyRevenue: number;
  lastSupplierName: string;
  lastCostPrice: number;
}
