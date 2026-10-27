export type NatureGroup = 'Asset' | 'Expenses' | 'Income' | 'Liability';

export interface LedgerGroup {
  id: string;
  name: string;
  underGroup: string; // Parent group name or 'Primary'
  nature: NatureGroup;
  affectsGrossProfit: boolean;
  code?: string;
  isSystem?: boolean;
}

export interface Ledger {
  id: string;
  name: string;
  underGroup: string; // Group Name it belongs to
  nature: NatureGroup;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  gstin?: string;
  address?: string;
  phone?: string;
  createdAt: string;
}

export interface MetricCard {
  label: string;
  value: string | number;
  subtitle: string;
  icon: string;
  change?: string;
}

export interface OperatingFlow {
  title: string;
  code: string;
  count: number;
  subtitle: string;
  icon: string;
}
