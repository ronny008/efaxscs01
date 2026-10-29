"use client";

import React, { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./ItemModal.module.css";
import {
  Item,
  ItemFormData,
  GSTApplicability,
  STOCK_GROUPS,
  STOCK_CATEGORIES,
  UNITS_OF_MEASUREMENT,
  STANDARD_GST_RATES,
} from "../../types/inventory";
import {
  Package,
  Layers,
  Scale,
  Settings2,
  Receipt,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedItem: Item) => void;
  itemToEdit?: Item | null;
  existingItems?: Item[];
}

type StepKey = 1 | 2 | 3 | 4;

const STEPS = [
  { key: 1 as StepKey, label: "Basics", icon: Layers },
  { key: 2 as StepKey, label: "Units & Conversion", icon: Scale },
  { key: 3 as StepKey, label: "Stock & Pricing", icon: Settings2 },
  { key: 4 as StepKey, label: "GST Details", icon: Receipt },
];

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function getInitialFormData(itemToEdit?: Item | null): ItemFormData {
  if (itemToEdit) {
    return {
      name: itemToEdit.name ?? "",
      code: itemToEdit.code ?? "",
      partNumber: itemToEdit.partNumber ?? "",
      stockGroup: itemToEdit.stockGroup ?? STOCK_GROUPS[0],
      stockCategory: itemToEdit.stockCategory ?? STOCK_CATEGORIES[0],

      primaryUnit: itemToEdit.primaryUnit ?? "PCS",
      enableSecondaryUnit: Boolean(itemToEdit.enableSecondaryUnit),
      secondaryUnit: itemToEdit.secondaryUnit ?? "BOX",
      conversionFactor: itemToEdit.conversionFactor ?? 10,

      enableBatch: Boolean(itemToEdit.enableBatch),
      enableExpiry: Boolean(itemToEdit.enableExpiry),
      maintainMRP: Boolean(itemToEdit.maintainMRP),
      maintainSellingPrice: itemToEdit.maintainSellingPrice ?? true,
      maintainCostPrice: itemToEdit.maintainCostPrice ?? true,

      mrp: itemToEdit.mrp !== undefined && itemToEdit.mrp !== null ? itemToEdit.mrp : "",
      sellingPrice: itemToEdit.sellingPrice !== undefined && itemToEdit.sellingPrice !== null ? itemToEdit.sellingPrice : "",
      costPrice: itemToEdit.costPrice !== undefined && itemToEdit.costPrice !== null ? itemToEdit.costPrice : "",
      shelfLifeDays: itemToEdit.shelfLifeDays !== undefined && itemToEdit.shelfLifeDays !== null ? itemToEdit.shelfLifeDays : "",
      batchPrefix: itemToEdit.batchPrefix ?? "",
      mfgDate: itemToEdit.mfgDate ?? "",
      expiryDate: itemToEdit.expiryDate ?? "",

      gstApplicability: itemToEdit.gstApplicability ?? "Taxable",
      hsnCode: itemToEdit.hsnCode ?? "",
      description: itemToEdit.description ?? "",
      gstRate: itemToEdit.gstRate ?? 18,
      igstRate: itemToEdit.igstRate ?? 18,
      cgstRate: itemToEdit.cgstRate ?? 9,
      sgstRate: itemToEdit.sgstRate ?? 9,
      cessRate: itemToEdit.cessRate ?? 0,
      supplyType: itemToEdit.supplyType ?? "Goods",
    };
  }

  const randCode = `ITM-${Math.floor(100 + Math.random() * 900)}`;
  return {
    name: "",
    code: randCode,
    partNumber: "",
    stockGroup: STOCK_GROUPS[0],
    stockCategory: STOCK_CATEGORIES[0],

    primaryUnit: "PCS",
    enableSecondaryUnit: false,
    secondaryUnit: "BOX",
    conversionFactor: 10,

    enableBatch: false,
    enableExpiry: false,
    maintainMRP: false,
    maintainSellingPrice: true,
    maintainCostPrice: true,

    mrp: "",
    sellingPrice: "",
    costPrice: "",
    shelfLifeDays: "",
    batchPrefix: "",
    mfgDate: "",
    expiryDate: "",

    gstApplicability: "Taxable",
    hsnCode: "",
    description: "",
    gstRate: 18,
    igstRate: 18,
    cgstRate: 9,
    sgstRate: 9,
    cessRate: 0,
    supplyType: "Goods",
  };
}

