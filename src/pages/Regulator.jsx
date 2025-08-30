// src/pages/Regulator.jsx
import React, { useState, useEffect } from "react";
import styles from "../styles/Page.module.css";

// Recharts imports
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#3182ce", "#48bb78", "#ed8936", "#805ad5", "#e53e3e"];
const filterOptions = ["ALL", "PENDING", "ISSUED", "RETIRED"];

const Regulator = () => {
  // States
  const [allLots, setAllLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data
  const fetchLots = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("http://localhost:5000/lots");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAllLots(data);
      setFilteredLots(data);

      generateAuditTrail(data);
    } catch (err) {
      console.error("Error fetching lots:", err);
      setError(`Failed to fetch lots: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Audit trail generator
  const generateAuditTrail = (lots) => {
    const auditEntries = [];

    lots.forEach((lot) => {
      auditEntries.push({
        id: `${lot.id}_submitted`,
        timestamp: lot.submittedDate || lot.issuedDate,
        action: `LOT ${lot.id} submitted by ${lot.producer || "Unknown Producer"}`,
        type: "SUBMITTED",
        lotId: lot.id,
      });

      if (lot.status === "ISSUED" || lot.status === "RETIRED") {
        auditEntries.push({
          id: `${lot.id}_issued`,
          timestamp: lot.issuedDate || lot.submittedDate,
          action: `LOT ${lot.id} verified and credits issued (${lot.credits} credits)`,
          type: "ISSUED",
          lotId: lot.id,
        });
      }

      if (lot.status === "RETIRED") {
        auditEntries.push({
          id: `${lot.id}_retired`,
          timestamp: lot.purchaseDate || lot.issuedDate,
          action: `LOT ${lot.id} credits retired by buyer`,
          type: "RETIRED",
          lotId: lot.id,
        });
      }
    });

    auditEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setAuditTrail(auditEntries.slice(0, 10));
  };

  // Filters
  const applyFilter = (status) => {
    setStatusFilter(status);
    if (status === "ALL") {
      setFilteredLots(allLots);
    } else {
      setFilteredLots(allLots.filter((lot) => lot.status === status));
    }
  };

  // KPIs
  const calculateKPIs = () => {
    const totalLotsSubmitted = allLots.length;
    const totalCreditsIssued = allLots
      .filter((lot) => lot.status === "ISSUED" || lot.status === "RETIRED")
      .reduce((sum, lot) => sum + (lot.credits || 0), 0);
    const totalCreditsRetired = allLots
      .filter((lot) => lot.status === "RETIRED")
      .reduce((sum, lot) => sum + (lot.credits || 0), 0);
    const outstandingCredits = totalCreditsIssued - totalCreditsRetired;
    const pendingLots = allLots.filter((lot) => lot.status === "PENDING").length;

    return {
      totalLotsSubmitted,
      totalCreditsIssued,
      totalCreditsRetired,
      outstandingCredits,
      pendingLots,
    };
  };

  // Chart data
  const getCreditsPerSourceData = () => {
    const sourceData = {};
    allLots
      .filter((lot) => lot.status === "ISSUED" || lot.status === "RETIRED")
      .forEach((lot) => {
        const source = lot.source || "Unknown";
        sourceData[source] = (sourceData[source] || 0) + (lot.credits || 0);
      });

    return Object.entries(sourceData).map(([source, credits], index) => ({
      source,
      credits,
      fill: COLORS[index % COLORS.length],
    }));
  };

  const getCreditsOverTimeData = () => {
    const timeData = {};
    allLots
      .filter((lot) => lot.status === "ISSUED" || lot.status === "RETIRED")
      .forEach((lot) => {
        const date = lot.issuedDate || lot.submittedDate;
        if (date) {
          timeData[date] = (timeData[date] || 0) + (lot.credits || 0);
        }
      });

    return Object.entries(timeData)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, credits]) => ({ date, credits }));
  };

  // Impact calc
  const calculateEnvironmentalImpact = () => {
    const kpis = calculateKPIs();
    const totalCO2Saved = kpis.totalCreditsRetired * 2.3;
    const treesEquivalent = Math.round(totalCO2Saved * 16);
    const carsOffRoad = Math.round(totalCO2Saved / 4.6);
    return { totalCO2Saved, treesEquivalent, carsOffRoad };
  };

  // Styling helpers
  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return styles.statusPending;
      case "VERIFIED":
        return styles.statusVerified;
      case "ISSUED":
        return styles.statusIssued;
      case "RETIRED":
        return styles.statusRetired;
      default:
        return "";
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  // Load on mount
  useEffect(() => {
    fetchLots();
  }, []);

  // Loading
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <h2>Loading system data...</h2>
          <p>Please wait while we fetch the latest regulatory information.</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Error Loading System Data</h2>
          <p>{error}</p>
          <button onClick={fetchLots} className={styles.primaryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Data
  const kpis = calculateKPIs();
  const impact = calculateEnvironmentalImpact();
  const sourceData = getCreditsPerSourceData();
  const timeData = getCreditsOverTimeData();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Regulator</h1>
        <p className={styles.tagline}>
          Oversee and audit the carbon credit ecosystem
        </p>
        <button
          onClick={fetchLots}
          className={styles.secondaryButton}
          style={{ marginTop: "1rem" }}
        >
          🔄 Refresh Data
        </button>
      </header>

      <main className={styles.main}>
        {/* KPIs */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>System Overview</h2>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{kpis.totalLotsSubmitted}</div>
              <div className={styles.kpiLabel}>Total Lots Submitted</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{kpis.pendingLots}</div>
              <div className={styles.kpiLabel}>Lots Pending Review</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{kpis.totalCreditsIssued}</div>
              <div className={styles.kpiLabel}>Total Credits Issued</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{kpis.outstandingCredits}</div>
              <div className={styles.kpiLabel}>Credits Outstanding</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{kpis.totalCreditsRetired}</div>
              <div className={styles.kpiLabel}>Credits Retired</div>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Analytics & Insights</h2>
          <div className={styles.chartsGrid}>
            {/* Credits per source */}
            <div className={styles.chartContainer}>
              <h3 className={styles.chartTitle}>
                Credits Issued by Energy Source
              </h3>
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ source, credits, percent }) =>
                        `${source}: ${credits} (${(percent * 100).toFixed(1)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="credits"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>No data available</div>
              )}
            </div>

            {/* Credits over time */}
            <div className={styles.chartContainer}>
              <h3 className={styles.chartTitle}>Credits Issued Over Time</h3>
              {timeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="credits"
                      stroke="#667eea"
                      strokeWidth={2}
                      dot={{ fill: "#667eea" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>No data available</div>
              )}
            </div>
          </div>

          {/* Impact */}
          <div className={styles.impactContainer}>
            <h3 className={styles.chartTitle}>Environmental Impact</h3>
            <div className={styles.impactSummary}>
              <p>
                🌱 <strong>{impact.totalCO2Saved.toFixed(1)} tonnes</strong> of
                CO₂ emissions prevented
              </p>
              <p>
                🌳 Equivalent to planting{" "}
                <strong>{impact.treesEquivalent.toLocaleString()} trees</strong>
              </p>
              <p>
                🚗 Equal to taking{" "}
                <strong>{impact.carsOffRoad.toLocaleString()} cars</strong> off
                the road for a year
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className={styles.section}>
          <div className={styles.filterSection}>
            <h2 className={styles.sectionTitle}>All Production Lots</h2>
            <div className={styles.filterButtons}>
              {filterOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => applyFilter(status)}
                  className={`${styles.filterButton} ${
                    statusFilter === status ? styles.filterButtonActive : ""
                  }`}
                >
                  {status} (
                  {status === "ALL"
                    ? allLots.length
                    : allLots.filter((lot) => lot.status === status).length}
                  )
                </button>
              ))}
            </div>
          </div>

          {/* Lots Table */}
          {filteredLots.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No Lots Found</h3>
              <p>No lots match the current filter: {statusFilter}</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot ID</th>
                    <th>Producer</th>
                    <th>Energy (kWh)</th>
                    <th>H₂ (kg)</th>
                    <th>Source</th>
                    <th>Credits</th>
                    <th>Status</th>
                    <th>Submitted Date</th>
                    <th>Issued Date</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLots.map((lot) => (
                    <tr key={lot.id}>
                      <td className={styles.lotId}>{lot.id}</td>
                      <td>
                        <div>
                          <div className={styles.producerName}>
                            {lot.producer || "N/A"}
                          </div>
                          <div className={styles.producerId}>
                            {lot.producerId || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td>{(lot.energy || 0).toLocaleString()}</td>
                      <td>{lot.h2Produced || "N/A"}</td>
                      <td>{lot.source}</td>
                      <td className={styles.credits}>{lot.credits}</td>
                      <td>
                        <span
                          className={`${styles.status} ${getStatusColor(
                            lot.status
                          )}`}
                        >
                          {lot.status}
                        </span>
                      </td>
                      <td>{lot.submittedDate || lot.issuedDate}</td>
                      <td>{lot.issuedDate || "N/A"}</td>
                      <td>{lot.location || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Audit Trail */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>System Audit Trail</h2>
          <div className={styles.auditContainer}>
            {auditTrail.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No audit trail entries available.</p>
              </div>
            ) : (
              <div className={styles.auditList}>
                {auditTrail.map((entry) => (
                  <div key={entry.id} className={styles.auditItem}>
                    <div className={styles.auditHeader}>
                      <span className={styles.auditTime}>
                        {formatDateTime(entry.timestamp)}
                      </span>
                      <span
                        className={`${styles.auditType} ${
                          styles[`auditType${entry.type}`]
                        }`}
                      >
                        {entry.type}
                      </span>
                    </div>
                    <span className={styles.auditAction}>
                      {entry.action}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Regulator;
