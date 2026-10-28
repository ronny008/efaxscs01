import { NextResponse } from 'next/server';
import { Ledger, CreateLedgerFormValues } from '@/types/erp';
import { validateGSTINFormat, validatePANFormat, validateIFSCFormat } from '@/data/indianStates';

// In-memory store for server-side persistence across dev requests
const serverLedgersStore: Ledger[] = [];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: serverLedgersStore,
    count: serverLedgersStore.length,
  });
}

export async function POST(request: Request) {
  try {
    const body: Partial<CreateLedgerFormValues> & { existingLedgers?: Ledger[] } = await request.json();

    // 1. Basic validation
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Ledger Name is required.', field: 'name' },
        { status: 400 }
      );
    }

    const underGroup = body.underGroup?.trim();
    if (!underGroup) {
      return NextResponse.json(
        { success: false, message: 'Under Group is required.', field: 'underGroup' },
        { status: 400 }
      );
    }

    // 2. Uniqueness validation
    // Combine server-side store with client-provided existingLedgers
    const existingList = body.existingLedgers || serverLedgersStore;
    const isDuplicate = existingList.some(
      (l) => l.name.toLowerCase().trim() === name.toLowerCase()
    );

    if (isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          message: `A ledger account with the name "${name}" already exists in the Chart of Accounts.`,
          field: 'name',
        },
        { status: 409 }
      );
    }

    if (body.code?.trim()) {
      const codeDuplicate = existingList.some(
        (l) => l.code && l.code.toLowerCase().trim() === body.code?.toLowerCase().trim()
      );
      if (codeDuplicate) {
        return NextResponse.json(
          {
            success: false,
            message: `Ledger Code "${body.code.trim()}" is already assigned to another account.`,
            field: 'code',
          },
          { status: 409 }
        );
      }
    }

    // 3. Opening balance validation
    const openingBalance = Number(body.openingBalance) || 0;
    if (openingBalance < 0) {
      return NextResponse.json(
        { success: false, message: 'Opening balance amount must be non-negative (0 or greater).', field: 'openingBalance' },
        { status: 400 }
      );
    }

    // 4. GST & Tax validation (conditional)
    const requiresGSTIN =
      body.gstRegistrationType &&
      ['Regular', 'Composition'].includes(body.gstRegistrationType);

    if (requiresGSTIN && body.gstin?.trim()) {
      const gstinVal = validateGSTINFormat(body.gstin.trim());
      if (!gstinVal.isValid) {
        return NextResponse.json(
          { success: false, message: gstinVal.message || 'Invalid GSTIN format.', field: 'gstin' },
          { status: 400 }
        );
      }

      // Check PAN consistency if PAN is also provided
      if (body.pan?.trim() && gstinVal.pan && body.pan.trim().toUpperCase() !== gstinVal.pan) {
        return NextResponse.json(
          {
            success: false,
            message: `PAN (${body.pan.trim().toUpperCase()}) does not match the PAN embedded within the GSTIN (${gstinVal.pan}).`,
            field: 'pan',
          },
          { status: 400 }
        );
      }
    }

    if (body.pan?.trim()) {
      const panVal = validatePANFormat(body.pan.trim());
      if (!panVal.isValid) {
        return NextResponse.json(
          { success: false, message: panVal.message || 'Invalid PAN format.', field: 'pan' },
          { status: 400 }
        );
      }
    }

    // 5. Bank details validation
    if (body.maintainBankDetails) {
      if (!body.accountNumber?.trim()) {
        return NextResponse.json(
          { success: false, message: 'Bank Account Number is required when banking details are enabled.', field: 'accountNumber' },
          { status: 400 }
        );
      }
      if (body.ifscCode?.trim()) {
        const ifscVal = validateIFSCFormat(body.ifscCode.trim());
        if (!ifscVal.isValid) {
          return NextResponse.json(
            { success: false, message: ifscVal.message || 'Invalid IFSC code format.', field: 'ifscCode' },
            { status: 400 }
          );
        }
      }
    }

    // 6. Build the safe typed Ledger entity
    const newLedger: Ledger = {
      id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      code: body.code?.trim() || undefined,
      underGroup,
      nature: body.nature || 'Asset',
      billByBill: body.billByBill ?? false,
      creditDays: Math.max(0, Number(body.creditDays) || 0),
      creditLimit: Math.max(0, Number(body.creditLimit) || 0),
      address: body.addressLine1?.trim() || undefined,
      phone: body.phone?.trim() || body.mobile?.trim() || undefined,
      addressDetails: {
        addressLine1: body.addressLine1?.trim() || undefined,
        addressLine2: body.addressLine2?.trim() || undefined,
        country: body.country?.trim() || 'India',
        state: body.state?.trim() || 'Kerala',
        district: body.district?.trim() || undefined,
        city: body.city?.trim() || undefined,
        pincode: body.pincode?.trim() || undefined,
      },
      contactDetails: {
        contactPerson: body.contactPerson?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
        mobile: body.mobile?.trim() || undefined,
        whatsapp: body.whatsapp?.trim() || undefined,
        email: body.email?.trim() || undefined,
        website: body.website?.trim() || undefined,
      },
      gstRegistrationType: body.gstRegistrationType || 'Regular',
      gstin: body.gstin?.trim() ? body.gstin.trim().toUpperCase() : undefined,
      pan: body.pan?.trim()
        ? body.pan.trim().toUpperCase()
        : body.gstin?.trim() && body.gstin.trim().length >= 12
        ? body.gstin.trim().substring(2, 12).toUpperCase()
        : undefined,
      bankDetails: body.maintainBankDetails
        ? {
            maintainBankDetails: true,
            accountHolderName: body.accountHolderName?.trim() || name,
            bankName: body.bankName?.trim() || undefined,
            branchName: body.branchName?.trim() || undefined,
            accountNumber: body.accountNumber?.trim() || undefined,
            ifscCode: body.ifscCode?.trim() ? body.ifscCode.trim().toUpperCase() : undefined,
            accountType: body.accountType || 'Current',
          }
        : { maintainBankDetails: false },
      openingBalance,
      balanceType: body.balanceType || (body.nature === 'Asset' || body.nature === 'Expenses' ? 'Dr' : 'Cr'),
      openingBills: Array.isArray(body.openingBills) ? body.openingBills : undefined,
      status: body.status || 'Active',
      notes: body.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    serverLedgersStore.unshift(newLedger);

    return NextResponse.json(
      {
        success: true,
        message: `Ledger "${newLedger.name}" created successfully.`,
        data: newLedger,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('API Error in POST /api/ledgers:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred while saving the ledger.',
      },
      { status: 500 }
    );
  }
}