function ItemModalInner({
  onClose,
  onSave,
  itemToEdit,
}: {
  onClose: () => void;
  onSave: (savedItem: Item) => void;
  itemToEdit?: Item | null;
}) {
  const [activeStep, setActiveStep] = useState<StepKey>(1);
  const [formData, setFormData] = useState<ItemFormData>(() => getInitialFormData(itemToEdit));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle GST rate change with automatic sync of IGST, CGST, and SGST
  const handleGstRateChange = (rateVal: number) => {
    const half = Number((rateVal / 2).toFixed(2));
    setFormData((prev) => ({
      ...prev,
      gstRate: rateVal,
      igstRate: rateVal,
      cgstRate: half,
      sgstRate: half,
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Basic Details
    if (!formData.name.trim()) {
      newErrors.name = "Item name is required.";
    }

    // 2. Units & Conversion
    if (!formData.primaryUnit) {
      newErrors.primaryUnit = "Primary unit is required.";
    }

    if (formData.enableSecondaryUnit) {
      if (!formData.secondaryUnit) {
        newErrors.secondaryUnit = "Secondary unit is required.";
      } else if (formData.secondaryUnit === formData.primaryUnit) {
        newErrors.secondaryUnit = "Cannot be same as primary unit.";
      }
      const factorNum = Number(formData.conversionFactor);
      if (isNaN(factorNum) || factorNum <= 0) {
        newErrors.conversionFactor = "Must be a positive number.";
      }
    }

    // 3. Stock and Pricing
    if (formData.maintainMRP && formData.mrp !== "") {
      const mrpNum = Number(formData.mrp);
      if (isNaN(mrpNum) || mrpNum < 0) {
        newErrors.mrp = "Must be a valid amount.";
      }
    }
    if (formData.maintainSellingPrice && formData.sellingPrice !== "") {
      const spNum = Number(formData.sellingPrice);
      if (isNaN(spNum) || spNum < 0) {
        newErrors.sellingPrice = "Must be a valid amount.";
      }
    }
    if (formData.maintainCostPrice && formData.costPrice !== "") {
      const cpNum = Number(formData.costPrice);
      if (isNaN(cpNum) || cpNum < 0) {
        newErrors.costPrice = "Must be a valid amount.";
      }
    }
    if (formData.enableExpiry) {
      if (formData.shelfLifeDays !== "") {
        const days = Number(formData.shelfLifeDays);
        if (isNaN(days) || days <= 0 || !Number.isInteger(days)) {
          newErrors.shelfLifeDays = "Must be a positive number.";
        }
      }
      if (formData.mfgDate && formData.expiryDate) {
        if (new Date(formData.expiryDate) < new Date(formData.mfgDate)) {
          newErrors.expiryDate = "Expiry date cannot be before manufacturing date.";
        }
      }
    }

    // 4. GST Details
    if (formData.gstApplicability === "Taxable") {
      const rate = Number(formData.gstRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        newErrors.gstRate = "Must be between 0 and 100%.";
      }
      const cess = Number(formData.cessRate);
      if (isNaN(cess) || cess < 0) {
        newErrors.cessRate = "Must be a valid percentage.";
      }
    }

    setErrors(newErrors);

    if (newErrors.name) {
      setActiveStep(1);
    } else if (newErrors.primaryUnit || newErrors.secondaryUnit || newErrors.conversionFactor) {
      setActiveStep(2);
    } else if (
      newErrors.mrp ||
      newErrors.sellingPrice ||
      newErrors.costPrice ||
      newErrors.shelfLifeDays ||
      newErrors.mfgDate ||
      newErrors.expiryDate
    ) {
      setActiveStep(3);
    } else if (newErrors.gstRate || newErrors.cessRate) {
      setActiveStep(4);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const savedItem: Item = {
      id: itemToEdit?.id || `itm-${Date.now()}`,
      name: formData.name.trim(),
      code: formData.code.trim() || undefined,
      partNumber: formData.partNumber.trim() || undefined,
      stockGroup: formData.stockGroup,
      stockCategory: formData.stockCategory,

      primaryUnit: formData.primaryUnit,
      enableSecondaryUnit: formData.enableSecondaryUnit,
      secondaryUnit: formData.enableSecondaryUnit ? formData.secondaryUnit : undefined,
      conversionFactor: formData.enableSecondaryUnit ? Number(formData.conversionFactor) : undefined,

      enableBatch: formData.enableBatch,
      enableExpiry: formData.enableExpiry,
      maintainMRP: formData.maintainMRP,
      maintainSellingPrice: formData.maintainSellingPrice,
      maintainCostPrice: formData.maintainCostPrice,

      mrp: formData.maintainMRP && formData.mrp !== "" ? Number(formData.mrp) : undefined,
      sellingPrice: formData.maintainSellingPrice && formData.sellingPrice !== "" ? Number(formData.sellingPrice) : undefined,
      costPrice: formData.maintainCostPrice && formData.costPrice !== "" ? Number(formData.costPrice) : undefined,
      shelfLifeDays: formData.enableExpiry && formData.shelfLifeDays !== "" ? Number(formData.shelfLifeDays) : undefined,
      batchPrefix: formData.enableBatch && formData.batchPrefix.trim() ? formData.batchPrefix.trim() : undefined,
      mfgDate: formData.enableExpiry && formData.mfgDate ? formData.mfgDate : undefined,
      expiryDate: formData.enableExpiry && formData.expiryDate ? formData.expiryDate : undefined,

      gstApplicability: formData.gstApplicability,
      hsnCode: formData.hsnCode.trim() || undefined,
      description: formData.description.trim() || undefined,
      gstRate: formData.gstApplicability === "Taxable" ? Number(formData.gstRate) : 0,
      igstRate: formData.gstApplicability === "Taxable" ? Number(formData.igstRate) : 0,
      cgstRate: formData.gstApplicability === "Taxable" ? Number(formData.cgstRate) : 0,
      sgstRate: formData.gstApplicability === "Taxable" ? Number(formData.sgstRate) : 0,
      cessRate: formData.gstApplicability === "Taxable" ? Number(formData.cessRate) : 0,
      supplyType: formData.supplyType,

      createdAt: itemToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedItem);
  };

  return (
    <form className={styles.modalCard} onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className={styles.modalHeader}>
        <div className={styles.headerTitleRow}>
          <div className={styles.headerIconBox}>
            <Package size={20} />
          </div>
          <div className={styles.modalTitle}>
            {itemToEdit ? `Edit Item: ${itemToEdit.name}` : "Create Item"}
          </div>
        </div>
        <button
          id="btn-close-item-modal"
          type="button"
          className={styles.btnClose}
          onClick={onClose}
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Section Navigation Pills */}
      <div className={styles.stepperBar}>
        {STEPS.map((step) => {
          const IconComponent = step.icon;
          const isActive = activeStep === step.key;
          return (
            <button
              key={step.key}
              id={`step-btn-${step.key}`}
              type="button"
              onClick={() => setActiveStep(step.key)}
              className={`${styles.stepPill} ${isActive ? styles.stepPillActive : ""}`}
            >
              <span className={styles.stepBadge}>{step.key}</span>
              <IconComponent size={13} />
              <span className={styles.stepLabel}>{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modal Body */}
      <div className={styles.modalBody}>
        {/* =========================================================
            SECTION 1: BASIC DETAILS
            ========================================================= */}
        {activeStep === 1 && (
          <div>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <Layers size={17} className={styles.sectionIcon} />
                <span className={styles.sectionTitle}>Basic Details</span>
              </div>
            </div>

            <div className={styles.grid2}>
              {/* Item Name (Required) */}
              <div className={`${styles.formField} ${styles.formFieldFull}`}>
                <label className={styles.fieldLabel} htmlFor="item-name-input">
                  Item Name <span className={styles.requiredAsterisk}>*</span>
                </label>
                <input
                  id="item-name-input"
                  type="text"
                  className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                  placeholder="Item name"
                  value={formData.name ?? ""}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  autoFocus
                />
                {errors.name && (
                  <span className={styles.errorText}>
                    <AlertCircle size={12} /> {errors.name}
                  </span>
                )}
              </div>

              {/* Stock Group */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="stock-group-select">
                  Stock Group <span className={styles.requiredAsterisk}>*</span>
                </label>
                <select
                  id="stock-group-select"
                  className={styles.select}
                  value={formData.stockGroup ?? STOCK_GROUPS[0]}
                  onChange={(e) => setFormData({ ...formData, stockGroup: e.target.value })}
                >
                  {STOCK_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Category */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="stock-category-select">
                  Stock Category <span className={styles.requiredAsterisk}>*</span>
                </label>
                <select
                  id="stock-category-select"
                  className={styles.select}
                  value={formData.stockCategory ?? STOCK_CATEGORIES[0]}
                  onChange={(e) => setFormData({ ...formData, stockCategory: e.target.value })}
                >
                  {STOCK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Part Number */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="part-number-input">
                  Part Number
                </label>
                <input
                  id="part-number-input"
                  type="text"
                  className={styles.input}
                  placeholder="Part number"
                  value={formData.partNumber ?? ""}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                />
              </div>

              {/* Item Code */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="item-code-input">
                  Item Code
                </label>
                <input
                  id="item-code-input"
                  type="text"
                  className={styles.input}
                  placeholder="Item code"
                  value={formData.code ?? ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SECTION 2: UNITS AND CONVERSION
            ========================================================= */}
        {activeStep === 2 && (
          <div>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <Scale size={17} className={styles.sectionIcon} />
                <span className={styles.sectionTitle}>Units and Conversion</span>
              </div>
            </div>

            <div className={styles.grid2}>
              {/* Primary Unit (Required) */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="primary-unit-select">
                  Primary Unit <span className={styles.requiredAsterisk}>*</span>
                </label>
                <select
                  id="primary-unit-select"
                  className={`${styles.select} ${errors.primaryUnit ? styles.inputError : ""}`}
                  value={formData.primaryUnit ?? "PCS"}
                  onChange={(e) => {
                    setFormData({ ...formData, primaryUnit: e.target.value });
                    if (errors.primaryUnit) setErrors({ ...errors, primaryUnit: "" });
                  }}
                >
                  {UNITS_OF_MEASUREMENT.map((uom) => (
                    <option key={uom.code} value={uom.code}>
                      {uom.code} — {uom.name}
                    </option>
                  ))}
                </select>
                {errors.primaryUnit && (
                  <span className={styles.errorText}>
                    <AlertCircle size={12} /> {errors.primaryUnit}
                  </span>
                )}
              </div>

              {/* Enable Secondary Unit (Toggle) */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  Enable Secondary Unit
                </label>
                <div style={{ marginTop: 2 }}>
                  <div className={styles.segmentedGroup}>
                    <button
                      type="button"
                      id="btn-secondary-unit-no"
                      className={`${styles.segmentedBtn} ${!formData.enableSecondaryUnit ? styles.segmentedBtnActive : ""}`}
                      onClick={() => setFormData({ ...formData, enableSecondaryUnit: false })}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      id="btn-secondary-unit-yes"
                      className={`${styles.segmentedBtn} ${formData.enableSecondaryUnit ? styles.segmentedBtnActive : ""}`}
                      onClick={() => setFormData({ ...formData, enableSecondaryUnit: true })}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Conditional Secondary Unit Fields */}
            {formData.enableSecondaryUnit && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                <div className={styles.grid2}>
                  {/* Secondary Unit Dropdown */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="secondary-unit-select">
                      Secondary Unit <span className={styles.requiredAsterisk}>*</span>
                    </label>
                    <select
                      id="secondary-unit-select"
                      className={`${styles.select} ${errors.secondaryUnit ? styles.inputError : ""}`}
                      value={formData.secondaryUnit ?? "BOX"}
                      onChange={(e) => {
                        setFormData({ ...formData, secondaryUnit: e.target.value });
                        if (errors.secondaryUnit) setErrors({ ...errors, secondaryUnit: "" });
                      }}
                    >
                      {UNITS_OF_MEASUREMENT.map((uom) => (
                        <option key={uom.code} value={uom.code}>
                          {uom.code} — {uom.name}
                        </option>
                      ))}
                    </select>
                    {errors.secondaryUnit && (
                      <span className={styles.errorText}>
                        <AlertCircle size={12} /> {errors.secondaryUnit}
                      </span>
                    )}
                  </div>

                  {/* Unit Conversion Factor */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="conversion-factor-input">
                      Unit Conversion Factor <span className={styles.requiredAsterisk}>*</span>
                    </label>
                    <input
                      id="conversion-factor-input"
                      type="number"
                      step="any"
                      min="0.0001"
                      className={`${styles.input} ${errors.conversionFactor ? styles.inputError : ""}`}
                      placeholder="Conversion factor"
                      value={formData.conversionFactor ?? ""}
                      onChange={(e) => {
                        setFormData({ ...formData, conversionFactor: e.target.value });
                        if (errors.conversionFactor) setErrors({ ...errors, conversionFactor: "" });
                      }}
                    />
                    {errors.conversionFactor && (
                      <span className={styles.errorText}>
                        <AlertCircle size={12} /> {errors.conversionFactor}
                      </span>
                    )}
                  </div>
                </div>

                {/* Conversion Relationship */}
                <div className={styles.conversionBanner}>
                  <div className={styles.conversionFormula}>
                    1 {formData.secondaryUnit || "Secondary Unit"} ={" "}
                    {Number(formData.conversionFactor) > 0 ? formData.conversionFactor : "—"}{" "}
                    {formData.primaryUnit || "Primary Unit"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            SECTION 3: STOCK AND PRICING SETTINGS
            ========================================================= */}
        {activeStep === 3 && (
          <div>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <Settings2 size={17} className={styles.sectionIcon} />
                <span className={styles.sectionTitle}>Stock and Pricing Settings</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* 1. Enable Batch */}
              <div className={`${styles.settingCard} ${formData.enableBatch ? styles.settingCardActive : ""}`}>
                <div className={styles.settingHeader}>
                  <span className={styles.settingTitle}>Enable Batch</span>
                  <div
                    id="toggle-enable-batch"
                    className={`${styles.switchTrack} ${formData.enableBatch ? styles.switchTrackActive : ""}`}
                    onClick={() => setFormData({ ...formData, enableBatch: !formData.enableBatch })}
                  >
                    <div className={`${styles.switchThumb} ${formData.enableBatch ? styles.switchThumbActive : ""}`} />
                  </div>
                </div>

                {formData.enableBatch && (
                  <div className={styles.grid2} style={{ marginTop: 2 }}>
                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="batch-prefix-input">
                        Batch Prefix
                      </label>
                      <input
                        id="batch-prefix-input"
                        type="text"
                        className={styles.input}
                        placeholder="Batch prefix"
                        value={formData.batchPrefix ?? ""}
                        onChange={(e) => setFormData({ ...formData, batchPrefix: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Enable Expiry */}
              <div className={`${styles.settingCard} ${formData.enableExpiry ? styles.settingCardActive : ""}`}>
                <div className={styles.settingHeader}>
                  <span className={styles.settingTitle}>Enable Expiry</span>
                  <div
                    id="toggle-enable-expiry"
                    className={`${styles.switchTrack} ${formData.enableExpiry ? styles.switchTrackActive : ""}`}
                    onClick={() => setFormData({ ...formData, enableExpiry: !formData.enableExpiry })}
                  >
                    <div className={`${styles.switchThumb} ${formData.enableExpiry ? styles.switchThumbActive : ""}`} />
                  </div>
                </div>

                {formData.enableExpiry && (
                  <div className={styles.grid2} style={{ marginTop: 2 }}>
                    {/* Manufacturing Date */}
                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="mfg-date-input">
                        Manufacturing Date
                      </label>
                      <input
                        id="mfg-date-input"
                        type="date"
                        className={`${styles.input} ${errors.mfgDate ? styles.inputError : ""}`}
                        value={formData.mfgDate ?? ""}
                        onChange={(e) => {
                          const newMfg = e.target.value ?? "";
                          const nextData = {
                            ...formData,
                            mfgDate: newMfg,
                            expiryDate: formData.expiryDate ?? "",
                            shelfLifeDays: formData.shelfLifeDays ?? "",
                          };
                          if (newMfg && Number(formData.shelfLifeDays) > 0) {
                            const d = new Date(newMfg);
                            if (!isNaN(d.getTime())) {
                              d.setDate(d.getDate() + Number(formData.shelfLifeDays));
                              if (!isNaN(d.getTime())) {
                                nextData.expiryDate = d.toISOString().split("T")[0];
                              }
                            }
                          } else if (newMfg && formData.expiryDate) {
                            const mfgD = new Date(newMfg);
                            const expD = new Date(formData.expiryDate);
                            if (!isNaN(mfgD.getTime()) && !isNaN(expD.getTime())) {
                              const diff = Math.round((expD.getTime() - mfgD.getTime()) / (1000 * 60 * 60 * 24));
                              if (diff > 0) nextData.shelfLifeDays = diff;
                            }
                          }
                          setFormData(nextData);
                          if (errors.mfgDate || errors.expiryDate) {
                            setErrors({ ...errors, mfgDate: "", expiryDate: "" });
                          }
                        }}
                      />
                      {errors.mfgDate && (
                        <span className={styles.errorText}>
                          <AlertCircle size={12} /> {errors.mfgDate}
                        </span>
                      )}
                    </div>

                    {/* Expiry Date */}
                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="expiry-date-input">
                        Expiry Date
                      </label>
                      <input
                        id="expiry-date-input"
                        type="date"
                        className={`${styles.input} ${errors.expiryDate ? styles.inputError : ""}`}
                        value={formData.expiryDate ?? ""}
                        onChange={(e) => {
                          const newExp = e.target.value ?? "";
                          const nextData = {
                            ...formData,
                            expiryDate: newExp,
                            mfgDate: formData.mfgDate ?? "",
                            shelfLifeDays: formData.shelfLifeDays ?? "",
                          };
                          if (formData.mfgDate && newExp) {
                            const mfgD = new Date(formData.mfgDate);
                            const expD = new Date(newExp);
                            if (!isNaN(mfgD.getTime()) && !isNaN(expD.getTime())) {
                              const diff = Math.round((expD.getTime() - mfgD.getTime()) / (1000 * 60 * 60 * 24));
                              if (diff > 0) nextData.shelfLifeDays = diff;
                            }
                          }
                          setFormData(nextData);
                          if (errors.expiryDate) {
                            setErrors({ ...errors, expiryDate: "" });
                          }
                        }}
                      />
                      {errors.expiryDate && (
                        <span className={styles.errorText}>
                          <AlertCircle size={12} /> {errors.expiryDate}
                        </span>
                      )}
                    </div>

                    {/* Shelf Life (Days) */}
                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="shelf-life-input">
                        Shelf Life (Days)
                      </label>
                      <input
                        id="shelf-life-input"
                        type="number"
                        min="1"
                        className={`${styles.input} ${errors.shelfLifeDays ? styles.inputError : ""}`}
                        placeholder="Days"
                        value={formData.shelfLifeDays ?? ""}
                        onChange={(e) => {
                          const days = e.target.value ?? "";
                          const nextData = {
                            ...formData,
                            shelfLifeDays: days,
                            mfgDate: formData.mfgDate ?? "",
                            expiryDate: formData.expiryDate ?? "",
                          };
                          if (formData.mfgDate && Number(days) > 0) {
                            const d = new Date(formData.mfgDate);
                            if (!isNaN(d.getTime())) {
                              d.setDate(d.getDate() + Number(days));
                              if (!isNaN(d.getTime())) {
                                nextData.expiryDate = d.toISOString().split("T")[0];
                              }
                            }
                          }
                          setFormData(nextData);
                          if (errors.shelfLifeDays) setErrors({ ...errors, shelfLifeDays: "" });
                        }}
                      />
                      {errors.shelfLifeDays && (
                        <span className={styles.errorText}>
                          <AlertCircle size={12} /> {errors.shelfLifeDays}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Maintain MRP */}
              <div className={`${styles.settingCard} ${formData.maintainMRP ? styles.settingCardActive : ""}`}>
                <div className={styles.settingHeader}>
                  <span className={styles.settingTitle}>Maintain MRP</span>
                  <div
                    id="toggle-maintain-mrp"
                    className={`${styles.switchTrack} ${formData.maintainMRP ? styles.switchTrackActive : ""}`}
                    onClick={() => setFormData({ ...formData, maintainMRP: !formData.maintainMRP })}
                  >
                    <div className={`${styles.switchThumb} ${formData.maintainMRP ? styles.switchThumbActive : ""}`} />
                  </div>
                </div>

                {formData.maintainMRP && (
                  <div className={styles.grid2} style={{ marginTop: 2 }}>
                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="mrp-input">
                        MRP (₹)
                      </label>
                      <input
                        id="mrp-input"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`${styles.input} ${errors.mrp ? styles.inputError : ""}`}
                        placeholder="0.00"
                        value={formData.mrp ?? ""}
                        onChange={(e) => {
                          setFormData({ ...formData, mrp: e.target.value });
                          if (errors.mrp) setErrors({ ...errors, mrp: "" });
                        }}
                      />
                      {errors.mrp && (
                        <span className={styles.errorText}>
                          <AlertCircle size={12} /> {errors.mrp}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Maintain Selling Price */}
              <div className={`${styles.settingCard} ${formData.maintainSellingPrice ? styles.settingCardActive : ""}`}>
                <div className={styles.settingHeader}>
                  <span className={styles.settingTitle}>Maintain Selling Price</span>
                  <div
                    id="toggle-maintain-selling-price"
                    className={`${styles.switchTrack} ${formData.maintainSellingPrice ? styles.switchTrackActive : ""}`}
                    onClick={() => setFormData({ ...formData, maintainSellingPrice: !formData.maintainSellingPrice })}
                  >
                    <div className={`${styles.switchThumb} ${formData.maintainSellingPrice ? styles.switchThumbActive : ""}`} />
                  </div>
                </div>

                {formData.maintainSellingPrice && (
                  <div className={styles.grid2} style={{ marginTop: 2 }}>
                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="selling-price-input">
                        Selling Price (₹)
                      </label>
                      <input
                        id="selling-price-input"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`${styles.input} ${errors.sellingPrice ? styles.inputError : ""}`}
                        placeholder="0.00"
                        value={formData.sellingPrice ?? ""}
                        onChange={(e) => {
                          setFormData({ ...formData, sellingPrice: e.target.value });
                          if (errors.sellingPrice) setErrors({ ...errors, sellingPrice: "" });
                        }}
                      />
                      {errors.sellingPrice && (
                        <span className={styles.errorText}>
                          <AlertCircle size={12} /> {errors.sellingPrice}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Maintain Cost Price */}
              <div className={`${styles.settingCard} ${formData.maintainCostPrice ? styles.settingCardActive : ""}`}>
                <div className={styles.settingHeader}>
                  <span className={styles.settingTitle}>Maintain Cost Price</span>
                  <div
                    id="toggle-maintain-cost-price"
                    className={`${styles.switchTrack} ${formData.maintainCostPrice ? styles.switchTrackActive : ""}`}
                    onClick={() => setFormData({ ...formData, maintainCostPrice: !formData.maintainCostPrice })}
                  >
                    <div className={`${styles.switchThumb} ${formData.maintainCostPrice ? styles.switchThumbActive : ""}`} />
                  </div>
                </div>

                {formData.maintainCostPrice && (
                  <div className={styles.grid2} style={{ marginTop: 2 }}>
                    <div className={styles.formField}>
                      <label className={styles.fieldLabel} htmlFor="cost-price-input">
                        Cost Price (₹)
                      </label>
                      <input
                        id="cost-price-input"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`${styles.input} ${errors.costPrice ? styles.inputError : ""}`}
                        placeholder="0.00"
                        value={formData.costPrice ?? ""}
                        onChange={(e) => {
                          setFormData({ ...formData, costPrice: e.target.value });
                          if (errors.costPrice) setErrors({ ...errors, costPrice: "" });
                        }}
                      />
                      {errors.costPrice && (
                        <span className={styles.errorText}>
                          <AlertCircle size={12} /> {errors.costPrice}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SECTION 4: GST DETAILS
            ========================================================= */}
        {activeStep === 4 && (
          <div>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <Receipt size={17} className={styles.sectionIcon} />
                <span className={styles.sectionTitle}>GST Details</span>
              </div>
            </div>

            <div className={styles.grid2}>
              {/* GST Applicability */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="gst-applicability-select">
                  GST Applicability <span className={styles.requiredAsterisk}>*</span>
                </label>
                <select
                  id="gst-applicability-select"
                  className={styles.select}
                  value={formData.gstApplicability ?? "Taxable"}
                  onChange={(e) => {
                    const nextVal = e.target.value as GSTApplicability;
                    setFormData({
                      ...formData,
                      gstApplicability: nextVal,
                      gstRate: nextVal === "Taxable" ? (formData.gstRate || 18) : 0,
                      igstRate: nextVal === "Taxable" ? (formData.igstRate || 18) : 0,
                      cgstRate: nextVal === "Taxable" ? (formData.cgstRate || 9) : 0,
                      sgstRate: nextVal === "Taxable" ? (formData.sgstRate || 9) : 0,
                    });
                  }}
                >
                  <option value="Taxable">Taxable</option>
                  <option value="Exempt">Exempt</option>
                  <option value="Nil Rated">Nil Rated</option>
                  <option value="Non-GST">Non-GST</option>
                </select>
              </div>

              {/* Type of Supply */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>
                  Type of Supply <span className={styles.requiredAsterisk}>*</span>
                </label>
                <div style={{ marginTop: 2 }}>
                  <div className={styles.segmentedGroup}>
                    <button
                      type="button"
                      id="btn-supply-goods"
                      className={`${styles.segmentedBtn} ${formData.supplyType === "Goods" ? styles.segmentedBtnActive : ""}`}
                      onClick={() => setFormData({ ...formData, supplyType: "Goods" })}
                    >
                      Goods
                    </button>
                    <button
                      type="button"
                      id="btn-supply-services"
                      className={`${styles.segmentedBtn} ${formData.supplyType === "Services" ? styles.segmentedBtnActive : ""}`}
                      onClick={() => setFormData({ ...formData, supplyType: "Services" })}
                    >
                      Services
                    </button>
                  </div>
                </div>
              </div>

              {/* HSN Code / SAC Code */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel} htmlFor="hsn-code-input">
                  {formData.supplyType === "Services" ? "SAC Code" : "HSN Code"}
                </label>
                <input
                  id="hsn-code-input"
                  type="text"
                  className={styles.input}
                  placeholder={formData.supplyType === "Services" ? "SAC code" : "HSN code"}
                  value={formData.hsnCode ?? ""}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className={`${styles.formField} ${styles.formFieldFull}`}>
                <label className={styles.fieldLabel} htmlFor="item-description-input">
                  Description
                </label>
                <textarea
                  id="item-description-input"
                  rows={2}
                  className={styles.textarea}
                  placeholder="Description"
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            {/* Conditional Tax Rate Inputs */}
            {formData.gstApplicability === "Taxable" ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <label className={styles.fieldLabel}>
                    GST Rate (%) <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <div className={styles.gstPresetsRow}>
                    {STANDARD_GST_RATES.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        className={`${styles.gstPresetBtn} ${Number(formData.gstRate) === rate ? styles.gstPresetBtnActive : ""}`}
                        onClick={() => handleGstRateChange(rate)}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.grid4}>
                  {/* Overall GST Rate */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="gst-rate-input">
                      GST Rate (%)
                    </label>
                    <input
                      id="gst-rate-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className={`${styles.input} ${errors.gstRate ? styles.inputError : ""}`}
                      value={formData.gstRate ?? ""}
                      onChange={(e) => handleGstRateChange(Number(e.target.value))}
                    />
                  </div>

                  {/* IGST Rate */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="igst-rate-input">
                      IGST Rate (%)
                    </label>
                    <input
                      id="igst-rate-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className={styles.input}
                      value={formData.igstRate ?? ""}
                      onChange={(e) => setFormData({ ...formData, igstRate: e.target.value })}
                    />
                  </div>

                  {/* CGST Rate */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="cgst-rate-input">
                      CGST Rate (%)
                    </label>
                    <input
                      id="cgst-rate-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className={styles.input}
                      value={formData.cgstRate ?? ""}
                      onChange={(e) => setFormData({ ...formData, cgstRate: e.target.value })}
                    />
                  </div>

                  {/* SGST Rate */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="sgst-rate-input">
                      SGST Rate (%)
                    </label>
                    <input
                      id="sgst-rate-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className={styles.input}
                      value={formData.sgstRate ?? ""}
                      onChange={(e) => setFormData({ ...formData, sgstRate: e.target.value })}
                    />
                  </div>

                  {/* Cess Rate */}
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel} htmlFor="cess-rate-input">
                      Cess (%)
                    </label>
                    <input
                      id="cess-rate-input"
                      type="number"
                      step="0.01"
                      min="0"
                      className={`${styles.input} ${errors.cessRate ? styles.inputError : ""}`}
                      value={formData.cessRate ?? ""}
                      placeholder="0"
                      onChange={(e) => setFormData({ ...formData, cessRate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Informative Banner when NOT Taxable */
              <div className={styles.exemptBanner}>
                <div className={styles.exemptBadge}>{formData.gstApplicability}</div>
                <div className={styles.exemptText}>
                  No GST applicable for this supply
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className={styles.modalFooter}>
        <div className={styles.footerLeft}>
          <button
            id="btn-cancel-item-modal"
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        <div className={styles.footerRight}>
          {activeStep > 1 && (
            <button
              id="btn-prev-step"
              type="button"
              className={styles.btnNav}
              onClick={() => setActiveStep((prev) => (prev - 1) as StepKey)}
            >
              <ChevronLeft size={16} /> Previous
            </button>
          )}

          {activeStep < 4 ? (
            <button
              id="btn-next-step"
              type="button"
              className={styles.btnNav}
              onClick={() => setActiveStep((prev) => (prev + 1) as StepKey)}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : null}

          <button
            id="btn-save-item"
            type="submit"
            className={styles.btnSave}
          >
            <Check size={16} />
            {itemToEdit ? "Update Item" : "Save Item"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function ItemModal({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}: ItemModalProps) {
  const isMounted = useIsMounted();

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <ItemModalInner
        key={itemToEdit ? itemToEdit.id : "new-item"}
        onClose={onClose}
        onSave={onSave}
        itemToEdit={itemToEdit}
      />
    </div>,
    document.body
  );
}
