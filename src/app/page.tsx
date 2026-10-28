"use client";

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import styles from "./page.module.css";
import { LedgerGroup, Ledger, NatureGroup, GstRegistrationType, OpeningBillDetail } from "../types/erp";
import { INITIAL_LEDGER_GROUPS } from "../data/initialLedgerGroups";
import { INITIAL_LEDGERS } from "../data/initialLedgers";

const emptySubscribe = () => () => {};

const NATURE_OPTIONS: { key: NatureGroup; label: string; desc: string; badgeClass: string }[] = [
  { key: "Asset", label: "Asset", desc: "Economic resources, Bank, Cash, Debtors, Inventory & Equipment", badgeClass: styles.badgeAsset },
  { key: "Expenses", label: "Expenses", desc: "Direct & indirect costs, purchases, overheads & operations", badgeClass: styles.badgeExpenses },
  { key: "Income", label: "Income", desc: "Sales revenue, services rendered & interest/discount earnings", badgeClass: styles.badgeIncome },
  { key: "Liability", label: "Liability", desc: "Debts, Creditors, Loans, Capital Account & Statutory Taxes", badgeClass: styles.badgeLiability },
];

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function Home() {
  // Client mount detection via useSyncExternalStore prevents SSR hydration mismatch
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Navigation & View State
  const [currentView, setCurrentView] = useState<"dashboard" | "ledger-groups" | "ledgers">("ledger-groups");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("erp_theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
    }
    return "light";
  });
  const [masterExpanded, setMasterExpanded] = useState(true);
  const [accountingExpanded, setAccountingExpanded] = useState(true);

  // Groups Master State (Lazy initialisation avoids cascading render lint errors)
  const [ledgerGroups, setLedgerGroups] = useState<LedgerGroup[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp_ledger_groups");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return INITIAL_LEDGER_GROUPS;
  });
  const [selectedNatureFilter, setSelectedNatureFilter] = useState<"All" | NatureGroup>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Tree Expand/Collapse state
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => {
    return new Set(INITIAL_LEDGER_GROUPS.map((g) => g.id));
  });

  // Group Details View Modal State
  const [viewingGroup, setViewingGroup] = useState<LedgerGroup | null>(null);

  // Delete Confirmation Modal State (with child group reminder)
  interface DeleteGroupModalData {
    group: LedgerGroup;
    childGroups: LedgerGroup[];
    allDescendantIds: Set<string>;
    deleteChildren: boolean;
  }
  const [deleteModalData, setDeleteModalData] = useState<DeleteGroupModalData | null>(null);

  // Notification Toast State
  const [toast, setToast] = useState<{ title: string; message: string; type?: "success" | "danger" } | null>(null);

  const showToast = useCallback((title: string, message: string, type: "success" | "danger" = "success") => {
    setToast({ title, message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

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
  const [ledgers, setLedgers] = useState<Ledger[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp_ledgers");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const dummyIds = new Set(["led-1", "led-2", "led-3", "led-4", "led-5", "led-6", "led-7", "led-8"]);
            return parsed.filter((l: Ledger) => !dummyIds.has(l.id));
          }
        } catch {}
      }
    }
    return INITIAL_LEDGERS;
  });
  const [selectedLedgerNatureFilter, setSelectedLedgerNatureFilter] = useState<"All" | NatureGroup>("All");
  const [selectedLedgerGroupFilter, setSelectedLedgerGroupFilter] = useState<string>("All");
  const [selectedGstTypeFilter, setSelectedGstTypeFilter] = useState<"All" | GstRegistrationType>("All");
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");

  // Ledgers View State: "list" (table view) | "form" (dedicated full-page creation/edit)
  const [ledgerViewMode, setLedgerViewMode] = useState<"list" | "form">("list");
  type LedgerFormSection = "basic" | "contact" | "tax" | "bank" | "opening";
  const [activeLedgerSection, setActiveLedgerSection] = useState<LedgerFormSection>("basic");
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [viewingLedger, setViewingLedger] = useState<Ledger | null>(null);
  const [ledgerToDelete, setLedgerToDelete] = useState<Ledger | null>(null);
  const [ledgerErrors, setLedgerErrors] = useState<Record<string, string>>({});
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false);

  interface LedgerFormData {
    name: string;
    code: string;
    underGroup: string;
    nature: NatureGroup;
    // Billing & Credit
    maintainBillByBill: boolean;
    creditDays: number | "";
    creditLimit: number | "";
    // Address & Contact
    address: string;
    contactPerson: string;
    phone: string;
    whatsapp: string;
    email: string;
    website: string;
    pincode: string;
    country: string;
    state: string;
    // Business & Tax
    pan: string;
    cin: string;
    gstType: GstRegistrationType;
    gstin: string;
    // Bank Details
    maintainBankDetails: boolean;
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    // Opening Balance
    openingBalance: number | "";
    balanceType: "Dr" | "Cr";
    openingBills: {
      id: string;
      billNo: string;
      billDate: string;
      dueDate?: string;
      amount: number | "";
      drCr: "Dr" | "Cr";
    }[];
  }

  const [ledgerFormData, setLedgerFormData] = useState<LedgerFormData>({
    name: "",
    code: "",
    underGroup: "Sundry Debtors",
    nature: "Asset",
    maintainBillByBill: false,
    creditDays: "",
    creditLimit: "",
    address: "",
    contactPerson: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    pincode: "",
    country: "India",
    state: "Kerala",
    pan: "",
    cin: "",
    gstType: "Regular",
    gstin: "",
    maintainBankDetails: false,
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    openingBalance: "",
    balanceType: "Dr",
    openingBills: [],
  });

  // Opening Bills Table States (defaultly open)
  const [isOpeningBillsDropdownOpen, setIsOpeningBillsDropdownOpen] = useState(true);

  // Sync theme with document attribute & purge legacy dummy ledgers from localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("erp_ledgers");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const dummyIds = new Set(["led-1", "led-2", "led-3", "led-4", "led-5", "led-6", "led-7", "led-8"]);
            const hasDummy = parsed.some((l: Ledger) => dummyIds.has(l.id));
            if (hasDummy) {
              const clean = parsed.filter((l: Ledger) => !dummyIds.has(l.id));
              localStorage.setItem("erp_ledgers", JSON.stringify(clean));
              setLedgers(clean);
            }
          }
        } catch {}
      }
    }
  }, [themeMode]);

  // Auto-sync opening balance and balanceType from bills whenever bills change
  useEffect(() => {
    if (ledgerFormData.openingBills && ledgerFormData.openingBills.length > 0) {
      let totalDr = 0;
      let totalCr = 0;
      let hasAmt = false;
      ledgerFormData.openingBills.forEach((b) => {
        const amt = typeof b.amount === "number" ? b.amount : parseFloat(String(b.amount)) || 0;
        if (amt > 0) hasAmt = true;
        if (b.drCr === "Dr") totalDr += amt;
        else totalCr += amt;
      });
      if (hasAmt) {
        const netDiff = totalDr - totalCr;
        const netAmount = Math.abs(netDiff);
        const netType: "Dr" | "Cr" = netDiff >= 0 ? "Dr" : "Cr";
        const bal: number | "" = netAmount === 0 ? "" : netAmount;
        if (ledgerFormData.openingBalance !== bal || ledgerFormData.balanceType !== netType) {
          setLedgerFormData((prev) => ({
            ...prev,
            openingBalance: bal,
            balanceType: netType,
          }));
        }
      }
    }
  }, [ledgerFormData.openingBills, ledgerFormData.openingBalance, ledgerFormData.balanceType]);

  // Save Groups to LocalStorage
  const persistGroups = (groups: LedgerGroup[]) => {
    setLedgerGroups(groups);
    localStorage.setItem("erp_ledger_groups", JSON.stringify(groups));
  };

  // Save Ledgers to LocalStorage
  const persistLedgers = (data: Ledger[]) => {
    setLedgers(data);
    localStorage.setItem("erp_ledgers", JSON.stringify(data));
  };

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("erp_theme", nextTheme);
  };

  // -------------------------------------------------------------
  // GROUPS INHERITANCE TREE LOGIC
  // -------------------------------------------------------------
  const NATURE_FILTER_TABS: { key: "All" | NatureGroup; label: string }[] = [
    { key: "All", label: "All" },
    { key: "Asset", label: "Assets" },
    { key: "Expenses", label: "Expenses" },
    { key: "Income", label: "Income" },
    { key: "Liability", label: "Liabilities" },
  ];

  // Group counts by nature for top summary cards
  const groupCountsByNature = useMemo(() => {
    return {
      Asset: ledgerGroups.filter((g) => g.nature === "Asset").length,
      Expenses: ledgerGroups.filter((g) => g.nature === "Expenses").length,
      Income: ledgerGroups.filter((g) => g.nature === "Income").length,
      Liability: ledgerGroups.filter((g) => g.nature === "Liability").length,
      Total: ledgerGroups.length,
    };
  }, [ledgerGroups]);

  // Map parent -> child groups
  const { childGroupsByParent, parentMap } = useMemo(() => {
    const childrenMap = new Map<string, LedgerGroup[]>();
    const parents = new Map<string, LedgerGroup>();

    ledgerGroups.forEach((g) => {
      parents.set(g.name.toLowerCase(), g);
      const parentKey = (g.underGroup || "Primary").trim().toLowerCase();
      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, []);
      }
      childrenMap.get(parentKey)!.push(g);
    });

    return { childGroupsByParent: childrenMap, parentMap: parents };
  }, [ledgerGroups]);

  // Flattened tree rows with inheritance depth & expand/collapse
  const visibleTreeRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearchDirectly = (g: LedgerGroup) => {
      if (!query) return true;
      return (
        g.name.toLowerCase().includes(query) ||
        (g.code && g.code.toLowerCase().includes(query)) ||
        g.underGroup.toLowerCase().includes(query)
      );
    };

    const matchesNature = (g: LedgerGroup) => {
      if (selectedNatureFilter === "All") return true;
      return g.nature === selectedNatureFilter;
    };

    const nodeOrDescendantMatches = (g: LedgerGroup): boolean => {
      if (matchesNature(g) && matchesSearchDirectly(g)) return true;
      const children = childGroupsByParent.get(g.name.toLowerCase()) || [];
      return children.some(nodeOrDescendantMatches);
    };

    // Root groups are those under "Primary" or whose parent is not in groups
    const rootGroups = ledgerGroups.filter((g) => {
      const parentKey = g.underGroup.trim().toLowerCase();
      return parentKey === "primary" || !parentMap.has(parentKey);
    });

    interface TreeRowItem {
      group: LedgerGroup;
      level: number;
      childCount: number;
      hasChildren: boolean;
      isExpanded: boolean;
    }

    const flatRows: TreeRowItem[] = [];

    const traverse = (group: LedgerGroup, level: number) => {
      if (selectedNatureFilter !== "All" || query) {
        if (!nodeOrDescendantMatches(group)) return;
      }

      const directChildren = childGroupsByParent.get(group.name.toLowerCase()) || [];
      const childCount = directChildren.length;
      const hasChildren = childCount > 0;
      const isExpanded = query ? true : expandedGroupIds.has(group.id);

      flatRows.push({
        group,
        level,
        childCount,
        hasChildren,
        isExpanded,
      });

      if (hasChildren && isExpanded) {
        directChildren.forEach((child) => traverse(child, level + 1));
      }
    };

    rootGroups.forEach((root) => traverse(root, 0));
    return flatRows;
  }, [ledgerGroups, childGroupsByParent, parentMap, selectedNatureFilter, searchQuery, expandedGroupIds]);

  // Expand / Collapse Handlers
  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedGroupIds(new Set(ledgerGroups.map((g) => g.id)));
  };

  const handleCollapseAll = () => {
    setExpandedGroupIds(new Set());
  };

  // Check if all groups with children are currently expanded
  const areAllExpanded = useMemo(() => {
    const parentGroupsWithChildren = ledgerGroups.filter(
      (g) => (childGroupsByParent.get(g.name.toLowerCase()) || []).length > 0
    );
    if (parentGroupsWithChildren.length === 0) return false;
    return parentGroupsWithChildren.every((g) => expandedGroupIds.has(g.id));
  }, [ledgerGroups, childGroupsByParent, expandedGroupIds]);

  const toggleExpandCollapseAll = () => {
    if (areAllExpanded) {
      handleCollapseAll();
    } else {
      handleExpandAll();
    }
  };

  // Quick Action: Add Subgroup under a parent group
  const handleOpenAddSubgroup = (parentGroup: LedgerGroup) => {
    setEditingGroupId(null);
    setFormData({
      name: "",
      underGroup: parentGroup.name,
      nature: parentGroup.nature,
      affectsGrossProfit: parentGroup.affectsGrossProfit,
      code: "",
    });
    setIsModalOpen(true);
  };

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

  // Recursively collect all descendant groups of a given group name
  const getAllDescendants = (groupName: string): LedgerGroup[] => {
    const result: LedgerGroup[] = [];
    const queue = [groupName.trim().toLowerCase()];
    const visited = new Set<string>([groupName.trim().toLowerCase()]);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const children = childGroupsByParent.get(curr) || [];
      for (const child of children) {
        const childKey = child.name.trim().toLowerCase();
        if (!visited.has(childKey)) {
          visited.add(childKey);
          result.push(child);
          queue.push(childKey);
        }
      }
    }
    return result;
  };

  const handleDeleteGroup = (id: string) => {
    const group = ledgerGroups.find((g) => g.id === id);
    if (!group) return;

    const descendants = getAllDescendants(group.name);
    const descendantIds = new Set(descendants.map((d) => d.id));

    setDeleteModalData({
      group,
      childGroups: descendants,
      allDescendantIds: descendantIds,
      deleteChildren: descendants.length > 0, // default to true if child groups exist
    });
  };

  const executeDeleteGroup = (group: LedgerGroup, deleteChildren: boolean) => {
    if (deleteChildren) {
      // Cascade delete parent and all descendant subgroups
      const descendants = getAllDescendants(group.name);
      const idsToDelete = new Set([group.id, ...descendants.map((d) => d.id)]);
      const descendantNames = new Set([
        group.name.trim().toLowerCase(),
        ...descendants.map((d) => d.name.trim().toLowerCase()),
      ]);

      const updatedGroups = ledgerGroups.filter((g) => !idsToDelete.has(g.id));
      persistGroups(updatedGroups);

      // Reassign any ledgers under deleted groups to group's underGroup so they don't get orphaned
      const fallbackUnder = group.underGroup || "Primary";
      const updatedLedgers = ledgers.map((l) =>
        descendantNames.has(l.underGroup.trim().toLowerCase())
          ? { ...l, underGroup: fallbackUnder }
          : l
      );
      persistLedgers(updatedLedgers);

      // Clean up expandedGroupIds
      setExpandedGroupIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });

      showToast(
        "Group & Subgroups Deleted",
        descendants.length > 0
          ? `Deleted group "${group.name}" and ${descendants.length} child subgroup(s).`
          : `Group "${group.name}" successfully deleted.`,
        "danger"
      );
    } else {
      // Delete parent only: reassign direct child groups to parent's underGroup (e.g. Primary)
      const fallbackUnder = group.underGroup || "Primary";
      const updatedGroups = ledgerGroups
        .filter((g) => g.id !== group.id)
        .map((g) =>
          g.underGroup.trim().toLowerCase() === group.name.trim().toLowerCase()
            ? { ...g, underGroup: fallbackUnder }
            : g
        );
      persistGroups(updatedGroups);

      // Reassign any ledgers under deleted parent to parent's underGroup
      const updatedLedgers = ledgers.map((l) =>
        l.underGroup.trim().toLowerCase() === group.name.trim().toLowerCase()
          ? { ...l, underGroup: fallbackUnder }
          : l
      );
      persistLedgers(updatedLedgers);

      // Clean up expandedGroupIds
      setExpandedGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(group.id);
        return next;
      });

      const directChildren = childGroupsByParent.get(group.name.trim().toLowerCase()) || [];
      showToast(
        "Parent Group Deleted",
        directChildren.length > 0
          ? `Deleted "${group.name}". Preserved ${directChildren.length} child subgroup(s) under "${fallbackUnder}".`
          : `Group "${group.name}" successfully deleted.`,
        "danger"
      );
    }
    setDeleteModalData(null);
  };

  // Handle Under Group selection in Group modal (auto-inherits Nature & affectsGrossProfit)
  const handleGroupParentSelect = (parentName: string) => {
    if (parentName === "Primary") {
      setFormData((prev) => ({
        ...prev,
        underGroup: "Primary",
      }));
      return;
    }

    const matchedParent = ledgerGroups.find((g) => g.name === parentName);
    if (matchedParent) {
      setFormData((prev) => ({
        ...prev,
        underGroup: parentName,
        nature: matchedParent.nature,
        affectsGrossProfit: matchedParent.affectsGrossProfit,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        underGroup: parentName,
      }));
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

  // Find the selected parent group object (if not Primary)
  const matchedParentGroup = useMemo(() => {
    if (formData.underGroup === "Primary") return null;
    return ledgerGroups.find((g) => g.name.toLowerCase() === formData.underGroup.toLowerCase()) || null;
  }, [formData.underGroup, ledgerGroups]);

  // -------------------------------------------------------------
  // LEDGERS LOGIC
  // -------------------------------------------------------------
  const filteredLedgers = useMemo(() => {
    const query = ledgerSearchQuery.trim().toLowerCase();
    return ledgers.filter((led) => {
      // Nature filter
      if (selectedLedgerNatureFilter !== "All" && led.nature !== selectedLedgerNatureFilter) {
        return false;
      }
      // Ledger Group filter
      if (selectedLedgerGroupFilter !== "All" && led.underGroup.toLowerCase() !== selectedLedgerGroupFilter.toLowerCase()) {
        return false;
      }
      // GST Type filter
      if (selectedGstTypeFilter !== "All") {
        const type = led.gstType || "Unregistered";
        if (type !== selectedGstTypeFilter) return false;
      }
      // Search query (name, code, group, phone, contact, gstin, pan)
      if (query) {
        const matchName = led.name.toLowerCase().includes(query);
        const matchCode = (led.code || "").toLowerCase().includes(query);
        const matchGroup = led.underGroup.toLowerCase().includes(query);
        const matchPhone =
          (led.phone || "").toLowerCase().includes(query) ||
          (led.whatsapp || "").toLowerCase().includes(query) ||
          (led.mobile || "").toLowerCase().includes(query);
        const matchContact = (led.contactPerson || "").toLowerCase().includes(query);
        const matchGstin = (led.gstin || "").toLowerCase().includes(query);
        const matchPan = (led.pan || "").toLowerCase().includes(query);
        return matchName || matchCode || matchGroup || matchPhone || matchContact || matchGstin || matchPan;
      }
      return true;
    });
  }, [ledgers, selectedLedgerNatureFilter, selectedLedgerGroupFilter, selectedGstTypeFilter, ledgerSearchQuery]);

  const ledgerCountsByNature = useMemo(() => {
    return {
      Asset: ledgers.filter((l) => l.nature === "Asset").length,
      Expenses: ledgers.filter((l) => l.nature === "Expenses").length,
      Income: ledgers.filter((l) => l.nature === "Income").length,
      Liability: ledgers.filter((l) => l.nature === "Liability").length,
      Total: ledgers.length,
    };
  }, [ledgers]);

  // Unique list of groups for the filter dropdown
  const availableLedgerGroupOptions = useMemo(() => {
    const groupNames = new Set<string>();
    ledgerGroups.forEach((g) => groupNames.add(g.name));
    ledgers.forEach((l) => groupNames.add(l.underGroup));
    return Array.from(groupNames).sort((a, b) => a.localeCompare(b));
  }, [ledgerGroups, ledgers]);

  // Handle Under Group selection in Ledger modal (auto-detects Nature & default balance type)
  const handleGroupSelectInLedgerForm = (groupName: string) => {
    const matchedGroup = ledgerGroups.find((g) => g.name === groupName);
    const nature = matchedGroup ? matchedGroup.nature : "Asset";
    const defaultBalanceType: "Dr" | "Cr" = nature === "Asset" || nature === "Expenses" ? "Dr" : "Cr";

    setLedgerFormData((prev) => {
      const hasBillsWithAmt = (prev.openingBills || []).some((b) => {
        const amt = typeof b.amount === "number" ? b.amount : parseFloat(String(b.amount)) || 0;
        return amt > 0;
      });
      const resolvedBalanceType = hasBillsWithAmt ? prev.balanceType : defaultBalanceType;

      return {
        ...prev,
        underGroup: groupName,
        nature,
        balanceType: resolvedBalanceType,
      };
    });
    if (ledgerErrors.underGroup) {
      setLedgerErrors((prev) => {
        const next = { ...prev };
        delete next.underGroup;
        return next;
      });
    }
  };

  const handleOpenAddLedgerModal = (presetNature?: NatureGroup) => {
    setEditingLedgerId(null);
    setLedgerErrors({});
    const defaultGroup =
      ledgerGroups.find((g) => (presetNature ? g.nature === presetNature : g.nature === "Asset"))?.name ||
      ledgerGroups[0]?.name ||
      "Sundry Debtors";
    const matched = ledgerGroups.find((g) => g.name === defaultGroup);
    const nature = matched ? matched.nature : presetNature || "Asset";

    setWhatsappSameAsPhone(false);
    setLedgerFormData({
      name: "",
      code: "",
      underGroup: defaultGroup,
      nature,
      maintainBillByBill: false,
      creditDays: "",
      creditLimit: "",
      address: "",
      contactPerson: "",
      phone: "",
      whatsapp: "",
      email: "",
      website: "",
      pincode: "",
      country: "India",
      state: "Kerala",
      pan: "",
      cin: "",
      gstType: "Regular",
      gstin: "",
      maintainBankDetails: false,
      bankName: "",
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
      openingBalance: "",
      balanceType: nature === "Asset" || nature === "Expenses" ? "Dr" : "Cr",
      openingBills: [],
    });
    setLedgerViewMode("form");
    setActiveLedgerSection("basic");
    setIsOpeningBillsDropdownOpen(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleOpenEditLedgerModal = (ledger: Ledger) => {
    setEditingLedgerId(ledger.id);
    setLedgerErrors({});
    const phoneVal = ledger.phone || ledger.mobile || "";
    const waVal = ledger.whatsapp || "";
    setWhatsappSameAsPhone(Boolean(phoneVal && waVal && phoneVal.trim() === waVal.trim()));
    const loadedBills = ledger.openingBills && ledger.openingBills.length > 0
      ? ledger.openingBills.map((b) => ({
          id: b.id,
          billNo: b.billNo,
          billDate: b.billDate,
          dueDate: b.dueDate || "",
          amount: b.amount,
          drCr: b.drCr,
        }))
      : [];
    setLedgerFormData({
      name: ledger.name,
      code: ledger.code || "",
      underGroup: ledger.underGroup,
      nature: ledger.nature,
      maintainBillByBill: Boolean(ledger.maintainBillByBill),
      creditDays: ledger.creditDays !== undefined ? ledger.creditDays : "",
      creditLimit: ledger.creditLimit !== undefined ? ledger.creditLimit : "",
      address: ledger.address || "",
      contactPerson: ledger.contactPerson || "",
      phone: phoneVal,
      whatsapp: waVal,
      email: ledger.email || "",
      website: ledger.website || "",
      pincode: ledger.pincode || "",
      country: ledger.country || "India",
      state: ledger.state || "Kerala",
      pan: ledger.pan || "",
      cin: ledger.cin || "",
      gstType: ledger.gstType || "Regular",
      gstin: ledger.gstin || "",
      maintainBankDetails: Boolean(ledger.maintainBankDetails),
      bankName: ledger.bankName || "",
      accountHolderName: ledger.accountHolderName || "",
      accountNumber: ledger.accountNumber || "",
      ifscCode: ledger.ifscCode || "",
      branchName: ledger.branchName || "",
      openingBalance: ledger.openingBalance !== 0 ? ledger.openingBalance : "",
      balanceType: ledger.balanceType,
      openingBills: loadedBills,
    });
    setLedgerViewMode("form");
    setActiveLedgerSection("basic");
    setIsOpeningBillsDropdownOpen(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCloseLedgerForm = () => {
    setLedgerViewMode("list");
    setEditingLedgerId(null);
    setLedgerErrors({});
    setActiveLedgerSection("basic");
    setIsOpeningBillsDropdownOpen(true);
  };

  const LEDGER_FORM_SECTIONS: {
    id: LedgerFormSection;
    badge: string;
    title: string;
    subtitle: string;
  }[] = [
    { id: "basic", badge: "A", title: "Basic Details", subtitle: "Identity & Credit Terms" },
    { id: "contact", badge: "B", title: "Address & Contact", subtitle: "Phone, WA & Address" },
    { id: "tax", badge: "C", title: "Tax & Statutory", subtitle: "PAN, CIN & GST" },
    { id: "bank", badge: "D", title: "Bank Details", subtitle: "Account & IFSC" },
    { id: "opening", badge: "E", title: "Opening Balance", subtitle: "Starting Balance" },
  ];

  const currentSectionIndex = LEDGER_FORM_SECTIONS.findIndex((s) => s.id === activeLedgerSection);
  const currentSection = LEDGER_FORM_SECTIONS[currentSectionIndex] || LEDGER_FORM_SECTIONS[0];
  const prevSection = currentSectionIndex > 0 ? LEDGER_FORM_SECTIONS[currentSectionIndex - 1] : null;
  const nextSection = currentSectionIndex < LEDGER_FORM_SECTIONS.length - 1 ? LEDGER_FORM_SECTIONS[currentSectionIndex + 1] : null;

  const goToPrevSection = () => {
    if (prevSection) {
      setActiveLedgerSection(prevSection.id);
    }
  };

  const goToNextSection = () => {
    if (nextSection) {
      setActiveLedgerSection(nextSection.id);
    }
  };

  // Helper to calculate opening balance and Dr/Cr from bills
  const calcOpeningBalanceFromBills = (
    bills: LedgerFormData["openingBills"]
  ): { openingBalance: number | ""; balanceType: "Dr" | "Cr" } => {
    let totalDr = 0;
    let totalCr = 0;
    bills.forEach((b) => {
      const amt = typeof b.amount === "number" ? b.amount : parseFloat(String(b.amount)) || 0;
      if (b.drCr === "Dr") totalDr += amt;
      else totalCr += amt;
    });
    const netDiff = totalDr - totalCr;
    const netAmount = Math.abs(netDiff);
    const netType: "Dr" | "Cr" = netDiff >= 0 ? "Dr" : "Cr";
    const bal: number | "" = netAmount === 0 ? "" : netAmount;
    return {
      openingBalance: bal,
      balanceType: netType,
    };
  };

  // Opening Bills Dropdown Table Handlers
  const handleAddOpeningBillRow = () => {
    const today = new Date().toISOString().split("T")[0];
    let defaultDueDate = today;
    if (ledgerFormData.creditDays && Number(ledgerFormData.creditDays) > 0) {
      const d = new Date();
      d.setDate(d.getDate() + Number(ledgerFormData.creditDays));
      defaultDueDate = d.toISOString().split("T")[0];
    }
    const newRow = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      billNo: "",
      billDate: today,
      dueDate: defaultDueDate,
      amount: "" as number | "",
      drCr: ledgerFormData.balanceType || ("Dr" as "Dr" | "Cr"),
    };
    setLedgerFormData((prev) => {
      const nextBills = [...(prev.openingBills || []), newRow];
      const sync = calcOpeningBalanceFromBills(nextBills);
      return {
        ...prev,
        openingBills: nextBills,
        openingBalance: sync.openingBalance,
        balanceType: sync.balanceType,
      };
    });
    setIsOpeningBillsDropdownOpen(true);
  };

  const handleUpdateOpeningBillRow = (
    id: string,
    field: "billNo" | "billDate" | "dueDate" | "amount" | "drCr",
    value: string | number
  ) => {
    setLedgerFormData((prev) => {
      const nextBills = (prev.openingBills || []).map((b) => (b.id === id ? { ...b, [field]: value } : b));
      const sync = calcOpeningBalanceFromBills(nextBills);
      return {
        ...prev,
        openingBills: nextBills,
        openingBalance: sync.openingBalance,
        balanceType: sync.balanceType,
      };
    });
  };

  const handleDeleteOpeningBillRow = (id: string) => {
    setLedgerFormData((prev) => {
      const nextBills = (prev.openingBills || []).filter((b) => b.id !== id);
      const sync = nextBills.length > 0
        ? calcOpeningBalanceFromBills(nextBills)
        : { openingBalance: prev.openingBalance, balanceType: prev.balanceType };
      return {
        ...prev,
        openingBills: nextBills,
        openingBalance: sync.openingBalance,
        balanceType: sync.balanceType,
      };
    });
  };

  const openingBillTotals = useMemo(() => {
    const bills = ledgerFormData.openingBills || [];
    let totalDr = 0;
    let totalCr = 0;
    bills.forEach((b) => {
      const amt = typeof b.amount === "number" ? b.amount : parseFloat(String(b.amount)) || 0;
      if (b.drCr === "Dr") totalDr += amt;
      else totalCr += amt;
    });
    const netDiff = totalDr - totalCr;
    const netAmount = Math.abs(netDiff);
    const netType: "Dr" | "Cr" = netDiff >= 0 ? "Dr" : "Cr";
    return {
      totalDr,
      totalCr,
      netAmount,
      netType,
      totalCount: bills.length,
    };
  }, [ledgerFormData.openingBills]);

  const isSectionFilled = (secId: LedgerFormSection) => {
    switch (secId) {
      case "basic":
        return Boolean(ledgerFormData.name.trim() && ledgerFormData.underGroup.trim());
      case "contact":
        return Boolean(ledgerFormData.phone || ledgerFormData.whatsapp || ledgerFormData.email || ledgerFormData.address);
      case "tax":
        return Boolean(ledgerFormData.pan || ledgerFormData.cin || ledgerFormData.gstin || ledgerFormData.gstType !== "Regular");
      case "bank":
        return Boolean(ledgerFormData.maintainBankDetails && (ledgerFormData.bankName || ledgerFormData.accountNumber));
      case "opening":
        return Boolean(
          ledgerFormData.openingBalance !== "" ||
          (ledgerFormData.openingBills && ledgerFormData.openingBills.length > 0)
        );
      default:
        return false;
    }
  };

  const sectionHasError = (secId: LedgerFormSection) => {
    switch (secId) {
      case "basic":
        return Boolean(ledgerErrors.name || ledgerErrors.underGroup || ledgerErrors.creditDays || ledgerErrors.creditLimit);
      case "contact":
        return Boolean(ledgerErrors.email);
      case "opening":
        return Boolean(ledgerErrors.openingBalance);
      default:
        return false;
    }
  };

  const validateLedgerForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!ledgerFormData.name.trim()) {
      errors.name = "Ledger Name is required.";
    }
    if (!ledgerFormData.underGroup.trim()) {
      errors.underGroup = "Ledger Group is required.";
    }
    if (ledgerFormData.creditDays !== "" && Number(ledgerFormData.creditDays) < 0) {
      errors.creditDays = "Credit Days cannot be negative.";
    }
    if (ledgerFormData.creditLimit !== "" && Number(ledgerFormData.creditLimit) < 0) {
      errors.creditLimit = "Credit Limit cannot be negative.";
    }
    if (ledgerFormData.openingBalance !== "" && Number(ledgerFormData.openingBalance) < 0) {
      errors.openingBalance = "Opening Balance cannot be negative.";
    }
    if (ledgerFormData.email && ledgerFormData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(ledgerFormData.email.trim())) {
        errors.email = "Please enter a valid email address.";
      }
    }
    setLedgerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLedgerForm()) {
      if (
        !ledgerFormData.name.trim() ||
        !ledgerFormData.underGroup.trim() ||
        (ledgerFormData.creditDays !== "" && Number(ledgerFormData.creditDays) < 0) ||
        (ledgerFormData.creditLimit !== "" && Number(ledgerFormData.creditLimit) < 0)
      ) {
        setActiveLedgerSection("basic");
      } else if (ledgerFormData.email && ledgerFormData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ledgerFormData.email.trim())) {
        setActiveLedgerSection("contact");
      } else if (ledgerFormData.openingBalance !== "" && Number(ledgerFormData.openingBalance) < 0) {
        setActiveLedgerSection("opening");
      }
      showToast("Validation Error", "Please review the highlighted section and fix errors.", "danger");
      return;
    }

    const parsedOpeningBalance =
      ledgerFormData.openingBalance === "" ? 0 : Math.max(0, Number(ledgerFormData.openingBalance) || 0);

    const parsedCreditDays =
      ledgerFormData.creditDays === "" ? undefined : Math.max(0, Number(ledgerFormData.creditDays));

    const parsedCreditLimit =
      ledgerFormData.creditLimit === "" ? undefined : Math.max(0, Number(ledgerFormData.creditLimit));

    const cleanOpeningBills: OpeningBillDetail[] = (ledgerFormData.openingBills || [])
      .filter((b) => b.billNo.trim() !== "" || (typeof b.amount === "number" ? b.amount > 0 : (parseFloat(String(b.amount)) || 0) > 0))
      .map((b) => ({
        id: b.id,
        billNo: b.billNo.trim(),
        billDate: b.billDate || new Date().toISOString().split("T")[0],
        dueDate: b.dueDate || undefined,
        amount: typeof b.amount === "number" ? b.amount : parseFloat(String(b.amount)) || 0,
        drCr: b.drCr,
      }));

    if (editingLedgerId) {
      const updated = ledgers.map((l) =>
        l.id === editingLedgerId
          ? {
              ...l,
              name: ledgerFormData.name.trim(),
              code: ledgerFormData.code.trim() || undefined,
              underGroup: ledgerFormData.underGroup,
              nature: ledgerFormData.nature,
              maintainBillByBill: ledgerFormData.maintainBillByBill,
              creditDays: parsedCreditDays,
              creditLimit: parsedCreditLimit,
              address: ledgerFormData.address.trim() || undefined,
              contactPerson: ledgerFormData.contactPerson.trim() || undefined,
              phone: ledgerFormData.phone.trim() || undefined,
              whatsapp: ledgerFormData.whatsapp.trim() || undefined,
              email: ledgerFormData.email.trim() || undefined,
              website: ledgerFormData.website.trim() || undefined,
              pincode: ledgerFormData.pincode.trim() || undefined,
              country: ledgerFormData.country.trim() || undefined,
              state: ledgerFormData.state.trim() || undefined,
              pan: ledgerFormData.pan.trim() || undefined,
              cin: ledgerFormData.cin.trim() || undefined,
              gstType: ledgerFormData.gstType,
              gstin: ledgerFormData.gstin.trim() || undefined,
              maintainBankDetails: ledgerFormData.maintainBankDetails,
              bankName: ledgerFormData.maintainBankDetails ? ledgerFormData.bankName.trim() || undefined : undefined,
              accountHolderName: ledgerFormData.maintainBankDetails ? ledgerFormData.accountHolderName.trim() || undefined : undefined,
              accountNumber: ledgerFormData.maintainBankDetails ? ledgerFormData.accountNumber.trim() || undefined : undefined,
              ifscCode: ledgerFormData.maintainBankDetails ? ledgerFormData.ifscCode.trim() || undefined : undefined,
              branchName: ledgerFormData.maintainBankDetails ? ledgerFormData.branchName.trim() || undefined : undefined,
              openingBalance: parsedOpeningBalance,
              balanceType: ledgerFormData.balanceType,
              openingBills: cleanOpeningBills.length > 0 ? cleanOpeningBills : undefined,
            }
          : l
      );
      persistLedgers(updated);
      showToast("Ledger Updated", `Ledger "${ledgerFormData.name.trim()}" updated successfully.`);
    } else {
      const newLedger: Ledger = {
        id: `led-${Date.now()}`,
        name: ledgerFormData.name.trim(),
        code: ledgerFormData.code.trim() || undefined,
        underGroup: ledgerFormData.underGroup,
        nature: ledgerFormData.nature,
        maintainBillByBill: ledgerFormData.maintainBillByBill,
        creditDays: parsedCreditDays,
        creditLimit: parsedCreditLimit,
        address: ledgerFormData.address.trim() || undefined,
        contactPerson: ledgerFormData.contactPerson.trim() || undefined,
        phone: ledgerFormData.phone.trim() || undefined,
        whatsapp: ledgerFormData.whatsapp.trim() || undefined,
        email: ledgerFormData.email.trim() || undefined,
        website: ledgerFormData.website.trim() || undefined,
        pincode: ledgerFormData.pincode.trim() || undefined,
        country: ledgerFormData.country.trim() || undefined,
        state: ledgerFormData.state.trim() || undefined,
        pan: ledgerFormData.pan.trim() || undefined,
        cin: ledgerFormData.cin.trim() || undefined,
        gstType: ledgerFormData.gstType,
        gstin: ledgerFormData.gstin.trim() || undefined,
        maintainBankDetails: ledgerFormData.maintainBankDetails,
        bankName: ledgerFormData.maintainBankDetails ? ledgerFormData.bankName.trim() || undefined : undefined,
        accountHolderName: ledgerFormData.maintainBankDetails ? ledgerFormData.accountHolderName.trim() || undefined : undefined,
        accountNumber: ledgerFormData.maintainBankDetails ? ledgerFormData.accountNumber.trim() || undefined : undefined,
        ifscCode: ledgerFormData.maintainBankDetails ? ledgerFormData.ifscCode.trim() || undefined : undefined,
        branchName: ledgerFormData.maintainBankDetails ? ledgerFormData.branchName.trim() || undefined : undefined,
        openingBalance: parsedOpeningBalance,
        balanceType: ledgerFormData.balanceType,
        openingBills: cleanOpeningBills.length > 0 ? cleanOpeningBills : undefined,
        createdAt: new Date().toISOString().split("T")[0],
      };
      persistLedgers([newLedger, ...ledgers]);
      showToast("Ledger Created", `Ledger "${ledgerFormData.name.trim()}" created successfully.`);
    }

    setLedgerViewMode("list");
    setEditingLedgerId(null);
  };

  const handleConfirmDeleteLedger = () => {
    if (!ledgerToDelete) return;
    const targetName = ledgerToDelete.name;
    const updated = ledgers.filter((l) => l.id !== ledgerToDelete.id);
    persistLedgers(updated);
    showToast("Ledger Deleted", `Ledger "${targetName}" deleted successfully.`, "danger");
    setLedgerToDelete(null);
  };

  const handleResetLedgerFilters = () => {
    setSelectedLedgerNatureFilter("All");
    setSelectedLedgerGroupFilter("All");
    setSelectedGstTypeFilter("All");
    setLedgerSearchQuery("");
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amt);
  };

  if (!isMounted) {
    return (
      <div className={styles.erpContainer} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, border: "3px solid var(--border-light)", borderTopColor: "#46C81A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Loading ERP System...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.erpContainer}>
      {/* -------------------------------------------------------------
          LEFT SIDEBAR
          ------------------------------------------------------------- */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
        {/* Brand Header */}
        <div className={styles.brandSection}>
          <div className={styles.brandLogo}>B</div>
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
                        onClick={() => {
                          setCurrentView("ledgers");
                          setLedgerViewMode("list");
                        }}
                        className={`${styles.subnavItem} ${currentView === "ledgers" ? styles.subnavItemActive : ""}`}
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
                <button
                  id="nav-inventory-master"
                  onClick={() => {}}
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
                </button>
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
              {currentView === "ledgers"
                ? ledgerViewMode === "form"
                  ? editingLedgerId
                    ? `Master / Accounting Master / Ledgers / Edit Ledger (${ledgerFormData.name || "Account"})`
                    : "Master / Accounting Master / Ledgers / New Ledger"
                  : "Master / Accounting Master / Ledgers"
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
                <p className={styles.heroDescription}>
                  Configure primary accounting groups, parent hierarchy (Under Group), and their 4 core natures: 
                  <strong> Asset, Expenses, Income, Liability</strong>.
                </p>
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

            {/* 4 Nature Groups Pillar Cards */}
            <div className={styles.natureStatsRow}>
              {NATURE_OPTIONS.map((opt) => (
                <div
                  key={opt.key}
                  id={`group-nature-card-${opt.key.toLowerCase()}`}
                  onClick={() =>
                    setSelectedNatureFilter((prev) => (prev === opt.key ? "All" : opt.key))
                  }
                  className={`${styles.natureStatCard} ${
                    opt.key === "Asset"
                      ? styles.natureAsset
                      : opt.key === "Expenses"
                      ? styles.natureExpenses
                      : opt.key === "Income"
                      ? styles.natureIncome
                      : styles.natureLiability
                  } ${selectedNatureFilter === opt.key ? styles.natureStatCardActive : ""}`}
                  title={`Filter by ${opt.label} Groups (click again to show All)`}
                >
                  <div className={styles.natureStatTitle}>
                    <span>{opt.label}</span>
                    <span className={styles.badgePillar}>Pillar</span>
                  </div>
                  <div className={styles.natureStatCount}>
                    {groupCountsByNature[opt.key]} Groups
                  </div>
                  <div className={styles.natureStatDesc}>{opt.desc}</div>
                </div>
              ))}
            </div>

            {/* Tree Inheritance View Container */}
            <div className={styles.groupsViewWrapper}>
              {/* Toolbar Matching Screenshot */}
              <div className={styles.treeToolbar}>
                {/* 1. Search Box */}
                <div className={styles.treeSearchWrapper}>
                  <svg className={styles.treeSearchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    id="groups-search-input"
                    type="text"
                    placeholder="Search groups by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.treeSearchInput}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className={styles.treeSearchClearBtn}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* 2. Nature Filter Pills: All, Assets, Expenses, Income, Liabilities */}
                <div className={styles.treeFilterPillsGroup}>
                  {NATURE_FILTER_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      id={`filter-tab-${tab.key.toLowerCase()}`}
                      onClick={() => setSelectedNatureFilter(tab.key)}
                      className={`${styles.treeFilterPill} ${
                        selectedNatureFilter === tab.key ? styles.treeFilterPillActive : ""
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 3. Action Button: Dynamic Single Expand / Collapse All Toggle */}
                <div className={styles.treeActionsRight}>
                  <button
                    id="btn-toggle-expand-collapse-all"
                    onClick={toggleExpandCollapseAll}
                    className={styles.treeExpandCollapseBtn}
                    title={areAllExpanded ? "Collapse All Groups" : "Expand All Groups"}
                  >
                    {areAllExpanded ? (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="17 11 12 6 7 11" />
                          <polyline points="17 18 12 13 7 18" />
                        </svg>
                        <span>Collapse All</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="7 13 12 18 17 13" />
                          <polyline points="7 6 12 11 17 6" />
                        </svg>
                        <span>Expand All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Table with Tree / Inheritance layout */}
              <div className={styles.treeTableCard}>
                <table className={styles.treeTable}>
                  <thead>
                    <tr>
                      <th className={styles.treeColName}>GROUP NAME</th>
                      <th className={styles.treeColUnder}>UNDER GROUP</th>
                      <th className={styles.treeColNature}>NATURE</th>
                      <th className={styles.treeColChild}>CHILD GROUPS</th>
                      <th className={styles.treeColActions}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTreeRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "48px 20px" }}>
                          <div style={{ color: "var(--text-subtle)", fontSize: 14 }}>
                            No groups found matching &quot;{searchQuery || selectedNatureFilter}&quot;.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      visibleTreeRows.map(({ group, level, childCount, hasChildren, isExpanded }) => {
                        const isPrimary = level === 0;

                        return (
                          <tr key={group.id} className={styles.treeTableRow} id={`tree-row-${group.id}`}>
                            {/* 1. GROUP NAME */}
                            <td className={styles.treeTdName}>
                              <div
                                className={styles.treeNameCell}
                                style={{ paddingLeft: level > 0 ? `${(level - 1) * 28 + 36}px` : "0px" }}
                              >
                                {/* Vertical tree inheritance connector line for indented child rows */}
                                {level > 0 && <span className={styles.treeVerticalGuide} />}

                                {/* Expand / Collapse chevron or leaf spacing */}
                                {hasChildren ? (
                                  <button
                                    id={`btn-toggle-group-${group.id}`}
                                    onClick={() => toggleGroupExpand(group.id)}
                                    className={`${styles.treeChevronBtn} ${
                                      isExpanded ? styles.treeChevronExpanded : styles.treeChevronCollapsed
                                    }`}
                                    title={isExpanded ? "Collapse group" : "Expand group"}
                                    aria-label={isExpanded ? "Collapse group" : "Expand group"}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                  </button>
                                ) : (
                                  <span className={styles.treeSpacer} />
                                )}

                                {/* Folder Icon: Green for Parent, Gray for Child */}
                                <div className={isPrimary ? styles.treeFolderParent : styles.treeFolderChild}>
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={isPrimary ? "2" : "1.8"}
                                  >
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                  </svg>
                                </div>

                                {/* Group Name Title & Code */}
                                <span className={isPrimary ? styles.treeParentTitle : styles.treeChildTitle}>
                                  {group.name}
                                </span>
                                {group.code && (
                                  <span className={styles.treeGroupCodeTag}>#{group.code}</span>
                                )}
                              </div>
                            </td>

                            {/* 2. UNDER GROUP */}
                            <td>
                              {isPrimary ? (
                                <span className={styles.treePrimaryBadge}>Primary</span>
                              ) : (
                                <span className={styles.treeUnderText}>
                                  Under: <strong className={styles.treeUnderParentBold}>{group.underGroup}</strong>
                                </span>
                              )}
                            </td>

                            {/* 3. NATURE */}
                            <td>
                              <span
                                className={`${styles.treeNatureBadge} ${
                                  group.nature === "Asset"
                                    ? styles.treeNatureAsset
                                    : group.nature === "Expenses"
                                    ? styles.treeNatureExpenses
                                    : group.nature === "Income"
                                    ? styles.treeNatureIncome
                                    : styles.treeNatureLiability
                                }`}
                              >
                                {group.nature === "Asset"
                                  ? "Assets"
                                  : group.nature === "Liability"
                                  ? "Liabilities"
                                  : group.nature}
                              </span>
                            </td>

                            {/* 4. CHILD GROUPS */}
                            <td>
                              {childCount > 0 ? (
                                <span className={styles.treeSubgroupsBadge}>
                                  {childCount} {childCount === 1 ? "subgroup" : "subgroups"}
                                </span>
                              ) : (
                                <span className={styles.treeNoneText}>None</span>
                              )}
                            </td>

                            {/* 5. ACTIONS */}
                            <td>
                              <div className={styles.treeActionsCell}>
                                {/* Add Subgroup Button */}
                                <button
                                  id={`btn-add-subgroup-${group.id}`}
                                  onClick={() => handleOpenAddSubgroup(group)}
                                  className={styles.treeActionIconBtn}
                                  title={`Add subgroup under "${group.name}"`}
                                >
                                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                    <line x1="12" y1="11" x2="12" y2="17" />
                                    <line x1="9" y1="14" x2="15" y2="14" />
                                  </svg>
                                </button>

                                {/* View Details Button */}
                                <button
                                  id={`btn-view-${group.id}`}
                                  onClick={() => setViewingGroup(group)}
                                  className={styles.treeActionIconBtn}
                                  title={`View details for "${group.name}"`}
                                >
                                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                </button>

                                {/* Edit Group Button */}
                                <button
                                  id={`btn-edit-${group.id}`}
                                  onClick={() => handleOpenEditModal(group)}
                                  className={styles.treeActionIconBtn}
                                  title={`Edit group "${group.name}"`}
                                >
                                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                  </svg>
                                </button>

                                {/* Delete Group Button */}
                                <button
                                  id={`btn-delete-${group.id}`}
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className={`${styles.treeActionIconBtn} ${styles.treeActionDeleteBtn}`}
                                  title={`Delete group "${group.name}"`}
                                >
                                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        ) : ledgerViewMode === "form" ? (
          /* -------------------------------------------------------------
              VIEW 3: DEDICATED FULL-PAGE NEW / EDIT LEDGER
              ------------------------------------------------------------- */
          <div className={`${styles.contentContainer} animate-fade-in`}>
            {/* Top Navigation & Action Bar */}
            <div className={styles.pageHeaderActions}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  id="btn-back-to-ledgers"
                  onClick={handleCloseLedgerForm}
                  className={styles.backBtn}
                  title="Return to Ledgers list"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Back to Ledgers</span>
                </button>
                <span style={{ color: "var(--text-subtle)", fontSize: 13 }}>/</span>
                <span className={styles.breadcrumbBadge}>
                  {editingLedgerId ? "EDIT LEDGER" : "NEW LEDGER"}
                </span>
              </div>

              <div className={styles.actionButtonGroup}>
                <button
                  type="button"
                  id="btn-ledger-top-cancel"
                  onClick={handleCloseLedgerForm}
                  className={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-ledger-top-save"
                  onClick={handleSaveLedger}
                  className={styles.primaryBtn}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{editingLedgerId ? "Update Ledger" : "Save Ledger"}</span>
                </button>
              </div>
            </div>

            {/* Header Title */}
            <div className={styles.ledgerHeader} style={{ marginBottom: 20 }}>
              <div>
                <h1 className={styles.heroHeading}>
                  {editingLedgerId ? `Edit Ledger: ${ledgerFormData.name || "Account"}` : "New Ledger"}
                </h1>
                <p className={styles.heroDescription}>
                  Configure basic identity, group classification, billing terms, contact details, tax settings, and opening balance.
                </p>
              </div>
            </div>

            {/* Quick Context Summary Strip (When ledger name is typed) */}
            {ledgerFormData.name.trim() && (
              <div className={styles.ledgerSummaryStrip}>
                <span className={styles.summaryChip}>
                  <span>Ledger:</span> <strong>{ledgerFormData.name}</strong>
                </span>
                <span className={styles.summaryChip}>
                  <span>Group:</span> <strong>{ledgerFormData.underGroup}</strong>
                </span>
                <span className={styles.summaryChip}>
                  <span>Nature:</span> <strong>{ledgerFormData.nature}</strong>
                </span>
                <span className={styles.summaryChip}>
                  <span>GST:</span> <strong>{ledgerFormData.gstType}</strong>
                </span>
                {ledgerFormData.openingBalance !== "" && (
                  <span className={styles.summaryChip}>
                    <span>Opening:</span>{" "}
                    <strong>
                      ₹{Number(ledgerFormData.openingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
                      {ledgerFormData.balanceType}
                    </strong>
                  </span>
                )}
              </div>
            )}

            {/* Section Switcher Tabs */}
            <div className={styles.sectionNavContainer}>
              <div className={styles.sectionNavGrid} role="tablist">
                {LEDGER_FORM_SECTIONS.map((section) => {
                  const isActive = activeLedgerSection === section.id;
                  const hasErr = sectionHasError(section.id);
                  const isFilled = isSectionFilled(section.id);

                  return (
                    <button
                      key={section.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      id={`tab-section-${section.id}`}
                      onClick={() => setActiveLedgerSection(section.id)}
                      className={`${styles.sectionNavTab} ${isActive ? styles.sectionNavTabActive : ""} ${
                        hasErr ? styles.sectionNavTabError : ""
                      }`}
                      title={`Go to ${section.title}`}
                    >
                      <div className={styles.sectionTabBadge}>{section.badge}</div>
                      <div className={styles.sectionTabTextCol}>
                        <span className={styles.sectionTabTitle}>{section.title}</span>
                        <span className={styles.sectionTabSub}>{section.subtitle}</span>
                      </div>
                      <div className={styles.sectionTabIndicator}>
                        {hasErr ? (
                          <span title="Validation error in this section" style={{ color: "#ef4444", fontWeight: 700 }}>
                            ⚠
                          </span>
                        ) : isFilled ? (
                          <span title="Configured" style={{ color: "var(--brand-emerald-hover)" }}>
                            ●
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveLedger} className={styles.ledgerFormPage}>
              {/* SECTION A: Basic Details & Billing/Credit Settings */}
              <div
                className={styles.formSectionCard}
                style={{ display: activeLedgerSection === "basic" ? "flex" : "none" }}
              >
                <div className={styles.formSectionHeader}>
                  <div className={styles.formSectionBadge}>A</div>
                  <div className={styles.formSectionTitleCol}>
                    <h3 className={styles.formSectionTitle}>Basic Details</h3>
                    <p className={styles.formSectionDesc}>Ledger identity, parent group classification, and credit parameters</p>
                  </div>
                </div>

                <div className={styles.formGridTwo}>
                  {/* Ledger Name - Required */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-ledger-name">
                      Ledger Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      id="form-ledger-name"
                      type="text"
                      placeholder="e.g. Apex Packaging Supplies"
                      value={ledgerFormData.name}
                      onChange={(e) => {
                        setLedgerFormData({ ...ledgerFormData, name: e.target.value });
                        if (ledgerErrors.name) {
                          setLedgerErrors((prev) => {
                            const next = { ...prev };
                            delete next.name;
                            return next;
                          });
                        }
                      }}
                      className={`${styles.formInput} ${ledgerErrors.name ? styles.inputError : ""}`}
                      autoFocus
                    />
                    {ledgerErrors.name && (
                      <div className={styles.fieldError}>
                        <span>⚠ {ledgerErrors.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Ledger Code - Optional */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-ledger-code">
                      Ledger Code <span style={{ color: "var(--text-subtle)", fontWeight: 400, fontSize: 11.5 }}>(Optional)</span>
                    </label>
                    <input
                      id="form-ledger-code"
                      type="text"
                      placeholder="e.g. SUPP-101 or CUST-002"
                      value={ledgerFormData.code}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, code: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Ledger Group - Required dropdown */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-ledger-group">
                      Ledger Group <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      id="form-ledger-group"
                      value={ledgerFormData.underGroup}
                      onChange={(e) => handleGroupSelectInLedgerForm(e.target.value)}
                      className={`${styles.formSelect} ${ledgerErrors.underGroup ? styles.inputError : ""}`}
                    >
                      {ledgerGroups.length === 0 ? (
                        <option value="Primary">Primary</option>
                      ) : (
                        ledgerGroups.map((g) => (
                          <option key={g.id} value={g.name}>
                            {g.name} ({g.nature})
                          </option>
                        ))
                      )}
                    </select>
                    {ledgerErrors.underGroup && (
                      <div className={styles.fieldError}>
                        <span>⚠ {ledgerErrors.underGroup}</span>
                      </div>
                    )}
                  </div>

                  {/* Auto-Assigned Nature */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Assigned Accounting Nature</label>
                    <div style={{ display: "flex", alignItems: "center", height: 40 }}>
                      <span
                        className={`${styles.badgeNature} ${
                          ledgerFormData.nature === "Asset"
                            ? styles.badgeAsset
                            : ledgerFormData.nature === "Expenses"
                            ? styles.badgeExpenses
                            : ledgerFormData.nature === "Income"
                            ? styles.badgeIncome
                            : styles.badgeLiability
                        }`}
                      >
                        ● {ledgerFormData.nature} (Inherited from Group)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-section: Billing & Credit Settings */}
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 7 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: "var(--brand-emerald-hover)" }}>
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <span>Billing & Credit Terms</span>
                  </h4>
                  <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-subtle)" }}>
                    Bill tracking flags, credit period, and credit allowance limits
                  </p>
                </div>

                <div className={styles.formGridTwo}>
                  {/* Maintain Bill-by-Bill Tracking */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Maintain Bill-by-Bill Tracking</label>
                    <div className={styles.toggleButtonGroup}>
                      <button
                        type="button"
                        id="btn-billbybill-yes"
                        onClick={() => setLedgerFormData({ ...ledgerFormData, maintainBillByBill: true })}
                        className={`${styles.toggleButton} ${ledgerFormData.maintainBillByBill ? styles.toggleButtonActive : ""}`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        id="btn-billbybill-no"
                        onClick={() => setLedgerFormData({ ...ledgerFormData, maintainBillByBill: false })}
                        className={`${styles.toggleButton} ${!ledgerFormData.maintainBillByBill ? styles.toggleButtonActive : ""}`}
                      >
                        No
                      </button>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 2 }}>
                      Track individual invoice settlements & aging
                    </span>
                  </div>

                  {/* Credit Days */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-credit-days">
                      Credit Days <span style={{ color: "var(--text-subtle)", fontWeight: 400, fontSize: 11.5 }}>(Non-negative)</span>
                    </label>
                    <input
                      id="form-credit-days"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={ledgerFormData.creditDays}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0);
                        setLedgerFormData({ ...ledgerFormData, creditDays: val });
                        if (ledgerErrors.creditDays) {
                          setLedgerErrors((prev) => {
                            const next = { ...prev };
                            delete next.creditDays;
                            return next;
                          });
                        }
                      }}
                      className={`${styles.formInput} ${ledgerErrors.creditDays ? styles.inputError : ""}`}
                    />
                    {ledgerErrors.creditDays && (
                      <div className={styles.fieldError}>
                        <span>⚠ {ledgerErrors.creditDays}</span>
                      </div>
                    )}
                  </div>

                  {/* Credit Limit */}
                  <div className={`${styles.formField} ${styles.formGridFull}`}>
                    <label className={styles.formLabel} htmlFor="form-credit-limit">
                      Credit Limit (₹) <span style={{ color: "var(--text-subtle)", fontWeight: 400, fontSize: 11.5 }}>(Non-negative currency)</span>
                    </label>
                    <input
                      id="form-credit-limit"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0.00"
                      value={ledgerFormData.creditLimit}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                        setLedgerFormData({ ...ledgerFormData, creditLimit: val });
                        if (ledgerErrors.creditLimit) {
                          setLedgerErrors((prev) => {
                            const next = { ...prev };
                            delete next.creditLimit;
                            return next;
                          });
                        }
                      }}
                      className={`${styles.formInput} ${ledgerErrors.creditLimit ? styles.inputError : ""}`}
                    />
                    {ledgerErrors.creditLimit && (
                      <div className={styles.fieldError}>
                        <span>⚠ {ledgerErrors.creditLimit}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION B: Address and Contact Details */}
              <div
                className={styles.formSectionCard}
                style={{ display: activeLedgerSection === "contact" ? "flex" : "none" }}
              >
                <div className={styles.formSectionHeader}>
                  <div className={styles.formSectionBadge}>B</div>
                  <div className={styles.formSectionTitleCol}>
                    <h3 className={styles.formSectionTitle}>Address and Contact Details</h3>
                    <p className={styles.formSectionDesc}>Contact person, phone & WhatsApp numbers, and official mailing address</p>
                  </div>
                </div>

                <div className={styles.formGridTwo}>
                  {/* Address - multiline */}
                  <div className={`${styles.formField} ${styles.formGridFull}`}>
                    <label className={styles.formLabel} htmlFor="form-address">
                      Address <span style={{ color: "var(--text-subtle)", fontWeight: 400, fontSize: 11.5 }}>(Multiline)</span>
                    </label>
                    <textarea
                      id="form-address"
                      rows={3}
                      placeholder="Door No., Building, Street, Area..."
                      value={ledgerFormData.address}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, address: e.target.value })}
                      className={styles.formInput}
                      style={{ height: "auto", minHeight: 68, resize: "vertical" }}
                    />
                  </div>

                  {/* Contact Person */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-contact-person">
                      Contact Person
                    </label>
                    <input
                      id="form-contact-person"
                      type="text"
                      placeholder="e.g. K. V. Narayanan (Proprietor)"
                      value={ledgerFormData.contactPerson}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, contactPerson: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Phone Number */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-phone">
                      Phone Number
                    </label>
                    <input
                      id="form-phone"
                      type="text"
                      placeholder="e.g. +91 484 2356789"
                      value={ledgerFormData.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLedgerFormData((prev) => ({
                          ...prev,
                          phone: val,
                          ...(whatsappSameAsPhone ? { whatsapp: val } : {}),
                        }));
                      }}
                      className={styles.formInput}
                    />
                  </div>

                  {/* WhatsApp Number */}
                  <div className={styles.formField}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className={styles.formLabel} htmlFor="form-whatsapp">
                        WhatsApp Number
                      </label>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--brand-emerald-hover)",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <input
                          id="form-whatsapp-same"
                          type="checkbox"
                          checked={whatsappSameAsPhone}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setWhatsappSameAsPhone(isChecked);
                            if (isChecked) {
                              setLedgerFormData((prev) => ({ ...prev, whatsapp: prev.phone }));
                            }
                          }}
                          style={{ accentColor: "var(--brand-emerald)", cursor: "pointer", width: 14, height: 14 }}
                        />
                        Same as Phone
                      </label>
                    </div>
                    <input
                      id="form-whatsapp"
                      type="text"
                      placeholder={whatsappSameAsPhone && ledgerFormData.phone ? ledgerFormData.phone : "e.g. +91 98471 22334"}
                      value={ledgerFormData.whatsapp}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLedgerFormData((prev) => ({ ...prev, whatsapp: val }));
                        if (whatsappSameAsPhone && val !== ledgerFormData.phone) {
                          setWhatsappSameAsPhone(false);
                        }
                      }}
                      className={styles.formInput}
                    />
                    {whatsappSameAsPhone && (
                      <span style={{ fontSize: 11, color: "var(--brand-emerald-hover)", display: "inline-flex", alignItems: "center", gap: 4, marginTop: -2 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Same as phone number
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-email">
                      Email
                    </label>
                    <input
                      id="form-email"
                      type="email"
                      placeholder="e.g. accounts@company.in"
                      value={ledgerFormData.email}
                      onChange={(e) => {
                        setLedgerFormData({ ...ledgerFormData, email: e.target.value });
                        if (ledgerErrors.email) {
                          setLedgerErrors((prev) => {
                            const next = { ...prev };
                            delete next.email;
                            return next;
                          });
                        }
                      }}
                      className={`${styles.formInput} ${ledgerErrors.email ? styles.inputError : ""}`}
                    />
                    {ledgerErrors.email && (
                      <div className={styles.fieldError}>
                        <span>⚠ {ledgerErrors.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Website */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-website">
                      Website
                    </label>
                    <input
                      id="form-website"
                      type="url"
                      placeholder="https://example.com"
                      value={ledgerFormData.website}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, website: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Pincode */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-pincode">
                      Pincode
                    </label>
                    <input
                      id="form-pincode"
                      type="text"
                      placeholder="e.g. 682016"
                      value={ledgerFormData.pincode}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, pincode: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Country */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-country">
                      Country
                    </label>
                    <input
                      id="form-country"
                      type="text"
                      placeholder="India"
                      value={ledgerFormData.country}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, country: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>

                  {/* State */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-state">
                      State
                    </label>
                    <select
                      id="form-state"
                      value={ledgerFormData.state}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, state: e.target.value })}
                      className={styles.formSelect}
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION C: Business and Tax Details */}
              <div
                className={styles.formSectionCard}
                style={{ display: activeLedgerSection === "tax" ? "flex" : "none" }}
              >
                <div className={styles.formSectionHeader}>
                  <div className={styles.formSectionBadge}>C</div>
                  <div className={styles.formSectionTitleCol}>
                    <h3 className={styles.formSectionTitle}>Business and Tax Details</h3>
                    <p className={styles.formSectionDesc}>Income tax PAN, Corporate Identity CIN, and GST regime</p>
                  </div>
                </div>

                <div className={styles.formGridTwo}>
                  {/* PAN Number */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-pan">
                      PAN Number
                    </label>
                    <input
                      id="form-pan"
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={ledgerFormData.pan}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, pan: e.target.value.toUpperCase() })}
                      className={styles.formInput}
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>

                  {/* CIN Number */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-cin">
                      CIN Number
                    </label>
                    <input
                      id="form-cin"
                      type="text"
                      placeholder="e.g. U25200KL2018PTC051234"
                      value={ledgerFormData.cin}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, cin: e.target.value.toUpperCase() })}
                      className={styles.formInput}
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>

                  {/* GST Registration Type */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-gst-type">
                      GST Registration Type
                    </label>
                    <select
                      id="form-gst-type"
                      value={ledgerFormData.gstType}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, gstType: e.target.value as GstRegistrationType })}
                      className={styles.formSelect}
                    >
                      <option value="Regular">Regular</option>
                      <option value="Composition">Composition</option>
                      <option value="Consumer">Consumer</option>
                      <option value="Unregistered">Unregistered</option>
                    </select>
                  </div>

                  {/* GSTIN (relevant when Regular or Composition) */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-gstin">
                      GSTIN / Tax ID {ledgerFormData.gstType === "Regular" ? (
                        <span style={{ color: "var(--brand-emerald-hover)", fontSize: 11.5 }}>(Required for ITC)</span>
                      ) : ledgerFormData.gstType === "Composition" ? (
                        <span style={{ color: "#d97706", fontSize: 11.5 }}>(Composition Dealer)</span>
                      ) : (
                        <span style={{ color: "var(--text-subtle)", fontSize: 11.5 }}>(Optional)</span>
                      )}
                    </label>
                    <input
                      id="form-gstin"
                      type="text"
                      placeholder="e.g. 32AAAAA0000A1Z5"
                      value={ledgerFormData.gstin}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, gstin: e.target.value.toUpperCase() })}
                      className={styles.formInput}
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION D: Bank Details */}
              <div
                className={styles.formSectionCard}
                style={{ display: activeLedgerSection === "bank" ? "flex" : "none" }}
              >
                <div className={styles.formSectionHeader}>
                  <div className={styles.formSectionBadge}>D</div>
                  <div className={styles.formSectionTitleCol}>
                    <h3 className={styles.formSectionTitle}>Bank Details</h3>
                    <p className={styles.formSectionDesc}>Maintain bank accounts for electronic settlement & payouts</p>
                  </div>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Maintain Bank Details</label>
                  <div className={styles.toggleButtonGroup}>
                    <button
                      type="button"
                      id="btn-bankdetails-yes"
                      onClick={() => setLedgerFormData({ ...ledgerFormData, maintainBankDetails: true })}
                      className={`${styles.toggleButton} ${ledgerFormData.maintainBankDetails ? styles.toggleButtonActive : ""}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      id="btn-bankdetails-no"
                      onClick={() => setLedgerFormData({ ...ledgerFormData, maintainBankDetails: false })}
                      className={`${styles.toggleButton} ${!ledgerFormData.maintainBankDetails ? styles.toggleButtonActive : ""}`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {/* Revealed when Yes, hidden when No */}
                {ledgerFormData.maintainBankDetails ? (
                  <div className={styles.bankDetailsBox}>
                    <div className={styles.bankDetailsHeader}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                      <span>Bank Account Details</span>
                    </div>

                    <div className={styles.formGridTwo}>
                      {/* Bank Name */}
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="form-bank-name">
                          Bank Name
                        </label>
                        <input
                          id="form-bank-name"
                          type="text"
                          placeholder="e.g. HDFC Bank Ltd"
                          value={ledgerFormData.bankName}
                          onChange={(e) => setLedgerFormData({ ...ledgerFormData, bankName: e.target.value })}
                          className={styles.formInput}
                        />
                      </div>

                      {/* Account Holder Name */}
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="form-acc-holder">
                          Account Holder Name
                        </label>
                        <input
                          id="form-acc-holder"
                          type="text"
                          placeholder="e.g. Billing ERP Private Limited"
                          value={ledgerFormData.accountHolderName}
                          onChange={(e) => setLedgerFormData({ ...ledgerFormData, accountHolderName: e.target.value })}
                          className={styles.formInput}
                        />
                      </div>

                      {/* Account Number */}
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="form-acc-number">
                          Account Number
                        </label>
                        <input
                          id="form-acc-number"
                          type="text"
                          placeholder="e.g. 50200045890021"
                          value={ledgerFormData.accountNumber}
                          onChange={(e) => setLedgerFormData({ ...ledgerFormData, accountNumber: e.target.value })}
                          className={styles.formInput}
                        />
                      </div>

                      {/* IFSC Code */}
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="form-ifsc">
                          IFSC Code
                        </label>
                        <input
                          id="form-ifsc"
                          type="text"
                          placeholder="e.g. HDFC0000021"
                          value={ledgerFormData.ifscCode}
                          onChange={(e) => setLedgerFormData({ ...ledgerFormData, ifscCode: e.target.value.toUpperCase() })}
                          className={styles.formInput}
                          style={{ textTransform: "uppercase" }}
                        />
                      </div>

                      {/* Branch Name */}
                      <div className={`${styles.formField} ${styles.formGridFull}`}>
                        <label className={styles.formLabel} htmlFor="form-branch">
                          Branch Name
                        </label>
                        <input
                          id="form-branch"
                          type="text"
                          placeholder="e.g. MG Road Branch, Kochi"
                          value={ledgerFormData.branchName}
                          onChange={(e) => setLedgerFormData({ ...ledgerFormData, branchName: e.target.value })}
                          className={styles.formInput}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "var(--text-subtle)", padding: "4px 0" }}>
                    No bank account details configured for this ledger. Set toggle to &quot;Yes&quot; to specify banking coordinates.
                  </div>
                )}
              </div>

              {/* SECTION E: Opening Balance */}
              <div
                className={styles.formSectionCard}
                style={{ display: activeLedgerSection === "opening" ? "flex" : "none" }}
              >
                <div className={styles.formSectionHeader}>
                  <div className={styles.formSectionBadge}>E</div>
                  <div className={styles.formSectionTitleCol}>
                    <h3 className={styles.formSectionTitle}>Opening Balance</h3>
                    <p className={styles.formSectionDesc}>Starting ledger balance and Dr/Cr classification</p>
                  </div>
                </div>

                <div className={styles.formGridTwo}>
                  {/* Opening Balance Amount */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="form-opening-balance">
                      Opening Balance Amount (₹) <span style={{ color: "var(--text-subtle)", fontWeight: 400, fontSize: 11.5 }}>(Non-negative)</span>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        id="form-opening-balance"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={ledgerFormData.openingBalance}
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                          setLedgerFormData({ ...ledgerFormData, openingBalance: val });
                          if (ledgerErrors.openingBalance) {
                            setLedgerErrors((prev) => {
                              const next = { ...prev };
                              delete next.openingBalance;
                              return next;
                            });
                          }
                        }}
                        className={`${styles.formInput} ${ledgerErrors.openingBalance ? styles.inputError : ""}`}
                        style={{ flex: 1 }}
                      />
                      {/* Display balance type clearly beside amount */}
                      <div
                        style={{
                          padding: "8px 14px",
                          borderRadius: "var(--radius-pill)",
                          fontWeight: 700,
                          fontSize: 13,
                          backgroundColor: ledgerFormData.balanceType === "Dr" ? "#eaf7ec" : "#faf5ff",
                          color: ledgerFormData.balanceType === "Dr" ? "#15803d" : "#7e22ce",
                          border: ledgerFormData.balanceType === "Dr" ? "1px solid #bbf7d0" : "1px solid #e9d5ff",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {formatCurrency(Number(ledgerFormData.openingBalance) || 0)} {ledgerFormData.balanceType}
                      </div>
                    </div>
                    {ledgerErrors.openingBalance && (
                      <div className={styles.fieldError}>
                        <span>⚠ {ledgerErrors.openingBalance}</span>
                      </div>
                    )}
                  </div>

                  {/* Balance Type - Debit or Credit */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      Balance Type
                    </label>
                    <div className={styles.drCrToggleGroup}>
                      <button
                        type="button"
                        id="btn-balance-dr"
                        onClick={() => {
                          if (ledgerFormData.openingBills && ledgerFormData.openingBills.length > 0) return;
                          setLedgerFormData({ ...ledgerFormData, balanceType: "Dr" });
                        }}
                        className={`${styles.drCrBtn} ${ledgerFormData.balanceType === "Dr" ? styles.drCrBtnActive : ""}`}
                        title={
                          ledgerFormData.openingBills && ledgerFormData.openingBills.length > 0
                            ? "Debit balance"
                            : "Click to set Debit"
                        }
                      >
                        Debit (Dr)
                      </button>
                      <button
                        type="button"
                        id="btn-balance-cr"
                        onClick={() => {
                          if (ledgerFormData.openingBills && ledgerFormData.openingBills.length > 0) return;
                          setLedgerFormData({ ...ledgerFormData, balanceType: "Cr" });
                        }}
                        className={`${styles.drCrBtn} ${ledgerFormData.balanceType === "Cr" ? styles.drCrBtnActive : ""}`}
                        title={
                          ledgerFormData.openingBills && ledgerFormData.openingBills.length > 0
                            ? "Credit balance"
                            : "Click to set Credit"
                        }
                      >
                        Credit (Cr)
                      </button>
                    </div>
                  </div>
                </div>

                {/* BILL-BY-BILL BREAKDOWN DROPDOWN TABLE */}
                <div className={styles.openingBillsAccordion}>
                  <div
                    className={`${styles.openingBillsHeader} ${isOpeningBillsDropdownOpen ? styles.openingBillsHeaderOpen : ""}`}
                    onClick={() => setIsOpeningBillsDropdownOpen((prev) => !prev)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsOpeningBillsDropdownOpen((prev) => !prev);
                      }
                    }}
                  >
                    <div className={styles.openingBillsTitleGroup}>
                      <svg
                        className={`${styles.chevronIcon} ${isOpeningBillsDropdownOpen ? styles.chevronIconOpen : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <div>
                        <div className={styles.openingBillsTitle}>
                          <span>Bill-by-Bill Breakdown</span>
                          <span
                            className={`${styles.openingBillsCountBadge} ${
                              ledgerFormData.openingBills && ledgerFormData.openingBills.length > 0
                                ? styles.openingBillsCountBadgeFilled
                                : ""
                            }`}
                          >
                            {ledgerFormData.openingBills?.length || 0}{" "}
                            {ledgerFormData.openingBills?.length === 1 ? "Bill" : "Bills"}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 2 }}>
                          Itemize opening balance by individual invoice numbers, dates, credit terms, and Dr/Cr
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Table Body */}
                  {isOpeningBillsDropdownOpen && (
                    <div className={styles.openingBillsBody}>
                      {ledgerFormData.openingBills && ledgerFormData.openingBills.length > 0 ? (
                        <>
                          <div className={styles.openingBillsTableWrapper}>
                            <table className={styles.openingBillsTable}>
                              <thead>
                                <tr>
                                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                                  <th style={{ minWidth: 150 }}>Bill No / Ref</th>
                                  <th style={{ minWidth: 135 }}>Bill Date</th>
                                  <th style={{ minWidth: 135 }}>Due Date</th>
                                  <th style={{ minWidth: 140 }}>Amount (₹)</th>
                                  <th style={{ width: 90 }}>Dr / Cr</th>
                                  <th style={{ width: 45, textAlign: "center" }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {ledgerFormData.openingBills.map((bill, index) => (
                                  <tr key={bill.id}>
                                    <td style={{ textAlign: "center", color: "var(--text-subtle)", fontWeight: 600 }}>
                                      {index + 1}
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        placeholder="e.g. INV-2024-001"
                                        value={bill.billNo}
                                        onChange={(e) => handleUpdateOpeningBillRow(bill.id, "billNo", e.target.value)}
                                        className={styles.billInput}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="date"
                                        value={bill.billDate}
                                        onChange={(e) => handleUpdateOpeningBillRow(bill.id, "billDate", e.target.value)}
                                        className={styles.billInput}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="date"
                                        value={bill.dueDate}
                                        onChange={(e) => handleUpdateOpeningBillRow(bill.id, "dueDate", e.target.value)}
                                        className={styles.billInput}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={bill.amount}
                                        onChange={(e) => {
                                          const val = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                                          handleUpdateOpeningBillRow(bill.id, "amount", val);
                                        }}
                                        className={styles.billInput}
                                        style={{ textAlign: "right" }}
                                      />
                                    </td>
                                    <td>
                                      <select
                                        value={bill.drCr}
                                        data-type={bill.drCr}
                                        onChange={(e) => handleUpdateOpeningBillRow(bill.id, "drCr", e.target.value as "Dr" | "Cr")}
                                        className={styles.billSelectDrCr}
                                      >
                                        <option value="Dr">Dr</option>
                                        <option value="Cr">Cr</option>
                                      </select>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteOpeningBillRow(bill.id)}
                                        className={styles.billRowDeleteBtn}
                                        title="Delete this bill row"
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Quick row append button */}
                          <div style={{ display: "flex", justifyContent: "flex-start" }}>
                            <button
                              type="button"
                              onClick={handleAddOpeningBillRow}
                              className={styles.stepNavBtn}
                              style={{ fontSize: 12, padding: "6px 12px" }}
                            >
                              + Add Another Bill
                            </button>
                          </div>

                          {/* BREAKDOWN TOTALS */}
                          <div className={styles.openingBillsTotalsCard}>
                              <div className={styles.totalsGrid}>
                                <div className={styles.totalMetricBox}>
                                  <span className={styles.totalMetricLabel}>Total Debit (Dr)</span>
                                  <span className={`${styles.totalMetricValue} ${styles.totalMetricValueDr}`}>
                                    {formatCurrency(openingBillTotals.totalDr)} Dr
                                  </span>
                                </div>
                                <div className={styles.totalMetricBox}>
                                  <span className={styles.totalMetricLabel}>Total Credit (Cr)</span>
                                  <span className={`${styles.totalMetricValue} ${styles.totalMetricValueCr}`}>
                                    {formatCurrency(openingBillTotals.totalCr)} Cr
                                  </span>
                                </div>
                                <div className={styles.totalMetricBox}>
                                  <span className={styles.totalMetricLabel}>Net Breakdown Total</span>
                                  <span className={styles.totalMetricValue}>
                                    {formatCurrency(openingBillTotals.netAmount)} {openingBillTotals.netType}
                                  </span>
                                </div>
                                <div className={styles.totalMetricBox}>
                                  <span className={styles.totalMetricLabel}>Total Invoices</span>
                                  <span className={styles.totalMetricValue}>
                                    {openingBillTotals.totalCount} {openingBillTotals.totalCount === 1 ? "bill" : "bills"}
                                  </span>
                                </div>
                              </div>
                            </div>
                        </>
                      ) : (
                        <div className={styles.emptyBillsState}>
                          <p className={styles.emptyBillsText}>
                            No bill-wise opening balance records added yet.
                          </p>
                          <button
                            type="button"
                            onClick={handleAddOpeningBillRow}
                            className={styles.addBillRowBtn}
                          >
                            + Add First Bill Row
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Bottom Action & Stepper Bar */}
              <div className={styles.ledgerFormFooterBar}>
                <div className={styles.sectionFooterNav}>
                  <div className={styles.sectionFooterLeft}>
                    {prevSection ? (
                      <button
                        type="button"
                        id="btn-prev-section"
                        onClick={goToPrevSection}
                        className={styles.stepNavBtn}
                      >
                        ← Previous: {prevSection.title}
                      </button>
                    ) : (
                      <button
                        type="button"
                        id="btn-ledger-bottom-cancel"
                        onClick={handleCloseLedgerForm}
                        className={styles.secondaryBtn}
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className={styles.sectionStepIndicator}>
                    Section {currentSectionIndex + 1} of {LEDGER_FORM_SECTIONS.length}:{" "}
                    <strong>{currentSection.title}</strong>
                  </div>

                  <div className={styles.sectionFooterRight}>
                    {nextSection && (
                      <button
                        type="button"
                        id="btn-next-section"
                        onClick={goToNextSection}
                        className={`${styles.stepNavBtn} ${styles.stepNavBtnPrimary}`}
                      >
                        Next: {nextSection.title} →
                      </button>
                    )}
                    <button
                      type="submit"
                      id="btn-ledger-bottom-save"
                      className={styles.primaryBtn}
                      style={{ minWidth: 140 }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{editingLedgerId ? "Update Ledger" : "Save Ledger"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* -------------------------------------------------------------
              VIEW 3: MASTER DATA - LEDGERS MASTER (LIST)
              ------------------------------------------------------------- */
          <div className={`${styles.contentContainer} animate-fade-in`}>
            {/* Header */}
            <div className={styles.ledgerHeader}>
              <div>
                <span className={styles.breadcrumbBadge}>ACCOUNTING MASTER</span>
                <h1 className={styles.heroHeading}>Ledgers</h1>
                <p className={styles.heroDescription}>
                  Manage customer, supplier, and other account ledgers.
                </p>
              </div>

              <button
                id="btn-create-ledger"
                onClick={() => handleOpenAddLedgerModal(selectedLedgerNatureFilter !== "All" ? selectedLedgerNatureFilter : "Asset")}
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
                  onClick={() =>
                    setSelectedLedgerNatureFilter((prev) => (prev === opt.key ? "All" : opt.key))
                  }
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
                    <span className={styles.badgePillar}>Pillar</span>
                  </div>
                  <div className={styles.natureStatCount}>{ledgerCountsByNature[opt.key]} Ledgers</div>
                  <div className={styles.natureStatDesc}>{opt.desc}</div>
                </div>
              ))}
            </div>

            {/* Toolbar: Nature Tabs, Search, Group & GST Type Filters */}
            <div className={styles.tableToolbar} style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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

                <div className={styles.tableSearchWrapper} style={{ minWidth: 280, flex: 1, maxWidth: 420 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    id="ledger-search-input"
                    type="text"
                    placeholder="Search by ledger name or code..."
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    className={styles.tableSearchInput}
                  />
                  {ledgerSearchQuery && (
                    <button
                      onClick={() => setLedgerSearchQuery("")}
                      style={{ color: "var(--text-subtle)", fontSize: 12, background: "none", border: "none", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Bar: Group Filter, GST Registration Type Filter, Reset Button */}
              <div className={styles.ledgerFiltersBar}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <label htmlFor="filter-ledger-group" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                    Group:
                  </label>
                  <select
                    id="filter-ledger-group"
                    value={selectedLedgerGroupFilter}
                    onChange={(e) => setSelectedLedgerGroupFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="All">All Groups ({availableLedgerGroupOptions.length})</option>
                    {availableLedgerGroupOptions.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <label htmlFor="filter-gst-type" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                    GST Type:
                  </label>
                  <select
                    id="filter-gst-type"
                    value={selectedGstTypeFilter}
                    onChange={(e) => setSelectedGstTypeFilter(e.target.value as "All" | GstRegistrationType)}
                    className={styles.filterSelect}
                  >
                    <option value="All">All GST Types</option>
                    <option value="Regular">Regular</option>
                    <option value="Composition">Composition</option>
                    <option value="Consumer">Consumer</option>
                    <option value="Unregistered">Unregistered</option>
                  </select>
                </div>

                {(selectedLedgerGroupFilter !== "All" ||
                  selectedGstTypeFilter !== "All" ||
                  selectedLedgerNatureFilter !== "All" ||
                  ledgerSearchQuery.trim() !== "") && (
                  <button
                    type="button"
                    id="btn-reset-ledger-filters"
                    onClick={handleResetLedgerFilters}
                    className={styles.filterResetBtn}
                    title="Reset all search queries and active filters"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="1 4 1 10 7 10" />
                      <polyline points="23 20 23 14 17 14" />
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                    <span>Reset Filters</span>
                  </button>
                )}

                <div style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--text-muted)" }}>
                  Showing <strong>{filteredLedgers.length}</strong> of <strong>{ledgers.length}</strong> ledgers
                </div>
              </div>
            </div>

            {/* Responsive Ledgers Table */}
            <div className={styles.tableContainer}>
              <table className={styles.erpTable}>
                <thead>
                  <tr>
                    <th>Ledger Name</th>
                    <th>Code</th>
                    <th>Group</th>
                    <th>Phone</th>
                    <th>GST Type</th>
                    <th>Opening Balance</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "56px 20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: "50%",
                              backgroundColor: "var(--bg-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-muted)",
                            }}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                          </div>
                          <div style={{ color: "var(--text-main)", fontSize: 15, fontWeight: 600 }}>
                            No ledgers found matching criteria
                          </div>
                          <div style={{ color: "var(--text-subtle)", fontSize: 13, maxWidth: 360 }}>
                            Try adjusting your search terms, Ledger Group, or GST filter, or click below to add a new ledger.
                          </div>
                          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                            <button
                              type="button"
                              onClick={handleResetLedgerFilters}
                              className={styles.secondaryBtn}
                            >
                              Clear All Filters
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAddLedgerModal()}
                              className={styles.primaryBtn}
                            >
                              + New Ledger
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLedgers.map((ledger) => {
                      const gstType = ledger.gstType || "Unregistered";
                      return (
                        <tr key={ledger.id} id={`ledger-row-${ledger.id}`}>
                          {/* 1. Ledger Name */}
                          <td>
                            <div className={styles.groupNameCell}>
                              <div className={styles.groupIcon}>
                                {ledger.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className={styles.groupTitle}>{ledger.name}</div>
                                {ledger.contactPerson && (
                                  <div style={{ fontSize: "11px", color: "var(--text-subtle)", fontWeight: 500 }}>
                                    Attn: {ledger.contactPerson}
                                  </div>
                                )}
                                {ledger.address && !ledger.contactPerson && (
                                  <div style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                                    {ledger.address.length > 36 ? `${ledger.address.substring(0, 36)}...` : ledger.address}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Code */}
                          <td>
                            {ledger.code ? (
                              <span className={styles.ledgerCodeTag}>#{ledger.code}</span>
                            ) : (
                              <span style={{ color: "var(--text-subtle)", fontSize: "12px" }}>—</span>
                            )}
                          </td>

                          {/* 3. Group */}
                          <td>
                            <span className={styles.badgeUnderGroup}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                              {ledger.underGroup}
                            </span>
                          </td>

                          {/* 4. Phone & WhatsApp */}
                          <td>
                            {ledger.phone || ledger.whatsapp || ledger.mobile ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {(ledger.phone || ledger.mobile) && (
                                  <span className={styles.ledgerContactText}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                    {ledger.phone || ledger.mobile}
                                  </span>
                                )}
                                {ledger.whatsapp && (
                                  <span
                                    title={ledger.whatsapp === (ledger.phone || ledger.mobile) ? "WhatsApp (Same as Phone)" : `WhatsApp: ${ledger.whatsapp}`}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      fontSize: "11px",
                                      color: "#16a34a",
                                      fontWeight: 500,
                                    }}
                                  >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                    </svg>
                                    {ledger.whatsapp === (ledger.phone || ledger.mobile) ? (
                                      <span>WA: Same</span>
                                    ) : (
                                      <span>WA: {ledger.whatsapp}</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-subtle)", fontSize: "12px" }}>—</span>
                            )}
                          </td>

                          {/* 5. GST Type */}
                          <td>
                            <span
                              className={
                                gstType === "Regular"
                                  ? styles.gstBadgeRegular
                                  : gstType === "Composition"
                                  ? styles.gstBadgeComposition
                                  : gstType === "Consumer"
                                  ? styles.gstBadgeConsumer
                                  : styles.gstBadgeUnregistered
                              }
                            >
                              ● {gstType}
                            </span>
                          </td>

                          {/* 6. Opening Balance */}
                          <td>
                            <div className={styles.balanceCell}>
                              <span>{formatCurrency(ledger.openingBalance)}</span>
                              <span className={ledger.balanceType === "Dr" ? styles.drTag : styles.crTag}>
                                {ledger.balanceType}
                              </span>
                            </div>
                          </td>

                          {/* 7. Actions */}
                          <td>
                            <div className={styles.actionCell}>
                              {/* View Action */}
                              <button
                                id={`btn-view-ledger-${ledger.id}`}
                                onClick={() => setViewingLedger(ledger)}
                                className={styles.tableActionBtn}
                                title="View Ledger Details"
                              >
                                View
                              </button>
                              {/* Edit Action */}
                              <button
                                id={`btn-edit-ledger-${ledger.id}`}
                                onClick={() => handleOpenEditLedgerModal(ledger)}
                                className={styles.tableActionBtn}
                                title="Edit Ledger"
                              >
                                Edit
                              </button>
                              {/* Delete Action */}
                              <button
                                id={`btn-delete-ledger-${ledger.id}`}
                                onClick={() => setLedgerToDelete(ledger)}
                                className={`${styles.tableActionBtn} ${styles.tableDeleteBtn}`}
                                title="Delete Ledger"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
                <span className={styles.formLabelDesc}>
                  Select parent group to automatically inherit its accounting nature, or assign to &quot;Primary&quot; for top-level chart of accounts.
                </span>
                <select
                  id="under-group-select"
                  value={formData.underGroup}
                  onChange={(e) => handleGroupParentSelect(e.target.value)}
                  className={styles.formSelect}
                >
                  {parentGroupOptions.map((opt) => (
                    <option key={opt.name} value={opt.name}>
                      {opt.name === "Primary"
                        ? "Primary (Top-level)"
                        : `Under: ${opt.name} (${opt.nature === "Asset" ? "Assets" : opt.nature === "Liability" ? "Liabilities" : opt.nature})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nature of Group (Inherited by default, fully editable) */}
              <div className={styles.formField}>
                <div className={styles.natureFieldHeader}>
                  <label className={styles.formLabel}>
                    Nature of Group (4 Core Accounting Pillars) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  {formData.underGroup !== "Primary" && matchedParentGroup && (
                    <div className={styles.natureInheritStatus}>
                      {formData.nature === matchedParentGroup.nature ? (
                        <span className={styles.inheritedBadge}>
                          ✓ Inherited from &ldquo;{formData.underGroup}&rdquo;
                        </span>
                      ) : (
                        <div className={styles.overrideNotice}>
                          <span className={styles.overrideBadge}>
                            ✎ Custom Nature
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                nature: matchedParentGroup.nature,
                                affectsGrossProfit: matchedParentGroup.affectsGrossProfit,
                              })
                            }
                            className={styles.resetToParentBtn}
                            title={`Reset to parent's nature (${matchedParentGroup.nature})`}
                          >
                            ↺ Reset to parent ({matchedParentGroup.nature})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className={styles.formLabelDesc}>
                  {formData.underGroup === "Primary"
                    ? "Select the foundational accounting pillar for this top-level group."
                    : `Auto-inherited from parent group "${formData.underGroup}". You can select any pillar below to customize.`}
                </span>

                <div className={styles.natureRadioGroup}>
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
                      className={`${styles.natureRadioCard} ${
                        formData.nature === opt.key ? styles.natureRadioSelected : ""
                      }`}
                    >
                      <div className={styles.natureRadioHeader}>
                        <span className={styles.natureRadioName}>{opt.label}</span>
                        {formData.nature === opt.key && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-emerald)" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className={styles.natureRadioSubtext}>{opt.desc}</span>
                    </div>
                  ))}
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
                  value={formData.code}
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
          MODAL: VIEW LEDGER DETAILS (COMPREHENSIVE PROFILE)
          ------------------------------------------------------------- */}
      {viewingLedger && (
        <div className={styles.modalBackdrop} onClick={() => setViewingLedger(null)}>
          <div className={styles.viewModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Ledger Profile: {viewingLedger.name}</span>
              </div>
              <button
                id="btn-close-view-ledger"
                onClick={() => setViewingLedger(null)}
                className={styles.modalCloseBtn}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.scrollableModalForm}>
              {/* Basic Overview Card */}
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Ledger Name</span>
                  <span className={styles.detailValue}>{viewingLedger.name}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Ledger Code</span>
                  <span className={styles.detailValue}>
                    {viewingLedger.code ? <span className={styles.ledgerCodeTag}>#{viewingLedger.code}</span> : "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Under Group</span>
                  <span className={styles.detailValue}>
                    <span className={styles.badgeUnderGroup}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      {viewingLedger.underGroup}
                    </span>
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Nature</span>
                  <span className={styles.detailValue}>
                    <span
                      className={`${styles.badgeNature} ${
                        viewingLedger.nature === "Asset"
                          ? styles.badgeAsset
                          : viewingLedger.nature === "Expenses"
                          ? styles.badgeExpenses
                          : viewingLedger.nature === "Income"
                          ? styles.badgeIncome
                          : styles.badgeLiability
                      }`}
                    >
                      ● {viewingLedger.nature}
                    </span>
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Opening Balance</span>
                  <span className={styles.detailValue}>
                    <strong>{formatCurrency(viewingLedger.openingBalance)}</strong>{" "}
                    <span className={viewingLedger.balanceType === "Dr" ? styles.drTag : styles.crTag}>
                      {viewingLedger.balanceType}
                    </span>
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>GST Registration Type</span>
                  <span className={styles.detailValue}>
                    <span
                      className={
                        viewingLedger.gstType === "Regular"
                          ? styles.gstBadgeRegular
                          : viewingLedger.gstType === "Composition"
                          ? styles.gstBadgeComposition
                          : viewingLedger.gstType === "Consumer"
                          ? styles.gstBadgeConsumer
                          : styles.gstBadgeUnregistered
                      }
                    >
                      ● {viewingLedger.gstType || "Unregistered"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Billing and Credit Settings */}
              <div className={styles.detailSublistCard}>
                <div className={styles.detailSublistTitle}>
                  <span>Billing & Credit Settings</span>
                </div>
                <div className={styles.viewDetailList}>
                  <div>Bill-by-Bill Tracking: <strong>{viewingLedger.maintainBillByBill ? "Yes" : "No"}</strong></div>
                  <div>Credit Days: <strong>{viewingLedger.creditDays || 0} days</strong></div>
                  <div>Credit Limit: <strong>{formatCurrency(viewingLedger.creditLimit || 0)}</strong></div>
                  <div>Created Date: <strong>{viewingLedger.createdAt || "2026-04-01"}</strong></div>
                </div>
              </div>

              {/* Address and Contact Details */}
              <div className={styles.detailSublistCard}>
                <div className={styles.detailSublistTitle}>
                  <span>Address & Contact Details</span>
                </div>
                <div className={styles.viewDetailList}>
                  <div>Contact Person: <strong>{viewingLedger.contactPerson || "—"}</strong></div>
                  <div>Phone: <strong>{viewingLedger.phone || viewingLedger.mobile || "—"}</strong></div>
                  <div>WhatsApp: <strong>{viewingLedger.whatsapp || "—"}{viewingLedger.whatsapp && viewingLedger.whatsapp === (viewingLedger.phone || viewingLedger.mobile) ? " (Same as Phone)" : ""}</strong></div>
                  <div>Email: <strong>{viewingLedger.email || "—"}</strong></div>
                  <div>Website: <strong>{viewingLedger.website ? <a href={viewingLedger.website} target="_blank" rel="noreferrer" style={{ color: "var(--brand-emerald-hover)", textDecoration: "underline" }}>{viewingLedger.website}</a> : "—"}</strong></div>
                  <div style={{ gridColumn: "1 / -1" }}>Address: <strong>{viewingLedger.address || "—"}</strong></div>
                  <div>State: <strong>{viewingLedger.state || "—"}</strong></div>
                  <div>Country: <strong>{viewingLedger.country || "India"}</strong></div>
                  <div>Pincode: <strong>{viewingLedger.pincode || "—"}</strong></div>
                </div>
              </div>

              {/* Business, Tax & Bank Details */}
              <div className={styles.detailSublistCard}>
                <div className={styles.detailSublistTitle}>
                  <span>Business, Tax & Banking</span>
                </div>
                <div className={styles.viewDetailList}>
                  <div>PAN Number: <strong>{viewingLedger.pan || "—"}</strong></div>
                  <div>CIN Number: <strong>{viewingLedger.cin || "—"}</strong></div>
                  <div>GSTIN: <strong>{viewingLedger.gstin || "—"}</strong></div>
                  <div>Bank Details: <strong>{viewingLedger.maintainBankDetails ? "Yes (Configured)" : "No"}</strong></div>
                  {viewingLedger.maintainBankDetails && (
                    <>
                      <div>Bank Name: <strong>{viewingLedger.bankName || "—"}</strong></div>
                      <div>Account Holder: <strong>{viewingLedger.accountHolderName || "—"}</strong></div>
                      <div>Account Number: <strong>{viewingLedger.accountNumber || "—"}</strong></div>
                      <div>IFSC Code: <strong>{viewingLedger.ifscCode || "—"}</strong></div>
                      <div style={{ gridColumn: "1 / -1" }}>Branch: <strong>{viewingLedger.branchName || "—"}</strong></div>
                    </>
                  )}
                </div>
              </div>

              {/* Opening Balance & Bill Breakdown Details */}
              {viewingLedger.openingBills && viewingLedger.openingBills.length > 0 && (
                <div className={styles.detailSublistCard}>
                  <div className={styles.detailSublistTitle}>
                    <span>Bill-wise Opening Balance Records ({viewingLedger.openingBills.length} bills)</span>
                  </div>
                  <div className={styles.openingBillsTableWrapper} style={{ marginTop: 8 }}>
                    <table className={styles.openingBillsTable}>
                      <thead>
                        <tr>
                          <th style={{ width: 40, textAlign: "center" }}>#</th>
                          <th>Bill No / Ref</th>
                          <th>Bill Date</th>
                          <th>Due Date</th>
                          <th>Amount (₹)</th>
                          <th>Dr / Cr</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingLedger.openingBills.map((b, i) => (
                          <tr key={b.id}>
                            <td style={{ textAlign: "center", color: "var(--text-subtle)", fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{b.billNo || "—"}</td>
                            <td>{b.billDate || "—"}</td>
                            <td>{b.dueDate || "—"}</td>
                            <td style={{ fontWeight: 600 }}>{formatCurrency(b.amount)}</td>
                            <td>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: b.drCr === "Dr" ? "#15803d" : "#7e22ce",
                                }}
                              >
                                {b.drCr}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className={styles.modalFooterSticky}>
                <button
                  type="button"
                  onClick={() => setViewingLedger(null)}
                  className={styles.secondaryBtn}
                >
                  Close
                </button>
                <button
                  type="button"
                  id="btn-edit-from-view-ledger"
                  onClick={() => {
                    const target = viewingLedger;
                    setViewingLedger(null);
                    handleOpenEditLedgerModal(target);
                  }}
                  className={styles.primaryBtn}
                >
                  Edit Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: DELETE LEDGER CONFIRMATION
          ------------------------------------------------------------- */}
      {ledgerToDelete && (
        <div className={styles.modalBackdrop} onClick={() => setLedgerToDelete(null)}>
          <div className={styles.deleteModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalHeader}>
              <div className={styles.deleteModalTitleGroup}>
                <div className={styles.deleteModalIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.deleteModalTitle}>Delete Ledger: {ledgerToDelete.name}</h3>
                </div>
              </div>
              <button
                id="btn-close-delete-ledger-modal"
                onClick={() => setLedgerToDelete(null)}
                className={styles.modalCloseBtn}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.deleteModalBody}>
              <div className={styles.deleteTargetCard}>
                <div className={styles.deleteTargetQuestion}>
                  Are you sure you want to delete ledger &ldquo;<strong>{ledgerToDelete.name}</strong>&rdquo;?
                </div>
                <div className={styles.deleteTargetMeta}>
                  {ledgerToDelete.code && <span>Code: #{ledgerToDelete.code} • </span>}
                  <span>Group: <strong>{ledgerToDelete.underGroup}</strong></span>
                  <span> • </span>
                  <span>Opening Balance: <strong>{formatCurrency(ledgerToDelete.openingBalance)} {ledgerToDelete.balanceType}</strong></span>
                </div>
              </div>

              <div className={styles.deleteNoChildrenBox}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="12" x2="12.01" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="8" />
                </svg>
                <span>This action will remove this ledger from the local prototype session.</span>
              </div>
            </div>

            <div className={styles.deleteModalFooter}>
              <button
                type="button"
                id="btn-cancel-delete-ledger"
                onClick={() => setLedgerToDelete(null)}
                className={styles.secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-ledger"
                onClick={handleConfirmDeleteLedger}
                className={styles.dangerBtn}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Delete Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* -------------------------------------------------------------
          MODAL: VIEW GROUP DETAILS (INHERITANCE & ACCOUNTS)
          ------------------------------------------------------------- */}
      {viewingGroup && (
        <div className={styles.modalBackdrop} onClick={() => setViewingGroup(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Group Details: {viewingGroup.name}</span>
              </div>
              <button
                id="btn-close-view-group"
                onClick={() => setViewingGroup(null)}
                className={styles.modalCloseBtn}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalForm}>
              {/* Info Grid */}
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Group Name</span>
                  <span className={styles.detailValue}>{viewingGroup.name}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Under Group (Parent)</span>
                  <span className={styles.detailValue}>
                    {viewingGroup.underGroup === "Primary" ? (
                      <span className={styles.treePrimaryBadge}>Primary</span>
                    ) : (
                      <span>Under: <strong>{viewingGroup.underGroup}</strong></span>
                    )}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Accounting Nature</span>
                  <span className={styles.detailValue}>
                    <span
                      className={`${styles.treeNatureBadge} ${
                        viewingGroup.nature === "Asset"
                          ? styles.treeNatureAsset
                          : viewingGroup.nature === "Expenses"
                          ? styles.treeNatureExpenses
                          : viewingGroup.nature === "Income"
                          ? styles.treeNatureIncome
                          : styles.treeNatureLiability
                      }`}
                    >
                      ● {viewingGroup.nature === "Asset" ? "Assets" : viewingGroup.nature === "Liability" ? "Liabilities" : viewingGroup.nature}
                    </span>
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Affects Gross Profit</span>
                  <span className={styles.detailValue}>
                    {viewingGroup.affectsGrossProfit ? "✓ Yes" : "— No"}
                  </span>
                </div>
                {viewingGroup.code && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Group Code / Alias</span>
                    <span className={styles.detailValue}>#{viewingGroup.code}</span>
                  </div>
                )}
              </div>

              {/* Subgroups List */}
              <div className={styles.detailSublistCard}>
                <div className={styles.detailSublistTitle}>
                  <span>Subgroups ({(childGroupsByParent.get(viewingGroup.name.toLowerCase()) || []).length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingGroup;
                      setViewingGroup(null);
                      handleOpenAddSubgroup(target);
                    }}
                    style={{ fontSize: "12px", color: "var(--brand-emerald-hover)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    + Add Subgroup
                  </button>
                </div>
                <div className={styles.detailTagList}>
                  {(childGroupsByParent.get(viewingGroup.name.toLowerCase()) || []).length === 0 ? (
                    <span style={{ fontSize: "12.5px", color: "var(--text-subtle)" }}>No subgroups directly under this group.</span>
                  ) : (
                    (childGroupsByParent.get(viewingGroup.name.toLowerCase()) || []).map((sub) => (
                      <span key={sub.id} className={styles.detailTag}>
                        📁 {sub.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Associated Ledgers */}
              <div className={styles.detailSublistCard}>
                <div className={styles.detailSublistTitle}>
                  <span>Associated Ledgers ({ledgers.filter((l) => l.underGroup.toLowerCase() === viewingGroup.name.toLowerCase()).length})</span>
                </div>
                <div className={styles.detailTagList}>
                  {ledgers.filter((l) => l.underGroup.toLowerCase() === viewingGroup.name.toLowerCase()).length === 0 ? (
                    <span style={{ fontSize: "12.5px", color: "var(--text-subtle)" }}>No ledgers currently assigned to this group.</span>
                  ) : (
                    ledgers
                      .filter((l) => l.underGroup.toLowerCase() === viewingGroup.name.toLowerCase())
                      .map((l) => (
                        <span key={l.id} className={styles.detailTag}>
                          📄 {l.name} ({formatCurrency(l.openingBalance)} {l.balanceType})
                        </span>
                      ))
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className={styles.modalFooter} style={{ margin: "-24px", marginTop: "8px" }}>
                <button
                  type="button"
                  id="btn-close-view-modal"
                  onClick={() => setViewingGroup(null)}
                  className={styles.secondaryBtn}
                >
                  Close
                </button>
                <button
                  type="button"
                  id="btn-edit-viewing-group"
                  onClick={() => {
                    const target = viewingGroup;
                    setViewingGroup(null);
                    handleOpenEditModal(target);
                  }}
                  className={styles.primaryBtn}
                >
                  Edit Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: DELETE GROUP CONFIRMATION (WITH CHILD GROUP REMINDER)
          ------------------------------------------------------------- */}
      {deleteModalData && (
        <div className={styles.modalBackdrop} onClick={() => setDeleteModalData(null)}>
          <div className={styles.deleteModalContent} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.deleteModalHeader}>
              <div className={styles.deleteModalTitleGroup}>
                <div className={styles.deleteModalIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.deleteModalTitle}>Delete Group: {deleteModalData.group.name}</h3>
                </div>
              </div>
              <button
                id="btn-close-delete-modal"
                onClick={() => setDeleteModalData(null)}
                className={styles.modalCloseBtn}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className={styles.deleteModalBody}>
              {/* Target Group Question */}
              <div className={styles.deleteTargetCard}>
                <div className={styles.deleteTargetQuestion}>
                  Are you sure you want to delete group &ldquo;<strong>{deleteModalData.group.name}</strong>&rdquo;?
                </div>
                <div className={styles.deleteTargetMeta}>
                  <span>Nature: <strong>{deleteModalData.group.nature}</strong></span>
                  <span>•</span>
                  <span>Under: <strong>{deleteModalData.group.underGroup}</strong></span>
                  {deleteModalData.group.code && (
                    <>
                      <span>•</span>
                      <span>Code: #{deleteModalData.group.code}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Reminder if child groups exist */}
              {deleteModalData.childGroups.length > 0 ? (
                <div className={styles.deleteWarningBox}>
                  <div className={styles.deleteWarningHeader}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Do you want to delete the child groups also?</span>
                  </div>

                  <p className={styles.deleteWarningSubtext}>
                    This group has <strong>{deleteModalData.childGroups.length} child subgroup{deleteModalData.childGroups.length > 1 ? "s" : ""}</strong>:
                  </p>

                  {/* Child groups tags */}
                  <div className={styles.deleteChildTags}>
                    {deleteModalData.childGroups.map((child) => (
                      <span key={child.id} className={styles.deleteChildTag}>
                        📁 {child.name}
                      </span>
                    ))}
                  </div>

                  {/* Interactive Checkbox Row */}
                  <div
                    className={`${styles.deleteCheckboxRow} ${
                      deleteModalData.deleteChildren
                        ? styles.deleteCheckboxRowChecked
                        : styles.deleteCheckboxRowUnchecked
                    }`}
                    onClick={() =>
                      setDeleteModalData((prev) =>
                        prev ? { ...prev, deleteChildren: !prev.deleteChildren } : null
                      )
                    }
                  >
                    <input
                      id="checkbox-delete-children"
                      type="checkbox"
                      checked={deleteModalData.deleteChildren}
                      onChange={(e) =>
                        setDeleteModalData((prev) =>
                          prev ? { ...prev, deleteChildren: e.target.checked } : null
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                      className={styles.deleteCustomCheckbox}
                    />
                    <div className={styles.deleteCheckboxTextCol}>
                      <span className={styles.deleteCheckboxTitle}>
                        {deleteModalData.deleteChildren
                          ? `Yes, delete all ${deleteModalData.childGroups.length} child subgroup(s) too`
                          : `Keep child subgroups (reassign under "${deleteModalData.group.underGroup}")`}
                      </span>
                      <span className={styles.deleteCheckboxExplainer}>
                        {deleteModalData.deleteChildren
                          ? "⚠️ All child subgroups listed above will be permanently deleted alongside this parent group."
                          : `ℹ️ Child subgroups will be safely preserved and moved under "${deleteModalData.group.underGroup}".`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.deleteNoChildrenBox}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="12" x2="12.01" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="8" />
                  </svg>
                  <span>This group has no child subgroups. This action cannot be undone.</span>
                </div>
              )}
            </div>

            {/* Dedicated Neutral Danger Footer */}
            <div className={styles.deleteModalFooter}>
              <button
                type="button"
                id="btn-cancel-delete"
                onClick={() => setDeleteModalData(null)}
                className={styles.secondaryBtn}
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-delete"
                onClick={() => executeDeleteGroup(deleteModalData.group, deleteModalData.deleteChildren)}
                className={styles.dangerBtn}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>
                  {deleteModalData.childGroups.length > 0
                    ? deleteModalData.deleteChildren
                      ? `Delete Parent & ${deleteModalData.childGroups.length} Child Group${deleteModalData.childGroups.length > 1 ? "s" : ""}`
                      : "Delete Parent Group Only"
                    : "Delete Group"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {toast && (
        <div
          className={`${styles.toastNotice} ${toast.type === "danger" ? styles.toastDanger : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className={styles.toastIcon}>
            {toast.type === "danger" ? "🗑️" : "✓"}
          </div>
          <div className={styles.toastContent}>
            <span className={styles.toastTitle}>{toast.title}</span>
            <span className={styles.toastMsg}>{toast.message}</span>
          </div>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToast(null)}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}