"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import { LedgerGroup, Ledger, NatureGroup } from "../types/erp";
import { INITIAL_LEDGER_GROUPS } from "../data/initialLedgerGroups";
import { INITIAL_LEDGERS } from "../data/initialLedgers";
import CreateLedgerPage from "../components/ledger/CreateLedgerPage";
import LedgerModal from "../components/ledger/LedgerModal";
import ItemsPage from "../components/inventory/ItemsPage";

const NATURE_OPTIONS: { key: NatureGroup; label: string; desc: string; badgeClass: string }[] = [
  { key: "Asset", label: "Asset", desc: "Economic resources, Bank, Cash, Debtors, Inventory & Equipment", badgeClass: styles.badgeAsset },
  { key: "Expenses", label: "Expenses", desc: "Direct & indirect costs, purchases, overheads & operations", badgeClass: styles.badgeExpenses },
  { key: "Income", label: "Income", desc: "Sales revenue, services rendered & interest/discount earnings", badgeClass: styles.badgeIncome },
  { key: "Liability", label: "Liability", desc: "Debts, Creditors, Loans, Capital Account & Statutory Taxes", badgeClass: styles.badgeLiability },
];

export default function Home() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<"dashboard" | "ledger-groups" | "ledgers" | "create-ledger" | "items">("items");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [masterExpanded, setMasterExpanded] = useState(true);
  const [accountingExpanded, setAccountingExpanded] = useState(true);
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [itemsCount, setItemsCount] = useState<number>(0);

  // Groups Master State
  const [ledgerGroups, setLedgerGroups] = useState<LedgerGroup[]>(INITIAL_LEDGER_GROUPS);
  const [selectedNatureFilter, setSelectedNatureFilter] = useState<"All" | NatureGroup>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Group Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    underGroup: "Primary",
    nature: "Asset" as NatureGroup,
    affectsGrossProfit: false,
    code: "",
  });

  // Ledgers Master State
  const [ledgers, setLedgers] = useState<Ledger[]>(INITIAL_LEDGERS);
  const [selectedLedgerNatureFilter, setSelectedLedgerNatureFilter] = useState<"All" | NatureGroup>("All");
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");

  // Ledger Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);

  // Load saved state from LocalStorage on mount to prevent SSR hydration mismatches
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("erp_theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        setThemeMode(savedTheme);
      }
      const savedGroups = localStorage.getItem("erp_ledger_groups");
      if (savedGroups) {
        setLedgerGroups(JSON.parse(savedGroups));
      }
      const savedLedgers = localStorage.getItem("erp_ledgers");
      if (savedLedgers) {
        setLedgers(JSON.parse(savedLedgers));
      }
      const savedItems = localStorage.getItem("erp_inventory_items");
      if (savedItems) {
        const parsed = JSON.parse(savedItems);
        if (Array.isArray(parsed)) {
          setItemsCount(parsed.length);
        }
      }
    } catch (e) {
      console.error("Failed to read from localStorage:", e);
    }
  }, []);

  // Sync DOM data-theme with themeMode state
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  // Save Groups to LocalStorage
  const persistGroups = (groups: LedgerGroup[]) => {
    setLedgerGroups(groups);
    try {
      localStorage.setItem("erp_ledger_groups", JSON.stringify(groups));
    } catch (e) {
      console.error("Failed to persist groups to localStorage:", e);
    }
  };

  // Save Ledgers to LocalStorage
  const persistLedgers = (data: Ledger[]) => {
    setLedgers(data);
    try {
      localStorage.setItem("erp_ledgers", JSON.stringify(data));
    } catch (e) {
      console.error("Failed to persist ledgers to localStorage:", e);
    }
  };

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("erp_theme", nextTheme);
  };

  // -------------------------------------------------------------
  // GROUPS LOGIC
  // -------------------------------------------------------------
  const filteredGroups = useMemo(() => {
    return ledgerGroups.filter((g) => {
      const matchesNature = selectedNatureFilter === "All" || g.nature === selectedNatureFilter;
      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.underGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.code && g.code.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesNature && matchesSearch;
    });
  }, [ledgerGroups, selectedNatureFilter, searchQuery]);

  const countsByNature = useMemo(() => {
    return {
      Asset: ledgerGroups.filter((g) => g.nature === "Asset").length,
      Expenses: ledgerGroups.filter((g) => g.nature === "Expenses").length,
      Income: ledgerGroups.filter((g) => g.nature === "Income").length,
      Liability: ledgerGroups.filter((g) => g.nature === "Liability").length,
      Total: ledgerGroups.length,
    };
  }, [ledgerGroups]);

  const handleOpenAddModal = (presetNature?: NatureGroup) => {
    setEditingGroupId(null);
    setFormData({
      name: "",
      underGroup: "Primary",
      nature: presetNature || "Asset",
      affectsGrossProfit: presetNature === "Expenses" || presetNature === "Income",
      code: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group: LedgerGroup) => {
    setEditingGroupId(group.id);
    setFormData({
      name: group.name,
      underGroup: group.underGroup,
      nature: group.nature,
      affectsGrossProfit: group.affectsGrossProfit,
      code: group.code || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingGroupId) {
      const updated = ledgerGroups.map((g) =>
        g.id === editingGroupId
          ? {
              ...g,
              name: formData.name.trim(),
              underGroup: formData.underGroup,
              nature: formData.nature,
              affectsGrossProfit: formData.affectsGrossProfit,
              code: formData.code.trim() || undefined,
            }
          : g
      );
      persistGroups(updated);
    } else {
      const newGroup: LedgerGroup = {
        id: `grp-${Date.now()}`,
        name: formData.name.trim(),
        underGroup: formData.underGroup,
        nature: formData.nature,
        affectsGrossProfit: formData.affectsGrossProfit,
        code: formData.code.trim() || undefined,
      };
      persistGroups([newGroup, ...ledgerGroups]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteGroup = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete group "${name}"?`)) {
      const updated = ledgerGroups.filter((g) => g.id !== id);
      persistGroups(updated);
    }
  };

  const parentGroupOptions = useMemo(() => {
    const list: { name: string; nature?: NatureGroup }[] = [{ name: "Primary" }];
    ledgerGroups.forEach((g) => {
      if (g.id !== editingGroupId && !list.some((item) => item.name === g.name)) {
        list.push({ name: g.name, nature: g.nature });
      }
    });
    return list;
  }, [ledgerGroups, editingGroupId]);

  // Handle Under Group selection in Group modal (auto-inherits parent's Nature & affectsGrossProfit)
  const handleUnderGroupChange = (selectedUnderGroup: string) => {
    if (selectedUnderGroup === "Primary") {
      setFormData((prev) => ({
        ...prev,
        underGroup: "Primary",
      }));
    } else {
      const parent = ledgerGroups.find((g) => g.name === selectedUnderGroup);
      if (parent) {
        setFormData((prev) => ({
          ...prev,
          underGroup: selectedUnderGroup,
          nature: parent.nature,
          affectsGrossProfit: parent.affectsGrossProfit ?? (parent.nature === "Expenses" || parent.nature === "Income"),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          underGroup: selectedUnderGroup,
        }));
      }
    }
  };

  // -------------------------------------------------------------
  // LEDGERS LOGIC
  // -------------------------------------------------------------
  const filteredLedgers = useMemo(() => {
    return ledgers.filter((led) => {
      const matchesNature = selectedLedgerNatureFilter === "All" || led.nature === selectedLedgerNatureFilter;
      const matchesSearch =
        led.name.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
        led.underGroup.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
        (led.gstin && led.gstin.toLowerCase().includes(ledgerSearchQuery.toLowerCase())) ||
        (led.address && led.address.toLowerCase().includes(ledgerSearchQuery.toLowerCase()));
      return matchesNature && matchesSearch;
    });
  }, [ledgers, selectedLedgerNatureFilter, ledgerSearchQuery]);

  const ledgerCountsByNature = useMemo(() => {
    return {
      Asset: ledgers.filter((l) => l.nature === "Asset").length,
      Expenses: ledgers.filter((l) => l.nature === "Expenses").length,
      Income: ledgers.filter((l) => l.nature === "Income").length,
      Liability: ledgers.filter((l) => l.nature === "Liability").length,
      Total: ledgers.length,
    };
  }, [ledgers]);

  const handleOpenAddLedgerModal = (_presetNature?: NatureGroup) => {
    setEditingLedger(null);
    setIsLedgerModalOpen(true);
  };

  const handleOpenEditLedgerModal = (ledger: Ledger) => {
    setEditingLedger(ledger);
    setIsLedgerModalOpen(true);
  };

  const handleSaveLedgerFromModal = (savedLedger: Ledger) => {
    if (editingLedger) {
      const updated = ledgers.map((l) => (l.id === savedLedger.id ? savedLedger : l));
      persistLedgers(updated);
    } else {
      persistLedgers([savedLedger, ...ledgers]);
    }
    setIsLedgerModalOpen(false);
    setEditingLedger(null);
  };

  const handleDeleteLedger = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ledger "${name}"?`)) {
      const updated = ledgers.filter((l) => l.id !== id);
      persistLedgers(updated);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amt);
  };

  return (
    <div className={styles.erpContainer}>
      {/* -------------------------------------------------------------
          LEFT SIDEBAR
          ------------------------------------------------------------- */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
        {/* Brand Header */}
        <div className={styles.brandSection}>
          <div className={styles.brandLogo} title="Billing ERP">
            <img src="/logo.png" alt="Billing ERP Logo" className={styles.brandLogoImg} />
          </div>
          {!sidebarCollapsed && (
            <div className={styles.brandText}>
              <div className={styles.brandTitleRow}>
                <span className={styles.brandTitle}>Billing</span>
                <span className={styles.brandBadge}>ERP</span>
              </div>
              <span className={styles.brandSubtitle}>Kochi Processing Plant</span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className={styles.sidebarNav}>
          {/* MASTER ROOT DROPDOWN */}
          <div className={styles.navGroup}>
            {/* Clickable Master Parent Button */}
            <button
              id="nav-master-root"
              onClick={() => setMasterExpanded(!masterExpanded)}
              className={styles.navRootParent}
              title="Click to toggle Master menu"
            >
              <div className={styles.navParentLeft}>
                {!sidebarCollapsed && <span>Master</span>}
              </div>
              {!sidebarCollapsed && (
                <svg
                  className={`${styles.navChevron} ${masterExpanded ? styles.navChevronExpanded : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>

            {/* When Master is clicked -> Accounting Master and Inventory Master drop down */}
            {masterExpanded && !sidebarCollapsed && (
              <div className={styles.masterSubContainer}>
                {/* 1. Accounting Master */}
                <div>
                  <button
                    id="nav-accounting-master"
                    onClick={() => setAccountingExpanded(!accountingExpanded)}
                    className={styles.navParentItem}
                    title="Accounting Master"
                  >
                    <div className={styles.navParentLeft}>
                      <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <line x1="6" y1="8" x2="10" y2="8" />
                        <line x1="6" y1="12" x2="10" y2="12" />
                        <line x1="6" y1="16" x2="8" y2="16" />
                        <line x1="14" y1="8" x2="18" y2="8" />
                        <line x1="14" y1="12" x2="18" y2="12" />
                      </svg>
                      <span>Accounting Master</span>
                    </div>
                    <svg
                      className={`${styles.navChevron} ${accountingExpanded ? styles.navChevronExpanded : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  {/* Accounting Master -> Groups & Ledgers */}
                  {accountingExpanded && (
                    <div className={styles.subnavContainer}>
                      {/* Groups */}
                      <button
                        id="nav-ledger-groups"
                        onClick={() => setCurrentView("ledger-groups")}
                        className={`${styles.subnavItem} ${currentView === "ledger-groups" ? styles.subnavItemActive : ""}`}
                        title="Groups"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        <span>Groups</span>
                        <span className={`${styles.navBadge} ${styles.navBadgeFeatured}`}>
                          {ledgerGroups.length}
                        </span>
                      </button>

                      {/* Ledgers (Functionally Active) */}
                      <button
                        id="nav-ledgers"
                        onClick={() => setCurrentView("ledgers")}
                        className={`${styles.subnavItem} ${currentView === "ledgers" || currentView === "create-ledger" ? styles.subnavItemActive : ""}`}
                        title="Ledgers"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="8" y1="6" x2="21" y2="6" />
                          <line x1="8" y1="12" x2="21" y2="12" />
                          <line x1="8" y1="18" x2="21" y2="18" />
                          <line x1="3" y1="6" x2="3.01" y2="6" />
                          <line x1="3" y1="12" x2="3.01" y2="12" />
                          <line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                        <span>Ledgers</span>
                        <span className={`${styles.navBadge} ${styles.navBadgeFeatured}`}>
                          {ledgers.length}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Inventory Master */}
                <div>
                  <button
                    id="nav-inventory-master"
                    onClick={() => setInventoryExpanded(!inventoryExpanded)}
                    className={styles.navParentItem}
                    title="Inventory Master"
                  >
                    <div className={styles.navParentLeft}>
                      <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                      <span>Inventory Master</span>
                    </div>
                    <svg
                      className={`${styles.navChevron} ${inventoryExpanded ? styles.navChevronExpanded : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  {/* Inventory Master -> Items */}
                  {inventoryExpanded && (
                    <div className={styles.subnavContainer}>
                      {/* Items */}
                      <button
                        id="nav-inventory-items"
                        onClick={() => setCurrentView("items")}
                        className={`${styles.subnavItem} ${currentView === "items" ? styles.subnavItemActive : ""}`}
                        title="Items"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                          <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                        <span>Items</span>
                        <span className={`${styles.navBadge} ${styles.navBadgeFeatured}`}>
                          {itemsCount}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* User Card & Collapse */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>AK</div>
            {!sidebarCollapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>Arun Kumar</span>
                <span className={styles.userRole}>System Admin</span>
              </div>
            )}
          </div>

          <button
            id="btn-collapse-sidebar"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={styles.collapseBtn}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarCollapsed ? (
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
              ) : (
                <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
              )}
            </svg>
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          MAIN CONTENT AREA & TOP HEADER
          ------------------------------------------------------------- */}
      <main className={styles.mainWrapper}>
        {/* Top Header */}
        <header className={styles.topHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerBreadcrumb}>
              {currentView === "create-ledger"
                ? "Master / Accounting Master / Ledgers / Create Ledger"
                : currentView === "ledgers"
                ? "Master / Accounting Master / Ledgers"
                : currentView === "items"
                ? "Master / Inventory Master / Items"
                : currentView === "dashboard"
                ? "Today"
                : "Master / Accounting Master / Groups"}
            </span>
          </div>

          <div className={styles.headerRight}>
            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className={styles.headerIconBtn}
              title={`Switch to ${themeMode === "light" ? "Dark" : "Light"} Mode`}
            >
              {themeMode === "light" ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            {/* Avatar Pill */}
            <div className={styles.userAvatar} style={{ cursor: "pointer" }} title="Arun Kumar (AK)">
              AK
            </div>
          </div>
        </header>

        {/* -------------------------------------------------------------
            VIEW 1: OPERATING DASHBOARD (IF ACCESSED)
            ------------------------------------------------------------- */}
        {currentView === "dashboard" ? (
          <div className={`${styles.contentContainer} animate-fade-in`}>
            {/* Hero Header */}
            <div className={styles.heroHeader}>
              <div className={styles.heroTitles}>
                <span className={styles.heroTag}>MANUFACTURING OPERATING SYSTEM</span>
                <h1 className={styles.heroHeading}>Good day, Arun. Here&apos;s what needs attention.</h1>
                <p className={styles.heroDescription}>
                  Kochi Processing Plant · 2026–27 · Work moves through one connected operating layer instead of separate departmental screens.
                </p>
              </div>

              {/* Action Buttons */}
              <div className={styles.actionButtonGroup}>
                <button
                  id="btn-quick-ledger-group"
                  onClick={() => handleOpenAddModal()}
                  className={styles.primaryBtn}
                  title="Create a new Group"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>New Group</span>
                </button>
              </div>
            </div>
          </div>
        ) : currentView === "ledger-groups" ? (
          /* -------------------------------------------------------------
              VIEW 2: MASTER DATA - GROUPS MASTER
              ------------------------------------------------------------- */
          <div className={`${styles.contentContainer} animate-fade-in`}>
            {/* Header */}
            <div className={styles.ledgerHeader}>
              <div>
                <span className={styles.breadcrumbBadge}>CHART OF ACCOUNTS</span>
                <h1 className={styles.heroHeading}>Groups Master</h1>
              </div>

              <button
                id="btn-create-ledger-group"
                onClick={() => handleOpenAddModal(selectedNatureFilter !== "All" ? selectedNatureFilter : "Asset")}
                className={styles.primaryBtn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New Group</span>
              </button>
            </div>

            {/* 4 Nature Group Cards */}
            <div className={styles.natureStatsRow}>
              {NATURE_OPTIONS.map((opt) => (
                <div
                  key={opt.key}
                  id={`nature-card-${opt.key.toLowerCase()}`}
                  onClick={() => setSelectedNatureFilter(opt.key)}
                  className={`${styles.natureStatCard} ${
                    opt.key === "Asset"
                      ? styles.natureAsset
                      : opt.key === "Expenses"
                      ? styles.natureExpenses
                      : opt.key === "Income"
                      ? styles.natureIncome
                      : styles.natureLiability
                  } ${selectedNatureFilter === opt.key ? styles.natureStatCardActive : ""}`}
                >
                  <div className={styles.natureStatTitle}>
                    <span>{opt.label}</span>
                    <span className={styles.badgeUnderGroup}>Nature</span>
                  </div>
                  <div className={styles.natureStatCount}>{countsByNature[opt.key]} Groups</div>
                  <div className={styles.natureStatDesc}>{opt.desc}</div>
                </div>
              ))}
            </div>

            {/* Toolbar: Nature Tabs & Search */}
            <div className={styles.tableToolbar}>
              <div className={styles.natureTabs}>
                {(["All", "Asset", "Expenses", "Income", "Liability"] as const).map((tab) => (
                  <button
                    key={tab}
                    id={`filter-tab-${tab.toLowerCase()}`}
                    onClick={() => setSelectedNatureFilter(tab)}
                    className={`${styles.natureTab} ${selectedNatureFilter === tab ? styles.natureTabActive : ""}`}
                  >
                    {tab} {tab === "All" ? `(${countsByNature.Total})` : `(${countsByNature[tab]})`}
                  </button>
                ))}
              </div>

              <div className={styles.tableSearchWrapper}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="ledger-table-search"
                  type="text"
                  placeholder="Filter by group or parent..."
                  value={searchQuery ?? ""}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.tableSearchInput}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={{ color: "var(--text-subtle)", fontSize: 12 }}>
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Groups Table */}
            <div className={styles.tableContainer}>
              <table className={styles.erpTable}>
                <thead>
                  <tr>
                    <th>Group Name</th>
                    <th>Under Group (Parent)</th>
                    <th>Nature of Group (4 Core)</th>
                    <th>Affects Gross Profit</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "48px 20px" }}>
                        <div style={{ color: "var(--text-subtle)", fontSize: 14 }}>
                          No groups match your search or nature criteria.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((group) => (
                      <tr key={group.id} id={`row-${group.id}`}>
                        <td>
                          <div className={styles.groupNameCell}>
                            <div className={styles.groupIcon}>
                              {group.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className={styles.groupTitle}>{group.name}</div>
                              {group.code && <div className={styles.groupCode}>Code: {group.code}</div>}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={styles.badgeUnderGroup}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                            {group.underGroup}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.badgeNature} ${
                              group.nature === "Asset"
                                ? styles.badgeAsset
                                : group.nature === "Expenses"
                                ? styles.badgeExpenses
                                : group.nature === "Income"
                                ? styles.badgeIncome
                                : styles.badgeLiability
                            }`}
                          >
                            ● {group.nature}
                          </span>
                        </td>

                        <td>
                          {group.affectsGrossProfit ? (
                            <span className={styles.badgeAffectsProfitYes}>✓ Yes</span>
                          ) : (
                            <span className={styles.badgeAffectsProfitNo}>— No</span>
                          )}
                        </td>

                        <td>
                          <div className={styles.actionCell}>
                            <button
                              id={`btn-edit-${group.id}`}
                              onClick={() => handleOpenEditModal(group)}
                              className={styles.tableActionBtn}
                              title="Edit Group"
                            >
                              Edit
                            </button>
                            <button
                              id={`btn-delete-${group.id}`}
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                              className={`${styles.tableActionBtn} ${styles.tableDeleteBtn}`}
                              title="Delete Group"
                            >
                              Delete
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
        ) : currentView === "create-ledger" ? (
          /* -------------------------------------------------------------
              VIEW 4: CREATE LEDGER (FULL-PAGE ACCORDING TO SPEC)
              ------------------------------------------------------------- */
          <div className="animate-fade-in" style={{ width: "100%" }}>
            <CreateLedgerPage
              onBack={() => setCurrentView("ledgers")}
              onSuccess={(newLedger) => {
                persistLedgers([newLedger, ...ledgers]);
                setCurrentView("ledgers");
              }}
              existingGroups={ledgerGroups}
              existingLedgers={ledgers}
            />
          </div>
        ) : currentView === "items" ? (
          /* -------------------------------------------------------------
              VIEW 5: INVENTORY MASTERS - ITEMS
              ------------------------------------------------------------- */
          <div className="animate-fade-in" style={{ width: "100%" }}>
            <ItemsPage onItemsCountChange={(count) => setItemsCount(count)} />
          </div>
        ) : (
          /* -------------------------------------------------------------
              VIEW 3: MASTER DATA - LEDGERS MASTER (FUNCTIONAL)
              ------------------------------------------------------------- */
          <div className={`${styles.contentContainer} animate-fade-in`}>
            {/* Header */}
            <div className={styles.ledgerHeader}>
              <div>
                <span className={styles.breadcrumbBadge}>ACCOUNTING MASTER</span>
                <h1 className={styles.heroHeading}>Ledgers Master</h1>
              </div>

              <button
                id="btn-create-ledger"
                onClick={() => handleOpenAddLedgerModal()}
                className={styles.primaryBtn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New Ledger</span>
              </button>
            </div>

            {/* 4 Nature Ledger Cards */}
            <div className={styles.natureStatsRow}>
              {NATURE_OPTIONS.map((opt) => (
                <div
                  key={opt.key}
                  id={`ledger-nature-card-${opt.key.toLowerCase()}`}
                  onClick={() => setSelectedLedgerNatureFilter(opt.key)}
                  className={`${styles.natureStatCard} ${
                    opt.key === "Asset"
                      ? styles.natureAsset
                      : opt.key === "Expenses"
                      ? styles.natureExpenses
                      : opt.key === "Income"
                      ? styles.natureIncome
                      : styles.natureLiability
                  } ${selectedLedgerNatureFilter === opt.key ? styles.natureStatCardActive : ""}`}
                >
                  <div className={styles.natureStatTitle}>
                    <span>{opt.label}</span>
                    <span className={styles.badgeUnderGroup}>Pillar</span>
                  </div>
                  <div className={styles.natureStatCount}>{ledgerCountsByNature[opt.key]} Ledgers</div>
                  <div className={styles.natureStatDesc}>{opt.desc}</div>
                </div>
              ))}
            </div>

            {/* Toolbar: Nature Tabs & Search */}
            <div className={styles.tableToolbar}>
              <div className={styles.natureTabs}>
                {(["All", "Asset", "Expenses", "Income", "Liability"] as const).map((tab) => (
                  <button
                    key={tab}
                    id={`ledger-filter-tab-${tab.toLowerCase()}`}
                    onClick={() => setSelectedLedgerNatureFilter(tab)}
                    className={`${styles.natureTab} ${selectedLedgerNatureFilter === tab ? styles.natureTabActive : ""}`}
                  >
                    {tab} {tab === "All" ? `(${ledgerCountsByNature.Total})` : `(${ledgerCountsByNature[tab]})`}
                  </button>
                ))}
              </div>

              <div className={styles.tableSearchWrapper}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="ledger-search-input"
                  type="text"
                  placeholder="Filter ledgers by name, group, GSTIN..."
                  value={ledgerSearchQuery ?? ""}
                  onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  className={styles.tableSearchInput}
                />
                {ledgerSearchQuery && (
                  <button onClick={() => setLedgerSearchQuery("")} style={{ color: "var(--text-subtle)", fontSize: 12 }}>
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Ledgers Table */}
            <div className={styles.tableContainer}>
              <table className={styles.erpTable}>
                <thead>
                  <tr>
                    <th>Ledger Name</th>
                    <th>Under Group</th>
                    <th>Nature</th>
                    <th>Opening Balance</th>
                    <th>GSTIN / Tax ID</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "48px 20px" }}>
                        <div style={{ color: "var(--text-subtle)", fontSize: 14 }}>
                          No ledgers found matching the criteria. Click &quot;+ New Ledger&quot; to add one.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLedgers.map((ledger) => (
                      <tr key={ledger.id} id={`ledger-row-${ledger.id}`}>
                        <td>
                          <div className={styles.groupNameCell}>
                            <div className={styles.groupIcon}>
                              {ledger.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className={styles.groupTitle}>{ledger.name}</div>
                              {ledger.address && (
                                <div style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                                  {ledger.address} {ledger.phone ? `• ${ledger.phone}` : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={styles.badgeUnderGroup}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                            {ledger.underGroup}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.badgeNature} ${
                              ledger.nature === "Asset"
                                ? styles.badgeAsset
                                : ledger.nature === "Expenses"
                                ? styles.badgeExpenses
                                : ledger.nature === "Income"
                                ? styles.badgeIncome
                                : styles.badgeLiability
                            }`}
                          >
                            ● {ledger.nature}
                          </span>
                        </td>

                        <td>
                          <div className={styles.balanceCell}>
                            <span>{formatCurrency(ledger.openingBalance)}</span>
                            <span className={ledger.balanceType === "Dr" ? styles.drTag : styles.crTag}>
                              {ledger.balanceType}
                            </span>
                          </div>
                        </td>

                        <td>
                          {ledger.gstin ? (
                            <span className={styles.gstinCode}>{ledger.gstin}</span>
                          ) : (
                            <span style={{ color: "var(--text-subtle)", fontSize: "12px" }}>—</span>
                          )}
                        </td>

                        <td>
                          <div className={styles.actionCell}>
                            <button
                              id={`btn-edit-ledger-${ledger.id}`}
                              onClick={() => handleOpenEditLedgerModal(ledger)}
                              className={styles.tableActionBtn}
                              title="Edit Ledger"
                            >
                              Edit
                            </button>
                            <button
                              id={`btn-delete-ledger-${ledger.id}`}
                              onClick={() => handleDeleteLedger(ledger.id, ledger.name)}
                              className={`${styles.tableActionBtn} ${styles.tableDeleteBtn}`}
                              title="Delete Ledger"
                            >
                              Delete
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
        )}
      </main>

      {/* -------------------------------------------------------------
          MODAL: CREATE / EDIT GROUP
          ------------------------------------------------------------- */}
      {isModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>{editingGroupId ? "Edit Group" : "Create Master Group"}</span>
              </div>
              <button
                id="btn-close-modal"
                onClick={() => setIsModalOpen(false)}
                className={styles.modalCloseBtn}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className={styles.modalForm}>
              {/* Group Name */}
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="group-name-input">
                  Group Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <span className={styles.formLabelDesc}>
                  Enter descriptive title for this accounting grouping (e.g., Sundry Debtors, Direct Overheads).
                </span>
                <input
                  id="group-name-input"
                  type="text"
                  required
                  placeholder="e.g. Factory Power & Utilities"
                  value={formData.name ?? ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={styles.formInput}
                  autoFocus
                />
              </div>

              {/* Under Group */}
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="under-group-select">
                  Under Group (Parent Account)
                </label>
                <span className={styles.formLabelDesc}>
                  Select parent group or assign to &quot;Primary&quot; for top-level chart of accounts.
                </span>
                <select
                  id="under-group-select"
                  value={formData.underGroup}
                  onChange={(e) => handleUnderGroupChange(e.target.value)}
                  className={styles.formSelect}
                >
                  {parentGroupOptions.map((opt) => (
                    <option key={opt.name} value={opt.name}>
                      {opt.name === "Primary" ? "Primary (Top-level)" : `Under: ${opt.name} (${opt.nature})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nature of Group */}
              <div className={styles.formField}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                  <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                    Nature of Group (4 Core Accounting Pillars) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  {formData.underGroup !== "Primary" && (
                    <span className={styles.inheritedBadge}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Inherited from {formData.underGroup}
                    </span>
                  )}
                </div>
                <span className={styles.formLabelDesc}>
                  {formData.underGroup === "Primary"
                    ? "Top-level Primary groups define their own nature."
                    : `Automatically inherited from parent group "${formData.underGroup}". To choose a different nature, set Under Group to "Primary" or select another parent.`}
                </span>
                <div className={styles.natureRadioGroup}>
                  {NATURE_OPTIONS.map((opt) => {
                    const isSelected = formData.nature === opt.key;
                    const isInherited = formData.underGroup !== "Primary";
                    const isDisabled = isInherited && !isSelected;
                    return (
                      <div
                        key={opt.key}
                        id={`radio-nature-${opt.key.toLowerCase()}`}
                        onClick={() => {
                          if (isInherited) return;
                          setFormData({
                            ...formData,
                            nature: opt.key,
                            affectsGrossProfit: opt.key === "Expenses" || opt.key === "Income",
                          });
                        }}
                        className={`${styles.natureRadioCard} ${
                          isSelected ? styles.natureRadioSelected : ""
                        } ${isDisabled ? styles.natureRadioDisabled : ""}`}
                        style={isInherited ? { cursor: isSelected ? "default" : "not-allowed" } : undefined}
                        title={
                          isDisabled
                            ? `Nature is automatically locked to ${formData.nature} (inherited from ${formData.underGroup})`
                            : undefined
                        }
                      >
                        <div className={styles.natureRadioHeader}>
                          <span className={styles.natureRadioName}>{opt.label}</span>
                          {isSelected && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-emerald)" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span className={styles.natureRadioSubtext}>{opt.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Affects Gross Profit Toggle */}
              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.formLabel}>Affects Gross Profit</div>
                  <div className={styles.formLabelDesc}>
                    When active, accounts under this group impact Trading/Gross calculations.
                  </div>
                </div>
                <div
                  id="toggle-affects-gross-profit"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      affectsGrossProfit: !formData.affectsGrossProfit,
                    })
                  }
                  className={`${styles.toggleSwitch} ${
                    formData.affectsGrossProfit ? styles.toggleSwitchActive : ""
                  }`}
                >
                  <div className={styles.toggleKnob} />
                </div>
              </div>

              {/* Code */}
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="group-code-input">
                  Group Code / Alias (Optional)
                </label>
                <input
                  id="group-code-input"
                  type="text"
                  placeholder="e.g. 5140 or AST-BNK"
                  value={formData.code ?? ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              {/* Actions */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  id="btn-modal-cancel"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button type="submit" id="btn-modal-save" className={styles.primaryBtn}>
                  {editingGroupId ? "Update Group" : "Save Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: CREATE / EDIT LEDGER (4-STEP MATCHING SPEC)
          ------------------------------------------------------------- */}
      <LedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => {
          setIsLedgerModalOpen(false);
          setEditingLedger(null);
        }}
        onSave={handleSaveLedgerFromModal}
        ledgerToEdit={editingLedger}
        existingGroups={ledgerGroups}
        existingLedgers={ledgers}
      />

    </div>
  );
}