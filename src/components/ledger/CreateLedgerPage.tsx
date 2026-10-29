"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import styles from "./CreateLedger.module.css";
import {
  Ledger,
  LedgerGroup,
  NatureGroup,
  GSTRegistrationType,
  AccountType,
  CreateLedgerFormValues,
  OpeningBalanceBill,
} from "../../types/erp";
import { INDIAN_STATES, validateGSTINFormat, validatePANFormat, validateIFSCFormat, validatePincodeFormat, formatINR } from "../../data/indianStates";
import { getAllAccountingGroups } from "../../data/standardGroups";
import { LedgerApiService } from "../../services/ledgerService";
import {
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  ListFilter,
  Plus,
} from "lucide-react";

export type LedgerSectionTab = "basic" | "address" | "tax_bank" | "balance";

export interface TabDefinition {
  id: LedgerSectionTab;
  letter: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;
}

export const LEDGER_TABS: TabDefinition[] = [
  { id: "basic", letter: "1", label: "Basics", shortLabel: "Basics", icon: Building2 },
  { id: "address", letter: "2", label: "Contact", shortLabel: "Contact", icon: MapPin },
  { id: "tax_bank", letter: "3", label: "Tax & bank", shortLabel: "Tax & bank", icon: FileText },
  { id: "balance", letter: "4", label: "Balance", shortLabel: "Balance", icon: Wallet },
];

interface CreateLedgerPageProps {
  onBack: () => void;
  onSuccess?: (newLedger: Ledger) => void;
  existingGroups?: LedgerGroup[];
  existingLedgers?: Ledger[];
}

const INITIAL_FORM_STATE: CreateLedgerFormValues = {
  name: "",
  code: "",
  underGroup: "Sundry Debtors",
  nature: "Asset",
  billByBill: true,
  creditDays: 30,
  creditLimit: 0,
  // Address
  addressLine1: "",
  addressLine2: "",
  country: "India",
  state: "Kerala",
  district: "Ernakulam",
  city: "Kochi",
  pincode: "",
  // Contact
  contactPerson: "",
  phone: "",
  mobile: "",
  whatsapp: "",
  email: "",
  website: "",
  // GST & Tax
  gstRegistrationType: "Regular",
  gstin: "",
  pan: "",
  // Banking
  maintainBankDetails: false,
  accountHolderName: "",
  bankName: "",
  branchName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  accountType: "Current",
  // Opening Balance
  openingBalance: 0,
  balanceType: "Dr",
  // Additional
  status: "Active",
  notes: "",
};

