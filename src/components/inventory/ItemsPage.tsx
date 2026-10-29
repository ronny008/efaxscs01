"use client";

import React, { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./ItemsPage.module.css";
import {
  Item,
  SupplyType,
  STOCK_GROUPS,
  STOCK_CATEGORIES,
} from "../../types/inventory";
import ItemModal from "./ItemModal";
import ItemViewModal from "./ItemViewModal";
import {
  Package,
  Plus,
  Search,
  X,
  Eye,
  Edit,
  Trash2,
  Boxes,
  Briefcase,
  Percent,
  AlertTriangle,
} from "lucide-react";

interface ItemsPageProps {
  onItemsCountChange?: (count: number) => void;
}

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function ItemsPage({ onItemsCountChange }: ItemsPageProps) {
  const isMounted = useIsMounted();

  // Items state initialized with localStorage (clearing any old mock items)
  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const demoCleared = localStorage.getItem("erp_items_demo_cleared_v2");
        if (!demoCleared) {
          localStorage.removeItem("erp_inventory_items");
          localStorage.setItem("erp_items_demo_cleared_v2", "true");
          return [];
        }

        const savedItems = localStorage.getItem("erp_inventory_items");
        if (savedItems) {
          const parsed = JSON.parse(savedItems);
          if (Array.isArray(parsed)) {
            // Filter out any leftover mock items by checking their IDs
            const mockIds = ["itm-001", "itm-002", "itm-003", "itm-004", "itm-005", "itm-006", "itm-007", "itm-008"];
            return parsed.filter((itm) => !mockIds.includes(itm.id));
          }
        }
      } catch (e) {
        console.error("Failed to load inventory items from localStorage:", e);
      }
    }
    return [];
  });

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedGSTApplicability, setSelectedGSTApplicability] = useState<string>("All");
  const [selectedSupplyType, setSelectedSupplyType] = useState<"All" | SupplyType>("All");

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [itemToView, setItemToView] = useState<Item | null>(null);

  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  // Sync count to parent whenever items change
  useEffect(() => {
    if (onItemsCountChange) {
      onItemsCountChange(items.length);
    }
  }, [items, onItemsCountChange]);

  // Persist items
  const persistItems = (newItems: Item[]) => {
    setItems(newItems);
    try {
      localStorage.setItem("erp_inventory_items", JSON.stringify(newItems));
    } catch (e) {
      console.error("Failed to persist inventory items:", e);
    }
  };

  // Add or Edit Item handler
  const handleSaveItem = (savedItem: Item) => {
    if (itemToEdit) {
      const updated = items.map((itm) => (itm.id === savedItem.id ? savedItem : itm));
      persistItems(updated);
    } else {
      persistItems([savedItem, ...items]);
    }
    setIsFormModalOpen(false);
    setItemToEdit(null);
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const updated = items.filter((itm) => itm.id !== itemToDelete.id);
    persistItems(updated);
    setItemToDelete(null);
  };

  // Filtered Items logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query matches name, code, HSN code, or part number
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.hsnCode && item.hsnCode.toLowerCase().includes(q)) ||
        (item.partNumber && item.partNumber.toLowerCase().includes(q));

      // 2. Stock Group Filter
      const matchesGroup = selectedGroup === "All" || item.stockGroup === selectedGroup;

      // 3. Stock Category Filter
      const matchesCategory = selectedCategory === "All" || item.stockCategory === selectedCategory;

      // 4. GST Applicability Filter
      const matchesGST =
        selectedGSTApplicability === "All" || item.gstApplicability === selectedGSTApplicability;

      // 5. Type of Supply Filter
      const matchesSupply = selectedSupplyType === "All" || item.supplyType === selectedSupplyType;

      return matchesSearch && matchesGroup && matchesCategory && matchesGST && matchesSupply;
    });
  }, [
    items,
    searchQuery,
    selectedGroup,
    selectedCategory,
    selectedGSTApplicability,
    selectedSupplyType,
  ]);

  // Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const goods = items.filter((i) => i.supplyType === "Goods").length;
    const services = items.filter((i) => i.supplyType === "Services").length;
    const taxable = items.filter((i) => i.gstApplicability === "Taxable").length;
    return { total, goods, services, taxable };
  }, [items]);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedGroup !== "All" ||
    selectedCategory !== "All" ||
    selectedGSTApplicability !== "All" ||
    selectedSupplyType !== "All";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedGroup("All");
    setSelectedCategory("All");
    setSelectedGSTApplicability("All");
    setSelectedSupplyType("All");
  };

  return (
    <div className={styles.itemsContainer}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <div className={styles.breadcrumbBadge}>
            <Boxes size={12} />
            INVENTORY MASTERS
          </div>
          <h1 className={styles.pageTitle}>Items</h1>
          <p className={styles.pageSubtitle}>
            Manage inventory products and services.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            id="btn-add-item"
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setItemToEdit(null);
              setIsFormModalOpen(true);
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Items</span>
            <span className={styles.metricValue}>{metrics.total}</span>
          </div>
          <div className={styles.metricIconBox}>
            <Package size={20} />
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Goods</span>
            <span className={styles.metricValue}>{metrics.goods}</span>
          </div>
          <div className={styles.metricIconBox} style={{ color: "var(--primary-700)" }}>
            <Boxes size={20} />
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Services</span>
            <span className={styles.metricValue}>{metrics.services}</span>
          </div>
          <div className={styles.metricIconBox} style={{ color: "#2563eb", background: "#eff6ff", borderColor: "#bfdbfe" }}>
            <Briefcase size={20} />
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Taxable Items</span>
            <span className={styles.metricValue}>{metrics.taxable}</span>
          </div>
          <div className={styles.metricIconBox} style={{ color: "#047857", background: "#ecfdf5", borderColor: "#a7f3d0" }}>
            <Percent size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className={styles.toolbarCard}>
        {/* Top: Search & Supply Type Segmented Toggle */}
        <div className={styles.toolbarTop}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              id="item-search-input"
              type="text"
              className={styles.searchInput}
              placeholder="Search by name, code, HSN, or part number..."
              value={searchQuery ?? ""}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                id="btn-clear-search"
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.supplyTypeTabs}>
            {(["All", "Goods", "Services"] as const).map((tab) => (
              <button
                key={tab}
                id={`filter-supply-${tab.toLowerCase()}`}
                type="button"
                className={`${styles.supplyTab} ${selectedSupplyType === tab ? styles.supplyTabActive : ""}`}
                onClick={() => setSelectedSupplyType(tab)}
              >
                {tab === "All" ? `All Types (${metrics.total})` : tab === "Goods" ? `Goods (${metrics.goods})` : `Services (${metrics.services})`}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom: Dropdown Filters for Group, Category, and GST */}
        <div className={styles.filterControlsRow}>
          {/* Stock Group Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Stock Group:</span>
            <select
              id="filter-stock-group"
              className={styles.filterSelect}
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="All">All Groups</option>
              {STOCK_GROUPS.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Category Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Stock Category:</span>
            <select
              id="filter-stock-category"
              className={styles.filterSelect}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {STOCK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* GST Applicability Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>GST Applicability:</span>
            <select
              id="filter-gst-applicability"
              className={styles.filterSelect}
              value={selectedGSTApplicability}
              onChange={(e) => setSelectedGSTApplicability(e.target.value)}
            >
              <option value="All">All GST Types</option>
              <option value="Taxable">Taxable</option>
              <option value="Exempt">Exempt</option>
              <option value="Nil Rated">Nil Rated</option>
              <option value="Non-GST">Non-GST</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              id="btn-clear-filters"
              type="button"
              className={styles.resetFiltersBtn}
              onClick={clearAllFilters}
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Items Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.tableResponsive}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th style={{ minWidth: 260 }}>Item Name</th>
                <th style={{ minWidth: 140 }}>Part Number</th>
                <th style={{ minWidth: 140 }}>Stock Group</th>
                <th style={{ minWidth: 130 }}>Stock Category</th>
                <th style={{ minWidth: 120 }}>Primary Unit</th>
                <th style={{ minWidth: 110 }}>GST Rate</th>
                <th style={{ minWidth: 100 }}>Supply Type</th>
                <th style={{ minWidth: 180, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyStateContainer}>
                      <div className={styles.emptyStateIcon}>
                        <Package size={30} />
                      </div>
                      <div className={styles.emptyStateTitle}>No inventory items found</div>
                      <div className={styles.emptyStateDesc}>
                        {hasActiveFilters
                          ? "No items match your active search terms or filter criteria. Try clearing filters or revising your query."
                          : "There are currently no items in this inventory catalog. Click 'Add Item' to create your first product or service."}
                      </div>
                      <div className={styles.emptyStateActions}>
                        {hasActiveFilters ? (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={clearAllFilters}
                          >
                            <X size={14} /> Clear Active Filters
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={styles.primaryBtn}
                          onClick={() => {
                            setItemToEdit(null);
                            setIsFormModalOpen(true);
                          }}
                        >
                          <Plus size={16} /> Add Item
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} id={`item-row-${item.id}`}>
                    {/* Item Name */}
                    <td>
                      <div className={styles.itemNameCell}>
                        <div className={styles.itemAvatar}>
                          {item.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className={styles.itemTitleRow}>
                          <span className={styles.itemTitle}>{item.name}</span>
                          <div className={styles.itemMetaRow}>
                            {item.code && (
                              <span className={styles.itemCodeTag}>
                                {item.code}
                              </span>
                            )}
                            {item.hsnCode && (
                              <span>HSN: {item.hsnCode}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Part Number */}
                    <td>
                      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, color: item.partNumber ? "var(--text-main)" : "var(--text-subtle)" }}>
                        {item.partNumber || "—"}
                      </span>
                    </td>

                    {/* Stock Group */}
                    <td>
                      <span className={styles.badgeGroup}>
                        {item.stockGroup}
                      </span>
                    </td>

                    {/* Stock Category */}
                    <td>
                      <span className={styles.badgeCategory}>
                        {item.stockCategory}
                      </span>
                    </td>

                    {/* Primary Unit (+ Secondary tag if enabled) */}
                    <td>
                      <div className={styles.badgeUnit}>
                        <span className={styles.unitMain}>{item.primaryUnit}</span>
                        {item.enableSecondaryUnit && item.secondaryUnit && (
                          <span className={styles.unitSecondary} title={`1 ${item.secondaryUnit} = ${item.conversionFactor} ${item.primaryUnit}`}>
                            1 {item.secondaryUnit} = {item.conversionFactor} {item.primaryUnit}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* GST Rate */}
                    <td>
                      {item.gstApplicability === "Taxable" ? (
                        <span className={`${styles.badgeGST} ${styles.badgeGSTTaxable}`}>
                          {item.gstRate}% GST
                        </span>
                      ) : (
                        <span className={`${styles.badgeGST} ${styles.badgeGSTExempt}`}>
                          {item.gstApplicability}
                        </span>
                      )}
                    </td>

                    {/* Supply Type */}
                    <td>
                      {item.supplyType === "Goods" ? (
                        <span className={styles.badgeSupplyGoods}>Goods</span>
                      ) : (
                        <span className={styles.badgeSupplyServices}>Services</span>
                      )}
                    </td>

                    {/* Actions: View, Edit, Delete */}
                    <td>
                      <div className={styles.actionsCell}>
                        {/* View Action */}
                        <button
                          id={`btn-view-item-${item.id}`}
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => {
                            setItemToView(item);
                            setIsViewModalOpen(true);
                          }}
                          title="View complete item details"
                        >
                          <Eye size={13} /> View
                        </button>

                        {/* Edit Action */}
                        <button
                          id={`btn-edit-item-${item.id}`}
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => {
                            setItemToEdit(item);
                            setIsFormModalOpen(true);
                          }}
                          title="Edit item parameters"
                        >
                          <Edit size={13} /> Edit
                        </button>

                        {/* Delete Action */}
                        <button
                          id={`btn-delete-item-${item.id}`}
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                          onClick={() => setItemToDelete(item)}
                          title="Delete item"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      <ItemModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setItemToEdit(null);
        }}
        onSave={handleSaveItem}
        itemToEdit={itemToEdit}
      />

      {/* View Item Details Modal */}
      <ItemViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setItemToView(null);
        }}
        onEdit={(itm) => {
          setItemToEdit(itm);
          setIsFormModalOpen(true);
        }}
        item={itemToView}
      />

      {/* Delete Confirmation Modal */}
      {itemToDelete && isMounted && createPortal(
        <div className={styles.confirmBackdrop} onClick={() => setItemToDelete(null)}>
          <div className={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmHeader}>
              <div className={styles.confirmIconBox}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <div className={styles.confirmTitle}>Confirm Item Deletion</div>
                <div className={styles.confirmDesc}>
                  Are you sure you want to permanently delete <strong>{itemToDelete.name}</strong> ({itemToDelete.code || itemToDelete.primaryUnit})? This will remove it from the active inventory catalog demonstration state.
                </div>
              </div>
            </div>

            <div className={styles.confirmFooter}>
              <button
                id="btn-cancel-delete-modal"
                type="button"
                className={styles.btnConfirmCancel}
                onClick={() => setItemToDelete(null)}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-modal"
                type="button"
                className={styles.btnConfirmDelete}
                onClick={handleConfirmDelete}
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
