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

export type GstRegistrationType = 'Regular' | 'Composition' | 'Consumer' | 'Unregistered';

export interface OpeningBillDetail {
  id: string;
  billNo: string;
  billDate: string;
  dueDate?: string;
  amount: number;
  drCr: 'Dr' | 'Cr';
}

export interface Ledger {
  id: string;
  name: string;
  code?: string;
  underGroup: string; // Group Name it belongs to
  nature: NatureGroup;

  // Billing & Credit Settings
  maintainBillByBill?: boolean;
  creditDays?: number;
  creditLimit?: number;

  // Address and Contact Details
  address?: string;
  contactPerson?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  pincode?: string;
  country?: string;
  state?: string;

  // Business and Tax Details
  pan?: string;
  cin?: string;
  gstType?: GstRegistrationType;
  gstin?: string;

  // Bank Details
  maintainBankDetails?: boolean;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;

  // Opening Balance
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  openingBills?: OpeningBillDetail[];

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
