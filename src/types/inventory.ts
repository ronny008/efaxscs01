export type GSTApplicability = 'Taxable' | 'Exempt' | 'Nil Rated' | 'Non-GST';
export type SupplyType = 'Goods' | 'Services';

export const STOCK_GROUPS = [
  'Finished Goods',
  'Raw Materials',
  'Packaging Materials',
  'Spares & Components',
  'Consumables',
  'Services',
] as const;

export const STOCK_CATEGORIES = [
  'Electronics',
  'Consumables',
  'Hardware',
  'Office Supplies',
  'IT Services',
  'Industrial Spares',
  'General',
] as const;

export const UNITS_OF_MEASUREMENT = [
  { code: 'PCS', name: 'Pieces' },
  { code: 'NOS', name: 'Numbers' },
  { code: 'BOX', name: 'Boxes' },
  { code: 'KG', name: 'Kilograms' },
  { code: 'MTR', name: 'Metres' },
  { code: 'SET', name: 'Sets' },
  { code: 'LTR', name: 'Litres' },
  { code: 'HRS', name: 'Hours' },
  { code: 'BAG', name: 'Bags' },
  { code: 'BUNDLE', name: 'Bundles' },
  { code: 'BARREL', name: 'Barrels' },
  { code: 'PACK', name: 'Packs' },
] as const;

export const STANDARD_GST_RATES = [0, 3, 5, 12, 18, 28];

export interface Item {
  id: string;
  name: string;
  code?: string;
  partNumber?: string;
  stockGroup: string;
  stockCategory: string;

  // Units & Conversion
  primaryUnit: string;
  enableSecondaryUnit: boolean;
  secondaryUnit?: string;
  conversionFactor?: number; // 1 Primary Unit = conversionFactor Secondary Units

  // Stock and Pricing Settings
  enableBatch: boolean;
  enableExpiry: boolean;
  maintainMRP: boolean;
  maintainSellingPrice: boolean;
  maintainCostPrice: boolean;

  mrp?: number;
  sellingPrice?: number;
  costPrice?: number;
  shelfLifeDays?: number;
  batchPrefix?: string;
  mfgDate?: string;
  expiryDate?: string;

  // GST Details
  gstApplicability: GSTApplicability;
  hsnCode?: string;
  description?: string;
  gstRate: number; // percentage, e.g. 18
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
  cessRate: number;
  supplyType: SupplyType;

  createdAt: string;
  updatedAt?: string;
}

export interface ItemFormData {
  name: string;
  code: string;
  partNumber: string;
  stockGroup: string;
  stockCategory: string;

  // Units & Conversion
  primaryUnit: string;
  enableSecondaryUnit: boolean;
  secondaryUnit: string;
  conversionFactor: string | number;

  // Stock and Pricing Settings
  enableBatch: boolean;
  enableExpiry: boolean;
  maintainMRP: boolean;
  maintainSellingPrice: boolean;
  maintainCostPrice: boolean;

  mrp: string | number;
  sellingPrice: string | number;
  costPrice: string | number;
  shelfLifeDays: string | number;
  batchPrefix: string;
  mfgDate: string;
  expiryDate: string;

  // GST Details
  gstApplicability: GSTApplicability;
  hsnCode: string;
  description: string;
  gstRate: string | number;
  igstRate: string | number;
  cgstRate: string | number;
  sgstRate: string | number;
  cessRate: string | number;
  supplyType: SupplyType;
}

