import { LedgerGroup } from '../types/erp';

export const STANDARD_ACCOUNTING_GROUPS: LedgerGroup[] = [
  {
    id: 'grp-capital-acc',
    name: 'Capital Account',
    underGroup: 'Primary',
    nature: 'Liability',
    affectsGrossProfit: false,
    code: 'CAP-01',
    isSystem: true,
  },
  {
    id: 'grp-reserves-surplus',
    name: 'Reserves and Surplus',
    underGroup: 'Capital Account',
    nature: 'Liability',
    affectsGrossProfit: false,
    code: 'RES-01',
    isSystem: true,
  },
  {
    id: 'grp-current-assets',
    name: 'Current Assets',
    underGroup: 'Primary',
    nature: 'Asset',
    affectsGrossProfit: false,
    code: 'CAS-01',
    isSystem: true,
  },
  {
    id: 'grp-bank-accounts',
    name: 'Bank Accounts',
    underGroup: 'Current Assets',
    nature: 'Asset',
    affectsGrossProfit: false,
    code: 'BNK-01',
    isSystem: true,
  },
  {
    id: 'grp-cash-in-hand',
    name: 'Cash-in-Hand',
    underGroup: 'Current Assets',
    nature: 'Asset',
    affectsGrossProfit: false,
    code: 'CSH-01',
    isSystem: true,
  },
  {
    id: 'grp-sundry-debtors',
    name: 'Sundry Debtors',
    underGroup: 'Current Assets',
    nature: 'Asset',
    affectsGrossProfit: false,
    code: 'DEB-01',
    isSystem: true,
  },
  {
    id: 'grp-loans-advances-asset',
    name: 'Loans and Advances (Asset)',
    underGroup: 'Current Assets',
    nature: 'Asset',
    affectsGrossProfit: false,
    code: 'LAA-01',
    isSystem: true,
  },
  {
    id: 'grp-fixed-assets',
    name: 'Fixed Assets',
    underGroup: 'Primary',
    nature: 'Asset',
    affectsGrossProfit: false,
    code: 'FAS-01',
    isSystem: true,
  },
  {
    id: 'grp-investments',
    name: 'Investments',
    underGroup: 'Primary',
    nature: 'Asset',
    affectsGrossProfit: false,
    code: 'INV-01',
    isSystem: true,
  },
  {
    id: 'grp-current-liabilities',
    name: 'Current Liabilities',
    underGroup: 'Primary',
    nature: 'Liability',
    affectsGrossProfit: false,
    code: 'CLI-01',
    isSystem: true,
  },
  {
    id: 'grp-sundry-creditors',
    name: 'Sundry Creditors',
    underGroup: 'Current Liabilities',
    nature: 'Liability',
    affectsGrossProfit: false,
    code: 'CRE-01',
    isSystem: true,
  },
  {
    id: 'grp-duties-and-taxes',
    name: 'Duties and Taxes',
    underGroup: 'Current Liabilities',
    nature: 'Liability',
    affectsGrossProfit: false,
    code: 'TAX-01',
    isSystem: true,
  },
  {
    id: 'grp-loans-liability',
    name: 'Loans (Liability)',
    underGroup: 'Primary',
    nature: 'Liability',
    affectsGrossProfit: false,
    code: 'LON-01',
    isSystem: true,
  },
  {
    id: 'grp-sales-accounts',
    name: 'Sales Accounts',
    underGroup: 'Primary',
    nature: 'Income',
    affectsGrossProfit: true,
    code: 'SAL-01',
    isSystem: true,
  },
  {
    id: 'grp-direct-incomes',
    name: 'Direct Incomes',
    underGroup: 'Primary',
    nature: 'Income',
    affectsGrossProfit: true,
    code: 'DIN-01',
    isSystem: true,
  },
  {
    id: 'grp-indirect-incomes',
    name: 'Indirect Incomes',
    underGroup: 'Primary',
    nature: 'Income',
    affectsGrossProfit: false,
    code: 'IIN-01',
    isSystem: true,
  },
  {
    id: 'grp-purchase-accounts',
    name: 'Purchase Accounts',
    underGroup: 'Primary',
    nature: 'Expenses',
    affectsGrossProfit: true,
    code: 'PUR-01',
    isSystem: true,
  },
  {
    id: 'grp-direct-expenses',
    name: 'Direct Expenses',
    underGroup: 'Primary',
    nature: 'Expenses',
    affectsGrossProfit: true,
    code: 'DEX-01',
    isSystem: true,
  },
  {
    id: 'grp-indirect-expenses',
    name: 'Indirect Expenses',
    underGroup: 'Primary',
    nature: 'Expenses',
    affectsGrossProfit: false,
    code: 'IEX-01',
    isSystem: true,
  },
];

/**
 * Merge standard accounting groups with any user-defined custom groups.
 */
export function getAllAccountingGroups(customGroups: LedgerGroup[] = []): LedgerGroup[] {
  const customMap = new Map(customGroups.map((g) => [g.name.toLowerCase().trim(), g]));
  const result: LedgerGroup[] = [];

  // Add standard groups (custom version takes priority if name matches)
  for (const std of STANDARD_ACCOUNTING_GROUPS) {
    const key = std.name.toLowerCase().trim();
    if (customMap.has(key)) {
      result.push(customMap.get(key)!);
      customMap.delete(key);
    } else {
      result.push(std);
    }
  }

  // Add remaining user-created custom groups
  for (const remaining of customMap.values()) {
    result.push(remaining);
  }

  return result;
}
