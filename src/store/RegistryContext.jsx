import React, { createContext, useContext, useMemo, useState } from "react";

/**
 * Mock data model
 * lot: { lotId, producer, energyMWh, h2Kg, source, status: "PENDING"|"ISSUED"|"REVOKED", tokenId?, intensity?, evidenceCid? }
 * credit: { tokenId, lotId, owner, qtyKg, revoked?: boolean }
 * retired: { tokenId, lotId, owner, qtyKg, purpose, invoiceId, ts }
 */

const RegistryContext = createContext(null);

const makeId = (p="id") => `${p}-${Math.random().toString(36).slice(2,8)}`;

export function RegistryProvider({ children }) {
  const [lots, setLots] = useState([]);
  const [credits, setCredits] = useState([]);
  const [retirements, setRetirements] = useState([]);

  // Simulate connected account
  const [account, setAccount] = useState("0xProducer...DEMO");

  const connectWallet = async () => {
    // real: const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount("0xUser...DEMO");
  };

  const submitLot = (data) => {
    const lotId = makeId("lot");
    const lot = { ...data, lotId, status: "PENDING" };
    setLots((prev) => [lot, ...prev]);
    return lot;
  };

  const approveAndIssue = ({ lotId, qtyKg }) => {
    setLots(prev => prev.map(l => l.lotId === lotId ? { ...l, status: "ISSUED", h2Kg: qtyKg } : l));
    const tokenId = makeId("tok");
    const lot = lots.find(l => l.lotId === lotId);
    const credit = { tokenId, lotId, owner: lot?.producer || "0xProducer...DEMO", qtyKg };
    setCredits(prev => [credit, ...prev]);
    return { tokenId, credit };
  };

  const transferCredit = ({ tokenId, to, qtyKg }) => {
    setCredits(prev => {
      const next = prev.map(c => {
        if (c.tokenId !== tokenId) return c;
        if (c.qtyKg < qtyKg) throw new Error("Not enough balance");
        return { ...c, qtyKg: c.qtyKg - qtyKg };
      });
      const existing = next.find(c => c.tokenId === tokenId && c.owner === to);
      if (existing) {
        existing.qtyKg += qtyKg;
      } else {
        const lotId = prev.find(c => c.tokenId === tokenId)?.lotId;
        next.push({ tokenId, lotId, owner: to, qtyKg });
      }
      return [...next];
    });
  };

  const retireCredit = ({ tokenId, owner, qtyKg, purpose, invoiceId }) => {
    setCredits(prev => prev.map(c => {
      if (c.tokenId === tokenId && c.owner === owner) {
        if (c.qtyKg < qtyKg) throw new Error("Not enough balance to retire");
        return { ...c, qtyKg: c.qtyKg - qtyKg };
      }
      return c;
    }));
    const lotId = credits.find(c => c.tokenId === tokenId)?.lotId;
    setRetirements(prev => [{ tokenId, lotId, owner, qtyKg, purpose, invoiceId, ts: Date.now() }, ...prev]);
  };

  const value = useMemo(() => ({
    account, connectWallet,
    lots, credits, retirements,
    submitLot, approveAndIssue, transferCredit, retireCredit,
    setAccount
  }), [account, lots, credits, retirements]);

  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}

export const useRegistry = () => useContext(RegistryContext);
