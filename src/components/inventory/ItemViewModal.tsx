"use client";

import React, { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./ItemViewModal.module.css";
import { Item } from "../../types/inventory";
import {
  X,
  Layers,
  Scale,
  Settings2,
  Receipt,
  Edit,
  CheckCircle2,
  XCircle,
  Package,
} from "lucide-react";

interface ItemViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: Item) => void;
  item: Item | null;
}

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function ItemViewModal({
  isOpen,
  onClose,
  onEdit,
  item,
}: ItemViewModalProps) {
  const isMounted = useIsMounted();

  if (!isOpen || !item || !isMounted) return null;

  const formatCurrency = (amt?: number) => {
    if (amt === undefined || amt === null) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amt);
  };

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarIcon}>
              <Package size={20} />
            </div>
            <div>
              <div className={styles.headerTitle}>{item.name}</div>
              <div className={styles.headerBadges}>
                <span className={`${styles.badge} ${styles.badgeGroup}`}>
                  {item.stockGroup}
                </span>
                <span className={`${styles.badge} ${styles.badgeCategory}`}>
                  {item.stockCategory}
                </span>
                <span className={`${styles.badge} ${styles.badgeSupply}`}>
                  {item.supplyType}
                </span>
                <span className={`${styles.badge} ${styles.badgeGST}`}>
                  {item.gstApplicability === "Taxable" ? `${item.gstRate}% GST` : item.gstApplicability}
                </span>
                {item.code && (
                  <span style={{ fontSize: 11.5, color: "var(--text-subtle)", fontFamily: "monospace" }}>
                    SKU: {item.code}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            id="btn-close-view-modal"
            type="button"
            className={styles.btnClose}
            onClick={onClose}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Card 1: Basics */}
          <div className={styles.detailCard}>
            <div className={styles.cardHeader}>
              <Layers size={15} /> Basic Details
            </div>
            <div className={styles.cardContent}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Item Name</span>
                <span className={styles.infoValue}>{item.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Part Number</span>
                <span className={styles.infoValue}>{item.partNumber || "—"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Stock Group</span>
                <span className={styles.infoValue}>{item.stockGroup}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Stock Category</span>
                <span className={styles.infoValue}>{item.stockCategory}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Units & Conversion */}
          <div className={styles.detailCard}>
            <div className={styles.cardHeader}>
              <Scale size={15} /> Units and Conversion
            </div>
            <div className={styles.cardContent}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Primary Unit</span>
                <span className={styles.infoValue}>{item.primaryUnit}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Secondary Unit</span>
                <span className={styles.infoValue}>
                  {item.enableSecondaryUnit ? (
                    <span className={styles.tagEnabled}>
                      <CheckCircle2 size={13} /> Yes ({item.secondaryUnit})
                    </span>
                  ) : (
                    <span className={styles.tagDisabled}>
                      <XCircle size={13} /> No
                    </span>
                  )}
                </span>
              </div>

              {item.enableSecondaryUnit && (
                <>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Secondary Unit</span>
                    <span className={styles.infoValue}>{item.secondaryUnit}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Conversion</span>
                    <span className={styles.infoValue} style={{ color: "var(--primary-800)" }}>
                      1 {item.secondaryUnit} = {item.conversionFactor} {item.primaryUnit}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 3: Stock & Pricing Settings */}
          <div className={styles.detailCard}>
            <div className={styles.cardHeader}>
              <Settings2 size={15} /> Stock and Pricing Settings
            </div>
            <div className={styles.cardContent}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Batch Tracking</span>
                <span className={styles.infoValue}>
                  {item.enableBatch ? (
                    <span className={styles.tagEnabled}>
                      <CheckCircle2 size={13} /> Enabled {item.batchPrefix ? `(${item.batchPrefix})` : ""}
                    </span>
                  ) : (
                    <span className={styles.tagDisabled}><XCircle size={13} /> Disabled</span>
                  )}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Expiry Tracking</span>
                <span className={styles.infoValue}>
                  {item.enableExpiry ? (
                    <span className={styles.tagEnabled}>
                      <CheckCircle2 size={13} /> Enabled
                    </span>
                  ) : (
                    <span className={styles.tagDisabled}><XCircle size={13} /> Disabled</span>
                  )}
                </span>
              </div>

              {item.enableExpiry && item.mfgDate && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Manufacturing Date</span>
                  <span className={styles.infoValue}>{item.mfgDate}</span>
                </div>
              )}

              {item.enableExpiry && item.expiryDate && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Expiry Date</span>
                  <span className={styles.infoValue}>{item.expiryDate}</span>
                </div>
              )}

              {item.enableExpiry && item.shelfLifeDays && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Shelf Life</span>
                  <span className={styles.infoValue}>{item.shelfLifeDays} days</span>
                </div>
              )}

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Selling Price</span>
                <span className={styles.infoValue}>
                  {item.maintainSellingPrice && item.sellingPrice !== undefined
                    ? `${formatCurrency(item.sellingPrice)} / ${item.primaryUnit}`
                    : "—"}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Cost Price</span>
                <span className={styles.infoValue}>
                  {item.maintainCostPrice && item.costPrice !== undefined
                    ? `${formatCurrency(item.costPrice)} / ${item.primaryUnit}`
                    : "—"}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>MRP</span>
                <span className={styles.infoValue}>
                  {item.maintainMRP && item.mrp !== undefined
                    ? `${formatCurrency(item.mrp)} / ${item.primaryUnit}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: GST Details */}
          <div className={styles.detailCard}>
            <div className={styles.cardHeader}>
              <Receipt size={15} /> GST Details
            </div>
            <div className={styles.cardContent}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>GST Applicability</span>
                <span className={styles.infoValue}>{item.gstApplicability}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  {item.supplyType === "Services" ? "SAC Code" : "HSN Code"}
                </span>
                <span className={styles.infoValue} style={{ fontFamily: "monospace" }}>
                  {item.hsnCode || "—"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Type of Supply</span>
                <span className={styles.infoValue}>{item.supplyType}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>GST Rate</span>
                <span className={styles.infoValue}>
                  {item.gstApplicability === "Taxable" ? `${item.gstRate}%` : "0%"}
                </span>
              </div>

              {item.gstApplicability === "Taxable" && (
                <>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>IGST</span>
                    <span className={styles.infoValue}>{item.igstRate}%</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>CGST / SGST</span>
                    <span className={styles.infoValue}>{item.cgstRate}% + {item.sgstRate}%</span>
                  </div>
                  {item.cessRate > 0 && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Cess</span>
                      <span className={styles.infoValue}>{item.cessRate}%</span>
                    </div>
                  )}
                </>
              )}

              {item.description && (
                <div className={styles.descBox}>
                  <strong>Description:</strong> {item.description}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            id="btn-close-view"
            type="button"
            className={styles.btnSecondary}
            onClick={onClose}
          >
            Close
          </button>
          <button
            id="btn-edit-from-view"
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              onClose();
              onEdit(item);
            }}
          >
            <Edit size={15} /> Edit Item
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
