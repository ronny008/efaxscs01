"use client";

import React, { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import styles from "./page.module.css";
import { LedgerGroup, Ledger, NatureGroup } from "../types/erp";
import { INITIAL_LEDGER_GROUPS } from "../data/initialLedgerGroups";
import { INITIAL_LEDGERS } from "../data/initialLedgers";

const emptySubscribe = () => () => {};

const NATURE_OPTIONS: { key: NatureGroup; label: string; badgeClass: string }[] = [
  { key: "Asset", label: "Asset", badgeClass: styles.badgeAsset },
  { key: "Expenses", label: "Expenses", badgeClass: styles.badgeExpenses },
  { key: "Income", label: "Income", badgeClass: styles.badgeIncome },
  { key: "Liability", label: "Liability", badgeClass: styles.badgeLiability },
];

export default function Home() {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Navigation: Only working accounting masters (Groups & Ledgers)
  const [currentView, setCurrentView] = useState<"groups" | "ledgers">("groups");
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);

  // -------------------------------------------------------------
  // GROUPS & LEDGERS MASTER STATE (Hydration-safe localStorage)
  // -------------------------------------------------------------
  const [ledgerGroups, setLedgerGroups] = useState<LedgerGroup[]>(INITIAL_LEDGER_GROUPS);
  const [ledgers, setLedgers] = useState<Ledger[]>(INITIAL_LEDGERS);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const savedGroups = localStorage.getItem("easygst_v3_groups");
    if (savedGroups) {
      try {
        setLedgerGroups(JSON.parse(savedGroups));
      } catch (e) {
        console.error("Failed to load saved ledger groups", e);
      }
    }
    const savedLedgers = localStorage.getItem("easygst_v3_ledgers");
    if (savedLedgers) {
      try {
        setLedgers(JSON.parse(savedLedgers));
      } catch (e) {
        console.error("Failed to load saved ledgers", e);
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const [selectedNatureFilter, setSelectedNatureFilter] = useState<"All" | NatureGroup>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrossProfitOnly, setFilterGrossProfitOnly] = useState(false);

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

  const [selectedLedgerNatureFilter, setSelectedLedgerNatureFilter] = useState<"All" | NatureGroup>("All");
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");

  // Ledger Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [ledgerFormData, setLedgerFormData] = useState({
    name: "",
    underGroup: "Primary",
    nature: "Asset" as NatureGroup,
    openingBalance: 0,
    balanceType: "Dr" as "Dr" | "Cr",
    gstin: "",
    address: "",
    phone: "",
  });

  // Save Groups to LocalStorage
  const persistGroups = (groups: LedgerGroup[]) => {
    setLedgerGroups(groups);
    localStorage.setItem("easygst_v3_groups", JSON.stringify(groups));
  };

  // Save Ledgers to LocalStorage
  const persistLedgers = (data: Ledger[]) => {
    setLedgers(data);
    localStorage.setItem("easygst_v3_ledgers", JSON.stringify(data));
  };

  // Reset all data utility
  const handleResetAllData = () => {
    if (confirm("Are you sure you want to clear all groups and ledgers? This cannot be undone.")) {
      persistGroups([]);
      persistLedgers([]);
      setSearchQuery("");
      setLedgerSearchQuery("");
    }
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
      const matchesGrossProfit = !filterGrossProfitOnly || !!g.affectsGrossProfit;
      return matchesNature && matchesSearch && matchesGrossProfit;
    });
  }, [ledgerGroups, selectedNatureFilter, searchQuery, filterGrossProfitOnly]);

  const primaryGroupsCount = useMemo(() => {
    return ledgerGroups.filter((g) => g.underGroup === "Primary").length;
  }, [ledgerGroups]);

  const subGroupsCount = useMemo(() => {
    return ledgerGroups.filter((g) => g.underGroup !== "Primary").length;
  }, [ledgerGroups]);

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
    setCreateDropdownOpen(false);
  };

  const handleOpenEditModal = (group: LedgerGroup) => {
    setEditingGroupId(group.id);
    setFormData({
      name: group.name,
      underGroup: group.underGroup,
      nature: group.nature,
      affectsGrossProfit: !!group.affectsGrossProfit,
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
      persistGroups([...ledgerGroups, newGroup]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteGroup = (id: string, name: string) => {
    // Check if any ledger is linked to this group
    const isLinked = ledgers.some((l) => l.underGroup === name);
    if (isLinked) {
      alert(`Cannot delete group "${name}" because one or more ledgers are currently grouped under it.`);
      return;
    }

    if (confirm(`Are you sure you want to delete the group "${name}"?`)) {
      const updated = ledgerGroups.filter((g) => g.id !== id);
      persistGroups(updated);
    }
  };

  const parentGroupOptions = useMemo(() => {
    const list: { name: string; nature?: NatureGroup }[] = [{ name: "Primary" }];
    ledgerGroups.forEach((g) => {
      if (!editingGroupId || g.id !== editingGroupId) {
        list.push({ name: g.name, nature: g.nature });
      }
    });
    return list;
  }, [ledgerGroups, editingGroupId]);

  const handleUnderGroupChange = (parentName: string) => {
    if (parentName === "Primary") {
      setFormData((prev) => ({
        ...prev,
        underGroup: "Primary",
      }));
    } else {
      const parentGroup = ledgerGroups.find((g) => g.name === parentName);
      if (parentGroup) {
        setFormData((prev) => ({
          ...prev,
          underGroup: parentName,
          nature: parentGroup.nature,
          affectsGrossProfit: !!parentGroup.affectsGrossProfit,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          underGroup: parentName,
        }));
      }
    }
  };

  // -------------------------------------------------------------
  // LEDGERS LOGIC
  // -------------------------------------------------------------
  const filteredLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      const matchesNature = selectedLedgerNatureFilter === "All" || l.nature === selectedLedgerNatureFilter;
      const matchesSearch =
        l.name.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
        l.underGroup.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
        (l.gstin && l.gstin.toLowerCase().includes(ledgerSearchQuery.toLowerCase())) ||
        (l.phone && l.phone.toLowerCase().includes(ledgerSearchQuery.toLowerCase()));
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

  const totalDrBalance = useMemo(() => {
    return ledgers.filter((l) => l.balanceType === "Dr").reduce((sum, l) => sum + (l.openingBalance || 0), 0);
  }, [ledgers]);

  const totalCrBalance = useMemo(() => {
    return ledgers.filter((l) => l.balanceType === "Cr").reduce((sum, l) => sum + (l.openingBalance || 0), 0);
  }, [ledgers]);

  const handleGroupSelectInLedgerForm = (groupName: string) => {
    const matchedGroup = ledgerGroups.find((g) => g.name === groupName);
    const nature = matchedGroup ? matchedGroup.nature : "Asset";
    const defaultBalanceType: "Dr" | "Cr" = nature === "Asset" || nature === "Expenses" ? "Dr" : "Cr";

    setLedgerFormData((prev) => ({
      ...prev,
      underGroup: groupName,
      nature,
      balanceType: defaultBalanceType,
    }));
  };

  const handleOpenAddLedgerModal = (presetNature?: NatureGroup) => {
    setEditingLedgerId(null);
    const defaultGroup =
      ledgerGroups.find((g) => (presetNature ? g.nature === presetNature : g.nature === "Asset"))?.name ||
      ledgerGroups[0]?.name ||
      "Primary";
    const matched = ledgerGroups.find((g) => g.name === defaultGroup);
    const nature = matched ? matched.nature : presetNature || "Asset";

    setLedgerFormData({
      name: "",
      underGroup: defaultGroup,
      nature,
      openingBalance: 0,
      balanceType: nature === "Asset" || nature === "Expenses" ? "Dr" : "Cr",
      gstin: "",
      address: "",
      phone: "",
    });
    setIsLedgerModalOpen(true);
    setCreateDropdownOpen(false);
  };

  const handleOpenEditLedgerModal = (ledger: Ledger) => {
    setEditingLedgerId(ledger.id);
    setLedgerFormData({
      name: ledger.name,
      underGroup: ledger.underGroup,
      nature: ledger.nature,
      openingBalance: ledger.openingBalance,
      balanceType: ledger.balanceType,
      gstin: ledger.gstin || "",
      address: ledger.address || "",
      phone: ledger.phone || "",
    });
    setIsLedgerModalOpen(true);
  };

  const handleSaveLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerFormData.name.trim()) return;

    if (editingLedgerId) {
      const updated = ledgers.map((l) =>
        l.id === editingLedgerId
          ? {
              ...l,
              name: ledgerFormData.name.trim(),
              underGroup: ledgerFormData.underGroup,
              nature: ledgerFormData.nature,
              openingBalance: Number(ledgerFormData.openingBalance) || 0,
              balanceType: ledgerFormData.balanceType,
              gstin: ledgerFormData.gstin.trim() || undefined,
              address: ledgerFormData.address.trim() || undefined,
              phone: ledgerFormData.phone.trim() || undefined,
            }
          : l
      );
      persistLedgers(updated);
    } else {
      const newLedger: Ledger = {
        id: `led-${Date.now()}`,
        name: ledgerFormData.name.trim(),
        underGroup: ledgerFormData.underGroup,
        nature: ledgerFormData.nature,
        openingBalance: Number(ledgerFormData.openingBalance) || 0,
        balanceType: ledgerFormData.balanceType,
        gstin: ledgerFormData.gstin.trim() || undefined,
        address: ledgerFormData.address.trim() || undefined,
        phone: ledgerFormData.phone.trim() || undefined,
        createdAt: new Date().toISOString().split("T")[0],
      };
      persistLedgers([newLedger, ...ledgers]);
    }

    setIsLedgerModalOpen(false);
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
          LEFT SIDEBAR: ONLY ACCOUNTING MASTERS (EasyGST Light Green UI)
          ------------------------------------------------------------- */}
      <aside className={styles.sidebar}>
        {/* Brand Header */}
        <div className={styles.brandHeader}>
          <div className={styles.brandLeft}>
            <div className={styles.sidebarUserAvatar}>RH</div>
            <div className={styles.brandText}>
              <div className={styles.brandName}>
                <span>Ramesh Hardware</span>
              </div>
              <span className={styles.brandSubtitle}>9619766319</span>
            </div>
          </div>

          <button className={styles.collapseSidebarBtn} title="Collapse Sidebar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Primary Action Button */}
        <div className={styles.sidebarCtaWrapper} style={{ position: "relative" }}>
          <button
            id="btn-create-master-cta"
            onClick={() => {
              if (currentView === "groups") {
                handleOpenAddModal();
              } else {
                handleOpenAddLedgerModal();
              }
            }}
            className={styles.createInvoiceBtn}
            title={currentView === "groups" ? "Create New Group" : "Create New Ledger"}
          >
            <div className={styles.createInvoiceLeft}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{currentView === "groups" ? "Create Group" : "Create Ledger"}</span>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setCreateDropdownOpen(!createDropdownOpen);
              }}
              style={{ display: "flex", alignItems: "center", padding: "2px 4px" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {/* Quick Action Dropdown */}
          {createDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                left: "14px",
                right: "14px",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                zIndex: 50,
                padding: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <button
                id="dropdown-new-group"
                onClick={() => {
                  setCurrentView("groups");
                  handleOpenAddModal();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  color: "#1e293b",
                  fontSize: "12.5px",
                  borderRadius: "4px",
                  textAlign: "left",
                }}
              >
                <span>📁 + New Accounting Group</span>
              </button>
              <button
                id="dropdown-new-ledger"
                onClick={() => {
                  setCurrentView("ledgers");
                  handleOpenAddLedgerModal();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  color: "#1e293b",
                  fontSize: "12.5px",
                  borderRadius: "4px",
                  textAlign: "left",
                }}
              >
                <span>👤 + New Ledger Account</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Nav: ONLY ACCOUNTING MASTERS */}
        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            <div className={styles.sectionHeader}>ACCOUNTING MASTERS</div>

            {/* 1. Groups Master */}
            <button
              id="nav-groups-master"
              onClick={() => setCurrentView("groups")}
              className={`${styles.navItem} ${currentView === "groups" ? styles.navItemActive : ""}`}
            >
              <div className={styles.navItemLeft}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Groups Master</span>
              </div>
              <div className={styles.navItemRight}>
                <span className={styles.navBadge} suppressHydrationWarning>
                  {isMounted ? ledgerGroups.length : 0}
                </span>
              </div>
            </button>

            {/* 2. Ledgers Master */}
            <button
              id="nav-ledgers-master"
              onClick={() => setCurrentView("ledgers")}
              className={`${styles.navItem} ${currentView === "ledgers" ? styles.navItemActive : ""}`}
            >
              <div className={styles.navItemLeft}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span>Ledgers Master</span>
              </div>
              <div className={styles.navItemRight}>
                <span className={styles.navBadge} suppressHydrationWarning>
                  {isMounted ? ledgers.length : 0}
                </span>
              </div>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer with Reset Data */}
        <div className={styles.sidebarFooter}>
          <button
            onClick={handleResetAllData}
            className={styles.resetDataBtn}
            title="Clear all stored groups & ledgers"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Reset All Data</span>
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          MAIN CONTENT AREA & TOP HEADER
          ------------------------------------------------------------- */}
      <main className={styles.mainWrapper}>
        {/* -------------------------------------------------------------
            PAGE 1: GROUPS MASTER (Clean working accounting page)
            ------------------------------------------------------------- */}
        {currentView === "groups" ? (
          <div className={`${styles.contentContainer} animate-fade-in`}>
            {/* 1. Dashboard Title & Utilities Row */}
            <div className={styles.dashHeaderRow}>
              <h1 className={styles.dashTitle}>Groups</h1>

              <div className={styles.dashUtilities}>
                <button className={styles.dashUtilityBtn} title="View Reports">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>Reports</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <button className={styles.dashIconBtn} title="Settings">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>

                <button className={styles.dashIconBtn} title="Shortcuts & Barcode">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="6" y1="8" x2="6.01" y2="8" strokeWidth="3" />
                    <line x1="10" y1="8" x2="10.01" y2="8" strokeWidth="3" />
                    <line x1="14" y1="8" x2="14.01" y2="8" strokeWidth="3" />
                    <line x1="18" y1="8" x2="18.01" y2="8" strokeWidth="3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 2. Three KPI Metric Summary Cards */}
            <div className={styles.dashCardsGrid}>
              {/* Card 1: Total Groups */}
              <div className={styles.dashCard}>
                <div className={styles.dashCardTop}>
                  <div className={styles.dashCardLabelWrap}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.dashCardIconTrend}>
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    <span>Total Groups</span>
                    <span className={styles.dashCardInfoIcon} title="All active accounting groups">ⓘ</span>
                  </div>
                  <span className={styles.dashCardOpenIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </span>
                </div>
                <div className={styles.dashCardValue} suppressHydrationWarning>{isMounted ? ledgerGroups.length : 0}</div>
              </div>

              {/* Card 2: Primary Groups */}
              <div className={styles.dashCard}>
                <div className={styles.dashCardTop}>
                  <div className={styles.dashCardLabelWrap}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.dashCardIconBox}>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Primary Groups</span>
                    <span className={styles.dashCardInfoIcon} title="Root level parent groups">ⓘ</span>
                  </div>
                  <span className={styles.dashCardOpenIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </span>
                </div>
                <div className={styles.dashCardValue} suppressHydrationWarning>{isMounted ? primaryGroupsCount : 0}</div>
              </div>

              {/* Card 3: Sub Groups */}
              <div className={styles.dashCard}>
                <div className={styles.dashCardTop}>
                  <div className={styles.dashCardLabelWrap}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.dashCardIconAlert}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Sub Groups</span>
                    <span className={styles.dashCardInfoIcon} title="Child groups nested under parents">ⓘ</span>
                  </div>
                  <span className={styles.dashCardOpenIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </span>
                </div>
                <div className={styles.dashCardValue} suppressHydrationWarning>{isMounted ? subGroupsCount : 0}</div>
              </div>
            </div>

            {/* 3. Toolbar Row (Search, Nature Filter, Gross Profit Toggle, Bulk Actions, Create Group) */}
            <div className={styles.dashToolbarRow}>
              <div className={styles.dashToolbarLeft}>
                {/* Search Box */}
                <div className={styles.dashSearchWrap}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by Group Name, Code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.dashSearchInput}
                  />
                  <span className={styles.dashBarcodeIcon} title="Barcode Scanner / Shortcut">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="6" y1="8" x2="6.01" y2="8" strokeWidth="3" />
                      <line x1="10" y1="8" x2="10.01" y2="8" strokeWidth="3" />
                      <line x1="14" y1="8" x2="14.01" y2="8" strokeWidth="3" />
                      <line x1="18" y1="8" x2="18.01" y2="8" strokeWidth="3" />
                    </svg>
                  </span>
                </div>

                {/* Nature Dropdown (Matching 'Search Categories ▾') */}
                <select
                  value={selectedNatureFilter}
                  onChange={(e) => setSelectedNatureFilter(e.target.value as NatureGroup | "All")}
                  className={styles.dashSelect}
                >
                  <option value="All">All Natures ({countsByNature.Total})</option>
                  <option value="Asset">Asset ({countsByNature.Asset})</option>
                  <option value="Expenses">Expenses ({countsByNature.Expenses})</option>
                  <option value="Income">Income ({countsByNature.Income})</option>
                  <option value="Liability">Liability ({countsByNature.Liability})</option>
                </select>

                {/* Quick Toggle (Matching 'Show Low Stock') */}
                <button
                  type="button"
                  onClick={() => setFilterGrossProfitOnly(!filterGrossProfitOnly)}
                  className={`${styles.dashPillFilter} ${filterGrossProfitOnly ? styles.dashPillFilterActive : ""}`}
                  title="Filter groups affecting gross profit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  <span>Affects Gross Profit</span>
                </button>
              </div>

              <div className={styles.dashToolbarRight}>
                {/* Bulk Actions Button */}
                <button
                  type="button"
                  className={styles.dashBulkBtn}
                  onClick={() => alert("Bulk actions: Select rows from the table below to export or edit.")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span>Bulk Actions</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Create Group Button */}
                <button
                  id="btn-create-ledger-group"
                  onClick={() => handleOpenAddModal(selectedNatureFilter !== "All" ? selectedNatureFilter : "Asset")}
                  className={styles.dashCreateBtn}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create Group</span>
                </button>
              </div>
            </div>

            {/* Groups Table or Clean Empty State */}
            {filteredGroups.length === 0 ? (
              <div className={styles.emptyStateCard}>
                <div className={styles.emptyStateIconWrap}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    <line x1="12" y1="11" x2="12" y2="17" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                  </svg>
                </div>
                <div className={styles.emptyStateTitle}>
                  {ledgerGroups.length === 0 ? "No Accounting Groups" : "No Matching Groups Found"}
                </div>
                <button
                  onClick={() => handleOpenAddModal(selectedNatureFilter !== "All" ? selectedNatureFilter : "Asset")}
                  className={styles.primaryActionBtn}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create First Group</span>
                </button>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.masterTable}>
                  <thead>
                    <tr>
                      <th>Group Name</th>
                      <th>Under Group (Parent)</th>
                      <th>Nature of Group</th>
                      <th>Affects Gross Profit</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((group) => (
                      <tr key={group.id} id={`row-${group.id}`}>
                        <td>
                          <div className={styles.nameCell}>
                            <div className={styles.avatarInitial}>{group.name.substring(0, 2).toUpperCase()}</div>
                            <div>
                              <div className={styles.nameTitle}>{group.name}</div>
                              {group.code && <div className={styles.nameCode}>Code: {group.code}</div>}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={styles.badgeUnderGroup}>{group.underGroup}</span>
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
                            <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "12px" }}>✓ Yes</span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>— No</span>
                          )}
                        </td>

                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              id={`btn-edit-${group.id}`}
                              onClick={() => handleOpenEditModal(group)}
                              className={styles.editBtn}
                              title="Edit Group"
                            >
                              Edit
                            </button>
                            <button
                              id={`btn-delete-${group.id}`}
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                              className={styles.deleteBtn}
                              title="Delete Group"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* -------------------------------------------------------------
              PAGE 2: LEDGERS MASTER (Clean working accounting page)
              ------------------------------------------------------------- */
          <div className={`${styles.contentContainer} animate-fade-in`}>
            {/* 1. Dashboard Title & Utilities Row */}
            <div className={styles.dashHeaderRow}>
              <h1 className={styles.dashTitle}>Ledgers</h1>

              <div className={styles.dashUtilities}>
                <button className={styles.dashUtilityBtn} title="View Reports">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>Reports</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <button className={styles.dashIconBtn} title="Settings">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>

                <button className={styles.dashIconBtn} title="Shortcuts & Barcode">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="6" y1="8" x2="6.01" y2="8" strokeWidth="3" />
                    <line x1="10" y1="8" x2="10.01" y2="8" strokeWidth="3" />
                    <line x1="14" y1="8" x2="14.01" y2="8" strokeWidth="3" />
                    <line x1="18" y1="8" x2="18.01" y2="8" strokeWidth="3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 2. Three KPI Metric Summary Cards */}
            <div className={styles.dashCardsGrid}>
              {/* Card 1: Total Ledgers */}
              <div className={styles.dashCard}>
                <div className={styles.dashCardTop}>
                  <div className={styles.dashCardLabelWrap}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.dashCardIconTrend}>
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    <span>Total Ledgers</span>
                    <span className={styles.dashCardInfoIcon} title="All active ledgers">ⓘ</span>
                  </div>
                  <span className={styles.dashCardOpenIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </span>
                </div>
                <div className={styles.dashCardValue} suppressHydrationWarning>{isMounted ? ledgers.length : 0}</div>
              </div>

              {/* Card 2: Total Receivables */}
              <div className={styles.dashCard}>
                <div className={styles.dashCardTop}>
                  <div className={styles.dashCardLabelWrap}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.dashCardIconBox}>
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span>Total Receivables (Dr)</span>
                    <span className={styles.dashCardInfoIcon} title="Debit balance sum">ⓘ</span>
                  </div>
                  <span className={styles.dashCardOpenIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </span>
                </div>
                <div className={styles.dashCardValue} suppressHydrationWarning>{isMounted ? formatCurrency(totalDrBalance) : "₹0.00"}</div>
              </div>

              {/* Card 3: Total Payables */}
              <div className={styles.dashCard}>
                <div className={styles.dashCardTop}>
                  <div className={styles.dashCardLabelWrap}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.dashCardIconAlert}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Total Payables (Cr)</span>
                    <span className={styles.dashCardInfoIcon} title="Credit balance sum">ⓘ</span>
                  </div>
                  <span className={styles.dashCardOpenIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </span>
                </div>
                <div className={styles.dashCardValue} suppressHydrationWarning>{isMounted ? formatCurrency(totalCrBalance) : "₹0.00"}</div>
              </div>
            </div>

            {/* 3. Toolbar Row (Search, Nature Filter, Bulk Actions, Create Ledger) */}
            <div className={styles.dashToolbarRow}>
              <div className={styles.dashToolbarLeft}>
                <div className={styles.dashSearchWrap}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by Ledger Name, GSTIN..."
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    className={styles.dashSearchInput}
                  />
                  <span className={styles.dashBarcodeIcon} title="Barcode Scanner / Shortcut">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="6" y1="8" x2="6.01" y2="8" strokeWidth="3" />
                      <line x1="10" y1="8" x2="10.01" y2="8" strokeWidth="3" />
                      <line x1="14" y1="8" x2="14.01" y2="8" strokeWidth="3" />
                      <line x1="18" y1="8" x2="18.01" y2="8" strokeWidth="3" />
                    </svg>
                  </span>
                </div>

                <select
                  value={selectedLedgerNatureFilter}
                  onChange={(e) => setSelectedLedgerNatureFilter(e.target.value as NatureGroup | "All")}
                  className={styles.dashSelect}
                >
                  <option value="All">All Natures ({ledgerCountsByNature.Total})</option>
                  <option value="Asset">Asset ({ledgerCountsByNature.Asset})</option>
                  <option value="Expenses">Expenses ({ledgerCountsByNature.Expenses})</option>
                  <option value="Income">Income ({ledgerCountsByNature.Income})</option>
                  <option value="Liability">Liability ({ledgerCountsByNature.Liability})</option>
                </select>
              </div>

              <div className={styles.dashToolbarRight}>
                <button
                  type="button"
                  className={styles.dashBulkBtn}
                  onClick={() => alert("Bulk actions: Select rows from the table below to export or edit.")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span>Bulk Actions</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <button
                  id="btn-create-ledger"
                  onClick={() => handleOpenAddLedgerModal(selectedLedgerNatureFilter !== "All" ? selectedLedgerNatureFilter : "Asset")}
                  className={styles.dashCreateBtn}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create Ledger</span>
                </button>
              </div>
            </div>

            {/* Ledgers Table or Clean Empty State */}
            {filteredLedgers.length === 0 ? (
              <div className={styles.emptyStateCard}>
                <div className={styles.emptyStateIconWrap}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    <line x1="10" y1="8" x2="16" y2="8" />
                    <line x1="10" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <div className={styles.emptyStateTitle}>
                  {ledgers.length === 0 ? "No Ledgers" : "No Matching Ledgers Found"}
                </div>
                <button
                  onClick={() => handleOpenAddLedgerModal(selectedLedgerNatureFilter !== "All" ? selectedLedgerNatureFilter : "Asset")}
                  className={styles.primaryActionBtn}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create First Ledger</span>
                </button>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.masterTable}>
                  <thead>
                    <tr>
                      <th>Ledger Name / Account</th>
                      <th>Under Group</th>
                      <th>Nature</th>
                      <th>Opening Balance</th>
                      <th>GSTIN / Tax ID</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedgers.map((ledger) => (
                      <tr key={ledger.id} id={`ledger-row-${ledger.id}`}>
                        <td>
                          <div className={styles.nameCell}>
                            <div className={styles.avatarInitial}>{ledger.name.substring(0, 2).toUpperCase()}</div>
                            <div>
                              <div className={styles.nameTitle}>{ledger.name}</div>
                              {ledger.address && (
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                  {ledger.address} {ledger.phone ? `• ${ledger.phone}` : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={styles.badgeUnderGroup}>{ledger.underGroup}</span>
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
                          <span style={{ fontWeight: 600 }}>{formatCurrency(ledger.openingBalance)}</span>
                          <span className={ledger.balanceType === "Dr" ? styles.drTag : styles.crTag}>
                            {ledger.balanceType}
                          </span>
                        </td>

                        <td>
                          {ledger.gstin ? (
                            <span className={styles.gstinTag}>{ledger.gstin}</span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>
                          )}
                        </td>

                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              id={`btn-edit-ledger-${ledger.id}`}
                              onClick={() => handleOpenEditLedgerModal(ledger)}
                              className={styles.editBtn}
                              title="Edit Ledger"
                            >
                              Edit
                            </button>
                            <button
                              id={`btn-delete-ledger-${ledger.id}`}
                              onClick={() => handleDeleteLedger(ledger.id, ledger.name)}
                              className={styles.deleteBtn}
                              title="Delete Ledger"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* -------------------------------------------------------------
          MODAL 1: CREATE / EDIT GROUP
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
                <input
                  id="group-name-input"
                  type="text"
                  required
                  placeholder="e.g. Current Assets, Bank Accounts, Direct Expenses"
                  value={formData.name}
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
                <select
                  id="under-group-select"
                  value={formData.underGroup}
                  onChange={(e) => handleUnderGroupChange(e.target.value)}
                  className={styles.formSelect}
                >
                  {parentGroupOptions.map((opt) => (
                    <option key={opt.name} value={opt.name}>
                      {opt.name === "Primary" ? "Primary (Top-level)" : `${opt.name} (${opt.nature})`}
                    </option>
                  ))}
                </select>
                {formData.underGroup !== "Primary" && (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      color: "var(--brand-green)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 500,
                    }}
                  >
                    <span>✓ Inherits Parent Nature:</span>
                    <span
                      className={`${styles.badgeNature} ${
                        formData.nature === "Asset"
                          ? styles.badgeAsset
                          : formData.nature === "Expenses"
                          ? styles.badgeExpenses
                          : formData.nature === "Income"
                          ? styles.badgeIncome
                          : styles.badgeLiability
                      }`}
                    >
                      ● {formData.nature}
                    </span>
                  </div>
                )}
              </div>

              {/* Nature of Group */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Nature of Group <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className={styles.natureRadioGrid}>
                  {NATURE_OPTIONS.map((opt) => (
                    <div
                      key={opt.key}
                      id={`radio-nature-${opt.key.toLowerCase()}`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          nature: opt.key,
                          affectsGrossProfit: opt.key === "Expenses" || opt.key === "Income",
                        })
                      }
                      className={`${styles.natureRadioOption} ${
                        formData.nature === opt.key ? styles.natureRadioSelected : ""
                      }`}
                    >
                      <div className={styles.natureRadioTitle}>
                        <span>{opt.label}</span>
                        {formData.nature === opt.key && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand-green)" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
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
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              {/* Affects Gross Profit Toggle */}
              <div className={styles.checkboxField}>
                <input
                  type="checkbox"
                  id="affects-gross-profit"
                  checked={formData.affectsGrossProfit}
                  onChange={(e) => setFormData({ ...formData, affectsGrossProfit: e.target.checked })}
                  className={styles.checkboxInput}
                />
                <label htmlFor="affects-gross-profit" className={styles.checkboxLabel}>
                  Affects Gross Profit (Direct Trading Account)
                </label>
              </div>

              {/* Actions */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  id="btn-save-group"
                  type="submit"
                  className={styles.saveBtn}
                >
                  {editingGroupId ? "Save Changes" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 2: CREATE / EDIT LEDGER
          ------------------------------------------------------------- */}
      {isLedgerModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsLedgerModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <span>{editingLedgerId ? "Edit Ledger" : "Create Ledger Account"}</span>
              </div>
              <button
                id="btn-close-ledger-modal"
                onClick={() => setIsLedgerModalOpen(false)}
                className={styles.modalCloseBtn}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLedger} className={styles.modalForm}>
              {/* Ledger Name */}
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="ledger-name-input">
                  Ledger Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id="ledger-name-input"
                  type="text"
                  required
                  placeholder="e.g. Ramesh Hardware, HDFC Bank, Office Rent"
                  value={ledgerFormData.name}
                  onChange={(e) => setLedgerFormData({ ...ledgerFormData, name: e.target.value })}
                  className={styles.formInput}
                  autoFocus
                />
              </div>

              {/* Under Group */}
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="ledger-under-group-select">
                  Under Group <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  id="ledger-under-group-select"
                  value={ledgerFormData.underGroup}
                  onChange={(e) => handleGroupSelectInLedgerForm(e.target.value)}
                  className={styles.formSelect}
                >
                  {ledgerGroups.length > 0 ? (
                    ledgerGroups.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name} ({g.nature})
                      </option>
                    ))
                  ) : (
                    <option value="Primary">Primary (No custom groups created yet)</option>
                  )}
                </select>
              </div>

              {/* Nature & Balance Row */}
              <div className={styles.formRowTwo}>
                <div className={styles.formField}>
                  <label className={styles.formLabel} htmlFor="ledger-nature-select">
                    Nature
                  </label>
                  <select
                    id="ledger-nature-select"
                    value={ledgerFormData.nature}
                    onChange={(e) =>
                      setLedgerFormData({
                        ...ledgerFormData,
                        nature: e.target.value as NatureGroup,
                      })
                    }
                    className={styles.formSelect}
                  >
                    <option value="Asset">Asset</option>
                    <option value="Expenses">Expenses</option>
                    <option value="Income">Income</option>
                    <option value="Liability">Liability</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel} htmlFor="ledger-balance-input">
                    Opening Balance (₹)
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      id="ledger-balance-input"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={ledgerFormData.openingBalance || ""}
                      onChange={(e) =>
                        setLedgerFormData({
                          ...ledgerFormData,
                          openingBalance: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={styles.formInput}
                    />
                    <div className={styles.drCrToggle}>
                      <button
                        type="button"
                        onClick={() => setLedgerFormData({ ...ledgerFormData, balanceType: "Dr" })}
                        className={`${styles.drCrBtn} ${ledgerFormData.balanceType === "Dr" ? styles.drCrBtnActive : ""}`}
                      >
                        Dr
                      </button>
                      <button
                        type="button"
                        onClick={() => setLedgerFormData({ ...ledgerFormData, balanceType: "Cr" })}
                        className={`${styles.drCrBtn} ${ledgerFormData.balanceType === "Cr" ? styles.drCrBtnActive : ""}`}
                      >
                        Cr
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* GSTIN & Phone Row */}
              <div className={styles.formRowTwo}>
                <div className={styles.formField}>
                  <label className={styles.formLabel} htmlFor="ledger-gstin-input">
                    GSTIN / Tax ID (Optional)
                  </label>
                  <input
                    id="ledger-gstin-input"
                    type="text"
                    placeholder="e.g. 33AABCT1334M1Z5"
                    value={ledgerFormData.gstin}
                    onChange={(e) => setLedgerFormData({ ...ledgerFormData, gstin: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel} htmlFor="ledger-phone-input">
                    Phone / Contact (Optional)
                  </label>
                  <input
                    id="ledger-phone-input"
                    type="text"
                    placeholder="e.g. +91 98401 22334"
                    value={ledgerFormData.phone}
                    onChange={(e) => setLedgerFormData({ ...ledgerFormData, phone: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              {/* Address */}
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="ledger-address-input">
                  Address (Optional)
                </label>
                <input
                  id="ledger-address-input"
                  type="text"
                  placeholder="e.g. 14, Main Road, Industrial Estate"
                  value={ledgerFormData.address}
                  onChange={(e) => setLedgerFormData({ ...ledgerFormData, address: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              {/* Actions */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsLedgerModalOpen(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  id="btn-save-ledger"
                  type="submit"
                  className={styles.saveBtn}
                >
                  {editingLedgerId ? "Save Changes" : "Create Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}