export default function CreateLedgerPage({
  onBack,
  onSuccess,
  existingGroups = [],
  existingLedgers = [],
}: CreateLedgerPageProps) {
  // Form Data State
  const [formData, setFormData] = useState<CreateLedgerFormValues>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Tab-by-tab state
  const [activeTab, setActiveTab] = useState<LedgerSectionTab>("basic");
  const [viewMode, setViewMode] = useState<"tabbed" | "all">("tabbed");

  // UI / UX helpers
  const [showConfirmBackModal, setShowConfirmBackModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdLedger, setCreatedLedger] = useState<Ledger | null>(null);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showAddressLine2, setShowAddressLine2] = useState<boolean>(() => Boolean(formData.addressLine2?.trim()));
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  // Opening Balance Bill-by-Bill State (Matching Photo 1)
  const [openingBills, setOpeningBills] = useState<{
    id: string;
    billNo: string;
    billDate: string;
    dueDate: string;
    amount: string | number;
    balanceType: "Dr" | "Cr";
  }[]>([
    {
      id: "bill-1",
      billNo: "",
      billDate: "",
      dueDate: "",
      amount: "",
      balanceType: "Dr",
    },
  ]);

    // Set initial bill date on client mount to avoid Next.js unstable prerender error
  useEffect(() => {
    setOpeningBills((prev) =>
      prev.map((b) => (b.billDate ? b : { ...b, billDate: new Date().toISOString().split("T")[0] }))
    );
  }, []);

  const handleAddBillRow = () => {
    setIsDirty(true);
    setOpeningBills((prev) => [
      ...prev,
      {
        id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        billNo: "",
        billDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        amount: "",
        balanceType: formData.balanceType || "Dr",
      },
    ]);
  };

  const handleRemoveBillRow = (id: string) => {
    setIsDirty(true);
    if (openingBills.length === 1) {
      setOpeningBills([
        {
          id: `bill-${Date.now()}`,
          billNo: "",
          billDate: new Date().toISOString().split("T")[0],
          dueDate: "",
          amount: "",
          balanceType: formData.balanceType || "Dr",
        },
      ]);
      return;
    }
    setOpeningBills((prev) => prev.filter((b) => b.id !== id));
  };

  const handleUpdateBillRow = (
    id: string,
    field: "billNo" | "billDate" | "dueDate" | "amount" | "balanceType",
    value: any
  ) => {
    setIsDirty(true);
    setOpeningBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const billTotals = useMemo(() => {
    let totalDr = 0;
    let totalCr = 0;
    let validCount = 0;

    openingBills.forEach((b) => {
      const amt = parseFloat(String(b.amount)) || 0;
      if (amt > 0) {
        validCount++;
        if (b.balanceType === "Dr") totalDr += amt;
        else totalCr += amt;
      }
    });

    const net = totalDr - totalCr;
    const netAmount = Math.abs(net);
    const netType: "Dr" | "Cr" = net >= 0 ? "Dr" : "Cr";

    return {
      totalDr,
      totalCr,
      netAmount,
      netType,
      validCount,
    };
  }, [openingBills]);

  // Keep formData.openingBalance and balanceType in sync with bills
  useEffect(() => {
    if (billTotals.validCount > 0) {
      setFormData((prev) => ({
        ...prev,
        openingBalance: billTotals.netAmount,
        balanceType: billTotals.netType,
        openingBills: openingBills
          .filter((b) => (parseFloat(String(b.amount)) || 0) > 0 || b.billNo.trim())
          .map((b) => ({
            id: b.id,
            billNo: b.billNo.trim(),
            billDate: b.billDate,
            dueDate: b.dueDate,
            amount: parseFloat(String(b.amount)) || 0,
            balanceType: b.balanceType,
          })),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        openingBills: openingBills
          .filter((b) => b.billNo.trim() || (parseFloat(String(b.amount)) || 0) > 0)
          .map((b) => ({
            id: b.id,
            billNo: b.billNo.trim(),
            billDate: b.billDate,
            dueDate: b.dueDate,
            amount: parseFloat(String(b.amount)) || 0,
            balanceType: b.balanceType,
          })),
      }));
    }
  }, [billTotals, openingBills]);

  // Refs for focusing first invalid field
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  // Tab index & navigation helpers
  const currentTabIndex = LEDGER_TABS.findIndex((t) => t.id === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === LEDGER_TABS.length - 1;
  const prevTab = !isFirstTab ? LEDGER_TABS[currentTabIndex - 1] : null;
  const nextTab = !isLastTab ? LEDGER_TABS[currentTabIndex + 1] : null;

  // Track completion per tab
  const tabCompletionStatus = useMemo(() => {
    return {
      basic: Boolean(formData.name.trim() && formData.underGroup.trim()),
      address: Boolean(formData.addressLine1.trim() || formData.city.trim() || formData.mobile.trim() || formData.email.trim()),
      tax_bank: Boolean(
        formData.gstRegistrationType !== "Regular" ||
        formData.gstin.trim() ||
        formData.pan.trim() ||
        !formData.maintainBankDetails ||
        (formData.accountNumber.trim() && formData.confirmAccountNumber.trim())
      ),
      balance: Boolean(formData.openingBalance > 0),
    };
  }, [formData]);

  // Tab error counter
  const tabErrorCounts = useMemo(() => {
    const counts: Record<LedgerSectionTab, number> = {
      basic: 0,
      address: 0,
      tax_bank: 0,
      balance: 0,
    };
    const basicFields = ["name", "code", "underGroup", "creditDays", "creditLimit"];
    const addressFields = ["addressLine1", "addressLine2", "country", "state", "city", "pincode", "contactPerson", "mobile", "whatsapp", "email"];
    const taxBankFields = ["gstRegistrationType", "gstin", "pan", "accountNumber", "confirmAccountNumber", "ifscCode", "accountHolderName", "bankName", "branchName"];
    const balanceFields = ["openingBalance", "balanceType"];

    Object.keys(formErrors).forEach((field) => {
      if (basicFields.includes(field)) counts.basic++;
      else if (addressFields.includes(field)) counts.address++;
      else if (taxBankFields.includes(field)) counts.tax_bank++;
      else if (balanceFields.includes(field)) counts.balance++;
    });
    return counts;
  }, [formErrors]);

  const getTabForField = (field: string): LedgerSectionTab => {
    if (["name", "code", "underGroup", "creditDays", "creditLimit"].includes(field)) return "basic";
    if (["addressLine1", "addressLine2", "country", "state", "city", "pincode", "contactPerson", "mobile", "whatsapp", "email"].includes(field)) return "address";
    if (["gstRegistrationType", "gstin", "pan", "accountNumber", "confirmAccountNumber", "ifscCode", "accountHolderName", "bankName", "branchName"].includes(field)) return "tax_bank";
    if (["openingBalance", "balanceType"].includes(field)) return "balance";
    return "basic";
  };

  const handleNextSection = () => {
    if (activeTab === "basic" && !formData.name.trim()) {
      setFormErrors((prev) => ({ ...prev, name: "Ledger Name is required before proceeding." }));
      if (fieldRefs.current.name) fieldRefs.current.name.focus();
      return;
    }
    if (activeTab === "tax_bank" && isGSTINApplicable) {
      if (!formData.gstin.trim()) {
        setFormErrors((prev) => ({ ...prev, gstin: "GSTIN is mandatory for Regular and Composition registration." }));
        if (fieldRefs.current.gstin) fieldRefs.current.gstin.focus();
        return;
      }
      const gstinVal = validateGSTINFormat(formData.gstin.trim());
      if (!gstinVal.isValid) {
        setFormErrors((prev) => ({ ...prev, gstin: gstinVal.message || "Invalid 15-character GSTIN format." }));
        if (fieldRefs.current.gstin) fieldRefs.current.gstin.focus();
        return;
      }
    }
    if (nextTab) {
      setActiveTab(nextTab.id);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handlePrevSection = () => {
    if (prevTab) {
      setActiveTab(prevTab.id);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  // Merge standard accounting groups with any custom groups from props/API
  const allGroups = useMemo(() => {
    return getAllAccountingGroups(existingGroups);
  }, [existingGroups]);

  // Filtered groups for searchable dropdown
  const filteredGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return allGroups;
    const q = groupSearchQuery.toLowerCase().trim();
    return allGroups.filter(
      (g) => g.name.toLowerCase().includes(q) || g.nature.toLowerCase().includes(q)
    );
  }, [allGroups, groupSearchQuery]);

  // Auto-inherit nature & default Dr/Cr when Under Group changes
  const handleGroupChange = (groupName: string) => {
    setIsDirty(true);
    const matched = allGroups.find((g) => g.name === groupName);
    const nature: NatureGroup = matched ? matched.nature : "Asset";
    const defaultBalanceType: "Dr" | "Cr" = nature === "Asset" || nature === "Expenses" ? "Dr" : "Cr";

    // Auto-enable bill-by-bill for Sundry Debtors and Sundry Creditors
    const isDebtorOrCreditor = groupName === "Sundry Debtors" || groupName === "Sundry Creditors";

    setFormData((prev) => ({
      ...prev,
      underGroup: groupName,
      nature,
      balanceType: defaultBalanceType,
      billByBill: isDebtorOrCreditor ? true : prev.billByBill,
    }));

    if (formErrors.underGroup) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.underGroup;
        return next;
      });
    }
  };

  // Auto-generate Ledger Code
  const handleGenerateCode = () => {
    setIsDirty(true);
    const prefix = formData.underGroup === "Sundry Debtors" ? "DEB" : formData.underGroup === "Sundry Creditors" ? "CRE" : "LED";
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({
      ...prev,
      code: `${prefix}-${randomNum}`,
    }));
  };

  // Sync WhatsApp with Mobile if checkbox checked
  const [sameAsMobile, setSameAsMobile] = useState(false);
  const handleMobileChange = (val: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      mobile: val,
      whatsapp: sameAsMobile ? val : prev.whatsapp,
    }));
  };

  const handleToggleSameAsMobile = (checked: boolean) => {
    setSameAsMobile(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        whatsapp: prev.mobile,
      }));
    }
  };

  // GST Registration Type conditional logic
  const isGSTINApplicable = useMemo(() => {
    return ["Regular", "Composition"].includes(formData.gstRegistrationType);
  }, [formData.gstRegistrationType]);

  // Live GSTIN validation and PAN auto-extraction
  const gstinValidation = useMemo(() => {
    if (!formData.gstin.trim()) return null;
    return validateGSTINFormat(formData.gstin);
  }, [formData.gstin]);

  const handleGSTINChange = (raw: string) => {
    setIsDirty(true);
    const upper = raw.toUpperCase().trim();
    let autoPan = formData.pan;
    let autoState = formData.state;

    // If valid or partially valid 15-char GSTIN, auto-extract PAN (chars 3 to 12)
    if (upper.length >= 12) {
      const extractedPan = upper.substring(2, 12);
      const panCheck = validatePANFormat(extractedPan);
      if (panCheck.isValid && !formData.pan) {
        autoPan = extractedPan;
      }
    }

    // Auto-detect State from first 2 digits
    if (upper.length >= 2) {
      const stateCode = upper.substring(0, 2);
      const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);
      if (matchedState) {
        autoState = matchedState.name;
      }
    }

    setFormData((prev) => ({
      ...prev,
      gstin: upper,
      pan: autoPan,
      state: autoState,
    }));

    if (formErrors.gstin) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.gstin;
        return next;
      });
    }
  };

  // Validate form fields comprehensively
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Ledger Name
    if (!formData.name.trim()) {
      errors.name = "Ledger Name is required.";
    } else {
      const duplicate = existingLedgers.some(
        (l) => l.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
      );
      if (duplicate) {
        errors.name = `A ledger named "${formData.name.trim()}" already exists in the Chart of Accounts.`;
      }
    }

    // 2. Under Group
    if (!formData.underGroup.trim()) {
      errors.underGroup = "Please select a valid parent Ledger Group.";
    }

    // 3. Credit Days & Limit
    if (formData.creditDays < 0 || !Number.isInteger(Number(formData.creditDays))) {
      errors.creditDays = "Credit days must be a non-negative whole integer.";
    }
    if (formData.creditLimit < 0) {
      errors.creditLimit = "Credit limit cannot be negative.";
    }

    // 4. Contact validation
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "Please enter a valid email address (e.g. accounts@company.com).";
      }
    }
    if (formData.pincode.trim()) {
      const pinVal = validatePincodeFormat(formData.pincode.trim());
      if (!pinVal.isValid) {
        errors.pincode = pinVal.message || "Invalid 6-digit PIN code.";
      }
    }

    // 5. GSTIN & PAN validation
    if (isGSTINApplicable) {
      if (!formData.gstin.trim()) {
        errors.gstin = "GSTIN is mandatory for Regular and Composition registration.";
      } else {
        const gstinVal = validateGSTINFormat(formData.gstin.trim());
        if (!gstinVal.isValid) {
          errors.gstin = gstinVal.message || "Invalid GSTIN format.";
        } else {
          // State code mismatch check
          const selectedStateObj = INDIAN_STATES.find((s) => s.name === formData.state);
          if (selectedStateObj && gstinVal.stateCode !== selectedStateObj.code) {
            errors.gstin = `GSTIN state code (${gstinVal.stateCode}) does not match selected State "${formData.state}" (${selectedStateObj.code}).`;
          }
        }
      }
    }

    if (formData.pan.trim()) {
      const panVal = validatePANFormat(formData.pan.trim());
      if (!panVal.isValid) {
        errors.pan = panVal.message || "Invalid PAN format (e.g. ABCDE1234F).";
      } else if (isGSTINApplicable && formData.gstin.trim() && formData.gstin.length >= 12) {
        const gstinPan = formData.gstin.substring(2, 12).toUpperCase();
        if (formData.pan.trim().toUpperCase() !== gstinPan) {
          errors.pan = `PAN does not match the PAN embedded within the GSTIN (${gstinPan}).`;
        }
      }
    }

    // 6. Banking details validation
    if (formData.maintainBankDetails) {
      if (!formData.accountNumber.trim()) {
        errors.accountNumber = "Account Number is required when banking details are enabled.";
      }
      if (!formData.confirmAccountNumber.trim()) {
        errors.confirmAccountNumber = "Please confirm the account number.";
      } else if (formData.accountNumber.trim() !== formData.confirmAccountNumber.trim()) {
        errors.confirmAccountNumber = "Account number confirmation does not match.";
      }

      if (formData.ifscCode.trim()) {
        const ifscVal = validateIFSCFormat(formData.ifscCode.trim());
        if (!ifscVal.isValid) {
          errors.ifscCode = ifscVal.message || "Invalid IFSC format.";
        }
      }
    }

    // 7. Opening Balance validation
    if (formData.openingBalance < 0) {
      errors.openingBalance = "Opening balance cannot be negative.";
    }

    setFormErrors(errors);

    // Focus the first invalid field and jump to its section tab
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstField = errorKeys[0];
      const targetTab = getTabForField(firstField);
      setActiveTab(targetTab);
      setTimeout(() => {
        const el = fieldRefs.current[firstField];
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return false;
    }

    return true;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await LedgerApiService.saveLedger(formData, existingLedgers);

      if (!response.success) {
        setServerError(response.message || "Failed to create ledger. Please verify your inputs.");
        if (response.field) {
          const invalidFieldName = response.field;
          setFormErrors((prev) => ({
            ...prev,
            [invalidFieldName]: response.message,
          }));
          const targetTab = getTabForField(invalidFieldName);
          setActiveTab(targetTab);
          setTimeout(() => {
            const el = fieldRefs.current[invalidFieldName];
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 50);
        }
        setIsSubmitting(false);
        return;
      }

      // Success
      if (response.data) {
        setCreatedLedger(response.data);
        setSuccessMessage(`Ledger "${response.data.name}" created successfully in the Chart of Accounts.`);
        setIsDirty(false);
        if (onSuccess) {
          onSuccess(response.data);
        }
      }
    } catch (err: unknown) {
      console.error("Save Ledger Error:", err);
      setServerError(err instanceof Error ? err.message : "An unexpected server error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form handler
  const handleResetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setFormErrors({});
    setServerError(null);
    setSuccessMessage(null);
    setCreatedLedger(null);
    setShowAddressLine2(false);
    setOpeningBills([
      {
        id: "bill-1",
        billNo: "",
        billDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        amount: "",
        balanceType: "Dr",
      },
    ]);
    setIsDirty(false);
    setShowResetModal(false);
  };

  // Back button handler with unsaved changes check
  const handleBackClick = () => {
    if (isDirty) {
      setShowConfirmBackModal(true);
    } else {
      onBack();
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* -------------------------------------------------------------
          HEADER & BREADCRUMBS
          ------------------------------------------------------------- */}
      <div className={styles.headerSection}>
        <div className={styles.topRow}>
          <div className={styles.breadcrumbs}>
            <button type="button" onClick={onBack} className={styles.breadcrumbLink}>
              Dashboard
            </button>
            <span className={styles.breadcrumbSeparator}>/</span>
            <button type="button" onClick={onBack} className={styles.breadcrumbLink}>
              Ledgers
            </button>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>Create Ledger</span>
          </div>

          <button
            type="button"
            id="btn-back-to-ledgers"
            onClick={handleBackClick}
            className={styles.backBtn}
            title="Return to Ledgers List"
          >
            <ArrowLeft size={15} />
            <span>Back to Ledgers</span>
          </button>
        </div>

        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>
            <Building2 size={24} color="var(--primary-600)" />
            <span>Create Ledger</span>
          </h1>
          <p className={styles.pageSubtitle}>
            Create and configure a master ledger account for your business, compliant with Indian GST & Statutory ERP rules.
          </p>
        </div>
      </div>

      {/* -------------------------------------------------------------
          NOTIFICATIONS (SUCCESS & ERROR BANNERS)
          ------------------------------------------------------------- */}
      {successMessage && createdLedger && (
        <div className={styles.alertSuccess} role="alert">
          <CheckCircle2 size={20} color="#15803d" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <strong>Ledger Created Successfully!</strong>
            <p style={{ margin: "4px 0 0 0" }}>{successMessage}</p>
            <div className={styles.alertActions}>
              <button type="button" onClick={onBack} className={styles.alertBtn}>
                View in Ledgers Master
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(INITIAL_FORM_STATE);
                  setSuccessMessage(null);
                  setCreatedLedger(null);
                  setIsDirty(false);
                }}
                className={styles.alertBtnSecondary}
              >
                + Create Another Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {serverError && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Unable to Save Ledger</strong>
            <p style={{ margin: "4px 0 0 0" }}>{serverError}</p>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB-BY-TAB SECTION CONTROLLER
          ------------------------------------------------------------- */}
      <div className={styles.tabNavContainer}>
        <div className={styles.tabNavTop}>
          <div className={styles.tabStepIndicator}>
            <span className={styles.tabStepBadge}>
              Section {LEDGER_TABS[currentTabIndex]?.letter} of {LEDGER_TABS.length}
            </span>
            <span>{LEDGER_TABS[currentTabIndex]?.label}</span>
            <div className={styles.tabProgressBar} title={`Progress: ${Math.round(((currentTabIndex + 1) / LEDGER_TABS.length) * 100)}%`}>
              <div
                className={styles.tabProgressFill}
                style={{ width: `${((currentTabIndex + 1) / LEDGER_TABS.length) * 100}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewMode((m) => (m === "tabbed" ? "all" : "tabbed"))}
            className={styles.viewModeToggle}
            title={viewMode === "tabbed" ? "Switch to single long scrollable page" : "Switch to tap-by-tap tabs"}
          >
            {viewMode === "tabbed" ? (
              <>
                <Layers size={14} />
                <span>View All Sections</span>
              </>
            ) : (
              <>
                <ListFilter size={14} />
                <span>Tap by Tap Tabs</span>
              </>
            )}
          </button>
        </div>

        <div className={styles.tabList} role="tablist" aria-label="Ledger Form Sections">
          {LEDGER_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            const errorCount = tabErrorCounts[tab.id];
            const isCompleted = tabCompletionStatus[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                id={`tab-btn-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (viewMode === "all") setViewMode("tabbed");
                }}
                className={`${styles.tabButton} ${isActive && viewMode === "tabbed" ? styles.tabButtonActive : ""}`}
              >
                <span className={styles.tabLetterBadge}>{tab.letter}</span>
                <TabIcon size={14} />
                <span>{tab.shortLabel}</span>
                {errorCount > 0 ? (
                  <span className={styles.tabErrorBadge} title={`${errorCount} issue(s) need attention`}>
                    {errorCount}
                  </span>
                ) : isCompleted ? (
                  <span className={styles.tabSuccessDot} title="Section filled">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          CREATE LEDGER FORM
          ------------------------------------------------------------- */}
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {/* =========================================================
            SECTION A: BASIC INFORMATION
            ========================================================= */}
        {(viewMode === "all" || activeTab === "basic") && (
          <div className={`${styles.sectionCard} ${viewMode === "tabbed" ? styles.tabPane : ""}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIconBadge}>
                <Building2 size={18} />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Basic Information</h2>
                <p className={styles.sectionSubtitle}>Primary account identity, hierarchy group, and credit parameters</p>
              </div>
            </div>
            <span className={styles.sectionBadge}>Section A</span>
          </div>

          <div className={styles.gridTwoCol}>
            {/* Ledger Name */}
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="field-ledger-name">
                  Ledger Name <span className={styles.requiredAsterisk}>*</span>
                </label>
                <span className={styles.labelHint}>Official business or account name</span>
              </div>
              <input
                id="field-ledger-name"
                ref={(el) => { fieldRefs.current.name = el; }}
                type="text"
                required
                placeholder="e.g. Apex Exports Pvt Ltd / Factory Electricity"
                value={formData.name}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                  }
                }}
                className={`${styles.input} ${formErrors.name ? styles.inputError : ""}`}
                autoFocus
              />
              {formErrors.name ? (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {formErrors.name}
                </span>
              ) : (
                <span className={styles.helperText}>Unique title for reports, vouchers, and invoicing.</span>
              )}
            </div>

            {/* Ledger Code */}
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="field-ledger-code">
                  Ledger Code <span className={styles.labelHint}>(Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className={styles.inlineActionBtn}
                  title="Generate alphanumeric code"
                >
                  <Sparkles size={12} /> Auto Generate
                </button>
              </div>
              <input
                id="field-ledger-code"
                ref={(el) => { fieldRefs.current.code = el; }}
                type="text"
                placeholder="e.g. DEB-1042"
                value={formData.code}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, code: e.target.value });
                }}
                className={`${styles.input} ${formErrors.code ? styles.inputError : ""}`}
              />
              {formErrors.code ? (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {formErrors.code}
                </span>
              ) : (
                <span className={styles.helperText}>Used for rapid keyboard entry in journal vouchers.</span>
              )}
            </div>
          </div>

          <div className={styles.gridTwoCol} style={{ marginTop: 18 }}>
            {/* Under Group */}
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="field-under-group">
                  Under Group <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div
                  className={`${styles.naturePreview} ${
                    formData.nature === "Asset"
                      ? styles.natureAsset
                      : formData.nature === "Expenses"
                      ? styles.natureExpenses
                      : formData.nature === "Income"
                      ? styles.natureIncome
                      : styles.natureLiability
                  }`}
                >
                  ● Nature: {formData.nature}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <input
                  type="text"
                  placeholder="Type to filter groups (e.g. Bank, Debtors)..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  className={styles.input}
                  style={{ height: 32, fontSize: 12 }}
                />
                {groupSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setGroupSearchQuery("")}
                    className={styles.inlineActionBtn}
                  >
                    Clear
                  </button>
                )}
              </div>
              <select
                id="field-under-group"
                ref={(el) => { fieldRefs.current.underGroup = el; }}
                value={formData.underGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                className={`${styles.select} ${formErrors.underGroup ? styles.inputError : ""}`}
              >
                {filteredGroups.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name} ({g.nature})
                  </option>
                ))}
              </select>
              {formErrors.underGroup ? (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {formErrors.underGroup}
                </span>
              ) : (
                <span className={styles.helperText}>
                  Automatically links the account to Balance Sheet or P&L classification.
                </span>
              )}
            </div>

            {/* Bill-by-Bill Tracking Switch */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Bill-by-Bill Tracking</label>
              <div
                className={styles.switchContainer}
                onClick={() => {
                  setIsDirty(true);
                  setFormData((prev) => ({ ...prev, billByBill: !prev.billByBill }));
                }}
              >
                <div className={`${styles.switchTrack} ${formData.billByBill ? styles.switchTrackActive : ""}`}>
                  <div className={`${styles.switchThumb} ${formData.billByBill ? styles.switchThumbActive : ""}`} />
                </div>
                <div className={styles.switchContent}>
                  <span className={styles.switchTitle}>
                    {formData.billByBill ? "Bill-by-Bill Tracking Enabled" : "Lump-Sum Tracking"}
                  </span>
                  <span className={styles.switchDesc}>
                    {formData.billByBill
                      ? "Track individual invoices, credit days, and payment receipts"
                      : "Standard ledger tracking without invoice-wise matching"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Terms (Conditional if Bill-by-Bill is enabled or relevant) */}
          <div className={styles.gridTwoCol} style={{ marginTop: 18 }}>
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="field-credit-days">
                  Credit Days
                </label>
                <span className={styles.labelHint}>Grace payment window</span>
              </div>
              <div className={styles.inputWrapper}>
                <input
                  id="field-credit-days"
                  ref={(el) => { fieldRefs.current.creditDays = el; }}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={formData.creditDays}
                  onChange={(e) => {
                    setIsDirty(true);
                    setFormData({ ...formData, creditDays: Math.max(0, parseInt(e.target.value) || 0) });
                  }}
                  className={`${styles.input} ${styles.inputWithSuffix} ${formErrors.creditDays ? styles.inputError : ""}`}
                />
                <span className={styles.inputSuffix}>Days</span>
              </div>
              {formErrors.creditDays && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {formErrors.creditDays}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="field-credit-limit">
                  Credit Limit
                </label>
                <span className={styles.labelHint}>
                  {formData.creditLimit > 0 ? formatINR(formData.creditLimit) : "No Limit (₹0.00)"}
                </span>
              </div>
              <div className={styles.inputWrapper}>
                <span className={styles.inputPrefix}>₹</span>
                <input
                  id="field-credit-limit"
                  ref={(el) => { fieldRefs.current.creditLimit = el; }}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.creditLimit || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setFormData({ ...formData, creditLimit: Math.max(0, parseFloat(e.target.value) || 0) });
                  }}
                  className={`${styles.input} ${styles.inputWithPrefix} ${formErrors.creditLimit ? styles.inputError : ""}`}
                />
              </div>
              {formErrors.creditLimit && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {formErrors.creditLimit}
                </span>
              )}
            </div>
          </div>

          {viewMode === "tabbed" && (
            <div className={styles.sectionNavFooter}>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <span className={styles.tabStepBadge}>Section A of 5</span>
                Primary identity & group parameters
              </span>
              <button
                type="button"
                onClick={handleNextSection}
                className={`${styles.btnStepNav} ${styles.btnStepNavNext}`}
              >
                <span>Next: Address & Contact</span>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
        )}

        {/* =========================================================
            SECTION B: CONTACT AND ADDRESS DETAILS
            ========================================================= */}
        {(viewMode === "all" || activeTab === "address") && (
          <div className={`${styles.sectionCard} ${viewMode === "tabbed" ? styles.tabPane : ""}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIconBadge}>
                <MapPin size={18} />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Contact & Address Details</h2>
                <p className={styles.sectionSubtitle}>Place of supply, state code for GST, and communication coordinates</p>
              </div>
            </div>
            <span className={styles.sectionBadge}>Section B</span>
          </div>

          <div className={showAddressLine2 ? styles.gridTwoCol : undefined}>
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="field-address-line1">
                  Address Line 1
                </label>
                {!showAddressLine2 && (
                  <button
                    type="button"
                    onClick={() => setShowAddressLine2(true)}
                    className={styles.inlineActionBtn}
                    title="Add additional address line"
                  >
                    <Plus size={12} /> Add Address
                  </button>
                )}
              </div>
              <input
                id="field-address-line1"
                type="text"
                placeholder="Building / Flat / Premise No, Street"
                value={formData.addressLine1}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, addressLine1: e.target.value });
                }}
                className={styles.input}
              />
            </div>

            {showAddressLine2 && (
              <div className={styles.formGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="field-address-line2">
                    Address Line 2 <span className={styles.labelHint}>(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressLine2(false);
                      setIsDirty(true);
                      setFormData((prev) => ({ ...prev, addressLine2: "" }));
                    }}
                    className={styles.inlineActionBtn}
                    style={{ color: "#dc2626" }}
                    title="Remove address line 2"
                  >
                    ✕ Remove
                  </button>
                </div>
                <input
                  id="field-address-line2"
                  type="text"
                  placeholder="Locality, Landmark, Industrial Area"
                  value={formData.addressLine2}
                  onChange={(e) => {
                    setIsDirty(true);
                    setFormData({ ...formData, addressLine2: e.target.value });
                  }}
                  className={styles.input}
                />
              </div>
            )}
          </div>

          <div className={styles.gridFourCol} style={{ marginTop: 18 }}>
            {/* Country */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="field-country">
                Country
              </label>
              <input
                id="field-country"
                type="text"
                value={formData.country}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, country: e.target.value });
                }}
                className={styles.input}
              />
            </div>

            {/* State (Searchable Dropdown with GST Codes) */}
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="field-state">
                  State / POS <span className={styles.requiredAsterisk}>*</span>
                </label>
                <span className={styles.labelHint}>Place of Supply</span>
              </div>
              <select
                id="field-state"
                value={formData.state}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, state: e.target.value });
                }}
                className={styles.select}
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* City / Place */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="field-city">
                City / Place
              </label>
              <input
                id="field-city"
                type="text"
                placeholder="e.g. Kochi"
                value={formData.city}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, city: e.target.value });
                }}
                className={styles.input}
              />
            </div>

            {/* PIN Code */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="field-pincode">
                PIN Code
              </label>
              <input
                id="field-pincode"
                ref={(el) => { fieldRefs.current.pincode = el; }}
                type="text"
                maxLength={6}
                placeholder="e.g. 682001"
                value={formData.pincode}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "") });
                }}
                className={`${styles.input} ${formErrors.pincode ? styles.inputError : ""}`}
              />
              {formErrors.pincode && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {formErrors.pincode}
                </span>
              )}
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className={styles.gridFourCol} style={{ marginTop: 18 }}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="field-contact-person">
                Contact Person
              </label>
              <input
                id="field-contact-person"
                type="text"
                placeholder="e.g. Rajesh Nair"
                value={formData.contactPerson}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, contactPerson: e.target.value });
                }}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="field-mobile">
                Mobile Number
              </label>
              <input
                id="field-mobile"
                type="tel"
                placeholder="e.g. 9847012345"
                value={formData.mobile}
                onChange={(e) => handleMobileChange(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="field-whatsapp">
                  WhatsApp Number
                </label>
                <label style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={sameAsMobile}
                    onChange={(e) => handleToggleSameAsMobile(e.target.checked)}
                  />
                  Same as Mobile
                </label>
              </div>
              <input
                id="field-whatsapp"
                type="tel"
                placeholder="e.g. 9847012345"
                value={formData.whatsapp}
                disabled={sameAsMobile}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, whatsapp: e.target.value });
                }}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="field-email">
                Email Address
              </label>
              <input
                id="field-email"
                ref={(el) => { fieldRefs.current.email = el; }}
                type="email"
                placeholder="e.g. accounts@client.com"
                value={formData.email}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, email: e.target.value });
                }}
                className={`${styles.input} ${formErrors.email ? styles.inputError : ""}`}
              />
              {formErrors.email && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {formErrors.email}
                </span>
              )}
            </div>
          </div>

          {viewMode === "tabbed" && (
            <div className={styles.sectionNavFooter}>
              <button
                type="button"
                onClick={handlePrevSection}
                className={styles.btnStepNav}
              >
                <ChevronLeft size={15} />
                <span>Previous: Basic Info</span>
              </button>
              <button
                type="button"
                onClick={handleNextSection}
                className={`${styles.btnStepNav} ${styles.btnStepNavNext}`}
              >
                <span>Next: GST & Tax</span>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
        )}

        {/* =========================================================
            SECTION 3: TAX AND BANK DETAILS
            ========================================================= */}
        {(viewMode === "all" || activeTab === "tax_bank") && (
          <div className={`${styles.sectionCard} ${viewMode === "tabbed" ? styles.tabPane : ""}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIconBadge}>
                <FileText size={18} />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>GST & Statutory Tax Details</h2>
                <p className={styles.sectionSubtitle}>Tax registration type, 15-character GSTIN, and Income Tax PAN number</p>
              </div>
            </div>
            <span className={styles.sectionBadge}>Section C</span>
          </div>

          <div className={styles.gridThreeCol}>
            {/* GST Registration Type */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="field-gst-reg-type">
                GST Registration Type <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                id="field-gst-reg-type"
                value={formData.gstRegistrationType}
                onChange={(e) => {
                  setIsDirty(true);
                  const newType = e.target.value as GSTRegistrationType;
                  setFormData((prev) => ({
                    ...prev,
                    gstRegistrationType: newType,
                    // Clear GSTIN if unregistered or consumer
                    gstin: newType === "Unregistered" || newType === "Consumer" ? "" : prev.gstin,
                  }));
                }}
                className={styles.select}
              >
                <option value="Regular">Regular</option>
                <option value="Consumer">Consumer</option>
                <option value="Unregistered">Unregistered</option>
                <option value="Composition">Composition</option>
              </select>
              <span className={styles.helperText}>
                Controls whether B2B or B2C invoices and e-Invoicing are generated.
              </span>
            </div>

            {/* GSTIN (Only visible and mandatory for Regular & Composition) */}
            {isGSTINApplicable && (
              <div className={styles.formGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="field-gstin">
                    GSTIN <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  {gstinValidation && gstinValidation.isValid && (
                    <span className={styles.validationBadgeValid}>
                      <Check size={11} /> Format Valid
                    </span>
                  )}
                  {gstinValidation && !gstinValidation.isValid && (
                    <span className={styles.validationBadgeWarning}>
                      <AlertCircle size={11} /> Format Check
                    </span>
                  )}
                </div>
                <input
                  id="field-gstin"
                  ref={(el) => { fieldRefs.current.gstin = el; }}
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 32AAACS1234D1Z2"
                  value={formData.gstin}
                  onChange={(e) => handleGSTINChange(e.target.value)}
                  className={`${styles.input} ${formErrors.gstin ? styles.inputError : ""}`}
                  style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-mono)" }}
                />
                {formErrors.gstin ? (
                  <span className={styles.errorMessage}>
                    <AlertCircle size={13} /> {formErrors.gstin}
                  </span>
                ) : (
                  <span className={styles.helperText}>
                    15-digit alphanumeric format. State code & PAN auto-detected. Mandatory for Regular / Composition.
                  </span>
                )}
              </div>
            )}

            {/* PAN Number */}
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="field-pan">
                  PAN Number
                </label>
                {formData.pan.length === 10 && validatePANFormat(formData.pan).isValid && (
                  <span className={styles.validationBadgeValid}>
                    <Check size={11} /> PAN Valid
                  </span>
                )}
              </div>
              <input
                id="field-pan"
                ref={(el) => { fieldRefs.current.pan = el; }}
                type="text"
                maxLength={10}
                placeholder="e.g. AAACS1234D"
                value={formData.pan}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData({ ...formData, pan: e.target.value.toUpperCase().trim() });
                }}
                className={`${styles.input} ${formErrors.pan ? styles.inputError : ""}`}
                style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-mono)" }}
              />
              {formErrors.pan ? (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {formErrors.pan}
                </span>
              ) : (
                <span className={styles.helperText}>
                  10-character Income Tax Permanent Account Number for TDS & TCS compliance.
                </span>
              )}
            </div>
          </div>

          <div className={styles.disclaimerBox}>
            <HelpCircle size={16} color="var(--primary-700)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Statutory Compliance Note:</strong> EasyGST Billing ERP validates the structural checksum,
              state-code consistency, and PAN matching format according to GST statutory rules. Official government verification
              occurs during active portal sync.
            </span>
          </div>

          {viewMode === "tabbed" && (
            <div className={styles.sectionNavFooter}>
              <button
                type="button"
                onClick={handlePrevSection}
                className={styles.btnStepNav}
              >
                <ChevronLeft size={15} />
                <span>Previous: Address</span>
              </button>
              <button
                type="button"
                onClick={handleNextSection}
                className={`${styles.btnStepNav} ${styles.btnStepNavNext}`}
              >
                <span>Next: Banking Details</span>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
        )}

        {(viewMode === "all" || activeTab === "tax_bank") && (
          <div className={`${styles.sectionCard} ${viewMode === "tabbed" ? styles.tabPane : ""}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIconBadge}>
                <CreditCard size={18} />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Banking Details</h2>
                <p className={styles.sectionSubtitle}>Bank account, branch coordinates, and IFSC for electronic payouts</p>
              </div>
            </div>
            <span className={styles.sectionBadge}>Section D</span>
          </div>

          {/* Switch: Maintain Bank Details */}
          <div
            className={styles.switchContainer}
            onClick={() => {
              setIsDirty(true);
              setFormData((prev) => ({
                ...prev,
                maintainBankDetails: !prev.maintainBankDetails,
                // Default account holder to ledger name if empty
                accountHolderName: !prev.maintainBankDetails && !prev.accountHolderName ? prev.name : prev.accountHolderName,
              }));
            }}
          >
            <div className={`${styles.switchTrack} ${formData.maintainBankDetails ? styles.switchTrackActive : ""}`}>
              <div className={`${styles.switchThumb} ${formData.maintainBankDetails ? styles.switchThumbActive : ""}`} />
            </div>
            <div className={styles.switchContent}>
              <span className={styles.switchTitle}>
                {formData.maintainBankDetails ? "Maintain Bank Details: Yes" : "Maintain Bank Details: No"}
              </span>
              <span className={styles.switchDesc}>
                {formData.maintainBankDetails
                  ? "Record bank account details for vendor payouts, direct debits, and print on invoices"
                  : "Enable if this ledger account requires electronic bank settlements"}
              </span>
            </div>
          </div>

          {/* Conditional Banking Fields */}
          {formData.maintainBankDetails && (
            <div style={{ marginTop: 20 }}>
              <div className={styles.gridThreeCol}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="field-acc-holder">
                    Account Holder Name <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <input
                    id="field-acc-holder"
                    type="text"
                    placeholder="Name as registered with the bank"
                    value={formData.accountHolderName}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFormData({ ...formData, accountHolderName: e.target.value });
                    }}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="field-bank-name">
                    Bank Name
                  </label>
                  <input
                    id="field-bank-name"
                    type="text"
                    placeholder="e.g. State Bank of India / HDFC Bank"
                    value={formData.bankName}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFormData({ ...formData, bankName: e.target.value });
                    }}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="field-branch-name">
                    Branch Name
                  </label>
                  <input
                    id="field-branch-name"
                    type="text"
                    placeholder="e.g. MG Road, Ernakulam"
                    value={formData.branchName}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFormData({ ...formData, branchName: e.target.value });
                    }}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.gridThreeCol} style={{ marginTop: 18 }}>
                {/* Account Number */}
                <div className={styles.formGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="field-acc-num">
                      Account Number <span className={styles.requiredAsterisk}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className={styles.inputIconBtn}
                      title={showAccountNumber ? "Hide Account Number" : "Show Account Number"}
                    >
                      {showAccountNumber ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className={styles.inputWrapper}>
                    <input
                      id="field-acc-num"
                      ref={(el) => { fieldRefs.current.accountNumber = el; }}
                      type={showAccountNumber ? "text" : "password"}
                      placeholder="Enter bank account number"
                      value={formData.accountNumber}
                      onChange={(e) => {
                        setIsDirty(true);
                        setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, "") });
                      }}
                      className={`${styles.input} ${formErrors.accountNumber ? styles.inputError : ""}`}
                      style={{ letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                  {formErrors.accountNumber && (
                    <span className={styles.errorMessage}>
                      <AlertCircle size={13} /> {formErrors.accountNumber}
                    </span>
                  )}
                </div>

                {/* Confirm Account Number */}
                <div className={styles.formGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="field-confirm-acc-num">
                      Confirm Account Number <span className={styles.requiredAsterisk}>*</span>
                    </label>
                    {formData.accountNumber &&
                      formData.confirmAccountNumber &&
                      formData.accountNumber === formData.confirmAccountNumber && (
                        <span className={styles.validationBadgeValid}>
                          <Check size={11} /> Matched
                        </span>
                      )}
                  </div>
                  <input
                    id="field-confirm-acc-num"
                    ref={(el) => { fieldRefs.current.confirmAccountNumber = el; }}
                    type="password"
                    placeholder="Re-enter bank account number"
                    value={formData.confirmAccountNumber}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFormData({ ...formData, confirmAccountNumber: e.target.value.replace(/\D/g, "") });
                    }}
                    className={`${styles.input} ${formErrors.confirmAccountNumber ? styles.inputError : ""}`}
                    style={{ letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}
                  />
                  {formErrors.confirmAccountNumber && (
                    <span className={styles.errorMessage}>
                      <AlertCircle size={13} /> {formErrors.confirmAccountNumber}
                    </span>
                  )}
                </div>

                {/* IFSC Code */}
                <div className={styles.formGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="field-ifsc">
                      IFSC Code
                    </label>
                    {formData.ifscCode && validateIFSCFormat(formData.ifscCode).isValid && (
                      <span className={styles.validationBadgeValid}>
                        <Check size={11} /> Valid IFSC
                      </span>
                    )}
                  </div>
                  <input
                    id="field-ifsc"
                    ref={(el) => { fieldRefs.current.ifscCode = el; }}
                    type="text"
                    maxLength={11}
                    placeholder="e.g. SBIN0001234"
                    value={formData.ifscCode}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFormData({ ...formData, ifscCode: e.target.value.toUpperCase().trim() });
                    }}
                    className={`${styles.input} ${formErrors.ifscCode ? styles.inputError : ""}`}
                    style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-mono)" }}
                  />
                  {formErrors.ifscCode && (
                    <span className={styles.errorMessage}>
                      <AlertCircle size={13} /> {formErrors.ifscCode}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.gridThreeCol} style={{ marginTop: 18 }}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="field-acc-type">
                    Account Type
                  </label>
                  <select
                    id="field-acc-type"
                    value={formData.accountType}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFormData({ ...formData, accountType: e.target.value as AccountType });
                    }}
                    className={styles.select}
                  >
                    <option value="Current">Current Account</option>
                    <option value="Savings">Savings Account</option>
                    <option value="Overdraft">Overdraft (OD)</option>
                    <option value="Cash Credit">Cash Credit (CC)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {viewMode === "tabbed" && (
            <div className={styles.sectionNavFooter}>
              <button
                type="button"
                onClick={handlePrevSection}
                className={styles.btnStepNav}
              >
                <ChevronLeft size={15} />
                <span>Previous: GST & Tax</span>
              </button>
              <button
                type="button"
                onClick={handleNextSection}
                className={`${styles.btnStepNav} ${styles.btnStepNavNext}`}
              >
                <span>Next: Opening Balance</span>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
        )}

        {/* =========================================================
            SECTION E: OPENING BALANCE
            ========================================================= */}
        {(viewMode === "all" || activeTab === "balance") && (
          <div className={`${styles.sectionCard} ${viewMode === "tabbed" ? styles.tabPane : ""}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.sectionIconBadge}>
                <Wallet size={18} />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Opening Balance</h2>
                <p className={styles.sectionSubtitle}>Initial accounting balance brought forward as of financial year commencement</p>
              </div>
            </div>
            <span className={styles.sectionBadge}>Section E</span>
          </div>

          {/* Bill-by-Bill Table Matching Photo 1 */}
          <div className={styles.billTableWrapper}>
            <div className={styles.billTableCard}>
              <div className={styles.billTableInner}>
                {/* Table Header Row */}
                <div className={styles.billHeaderRow}>
                  <span>Bill No</span>
                  <span>Bill Date</span>
                  <span>Due Date</span>
                  <span>Amount (₹)</span>
                  <span>Dr / Cr</span>
                  <span></span>
                </div>

                {/* Table Item Rows */}
                {openingBills.map((bill, index) => (
                  <div key={bill.id} className={styles.billItemRow}>
                    <input
                      type="text"
                      placeholder={`e.g. INV-${2024 + index}-001`}
                      value={bill.billNo}
                      onChange={(e) => handleUpdateBillRow(bill.id, "billNo", e.target.value)}
                      className={styles.billInput}
                    />

                    <input
                      type="date"
                      value={bill.billDate}
                      onChange={(e) => handleUpdateBillRow(bill.id, "billDate", e.target.value)}
                      className={styles.billInput}
                    />

                    <input
                      type="date"
                      value={bill.dueDate}
                      onChange={(e) => handleUpdateBillRow(bill.id, "dueDate", e.target.value)}
                      className={styles.billInput}
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={bill.amount}
                      onChange={(e) => handleUpdateBillRow(bill.id, "amount", e.target.value)}
                      className={styles.billInput}
                    />

                    <select
                      value={bill.balanceType}
                      onChange={(e) => handleUpdateBillRow(bill.id, "balanceType", e.target.value as "Dr" | "Cr")}
                      className={`${styles.billSelect} ${bill.balanceType === "Dr" ? styles.billSelectDr : styles.billSelectCr}`}
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveBillRow(bill.id)}
                      className={styles.billRemoveBtn}
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Table Bottom Action: + Add Bill */}
                <div className={styles.billActionsRow}>
                  <button
                    type="button"
                    onClick={handleAddBillRow}
                    className={styles.btnAddBillRow}
                  >
                    <Plus size={14} />
                    <span>Add Bill</span>
                  </button>

                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {openingBills.length} Bill row{openingBills.length === 1 ? "" : "s"} configured
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Summary Banner */}
            <div className={styles.billSummaryBanner}>
              <div className={styles.billSummaryGroup}>
                <div className={styles.billSummaryItem}>
                  <span className={styles.billSummaryLabel}>Total Debit (Dr)</span>
                  <span className={`${styles.billSummaryValue} ${styles.billSummaryValueDr}`}>
                    {formatINR(billTotals.totalDr)}
                  </span>
                </div>

                <div className={styles.billSummaryItem}>
                  <span className={styles.billSummaryLabel}>Total Credit (Cr)</span>
                  <span className={`${styles.billSummaryValue} ${styles.billSummaryValueCr}`}>
                    {formatINR(billTotals.totalCr)}
                  </span>
                </div>
              </div>

              <div className={styles.billSummaryItem} style={{ textAlign: "right" }}>
                <span className={styles.billSummaryLabel}>Net Opening Balance</span>
                <span
                  className={`${styles.billSummaryValue} ${billTotals.netType === "Dr" ? styles.billSummaryValueDr : styles.billSummaryValueCr}`}
                  style={{ fontSize: 16 }}
                >
                  {formatINR(billTotals.netAmount)} {billTotals.netType}
                </span>
              </div>
            </div>
          </div>

          {viewMode === "tabbed" && (
            <div className={styles.sectionNavFooter}>
              <button
                type="button"
                onClick={handlePrevSection}
                className={styles.btnStepNav}
              >
                <ChevronLeft size={15} />
                <span>Previous: Banking</span>
              </button>
              <span style={{ fontSize: 12.5, color: "var(--primary-700)", fontWeight: 600 }}>
                Section E of 5 — Ready to Save
              </span>
            </div>
          )}
        </div>
        )}

        {/* =========================================================
            BOTTOM ACTION BAR (STICKY)
            ========================================================= */}
        <div className={styles.actionBar}>
          <div className={styles.actionLeft}>
            <button
              type="button"
              onClick={() => {
                if (isDirty) setShowResetModal(true);
                else handleResetForm();
              }}
              className={styles.btnReset}
              title="Reset all fields to defaults"
            >
              <RotateCcw size={14} />
              <span>Reset Form</span>
            </button>
          </div>

          <div className={styles.actionRight}>
            {viewMode === "tabbed" && (
              <>
                <button
                  type="button"
                  onClick={handlePrevSection}
                  disabled={isFirstTab}
                  className={styles.btnSecondary}
                  title={prevTab ? `Go back to ${prevTab.shortLabel}` : "First section"}
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>

                {nextTab && (
                  <button
                    type="button"
                    onClick={handleNextSection}
                    className={styles.btnSecondary}
                    title={`Proceed to ${nextTab.shortLabel}`}
                  >
                    <span>Next: {nextTab.shortLabel}</span>
                    <ChevronRight size={15} />
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              id="btn-cancel-create-ledger"
              onClick={handleBackClick}
              className={styles.btnSecondary}
            >
              Cancel
            </button>

            <button
              type="submit"
              id="btn-save-ledger"
              disabled={isSubmitting}
              className={styles.btnPrimary}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.spinner} />
                  <span>Saving Ledger...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Ledger</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* -------------------------------------------------------------
          MODAL: UNSAVED CHANGES CONFIRMATION
          ------------------------------------------------------------- */}
      {showConfirmBackModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowConfirmBackModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Unsaved Changes</h3>
            <p className={styles.modalBody}>
              You have unsaved changes in this ledger form. If you leave now, any entered data will be discarded.
              Are you sure you want to return to the Ledgers list?
            </p>
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowConfirmBackModal(false)}
                className={styles.btnSecondary}
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmBackModal(false);
                  onBack();
                }}
                className={styles.btnDanger}
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: RESET FORM CONFIRMATION
          ------------------------------------------------------------- */}
      {showResetModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowResetModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Reset Ledger Form?</h3>
            <p className={styles.modalBody}>
              This will clear all entered contact, GST, banking, and opening balance information and restore defaults.
              This action cannot be undone.
            </p>
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className={styles.btnSecondary}
              >
                Keep Changes
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className={styles.btnDanger}
              >
                Yes, Reset Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
