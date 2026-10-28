"use client";

import React, { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import styles from "./page.module.css";
import { LedgerGroup, Ledger, NatureGroup, OpeningBill } from "../types/erp";
import { INITIAL_LEDGER_GROUPS } from "../data/initialLedgerGroups";
import { INITIAL_LEDGERS } from "../data/initialLedgers";

const emptySubscribe = () => () => {};

const LEDGER_STEPS = ["Basics", "Contact", "Tax & bank", "Balance"] as const;

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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);

  // -------------------------------------------------------------
  // GROUPS & LEDGERS MASTER STATE (Hydration-safe localStorage)
  // -------------------------------------------------------------
  const [ledgerGroups, setLedgerGroups] = useState<LedgerGroup[]>(INITIAL_LEDGER_GROUPS);
  const [ledgers, setLedgers] = useState<Ledger[]>(INITIAL_LEDGERS);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const savedTheme = localStorage.getItem("easygst_theme");
    const initialTheme = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
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

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("easygst_theme", nextTheme);
  };

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
  const [ledgerStep, setLedgerStep] = useState(0);
  const [openingBalanceCollapsed, setOpeningBalanceCollapsed] = useState(false);
  const [ledgerFormData, setLedgerFormData] = useState({
    name: "",
    underGroup: "Primary",
    nature: "Asset" as NatureGroup,
    openingBalance: 0,
    balanceType: "Dr" as "Dr" | "Cr",
    openingBalanceDate: "",
    openingBalanceReference: "",
    openingBalanceNotes: "",
    openingBills: [] as OpeningBill[],
    code: "",
    trackBillByBill: false,
    creditDays: 0,
    creditLimit: 0,
    gstRegistrationType: "Unregistered" as "Regular" | "Consumer" | "Unregistered",
    pan: "",
    cin: "",
    pincode: "",
    country: "India",
    state: "",
    mobile: "",
    whatsapp: "",
    email: "",
    website: "",
    contactPerson: "",
    hasBankDetails: false,
    bankName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankBranch: "",
    gstin: "",

    addressLines: [""],
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
    setLedgerStep(0);
    const defaultGroup =
      ledgerGroups.find((g) => (presetNature ? g.nature === presetNature : g.nature === "Asset"))?.name ||
      ledgerGroups[0]?.name ||
      "Primary";
    const matched = ledgerGroups.find((g) => g.name === defaultGroup);
    const nature = matched ? matched.nature : presetNature || "Asset";
    const defaultBalanceType = nature === "Asset" || nature === "Expenses" ? "Dr" : "Cr";
    const today = new Date().toISOString().slice(0, 10);
    const initialBill: OpeningBill = {
      id: "bill-" + Date.now(),
      reference: "",
      billDate: today,
      dueDate: "",
      amount: 0,
      balanceType: defaultBalanceType,
    };

    setLedgerFormData({
      name: "",
      underGroup: defaultGroup,
      nature,
      openingBalance: 0,
      balanceType: defaultBalanceType,
      openingBalanceDate: today,
      openingBalanceReference: "",
      openingBalanceNotes: "",
      openingBills: [initialBill],
      code: "",
      trackBillByBill: false,
      creditDays: 0,
      creditLimit: 0,
      gstRegistrationType: "Unregistered" as "Regular" | "Consumer" | "Unregistered",
      pan: "",
      cin: "",
      pincode: "",
      country: "India",
      state: "",
      mobile: "",
      whatsapp: "",
      email: "",
      website: "",
      contactPerson: "",
      hasBankDetails: false,
      bankName: "",
      bankAccountNumber: "",
      bankIfsc: "",
      bankBranch: "",
      gstin: "",

      addressLines: [""],
      phone: "",
    });
    setIsLedgerModalOpen(true);
    setCreateDropdownOpen(false);
  };

  const handleOpenEditLedgerModal = (ledger: Ledger) => {
    setEditingLedgerId(ledger.id);
    setLedgerStep(0);
    const bills: OpeningBill[] = (ledger.openingBills && ledger.openingBills.length > 0)
      ? ledger.openingBills
      : [{
          id: "bill-1",
          reference: ledger.openingBalanceReference || "",
          billDate: ledger.openingBalanceDate || "",
          dueDate: "",
          amount: ledger.openingBalance || 0,
          balanceType: ledger.balanceType || (ledger.nature === "Asset" || ledger.nature === "Expenses" ? "Dr" : "Cr"),
        }];

    setLedgerFormData({
      name: ledger.name,
      underGroup: ledger.underGroup,
      nature: ledger.nature,
      openingBalance: ledger.openingBalance,
      balanceType: ledger.balanceType,
      openingBalanceDate: ledger.openingBalanceDate || "",
      openingBalanceReference: ledger.openingBalanceReference || "",
      openingBalanceNotes: ledger.openingBalanceNotes || "",
      openingBills: bills,
      code: ledger.code || "",
      trackBillByBill: !!ledger.trackBillByBill,
      creditDays: ledger.creditDays || 0,
      creditLimit: ledger.creditLimit || 0,
      gstRegistrationType: ledger.gstRegistrationType || "Unregistered",
      pan: ledger.pan || "",
      cin: ledger.cin || "",
      pincode: ledger.pincode || "",
      country: ledger.country || "India",
      state: ledger.state || "",
      mobile: ledger.mobile || "",
      whatsapp: ledger.whatsapp || "",
      email: ledger.email || "",
      website: ledger.website || "",
      contactPerson: ledger.contactPerson || "",
      hasBankDetails: !!ledger.hasBankDetails,
      bankName: ledger.bankName || "",
      bankAccountNumber: ledger.bankAccountNumber || "",
      bankIfsc: ledger.bankIfsc || "",
      bankBranch: ledger.bankBranch || "",
      gstin: ledger.gstin || "",

      addressLines: ledger.addressLines?.length ? ledger.addressLines : ledger.address ? ledger.address.split("\n") : [""],
      phone: ledger.phone || "",
    });
    setIsLedgerModalOpen(true);
  };

  const openingBillsNet = useMemo(() => {
    return ledgerFormData.openingBills.reduce((acc, bill) => {
      const amt = Number(bill.amount) || 0;
      return bill.balanceType === "Cr" ? acc - amt : acc + amt;
    }, 0);
  }, [ledgerFormData.openingBills]);

  const totalOpeningBalance = Math.abs(openingBillsNet);
  const totalBalanceType: "Dr" | "Cr" = openingBillsNet < 0
    ? "Cr"
    : openingBillsNet > 0
      ? "Dr"
      : (ledgerFormData.openingBills[0]?.balanceType || ledgerFormData.balanceType || "Dr");

  const updateOpeningBill = (id: string, changes: Partial<OpeningBill>) => {
    setLedgerFormData((previous) => {
      const nextBills = previous.openingBills.map((bill) =>
        bill.id === id ? { ...bill, ...changes } : bill
      );
      const net = nextBills.reduce((acc, b) => {
        const amt = Number(b.amount) || 0;
        return b.balanceType === "Cr" ? acc - amt : acc + amt;
      }, 0);
      const nextBalanceType: "Dr" | "Cr" = net < 0 ? "Cr" : net > 0 ? "Dr" : (nextBills[0]?.balanceType || previous.balanceType);
      return {
        ...previous,
        openingBills: nextBills,
        openingBalance: Math.abs(net),
        balanceType: nextBalanceType,
        openingBalanceDate: nextBills.find((b) => b.billDate)?.billDate || previous.openingBalanceDate,
        openingBalanceReference: nextBills.find((b) => b.reference.trim())?.reference || previous.openingBalanceReference,
      };
    });
  };

  const addOpeningBill = () => {
    setLedgerFormData((previous) => {
      const defaultType = previous.balanceType || (previous.nature === "Asset" || previous.nature === "Expenses" ? "Dr" : "Cr");
      const lastBill = previous.openingBills[previous.openingBills.length - 1];
      const newBill: OpeningBill = {
        id: "bill-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        reference: "",
        billDate: lastBill?.billDate || previous.openingBalanceDate || new Date().toISOString().slice(0, 10),
        dueDate: lastBill?.dueDate || "",
        amount: 0,
        balanceType: lastBill?.balanceType || defaultType,
      };
      return {
        ...previous,
        openingBills: [...previous.openingBills, newBill],
        trackBillByBill: true,
      };
    });
  };

  const removeOpeningBill = (id: string) => {
    setLedgerFormData((previous) => {
      let nextBills = previous.openingBills.filter((bill) => bill.id !== id);
      if (nextBills.length === 0) {
        nextBills = [{
          id: "bill-" + Date.now(),
          reference: "",
          billDate: "",
          dueDate: "",
          amount: 0,
          balanceType: previous.balanceType || "Dr",
        }];
      }
      const net = nextBills.reduce((acc, b) => {
        const amt = Number(b.amount) || 0;
        return b.balanceType === "Cr" ? acc - amt : acc + amt;
      }, 0);
      const nextBalanceType: "Dr" | "Cr" = net < 0 ? "Cr" : net > 0 ? "Dr" : (nextBills[0]?.balanceType || previous.balanceType);
      return {
        ...previous,
        openingBills: nextBills,
        openingBalance: Math.abs(net),
        balanceType: nextBalanceType,
      };
    });
  };

  const handleSaveLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerFormData.name.trim()) return;
    if (ledgerStep < LEDGER_STEPS.length - 1) {
      setLedgerStep((step) => step + 1);
      return;
    }

    const validBills = ledgerFormData.openingBills.filter((bill) => (Number(bill.amount) || 0) > 0 || bill.reference.trim() !== "");
    const netAmt = validBills.reduce((acc, b) => {
      const amt = Number(b.amount) || 0;
      return b.balanceType === "Cr" ? acc - amt : acc + amt;
    }, 0);
    const finalBalance = Math.abs(netAmt);
    const finalBalanceType: "Dr" | "Cr" = netAmt < 0 ? "Cr" : netAmt > 0 ? "Dr" : (ledgerFormData.openingBills[0]?.balanceType || ledgerFormData.balanceType || "Dr");

    const addressLines = ledgerFormData.addressLines.map((line) => line.trim()).filter(Boolean);
    const details = {
      name: ledgerFormData.name.trim(),
      code: ledgerFormData.code.trim() || undefined,
      underGroup: ledgerFormData.underGroup,
      nature: ledgerFormData.nature,
      trackBillByBill: validBills.length > 0 ? true : ledgerFormData.trackBillByBill,
      creditDays: Number(ledgerFormData.creditDays) || 0,
      creditLimit: Number(ledgerFormData.creditLimit) || 0,
      openingBalance: finalBalance,
      balanceType: finalBalanceType,
      openingBalanceDate: validBills[0]?.billDate || ledgerFormData.openingBalanceDate || undefined,
      openingBalanceReference: validBills[0]?.reference.trim() || ledgerFormData.openingBalanceReference.trim() || undefined,
      openingBalanceNotes: ledgerFormData.openingBalanceNotes.trim() || undefined,
      openingBills: validBills.map((bill) => ({
        ...bill,
        reference: bill.reference.trim(),
        amount: Number(bill.amount) || 0,
      })),
      address: addressLines.join("\n") || undefined,
      addressLines,
      pincode: ledgerFormData.pincode.trim() || undefined,
      country: ledgerFormData.country.trim() || undefined,
      state: ledgerFormData.state.trim() || undefined,
      phone: ledgerFormData.phone.trim() || undefined,
      mobile: ledgerFormData.mobile.trim() || undefined,
      whatsapp: ledgerFormData.whatsapp.trim() || undefined,
      email: ledgerFormData.email.trim() || undefined,
      website: ledgerFormData.website.trim() || undefined,
      contactPerson: ledgerFormData.contactPerson.trim() || undefined,
      pan: ledgerFormData.pan.trim() || undefined,
      cin: ledgerFormData.cin.trim() || undefined,
      gstRegistrationType: ledgerFormData.gstRegistrationType,
      gstin: ledgerFormData.gstin.trim() || undefined,
      hasBankDetails: ledgerFormData.hasBankDetails,
      bankName: ledgerFormData.hasBankDetails ? ledgerFormData.bankName.trim() || undefined : undefined,
      bankAccountNumber: ledgerFormData.hasBankDetails ? ledgerFormData.bankAccountNumber.trim() || undefined : undefined,
      bankIfsc: ledgerFormData.hasBankDetails ? ledgerFormData.bankIfsc.trim() || undefined : undefined,
      bankBranch: ledgerFormData.hasBankDetails ? ledgerFormData.bankBranch.trim() || undefined : undefined,
    };

    if (editingLedgerId) {
      persistLedgers(ledgers.map((ledger) => ledger.id === editingLedgerId ? { ...ledger, ...details } : ledger));
    } else {
      persistLedgers([{ id: "led-" + Date.now(), ...details, createdAt: new Date().toISOString().split("T")[0] }, ...ledgers]);
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
    <div className={styles.erpContainer + " " + (theme === "dark" ? styles.themeDark : styles.themeGhost)}>
      {/* -------------------------------------------------------------
          LEFT SIDEBAR: ONLY ACCOUNTING MASTERS (EasyGST Light Green UI)
          ------------------------------------------------------------- */}
      {sidebarVisible && (
      <aside className={styles.sidebar}>
        <div className={styles.brandHeader}>
          <div className={styles.brandLeft}>
            <span className={styles.productLogo} aria-hidden="true" />
            <div className={styles.brandText}>
              <span className={styles.brandName}>EasyGST <span className={styles.brandNameAccent}>Billing</span></span>
              <span className={styles.brandSubtitle}>BILLING &amp; ACCOUNTS</span>
            </div>
          </div>
          <button type="button" className={styles.hideSidebarBtn} onClick={() => setSidebarVisible(false)} aria-label="Hide sidebar" title="Hide sidebar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        </div>
        <div className={styles.workspaceIdentity}>
          <span className={styles.workspaceAvatar} aria-hidden="true">RH</span>
          <span><strong>Ramesh Hardware</strong><small>9619766319</small></span>
        </div>

        <div className={styles.sidebarCtaWrapper}>
          <div className={styles.sidebarCreateControl}>
            <button
              id="btn-create-master-cta"
              type="button"
              onClick={() => currentView === "groups" ? handleOpenAddModal() : handleOpenAddLedgerModal()}
              className={styles.createInvoiceBtn}
              title={currentView === "groups" ? "Create New Group" : "Create New Ledger"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              <span>{currentView === "groups" ? "Create Group" : "Create Ledger"}</span>
            </button>
            <button type="button" className={styles.createDropdownToggle} aria-label="Choose what to create" aria-expanded={createDropdownOpen} onClick={() => setCreateDropdownOpen(!createDropdownOpen)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
          </div>
          {createDropdownOpen && (
            <div className={styles.sidebarCreateMenu}>
              <button id="dropdown-new-group" type="button" onClick={() => { setCurrentView("groups"); handleOpenAddModal(); }}>Create Group</button>
              <button id="dropdown-new-ledger" type="button" onClick={() => { setCurrentView("ledgers"); handleOpenAddLedgerModal(); }}>Create Ledger</button>
            </div>
          )}
        </div>

        <nav className={styles.sidebarNav} aria-label="Accounting masters">
          <div className={styles.navSection}>
            <div className={styles.sectionHeader}>GENERAL</div>
            <button id="nav-groups-master" type="button" onClick={() => setCurrentView("groups")} className={styles.navItem + (currentView === "groups" ? " " + styles.navItemActive : "")} aria-current={currentView === "groups" ? "page" : undefined}>
              <span className={styles.navItemLeft}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>
                <span>Groups Master</span>
              </span>
              <span className={styles.navBadge} suppressHydrationWarning>{isMounted ? ledgerGroups.length : 0}</span>
            </button>
            <button id="nav-ledgers-master" type="button" onClick={() => setCurrentView("ledgers")} className={styles.navItem + (currentView === "ledgers" ? " " + styles.navItemActive : "")} aria-current={currentView === "ledgers" ? "page" : undefined}>
              <span className={styles.navItemLeft}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1 0-6h11M5 4v13"/><path d="M9 8h6"/></svg>
                <span>Ledgers Master</span>
              </span>
              <span className={styles.navBadge} suppressHydrationWarning>{isMounted ? ledgers.length : 0}</span>
            </button>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.themeToggle} onClick={toggleTheme} aria-pressed={theme === "dark"} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/></svg>}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            <span className={styles.themeToggleTrack} aria-hidden="true"><span /></span>
          </button>
          <button onClick={handleResetAllData} className={styles.resetDataBtn} title="Clear all stored groups & ledgers">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6M10 10v7m4-7v7"/></svg>
            <span>Reset All Data</span>
          </button>
        </div>
      </aside>
      )}

      {/* -------------------------------------------------------------
          MAIN CONTENT AREA & TOP HEADER
          ------------------------------------------------------------- */}
      <main className={styles.mainWrapper}>
        {!sidebarVisible && (
          <div className={styles.sidebarRestoreBar}>
            <button type="button" className={styles.showSidebarBtn} onClick={() => setSidebarVisible(true)} aria-label="Show sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              <span>Show sidebar</span>
            </button>
            <span className={styles.restoreBrand}><span className={styles.productLogo} aria-hidden="true" />EasyGST Billing</span>
            <button type="button" className={styles.restoreThemeBtn} onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
          </div>
        )}
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
                             <span style={{ color: "#475569", fontWeight: 600, fontSize: "12px" }}>✓ Yes</span>
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
          <div className={styles.ledgerModalContent} onClick={(e) => e.stopPropagation()}>
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
              <div className={styles.ledgerStepHeader}>
                <span>Step {ledgerStep + 1} of {LEDGER_STEPS.length}</span>
                <strong>{LEDGER_STEPS[ledgerStep]}</strong>
              </div>
              <div className={styles.ledgerProgressTrack} role="progressbar" aria-label="Ledger form progress" aria-valuenow={ledgerStep + 1} aria-valuemin={1} aria-valuemax={LEDGER_STEPS.length}>
                <div className={styles.ledgerProgressFill} style={{ width: ((ledgerStep + 1) / LEDGER_STEPS.length * 100) + "%" }} />
              </div>
              <div className={styles.ledgerStepList} aria-label="Ledger form steps">
                {LEDGER_STEPS.map((label, index) => (
                  <button key={label} type="button" className={styles.ledgerStepItem + (index === ledgerStep ? " " + styles.ledgerStepItemActive : "") + (index < ledgerStep ? " " + styles.ledgerStepItemDone : "")} disabled={index > ledgerStep} onClick={() => setLedgerStep(index)} aria-current={index === ledgerStep ? "step" : undefined}>
                    <span className={styles.ledgerStepNumber}>{index < ledgerStep ? "✓" : index + 1}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              {ledgerStep === 0 && (<>
              <div className={styles.ledgerSectionTitle}>Ledger details</div>
              <div className={styles.ledgerFieldGrid}>
                <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-name-input">Name *</label><input id="ledger-name-input" className={styles.formInput} required autoFocus value={ledgerFormData.name} onChange={(e) => setLedgerFormData({ ...ledgerFormData, name: e.target.value })} /></div>
                <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-code-input">Code (optional)</label><input id="ledger-code-input" className={styles.formInput} value={ledgerFormData.code} onChange={(e) => setLedgerFormData({ ...ledgerFormData, code: e.target.value })} /></div>
                <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-under-group-select">Group *</label><select id="ledger-under-group-select" value={ledgerFormData.underGroup} onChange={(e) => handleGroupSelectInLedgerForm(e.target.value)} className={styles.formSelect}>{ledgerGroups.length ? ledgerGroups.map((g) => <option key={g.id} value={g.name}>{g.name} ({g.nature})</option>) : <option value="Primary">Primary</option>}</select></div>
                <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-nature-select">Nature</label><select id="ledger-nature-select" value={ledgerFormData.nature} onChange={(e) => setLedgerFormData({ ...ledgerFormData, nature: e.target.value as NatureGroup })} className={styles.formSelect}><option>Asset</option><option>Expenses</option><option>Income</option><option>Liability</option></select></div>
              </div>
              <div className={styles.ledgerSectionTitle}>Credit terms</div>
              <div className={styles.ledgerFieldGrid}>
                <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-bill-tracking">Maintain bill-by-bill tracking?</label><select id="ledger-bill-tracking" className={styles.formSelect} value={ledgerFormData.trackBillByBill ? "yes" : "no"} onChange={(e) => setLedgerFormData({ ...ledgerFormData, trackBillByBill: e.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes</option></select></div>
                <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-credit-days">Credit days</label><input id="ledger-credit-days" type="number" min="0" step="1" className={styles.formInput} value={ledgerFormData.creditDays} onChange={(e) => setLedgerFormData({ ...ledgerFormData, creditDays: Number(e.target.value) })} /></div>
                <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-credit-limit">Credit limit (₹)</label><input id="ledger-credit-limit" type="number" min="0" step="0.01" className={styles.formInput} value={ledgerFormData.creditLimit} onChange={(e) => setLedgerFormData({ ...ledgerFormData, creditLimit: Number(e.target.value) })} /></div>
              </div>
              </>)}
              {ledgerStep === 1 && (<>
              <div className={styles.ledgerSectionTitle}>Address and contact</div>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Address lines</span>
                {ledgerFormData.addressLines.map((line, index) => (
                  <div className={styles.addressLineRow} key={index}>
                    <input id={"ledger-address-line-" + index} aria-label={"Address line " + (index + 1)} className={styles.formInput} placeholder={"Address line " + (index + 1)} value={line} onChange={(e) => setLedgerFormData({ ...ledgerFormData, addressLines: ledgerFormData.addressLines.map((value, lineIndex) => lineIndex === index ? e.target.value : value) })} />
                    {index > 0 && <button type="button" className={styles.addressRemoveBtn} onClick={() => setLedgerFormData({ ...ledgerFormData, addressLines: ledgerFormData.addressLines.filter((_, lineIndex) => lineIndex !== index) })} aria-label={"Remove address line " + (index + 1)}>Remove</button>}
                  </div>
                ))}
                <button type="button" className={styles.addAddressLineBtn} onClick={() => setLedgerFormData({ ...ledgerFormData, addressLines: [...ledgerFormData.addressLines, ""] })}>+ Add address line</button>
              </div>
              <div className={styles.ledgerFieldGrid}>{([["pincode", "PIN code"], ["country", "Country"], ["state", "State"], ["phone", "Phone"], ["mobile", "Mobile"], ["whatsapp", "WhatsApp"], ["email", "Email"], ["website", "Website"], ["contactPerson", "Contact person"]] as const).map(([key, label]) => <div className={styles.formField} key={key}><label className={styles.formLabel} htmlFor={"ledger-" + key}>{label}</label><input id={"ledger-" + key} className={styles.formInput} type={key === "email" ? "email" : "text"} value={ledgerFormData[key]} onChange={(e) => setLedgerFormData({ ...ledgerFormData, [key]: e.target.value })} /></div>)}</div>
              </>)}
              {ledgerStep === 2 && (<>
              <div className={styles.ledgerSectionTitle}>Tax details</div>
              <div className={styles.ledgerFieldGrid}>
                {([["pan", "PAN number"], ["cin", "CIN number"]] as const).map(([key, label]) => <div className={styles.formField} key={key}><label className={styles.formLabel} htmlFor={"ledger-" + key}>{label}</label><input id={"ledger-" + key} className={styles.formInput} value={ledgerFormData[key]} onChange={(e) => setLedgerFormData({ ...ledgerFormData, [key]: e.target.value.toUpperCase() })} /></div>)}
                <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-gst-registration">GST registration type</label><select id="ledger-gst-registration" className={styles.formSelect} value={ledgerFormData.gstRegistrationType} onChange={(e) => setLedgerFormData({ ...ledgerFormData, gstRegistrationType: e.target.value as "Regular" | "Consumer" | "Unregistered" })}><option>Regular</option><option>Consumer</option><option>Unregistered</option></select></div>
                <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-gstin-input">GSTIN</label><input id="ledger-gstin-input" className={styles.formInput} value={ledgerFormData.gstin} onChange={(e) => setLedgerFormData({ ...ledgerFormData, gstin: e.target.value.toUpperCase() })} /></div>
              </div>
              <div className={styles.ledgerSectionTitle}>Bank details</div>
              <div className={styles.formField}><label className={styles.formLabel} htmlFor="ledger-has-bank">Add bank details?</label><select id="ledger-has-bank" className={styles.formSelect} value={ledgerFormData.hasBankDetails ? "yes" : "no"} onChange={(e) => setLedgerFormData({ ...ledgerFormData, hasBankDetails: e.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes</option></select></div>
              {ledgerFormData.hasBankDetails && <div className={styles.ledgerFieldGrid}>{([["bankName", "Bank name"], ["bankAccountNumber", "Account number"], ["bankIfsc", "IFSC code"], ["bankBranch", "Branch"]] as const).map(([key, label]) => <div className={styles.formField} key={key}><label className={styles.formLabel} htmlFor={"ledger-" + key}>{label}</label><input id={"ledger-" + key} className={styles.formInput} value={ledgerFormData[key]} onChange={(e) => setLedgerFormData({ ...ledgerFormData, [key]: key === "bankIfsc" ? e.target.value.toUpperCase() : e.target.value })} /></div>)}</div>}
              </>)}
              {ledgerStep === 3 && (<>
              <div className={styles.openingStockSection}>
                <div className={styles.openingStockHeader}>
                  <div className={styles.openingStockTitle}>Opening Balance</div>
                  <button
                    type="button"
                    className={styles.openingStockCollapseBtn}
                    onClick={() => setOpeningBalanceCollapsed(!openingBalanceCollapsed)}
                    aria-label={openingBalanceCollapsed ? "Expand Opening Balance" : "Collapse Opening Balance"}
                    title={openingBalanceCollapsed ? "Expand" : "Collapse"}
                  >
                    {openingBalanceCollapsed ? "+" : "−"}
                  </button>
                </div>

                {!openingBalanceCollapsed && (
                  <>
                    <div className={styles.openingStockBanner}>
                      Onboarding setup only. Enter bill-by-bill opening balance breakup (Bill No, Bill Date, Due Date, Amount, Dr/Cr).
                    </div>

                    <div className={styles.openingStockTableCard}>
                      <div className={styles.openingStockGrid}>
                        <div className={styles.openingStockHeadRow}>
                          <span>Bill No</span>
                          <span>Bill Date</span>
                          <span>Due Date</span>
                          <span>Amount</span>
                          <span>Dr / Cr</span>
                          <span />
                        </div>

                        {ledgerFormData.openingBills.map((bill) => (
                          <div className={styles.openingStockDataRow} key={bill.id}>
                            <input
                              type="text"
                              className={styles.openingStockInput}
                              placeholder="Bill no."
                              value={bill.reference}
                              onChange={(e) => updateOpeningBill(bill.id, { reference: e.target.value })}
                            />
                            <input
                              type="date"
                              className={styles.openingStockInput}
                              value={bill.billDate}
                              onChange={(e) => updateOpeningBill(bill.id, { billDate: e.target.value })}
                            />
                            <input
                              type="date"
                              className={styles.openingStockInput}
                              value={bill.dueDate}
                              onChange={(e) => updateOpeningBill(bill.id, { dueDate: e.target.value })}
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={styles.openingStockInput}
                              placeholder="0.00"
                              value={bill.amount === 0 ? "" : bill.amount}
                              onChange={(e) => updateOpeningBill(bill.id, { amount: e.target.value === "" ? 0 : Number(e.target.value) })}
                            />
                            <select
                              className={styles.openingStockSelect}
                              value={bill.balanceType || ledgerFormData.balanceType || "Dr"}
                              onChange={(e) => updateOpeningBill(bill.id, { balanceType: e.target.value as "Dr" | "Cr" })}
                            >
                              <option value="Dr">Dr</option>
                              <option value="Cr">Cr</option>
                            </select>
                            <button
                              type="button"
                              className={styles.openingStockRemoveBtn}
                              title="Remove bill"
                              aria-label="Remove bill"
                              onClick={() => removeOpeningBill(bill.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addOpeningBill}
                        className={styles.openingStockAddBtn}
                      >
                        + Add Bill
                      </button>
                    </div>

                    <div className={styles.openingStockSummary}>
                      <div className={styles.openingStockSummaryText}>
                        <span>Total Opening Balance:</span>
                        <strong>{formatCurrency(totalOpeningBalance)} {totalBalanceType}</strong>
                        <span className={styles.openingStockCount}>({ledgerFormData.openingBills.length} {ledgerFormData.openingBills.length === 1 ? "entry" : "entries"})</span>
                      </div>
                      <div className={styles.openingStockNotesWrap}>
                        <input
                          type="text"
                          className={styles.openingStockNotesInput}
                          placeholder="Optional notes / remarks..."
                          value={ledgerFormData.openingBalanceNotes}
                          onChange={(e) => setLedgerFormData({ ...ledgerFormData, openingBalanceNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.ledgerReview}>
                <strong>Ready to save</strong>
                <span>{ledgerFormData.name.trim()} · {ledgerFormData.underGroup}</span>
                <span>{ledgerFormData.addressLines.filter((line) => line.trim()).length} address line(s) · {ledgerFormData.gstRegistrationType}</span>
                <span>{formatCurrency(totalOpeningBalance)} {totalBalanceType}{ledgerFormData.openingBalanceDate ? " as of " + ledgerFormData.openingBalanceDate : ""}</span>
              </div>
              </>)}

              {/* Actions */}
              <div className={styles.modalFooter}>
                {ledgerStep === 0 ? (
                  <button type="button" onClick={() => setIsLedgerModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
                ) : (
                  <button type="button" onClick={() => setLedgerStep((step) => step - 1)} className={styles.cancelBtn}>Back</button>
                )}
                <button id="btn-save-ledger" type="submit" className={styles.saveBtn}>
                  {ledgerStep < LEDGER_STEPS.length - 1 ? "Next step" : editingLedgerId ? "Save Changes" : "Create Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
