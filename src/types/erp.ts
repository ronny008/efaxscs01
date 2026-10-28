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

export interface OpeningBill {
  id: string;
  reference: string;
  billDate: string;
  dueDate: string;
  amount: number;
  balanceType?: 'Dr' | 'Cr';
}

export interface Ledger {
  id: string;
  name: string;
  underGroup: string; // Group Name it belongs to
  nature: NatureGroup;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  openingBalanceDate?: string;
  openingBalanceReference?: string;
  openingBalanceNotes?: string;
  openingBills?: OpeningBill[];
  code?: string;
  trackBillByBill?: boolean;
  creditDays?: number;
  creditLimit?: number;
  gstRegistrationType?: "Regular" | "Consumer" | "Unregistered";
  gstin?: string;
  pan?: string;
  cin?: string;
  pincode?: string;
  country?: string;
  state?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  hasBankDetails?: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  address?: string;
  addressLines?: string[];
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
