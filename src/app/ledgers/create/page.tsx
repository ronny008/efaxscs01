"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CreateLedgerPage from "@/components/ledger/CreateLedgerPage";
import { Ledger, LedgerGroup } from "@/types/erp";
import styles from "@/app/page.module.css";

export default function CreateLedgerRoute() {
  const router = useRouter();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [groups, setGroups] = useState<LedgerGroup[]>([]);

  useEffect(() => {
    try {
      const savedLedgers = localStorage.getItem("erp_ledgers");
      if (savedLedgers) setLedgers(JSON.parse(savedLedgers));
      const savedGroups = localStorage.getItem("erp_ledger_groups");
      if (savedGroups) setGroups(JSON.parse(savedGroups));
    } catch (e) {
      console.error("Failed to load initial data from localStorage:", e);
    }
  }, []);

  const handleSuccess = (newLedger: Ledger) => {
    try {
      const updated = [newLedger, ...ledgers];
      setLedgers(updated);
      localStorage.setItem("erp_ledgers", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save ledger to localStorage:", e);
    }
    router.push("/");
  };

  return (
    <div className={styles.erpContainer} style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <main className={styles.mainWrapper} style={{ width: "100%" }}>
        <header className={styles.topHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerBreadcrumb}>Master / Accounting Master / Ledgers / Create Ledger</span>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.userAvatar} title="Arun Kumar (AK)">
              AK
            </div>
          </div>
        </header>

        <div style={{ padding: "24px 20px" }}>
          <CreateLedgerPage
            onBack={() => router.push("/")}
            onSuccess={handleSuccess}
            existingGroups={groups}
            existingLedgers={ledgers}
          />
        </div>
      </main>
    </div>
  );
}
