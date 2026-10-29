"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import styles from "./LedgerModal.module.css";
import {
  Ledger,
  LedgerGroup,
  NatureGroup,
  GSTRegistrationType,
  AccountType,
  CreateLedgerFormValues,
  OpeningBalanceBill,
} from "../../types/erp";
import {
  INDIAN_STATES,
  validateGSTINFormat,
  validatePANFormat,
  formatINR,
} from "../../data/indianStates";
import { getAllAccountingGroups } from "../../data/standardGroups";
import { User, X, Plus } from "lucide-react";

interface LedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedLedger: Ledger) => void;
  ledgerToEdit?: Ledger | null;
  existingGroups?: LedgerGroup[];
  existingLedgers?: Ledger[];
}

type StepNumber = 1 | 2 | 3 | 4;

interface StepInfo {
  num: StepNumber;
  label: string;
}

const STEPS: StepInfo[] = [
  { num: 1, label: "Basics" },
  { num: 2, label: "Contact" },
  { num: 3, label: "Tax & bank" },
  { num: 4, label: "Balance" },
];

const INITIAL_FORM_STATE: CreateLedgerFormValues = {
  name: "",
  code: "",
  underGroup: "Sundry Debtors",
  nature: "Income",
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

export default function LedgerModal({
  isOpen,
  onClose,
  onSave,
  ledgerToEdit,
  existingGroups = [],
  existingLedgers = [],
}: LedgerModalProps) {
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  const [formData, setFormData] = useState<CreateLedgerFormValues>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAddressLine2, setShowAddressLine2] = useState(false);
  const [sameAsMobile, setSameAsMobile] = useState(false);

  // Bill-by-bill opening balance rows
  const [openingBills, setOpeningBills] = useState<
    {
      id: string;
      billNo: string;
      billDate: string;
      dueDate: string;
      amount: string | number;
      balanceType: "Dr" | "Cr";
    }[]
  >([
    {
      id: "bill-1",
      billNo: "",
      billDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      amount: "",
      balanceType: "Dr",
    },
  ]);

  const allGroups = useMemo(() => {
    return getAllAccountingGroups(existingGroups);
  }, [existingGroups]);

  // Load existing ledger if editing or reset to initial
  useEffect(() => {
    if (!isOpen) return;

    if (ledgerToEdit) {
      setFormData({
        name: ledgerToEdit.name || "",
        code: ledgerToEdit.code || "",
        underGroup: ledgerToEdit.underGroup || "Sundry Debtors",
        nature: ledgerToEdit.nature || "Income",
        billByBill: ledgerToEdit.billByBill !== undefined ? ledgerToEdit.billByBill : true,
        creditDays: ledgerToEdit.creditDays !== undefined ? ledgerToEdit.creditDays : 30,
        creditLimit: ledgerToEdit.creditLimit !== undefined ? ledgerToEdit.creditLimit : 0,
        addressLine1: ledgerToEdit.addressDetails?.addressLine1 || ledgerToEdit.address || "",
        addressLine2: ledgerToEdit.addressDetails?.addressLine2 || "",
        country: ledgerToEdit.addressDetails?.country || "India",
        state: ledgerToEdit.addressDetails?.state || "Kerala",
        district: ledgerToEdit.addressDetails?.district || "Ernakulam",
        city: ledgerToEdit.addressDetails?.city || "Kochi",
        pincode: ledgerToEdit.addressDetails?.pincode || "",
        contactPerson: ledgerToEdit.contactDetails?.contactPerson || "",
        phone: ledgerToEdit.contactDetails?.phone || ledgerToEdit.phone || "",
        mobile: ledgerToEdit.contactDetails?.mobile || "",
        whatsapp: ledgerToEdit.contactDetails?.whatsapp || "",
        email: ledgerToEdit.contactDetails?.email || "",
        website: ledgerToEdit.contactDetails?.website || "",
        gstRegistrationType: (ledgerToEdit.gstRegistrationType as GSTRegistrationType) || "Regular",
        gstin: ledgerToEdit.gstin || "",
        pan: ledgerToEdit.pan || "",
        maintainBankDetails: Boolean(ledgerToEdit.bankDetails?.maintainBankDetails),
        accountHolderName: ledgerToEdit.bankDetails?.accountHolderName || "",
        bankName: ledgerToEdit.bankDetails?.bankName || "",
        branchName: ledgerToEdit.bankDetails?.branchName || "",
        accountNumber: ledgerToEdit.bankDetails?.accountNumber || "",
        confirmAccountNumber: ledgerToEdit.bankDetails?.accountNumber || "",
        ifscCode: ledgerToEdit.bankDetails?.ifscCode || "",
        accountType: ledgerToEdit.bankDetails?.accountType || "Current",
        openingBalance: ledgerToEdit.openingBalance || 0,
        balanceType: ledgerToEdit.balanceType || "Dr",
        status: ledgerToEdit.status || "Active",
        notes: ledgerToEdit.notes || "",
      });

      setShowAddressLine2(Boolean(ledgerToEdit.addressDetails?.addressLine2?.trim()));

      if (ledgerToEdit.openingBills && ledgerToEdit.openingBills.length > 0) {
        setOpeningBills(
          ledgerToEdit.openingBills.map((b, idx) => ({
            id: b.id || `bill-${idx + 1}`,
            billNo: b.billNo || "",
            billDate: b.billDate || new Date().toISOString().split("T")[0],
            dueDate: b.dueDate || "",
            amount: b.amount || "",
            balanceType: b.balanceType || "Dr",
          }))
        );
      } else if (ledgerToEdit.openingBalance && ledgerToEdit.openingBalance > 0) {
        setOpeningBills([
          {
            id: "bill-1",
            billNo: "OB-001",
            billDate: new Date().toISOString().split("T")[0],
            dueDate: "",
            amount: ledgerToEdit.openingBalance,
            balanceType: ledgerToEdit.balanceType || "Dr",
          },
        ]);
      } else {
        setOpeningBills([
          {
            id: "bill-1",
            billNo: "",
            billDate: new Date().toISOString().split("T")[0],
            dueDate: "",
            amount: "",
            balanceType: ledgerToEdit.balanceType || "Dr",
          },
        ]);
      }
    } else {
      setFormData(INITIAL_FORM_STATE);
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
    }
    setActiveStep(1);
    setFormErrors({});
  }, [isOpen, ledgerToEdit]);

  // Bill totals auto-calculation
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

    return { totalDr, totalCr, netAmount, netType, validCount };
  }, [openingBills]);

  // Sync formData balance with billTotals
  useEffect(() => {
    if (billTotals.validCount > 0) {
      setFormData((prev) => ({
        ...prev,
        openingBalance: billTotals.netAmount,
        balanceType: billTotals.netType,
      }));
    }
  }, [billTotals]);

  if (!isOpen) return null;

  const currentStepInfo = STEPS.find((s) => s.num === activeStep) || STEPS[0];

  const handleGroupSelect = (groupName: string) => {
    const matched = allGroups.find((g) => g.name === groupName);
    const nature: NatureGroup = matched ? matched.nature : "Income";
    const defaultBalanceType: "Dr" | "Cr" = nature === "Asset" || nature === "Expenses" ? "Dr" : "Cr";

    setFormData((prev) => ({
      ...prev,
      underGroup: groupName,
      nature,
      balanceType: defaultBalanceType,
    }));

    if (formErrors.name && formData.name.trim()) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  };

  const handleGSTINChange = (raw: string) => {
    const upper = raw.toUpperCase().trim();
    let autoPan = formData.pan;
    let autoState = formData.state;

    if (upper.length >= 12) {
      const extractedPan = upper.substring(2, 12);
      const panCheck = validatePANFormat(extractedPan);
      if (panCheck.isValid && !formData.pan) {
        autoPan = extractedPan;
      }
    }

    if (upper.length >= 2) {
      const stateCode = upper.substring(0, 2);
      const matched = INDIAN_STATES.find((s) => s.code === stateCode);
      if (matched) autoState = matched.name;
    }

    setFormData((prev) => ({
      ...prev,
      gstin: upper,
      pan: autoPan,
      state: autoState,
    }));
  };

  const handleNext = () => {
    if (activeStep === 1) {
      if (!formData.name.trim()) {
        setFormErrors({ name: "Ledger Name is required" });
        return;
      }
      setFormErrors({});
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      setActiveStep(3);
      return;
    }

    if (activeStep === 3) {
      if (["Regular", "Composition"].includes(formData.gstRegistrationType)) {
        if (!formData.gstin.trim()) {
          setFormErrors({ gstin: "GSTIN is mandatory for Regular and Composition registration." });
          return;
        }
        const gstinCheck = validateGSTINFormat(formData.gstin.trim());
        if (!gstinCheck.isValid) {
          setFormErrors({ gstin: gstinCheck.message || "Invalid 15-character GSTIN format." });
          return;
        }
      }
      setFormErrors({});
      setActiveStep(4);
      return;
    }
  };

  const handlePrevious = () => {
    if (activeStep > 1) {
      setActiveStep((prev) => (prev - 1) as StepNumber);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setActiveStep(1);
      setFormErrors({ name: "Ledger Name is required" });
      return;
    }

    if (["Regular", "Composition"].includes(formData.gstRegistrationType)) {
      if (!formData.gstin.trim()) {
        setActiveStep(3);
        setFormErrors({ gstin: "GSTIN is mandatory for Regular and Composition registration." });
        return;
      }
      const gstinCheck = validateGSTINFormat(formData.gstin.trim());
      if (!gstinCheck.isValid) {
        setActiveStep(3);
        setFormErrors({ gstin: gstinCheck.message || "Invalid 15-character GSTIN format." });
        return;
      }
    }

    const compiledBills: OpeningBalanceBill[] = openingBills
      .filter((b) => (parseFloat(String(b.amount)) || 0) > 0 || b.billNo.trim())
      .map((b, idx) => ({
        id: b.id || `bill-${idx + 1}`,
        billNo: b.billNo.trim() || `OB-${idx + 1}`,
        billDate: b.billDate || new Date().toISOString().split("T")[0],
        dueDate: b.dueDate || "",
        amount: parseFloat(String(b.amount)) || 0,
        balanceType: b.balanceType,
      }));

    const finalBalance = billTotals.validCount > 0 ? billTotals.netAmount : Number(formData.openingBalance) || 0;
    const finalBalanceType = billTotals.validCount > 0 ? billTotals.netType : formData.balanceType;

    const savedLedger: Ledger = {
      id: ledgerToEdit?.id || `led-${Date.now()}`,
      name: formData.name.trim(),
      code: formData.code.trim() || undefined,
      underGroup: formData.underGroup,
      nature: formData.nature,
      billByBill: formData.billByBill,
      creditDays: Number(formData.creditDays) || 0,
      creditLimit: Number(formData.creditLimit) || 0,
      address: [formData.addressLine1, formData.addressLine2, formData.city].filter(Boolean).join(", ") || undefined,
      phone: formData.phone.trim() || formData.mobile.trim() || undefined,
      addressDetails: {
        addressLine1: formData.addressLine1.trim() || undefined,
        addressLine2: showAddressLine2 ? formData.addressLine2.trim() || undefined : undefined,
        country: formData.country,
        state: formData.state,
        district: formData.district || undefined,
        city: formData.city || undefined,
        pincode: formData.pincode.trim() || undefined,
      },
      contactDetails: {
        contactPerson: formData.contactPerson.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        whatsapp: formData.whatsapp.trim() || undefined,
        email: formData.email.trim() || undefined,
      },
      gstRegistrationType: formData.gstRegistrationType,
      gstin: formData.gstin.trim() || undefined,
      pan: formData.pan.trim() || undefined,
      bankDetails: {
        maintainBankDetails: formData.maintainBankDetails,
        accountHolderName: formData.accountHolderName.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        branchName: formData.branchName.trim() || undefined,
        accountNumber: formData.accountNumber.trim() || undefined,
        ifscCode: formData.ifscCode.trim() || undefined,
        accountType: formData.accountType,
      },
      openingBalance: finalBalance,
      balanceType: finalBalanceType,
      openingBills: compiledBills.length > 0 ? compiledBills : undefined,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      createdAt: ledgerToEdit?.createdAt || new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    onSave(savedLedger);
  };

  const handleAddBill = () => {
    setOpeningBills((prev) => [
      ...prev,
      {
        id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        billNo: "",
        billDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        amount: "",
        balanceType: formData.balanceType || "Dr",
      },
    ]);
  };

  const handleRemoveBill = (id: string) => {
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

  const handleUpdateBill = (
    id: string,
    field: "billNo" | "billDate" | "dueDate" | "amount" | "balanceType",
    value: any
  ) => {
    setOpeningBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleRow}>
            <span className={styles.headerUserIcon}>
              <User size={19} />
            </span>
            <span>{ledgerToEdit ? "Edit Ledger" : "Create Ledger"}</span>
          </div>
          <button
            id="btn-close-ledger-modal"
            className={styles.btnClose}
            onClick={onClose}
            title="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* Stepper Header */}
        <div className={styles.stepperHeader}>
          <div className={styles.stepCountRow}>
            <span className={styles.stepCountText}>Step {activeStep} of 4</span>
            <span className={styles.stepNameText}>{currentStepInfo.label}</span>
          </div>

          {/* Progress bar track */}
          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${activeStep * 25}%` }}
            />
          </div>

          {/* 4 Stepper pills */}
          <div className={styles.stepperPillsRow}>
            {STEPS.map((step) => {
              const isActive = activeStep === step.num;
              const isPast = activeStep > step.num;
              return (
                <div
                  key={step.num}
                  id={`step-pill-${step.num}`}
                  onClick={() => {
                    if (step.num === 1 || formData.name.trim()) {
                      setActiveStep(step.num);
                    } else {
                      setFormErrors({ name: "Please enter Ledger Name first" });
                    }
                  }}
                  className={`${styles.stepPill} ${isActive ? styles.stepPillActive : ""} ${
                    isPast ? styles.stepPillCompleted : ""
                  }`}
                >
                  <div className={styles.stepPillNumber}>
                    {step.num}
                  </div>
                  <span className={styles.stepPillLabel}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body / Active Step Content */}
        <div className={styles.modalBody}>
          {/* ==============================================================
              STEP 1: BASICS (Matching Photo Exact Fields)
              ============================================================== */}
          {activeStep === 1 && (
            <div>
              <div className={styles.sectionHeading}>Ledger details</div>

              <div className={styles.fieldGrid2}>
                {/* Name * */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-ledger-name">
                    Name <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <input
                    id="modal-ledger-name"
                    type="text"
                    value={formData.name}
                    placeholder="e.g. Anurag TR"
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({});
                    }}
                    className={styles.input}
                    autoFocus
                  />
                  {formErrors.name && (
                    <span className={styles.errorText}>{formErrors.name}</span>
                  )}
                </div>

                {/* Code (optional) */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-ledger-code">
                    Code (optional)
                  </label>
                  <input
                    id="modal-ledger-code"
                    type="text"
                    value={formData.code}
                    placeholder="e.g. DEB-1001"
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className={styles.input}
                  />
                </div>

                {/* Group * */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-ledger-group">
                    Group <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <select
                    id="modal-ledger-group"
                    value={formData.underGroup}
                    onChange={(e) => handleGroupSelect(e.target.value)}
                    className={styles.select}
                  >
                    {allGroups.map((g) => (
                      <option key={g.id || g.name} value={g.name}>
                        {g.name} ({g.nature})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nature */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-ledger-nature">
                    Nature
                  </label>
                  <select
                    id="modal-ledger-nature"
                    value={formData.nature}
                    onChange={(e) =>
                      setFormData({ ...formData, nature: e.target.value as NatureGroup })
                    }
                    className={styles.select}
                  >
                    <option value="Asset">Asset</option>
                    <option value="Expenses">Expenses</option>
                    <option value="Income">Income</option>
                    <option value="Liability">Liability</option>
                  </select>
                </div>
              </div>

              {/* Credit terms */}
              <div className={styles.sectionHeading} style={{ marginTop: 22 }}>
                Credit terms
              </div>

              <div className={styles.fieldGrid2}>
                {/* Maintain bill-by-bill tracking? */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-billbybill-select">
                    Maintain bill-by-bill tracking?
                  </label>
                  <select
                    id="modal-billbybill-select"
                    value={formData.billByBill ? "Yes" : "No"}
                    onChange={(e) =>
                      setFormData({ ...formData, billByBill: e.target.value === "Yes" })
                    }
                    className={styles.select}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* Credit days */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-credit-days">
                    Credit days
                  </label>
                  <input
                    id="modal-credit-days"
                    type="number"
                    min="0"
                    value={formData.creditDays}
                    onChange={(e) =>
                      setFormData({ ...formData, creditDays: Number(e.target.value) || 0 })
                    }
                    className={styles.input}
                  />
                </div>

                {/* Credit limit */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-credit-limit">
                    Credit limit (₹)
                  </label>
                  <input
                    id="modal-credit-limit"
                    type="number"
                    min="0"
                    value={formData.creditLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, creditLimit: Number(e.target.value) || 0 })
                    }
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 2: CONTACT
              ============================================================== */}
          {activeStep === 2 && (
            <div>
              <div className={styles.sectionHeading}>Contact information</div>
              <div className={styles.fieldGrid2}>
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-contact-person">
                    Contact Person
                  </label>
                  <input
                    id="modal-contact-person"
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-contact-mobile">
                    Mobile Number
                  </label>
                  <input
                    id="modal-contact-mobile"
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.mobile}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        mobile: val,
                        whatsapp: sameAsMobile ? val : formData.whatsapp,
                      });
                    }}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className={styles.fieldLabel} htmlFor="modal-contact-whatsapp">
                      WhatsApp
                    </label>
                    <label style={{ fontSize: 11.5, color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={sameAsMobile}
                        onChange={(e) => {
                          setSameAsMobile(e.target.checked);
                          if (e.target.checked) {
                            setFormData((prev) => ({ ...prev, whatsapp: prev.mobile }));
                          }
                        }}
                      />
                      Same as mobile
                    </label>
                  </div>
                  <input
                    id="modal-contact-whatsapp"
                    type="text"
                    placeholder="WhatsApp number"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-contact-email">
                    Email Address
                  </label>
                  <input
                    id="modal-contact-email"
                    type="email"
                    placeholder="e.g. accounts@client.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.sectionHeading} style={{ marginTop: 22 }}>
                Address details
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Address Line 1 */}
                <div className={styles.formField}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className={styles.fieldLabel} htmlFor="modal-address-line1">
                      Address Line 1
                    </label>
                    {!showAddressLine2 && (
                      <button
                        type="button"
                        onClick={() => setShowAddressLine2(true)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#15803d",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: "2px 6px",
                        }}
                      >
                        + Add Address (Line 2)
                      </button>
                    )}
                  </div>
                  <input
                    id="modal-address-line1"
                    type="text"
                    placeholder="Building, street, door no."
                    value={formData.addressLine1}
                    onChange={(e) =>
                      setFormData({ ...formData, addressLine1: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>

                {/* Address Line 2 (collapsible) */}
                {showAddressLine2 && (
                  <div className={styles.formField}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className={styles.fieldLabel} htmlFor="modal-address-line2">
                        Address Line 2
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressLine2(false);
                          setFormData((prev) => ({ ...prev, addressLine2: "" }));
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "11.5px",
                          fontWeight: 500,
                          cursor: "pointer",
                          padding: "2px 4px",
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                    <input
                      id="modal-address-line2"
                      type="text"
                      placeholder="Area, landmark, suite"
                      value={formData.addressLine2}
                      onChange={(e) =>
                        setFormData({ ...formData, addressLine2: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>
                )}

                <div className={styles.fieldGrid2}>
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="modal-state-select">
                      State
                    </label>
                    <select
                      id="modal-state-select"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className={styles.select}
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="modal-city-input">
                      City / District
                    </label>
                    <input
                      id="modal-city-input"
                      type="text"
                      placeholder="e.g. Kochi"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="modal-pincode-input">
                      Pincode
                    </label>
                    <input
                      id="modal-pincode-input"
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 682001"
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "") })
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="modal-country-input">
                      Country
                    </label>
                    <input
                      id="modal-country-input"
                      type="text"
                      value={formData.country}
                      disabled
                      className={styles.input}
                      style={{ background: "#f9fafb" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 3: TAX & BANK (Combined)
              ============================================================== */}
          {activeStep === 3 && (
            <div>
              <div className={styles.sectionHeading}>Tax details</div>
              <div className={styles.fieldGrid2}>
                {/* GST Registration Type */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-gst-type">
                    GST Registration Type <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <select
                    id="modal-gst-type"
                    value={formData.gstRegistrationType}
                    onChange={(e) => {
                      const newType = e.target.value as GSTRegistrationType;
                      setFormData((prev) => ({
                        ...prev,
                        gstRegistrationType: newType,
                        gstin: ["Unregistered", "Consumer"].includes(newType) ? "" : prev.gstin,
                      }));
                      if (formErrors.gstin) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.gstin;
                          return n;
                        });
                      }
                    }}
                    className={styles.select}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Consumer">Consumer</option>
                    <option value="Unregistered">Unregistered</option>
                    <option value="Composition">Composition</option>
                  </select>
                </div>

                {/* GSTIN (Mandatory and only visible when Regular or Composition) */}
                {["Regular", "Composition"].includes(formData.gstRegistrationType) && (
                  <div className={styles.formField}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className={styles.fieldLabel} htmlFor="modal-gstin-input">
                        GSTIN <span className={styles.requiredAsterisk}>*</span>
                      </label>
                      {formData.gstin.trim() && validateGSTINFormat(formData.gstin.trim()).isValid && (
                        <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>✓ Valid Format</span>
                      )}
                    </div>
                    <input
                      id="modal-gstin-input"
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 32AAACG1234F1Z5"
                      value={formData.gstin}
                      onChange={(e) => {
                        handleGSTINChange(e.target.value);
                        if (formErrors.gstin) {
                          setFormErrors((prev) => {
                            const n = { ...prev };
                            delete n.gstin;
                            return n;
                          });
                        }
                      }}
                      className={styles.input}
                      style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
                    />
                    {formErrors.gstin && (
                      <span className={styles.errorText}>{formErrors.gstin}</span>
                    )}
                  </div>
                )}

                {/* PAN */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-pan-input">
                    PAN
                  </label>
                  <input
                    id="modal-pan-input"
                    type="text"
                    maxLength={10}
                    placeholder="e.g. AAACG1234F"
                    value={formData.pan}
                    onChange={(e) =>
                      setFormData({ ...formData, pan: e.target.value.toUpperCase().trim() })
                    }
                    className={styles.input}
                  />
                </div>
              </div>

              {/* Banking details */}
              <div className={styles.sectionHeading} style={{ marginTop: 22 }}>
                Banking details
              </div>

              <div className={styles.fieldGrid2}>
                <div className={styles.formField}>
                  <label className={styles.fieldLabel} htmlFor="modal-maintain-bank">
                    Maintain bank details?
                  </label>
                  <select
                    id="modal-maintain-bank"
                    value={formData.maintainBankDetails ? "Yes" : "No"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maintainBankDetails: e.target.value === "Yes",
                      })
                    }
                    className={styles.select}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                {formData.maintainBankDetails && (
                  <>
                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="modal-bank-holder">
                        Account Holder Name
                      </label>
                      <input
                        id="modal-bank-holder"
                        type="text"
                        placeholder="Name as per bank passbook"
                        value={formData.accountHolderName}
                        onChange={(e) =>
                          setFormData({ ...formData, accountHolderName: e.target.value })
                        }
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="modal-bank-name">
                        Bank Name
                      </label>
                      <input
                        id="modal-bank-name"
                        type="text"
                        placeholder="e.g. State Bank of India"
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData({ ...formData, bankName: e.target.value })
                        }
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="modal-bank-branch">
                        Branch Name
                      </label>
                      <input
                        id="modal-bank-branch"
                        type="text"
                        placeholder="e.g. MG Road Branch"
                        value={formData.branchName}
                        onChange={(e) =>
                          setFormData({ ...formData, branchName: e.target.value })
                        }
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="modal-bank-acc">
                        Account Number
                      </label>
                      <input
                        id="modal-bank-acc"
                        type="text"
                        placeholder="Account number"
                        value={formData.accountNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, accountNumber: e.target.value })
                        }
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="modal-bank-ifsc">
                        IFSC Code
                      </label>
                      <input
                        id="modal-bank-ifsc"
                        type="text"
                        maxLength={11}
                        placeholder="e.g. SBIN0001234"
                        value={formData.ifscCode}
                        onChange={(e) =>
                          setFormData({ ...formData, ifscCode: e.target.value.toUpperCase().trim() })
                        }
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="modal-bank-type">
                        Account Type
                      </label>
                      <select
                        id="modal-bank-type"
                        value={formData.accountType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            accountType: e.target.value as AccountType,
                          })
                        }
                        className={styles.select}
                      >
                        <option value="Current">Current</option>
                        <option value="Savings">Savings</option>
                        <option value="Overdraft">Overdraft</option>
                        <option value="Cash Credit">Cash Credit</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 4: BALANCE (Opening Balance & Bill-by-Bill Breakdown)
              ============================================================== */}
          {activeStep === 4 && (
            <div>
              <div className={styles.sectionHeading}>Opening Balance</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                Initial accounting balance brought forward as of financial year commencement
              </div>

              {/* Bill-by-Bill Table matching reference photo */}
              <div className={styles.billTableWrapper}>
                <div className={styles.billTableCard}>
                  <div className={styles.billTableInner}>
                    {/* Header Row */}
                    <div className={styles.billHeaderRow}>
                      <div>Bill No</div>
                      <div>Bill Date</div>
                      <div>Due Date</div>
                      <div>Amount (₹)</div>
                      <div>Dr / Cr</div>
                      <div></div>
                    </div>

                    {/* Bill Rows */}
                    {openingBills.map((bill, index) => (
                      <div key={bill.id} className={styles.billItemRow}>
                        <div>
                          <input
                            type="text"
                            placeholder="e.g. INV-1001"
                            value={bill.billNo}
                            onChange={(e) =>
                              handleUpdateBill(bill.id, "billNo", e.target.value)
                            }
                            className={styles.billInput}
                          />
                        </div>

                        <div>
                          <input
                            type="date"
                            value={bill.billDate}
                            onChange={(e) =>
                              handleUpdateBill(bill.id, "billDate", e.target.value)
                            }
                            className={styles.billInput}
                          />
                        </div>

                        <div>
                          <input
                            type="date"
                            value={bill.dueDate}
                            onChange={(e) =>
                              handleUpdateBill(bill.id, "dueDate", e.target.value)
                            }
                            className={styles.billInput}
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={bill.amount}
                            onChange={(e) =>
                              handleUpdateBill(bill.id, "amount", e.target.value)
                            }
                            className={styles.billInput}
                          />
                        </div>

                        <div>
                          <select
                            value={bill.balanceType}
                            onChange={(e) =>
                              handleUpdateBill(
                                bill.id,
                                "balanceType",
                                e.target.value as "Dr" | "Cr"
                              )
                            }
                            className={`${styles.billSelect} ${
                              bill.balanceType === "Dr"
                                ? styles.billSelectDr
                                : styles.billSelectCr
                            }`}
                          >
                            <option value="Dr">Dr</option>
                            <option value="Cr">Cr</option>
                          </select>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => handleRemoveBill(bill.id)}
                            className={styles.billRemoveBtn}
                            title="Remove row"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Row Button */}
                  <div className={styles.billActionsRow}>
                    <button
                      type="button"
                      onClick={handleAddBill}
                      className={styles.btnAddBillRow}
                    >
                      <Plus size={14} />
                      <span>+ Add Bill</span>
                    </button>
                  </div>
                </div>

                {/* Net Summary Banner */}
                <div className={styles.billSummaryBanner}>
                  <div className={styles.billSummaryGroup}>
                    <div className={styles.billSummaryItem}>
                      <span className={styles.billSummaryLabel}>Total Debit (Dr)</span>
                      <span
                        className={`${styles.billSummaryValue} ${styles.billSummaryValueDr}`}
                      >
                        {formatINR(billTotals.totalDr)}
                      </span>
                    </div>

                    <div className={styles.billSummaryItem}>
                      <span className={styles.billSummaryLabel}>Total Credit (Cr)</span>
                      <span
                        className={`${styles.billSummaryValue} ${styles.billSummaryValueCr}`}
                      >
                        {formatINR(billTotals.totalCr)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.billSummaryItem} style={{ textAlign: "right" }}>
                    <span className={styles.billSummaryLabel}>Net Opening Balance</span>
                    <span className={styles.billSummaryValue}>
                      {formatINR(billTotals.netAmount)}{" "}
                      <span
                        className={
                          billTotals.netType === "Dr"
                            ? styles.billSummaryValueDr
                            : styles.billSummaryValueCr
                        }
                      >
                        {billTotals.netType}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            id="modal-btn-cancel"
            onClick={onClose}
            className={styles.btnCancel}
          >
            Cancel
          </button>

          {activeStep > 1 && (
            <button
              type="button"
              id="modal-btn-prev"
              onClick={handlePrevious}
              className={styles.btnPrevious}
            >
              Previous
            </button>
          )}

          {activeStep < 4 ? (
            <button
              type="button"
              id="modal-btn-next"
              onClick={handleNext}
              className={styles.btnNext}
            >
              Next step
            </button>
          ) : (
            <button
              type="button"
              id="modal-btn-save"
              onClick={handleSave}
              className={styles.btnSave}
            >
              {ledgerToEdit ? "Save changes" : "Create Ledger"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
