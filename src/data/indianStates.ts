export interface IndianState {
  code: string;
  name: string;
  type: 'State' | 'Union Territory';
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir', type: 'Union Territory' },
  { code: '02', name: 'Himachal Pradesh', type: 'State' },
  { code: '03', name: 'Punjab', type: 'State' },
  { code: '04', name: 'Chandigarh', type: 'Union Territory' },
  { code: '05', name: 'Uttarakhand', type: 'State' },
  { code: '06', name: 'Haryana', type: 'State' },
  { code: '07', name: 'Delhi', type: 'Union Territory' },
  { code: '08', name: 'Rajasthan', type: 'State' },
  { code: '09', name: 'Uttar Pradesh', type: 'State' },
  { code: '10', name: 'Bihar', type: 'State' },
  { code: '11', name: 'Sikkim', type: 'State' },
  { code: '12', name: 'Arunachal Pradesh', type: 'State' },
  { code: '13', name: 'Nagaland', type: 'State' },
  { code: '14', name: 'Manipur', type: 'State' },
  { code: '15', name: 'Mizoram', type: 'State' },
  { code: '16', name: 'Tripura', type: 'State' },
  { code: '17', name: 'Meghalaya', type: 'State' },
  { code: '18', name: 'Assam', type: 'State' },
  { code: '19', name: 'West Bengal', type: 'State' },
  { code: '20', name: 'Jharkhand', type: 'State' },
  { code: '21', name: 'Odisha', type: 'State' },
  { code: '22', name: 'Chhattisgarh', type: 'State' },
  { code: '23', name: 'Madhya Pradesh', type: 'State' },
  { code: '24', name: 'Gujarat', type: 'State' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'Union Territory' },
  { code: '27', name: 'Maharashtra', type: 'State' },
  { code: '28', name: 'Andhra Pradesh', type: 'State' },
  { code: '29', name: 'Karnataka', type: 'State' },
  { code: '30', name: 'Goa', type: 'State' },
  { code: '31', name: 'Lakshadweep', type: 'Union Territory' },
  { code: '32', name: 'Kerala', type: 'State' },
  { code: '33', name: 'Tamil Nadu', type: 'State' },
  { code: '34', name: 'Puducherry', type: 'Union Territory' },
  { code: '35', name: 'Andaman and Nicobar Islands', type: 'Union Territory' },
  { code: '36', name: 'Telangana', type: 'State' },
  { code: '37', name: 'Andhra Pradesh (New)', type: 'State' },
  { code: '38', name: 'Ladakh', type: 'Union Territory' },
  { code: '97', name: 'Other Territory', type: 'Union Territory' },
];

/**
 * Validate standard 15-character Indian GSTIN format
 * Structure: 2-digit state code + 10-char PAN + 1 entity num + 'Z' + 1 checksum char
 */
export function validateGSTINFormat(gstin: string): {
  isValid: boolean;
  message?: string;
  stateCode?: string;
  pan?: string;
} {
  const clean = gstin.trim().toUpperCase();
  if (!clean) {
    return { isValid: false, message: 'GSTIN is required' };
  }
  if (clean.length !== 15) {
    return { isValid: false, message: `GSTIN must be exactly 15 characters (currently ${clean.length})` };
  }

  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(clean)) {
    return {
      isValid: false,
      message: 'Invalid GSTIN structure (Expected format: 2-digit State + 10-char PAN + 1 Entity + Z + Checksum)',
    };
  }

  const stateCode = clean.substring(0, 2);
  const pan = clean.substring(2, 12);

  const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);
  if (!matchedState) {
    return { isValid: false, message: `State code "${stateCode}" in GSTIN is invalid.` };
  }

  return { isValid: true, stateCode, pan };
}

/**
 * Validate 10-character Indian PAN format (5 letters + 4 digits + 1 letter)
 */
export function validatePANFormat(pan: string): { isValid: boolean; message?: string } {
  const clean = pan.trim().toUpperCase();
  if (!clean) {
    return { isValid: false, message: 'PAN is required' };
  }
  if (clean.length !== 10) {
    return { isValid: false, message: `PAN must be exactly 10 characters (currently ${clean.length})` };
  }
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!regex.test(clean)) {
    return { isValid: false, message: 'Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)' };
  }
  return { isValid: true };
}

/**
 * Validate 11-character Indian Bank IFSC code format (4 letters + '0' + 6 alphanumeric)
 */
export function validateIFSCFormat(ifsc: string): { isValid: boolean; message?: string } {
  const clean = ifsc.trim().toUpperCase();
  if (!clean) {
    return { isValid: false, message: 'IFSC is required' };
  }
  if (clean.length !== 11) {
    return { isValid: false, message: `IFSC must be exactly 11 characters (currently ${clean.length})` };
  }
  const regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!regex.test(clean)) {
    return { isValid: false, message: 'Invalid IFSC format. 4 letters, 5th character 0, followed by 6 alphanumeric characters (e.g. SBIN0001234)' };
  }
  return { isValid: true };
}

/**
 * Validate 6-digit Indian Postal PIN Code
 */
export function validatePincodeFormat(pin: string): { isValid: boolean; message?: string } {
  const clean = pin.trim();
  if (!clean) return { isValid: true }; // optional
  const regex = /^[1-9][0-9]{5}$/;
  if (!regex.test(clean)) {
    return { isValid: false, message: 'PIN code must be a valid 6-digit Indian postal code' };
  }
  return { isValid: true };
}

/**
 * Format currency into Indian Rupees (INR) format (e.g. ₹ 1,23,456.00)
 */
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
