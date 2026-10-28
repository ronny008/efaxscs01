import { Ledger, LedgerGroup, CreateLedgerFormValues } from '../types/erp';
import { getAllAccountingGroups } from '../data/standardGroups';

export interface CreateLedgerResponse {
  success: boolean;
  message: string;
  data?: Ledger;
  field?: string;
}

export class LedgerApiService {
  /**
   * Fetch all ledger groups from API, falling back to local/standard groups
   */
  static async getLedgerGroups(localCustomGroups: LedgerGroup[] = []): Promise<LedgerGroup[]> {
    try {
      const res = await fetch('/api/ledger-groups', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return getAllAccountingGroups([...localCustomGroups, ...json.data]);
        }
      }
    } catch (err) {
      console.warn('Could not reach /api/ledger-groups, using local standard groups:', err);
    }
    return getAllAccountingGroups(localCustomGroups);
  }

  /**
   * Save a newly created ledger via POST /api/ledgers
   */
  static async saveLedger(
    formData: CreateLedgerFormValues,
    existingLedgers: Ledger[]
  ): Promise<CreateLedgerResponse> {
    try {
      const res = await fetch('/api/ledgers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          existingLedgers,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: json.message || `Server responded with status ${res.status}`,
          field: json.field,
        };
      }

      return {
        success: true,
        message: json.message || 'Ledger created successfully.',
        data: json.data,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error: Unable to reach server';
      return {
        success: false,
        message: errorMsg,
      };
    }
  }
}
