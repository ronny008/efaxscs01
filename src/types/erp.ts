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

export type GSTRegistrationType =
  | 'Regular'
  | 'Consumer'
  | 'Unregistered'
  | 'Composition';

export type AccountType = 'Savings' | 'Current' | 'Overdraft' | 'Cash Credit' | 'Other';

export interface BankDetails {
  maintainBankDetails: boolean;
  accountHolderName?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountType?: AccountType;
}

export interface LedgerAddress {
  addressLine1?: string;
  addressLine2?: string;
  country: string;
  state: string;
  district?: string;
  city?: string;
  pincode?: string;
}

export interface LedgerContact {
  contactPerson?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
}

export interface OpeningBalanceBill {
  id: string;
  billNo: string;
  billDate: string;
  dueDate: string;
  amount: number;
  balanceType: 'Dr' | 'Cr';
}

export interface Ledger {
  id: string;
  name: string;
  code?: string;
  underGroup: string; // Group Name it belongs to
  nature: NatureGroup;
  billByBill?: boolean;
  creditDays?: number;
  creditLimit?: number;
  address?: string; // backwards compatibility string
  phone?: string; // backwards compatibility string
  addressDetails?: LedgerAddress;
  contactDetails?: LedgerContact;
  gstRegistrationType?: GSTRegistrationType;
  gstin?: string;
  pan?: string;
  bankDetails?: BankDetails;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  openingBills?: OpeningBalanceBill[];
  status?: 'Active' | 'Inactive';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
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

export interface CreateLedgerFormValues {
  name: string;
  code: string;
  underGroup: string;
  nature: NatureGroup;
  billByBill: boolean;
  creditDays: number;
  creditLimit: number;
  // Address
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  // Contact
  contactPerson: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  email: string;
  website: string;
  // GST & Tax
  gstRegistrationType: GSTRegistrationType;
  gstin: string;
  pan: string;
  // Banking
  maintainBankDetails: boolean;
  accountHolderName: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  accountType: AccountType;
  // Opening Balance
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  openingBills?: OpeningBalanceBill[];
  // Additional
  status: 'Active' | 'Inactive';
  notes: string;
}
