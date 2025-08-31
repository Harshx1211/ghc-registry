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
  BarChart,
  Bar,
} from "recharts";

const COLORS = ["#3182ce", "#48bb78", "#ed8936", "#805ad5", "#e53e3e"];
const filterOptions = ["ALL", "PENDING", "ISSUED", "RETIRED"];

const Regulator = () => {
  // States
  const [allLots, setAllLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [debugMode, setDebugMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data with enhanced debugging
  const fetchLots = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching lots from backend...");
      const response = await fetch("http://localhost:5000/lots");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Enhanced debugging logs
      console.log("Raw data from backend:", data);
      console.log("Number of lots received:", data.length);
      console.log("Sample lot structure:", data[0]);
      console.log("All lot statuses:", data.map(lot => ({
        id: lot.id,
        status: lot.status,
        credits: lot.credits,
        source: lot.source
      })));
      
      // Check for chart-eligible lots
      const chartEligibleLots = data.filter(lot => 
        lot.status === "ISSUED" || lot.status === "RETIRED"
      );
      console.log("Chart-eligible lots (ISSUED/RETIRED):", chartEligibleLots);
      
      // Check for missing fields
      const missingFields = data.map(lot => ({
        id: lot.id,
        hasCredits: !!lot.credits,
        hasSource: !!lot.source,
        hasStatus: !!lot.status,
        status: lot.status
      }));
      console.log("Field validation:", missingFields);

      setAllLots(data);
      setFilteredLots(data);
      generateAuditTrail(data);
      
      console.log("Data processing complete");
    } catch (err) {
      console.error("Error fetching lots:", err);
      setError(`Failed to fetch lots: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced audit trail generator
  const generateAuditTrail = (lots) => {
    const auditEntries = [];
    console.log("Generating audit trail for", lots.length, "lots");

    lots.forEach((lot) => {
      // Always add submission entry
      auditEntries.push({
        id: `${lot.id}_submitted`,
        timestamp: lot.submittedDate || lot.issuedDate || new Date().toISOString(),
        action: `LOT ${lot.id} submitted by ${lot.producer || "Unknown Producer"}`,
        type: "SUBMITTED",
        lotId: lot.id,
      });

      // Add issued entry for ISSUED/RETIRED lots
      if (lot.status === "ISSUED" || lot.status === "RETIRED") {
        auditEntries.push({
          id: `${lot.id}_issued`,
          timestamp: lot.issuedDate || lot.submittedDate || new Date().toISOString(),
          action: `LOT ${lot.id} verified and credits issued (${lot.credits || 0} credits)`,
          type: "ISSUED",
          lotId: lot.id,
        });
      }

      // Add retired entry for RETIRED lots
      if (lot.status === "RETIRED") {
        auditEntries.push({
          id: `${lot.id}_retired`,
          timestamp: lot.purchaseDate || lot.retiredDate || lot.issuedDate || new Date().toISOString(),
          action: `LOT ${lot.id} credits retired by buyer (${lot.credits || 0} credits)`,
          type: "RETIRED",
          lotId: lot.id,
        });
      }
    });

    auditEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setAuditTrail(auditEntries.slice(0, 15));
    console.log("Generated audit trail entries:", auditEntries.length);
  };

  // Enhanced filters
  const applyFilter = (status) => {
    console.log("Applying filter:", status);
    setStatusFilter(status);
    
    if (status === "ALL") {
      setFilteredLots(allLots);
      console.log("Showing all lots:", allLots.length);
    } else {
      const filtered = allLots.filter((lot) => lot.status === status);
      setFilteredLots(filtered);
      console.log(`Filtered lots (${status}):`, filtered.length);
    }
  };

  // Enhanced KPIs calculation
  const calculateKPIs = () => {
    const totalLotsSubmitted = allLots.length;
    
    const issuedLots = allLots.filter((lot) => 
      lot.status === "ISSUED" || lot.status === "RETIRED"
    );
    
    // Enhanced credit calculation with fallbacks
    const totalCreditsIssued = issuedLots.reduce((sum, lot) => {
      let credits = parseInt(lot.credits) || 
                   parseInt(lot.carbonCredits) || 
                   parseInt(lot.creditsEarned) ||
                   Math.floor((parseInt(lot.energy) || 0) / 20) || // 1 credit per 20 kWh
                   1; // Minimum for issued lots
      return sum + credits;
    }, 0);
    
    const retiredLots = allLots.filter((lot) => lot.status === "RETIRED");
    const totalCreditsRetired = retiredLots.reduce((sum, lot) => {
      let credits = parseInt(lot.credits) || 
                   parseInt(lot.carbonCredits) || 
                   parseInt(lot.creditsEarned) ||
                   Math.floor((parseInt(lot.energy) || 0) / 20) ||
                   1;
      return sum + credits;
    }, 0);
    
    const outstandingCredits = totalCreditsIssued - totalCreditsRetired;
    const pendingLots = allLots.filter((lot) => lot.status === "PENDING").length;
    const verifiedLots = allLots.filter((lot) => lot.status === "VERIFIED").length;

    const kpis = {
      totalLotsSubmitted,
      totalCreditsIssued,
      totalCreditsRetired,
      outstandingCredits,
      pendingLots,
      verifiedLots,
    };

    if (debugMode) {
      console.log("KPIs calculated:", kpis);
      console.log("Issued lots:", issuedLots);
      console.log("Retired lots:", retiredLots);
    }

    return kpis;
  };

  // Enhanced chart data with better error handling
  const getCreditsPerSourceData = () => {
    const eligibleLots = allLots.filter((lot) => 
      lot.status === "ISSUED" || lot.status === "RETIRED"
    );
    
    if (debugMode) {
      console.log("Eligible lots for pie chart:", eligibleLots);
    }

    const sourceData = {};
    
    eligibleLots.forEach((lot) => {
      const source = lot.source || lot.energySource || "Unknown Source";
      // Try multiple field names for credits and provide fallback calculation
      let credits = parseInt(lot.credits) || 
                   parseInt(lot.carbonCredits) || 
                   parseInt(lot.creditsEarned) ||
                   Math.floor((parseInt(lot.energy) || 0) / 20) || // Fallback: 1 credit per 20 kWh
                   1; // Minimum 1 credit for issued/retired lots
      
      sourceData[source] = (sourceData[source] || 0) + credits;
    });

    const result = Object.entries(sourceData)
      .map(([source, credits], index) => ({
        source,
        credits,
        fill: COLORS[index % COLORS.length],
      }));

    if (debugMode) {
      console.log("Source data for pie chart:", sourceData);
      console.log("Final pie chart data:", result);
    }

    return result;
  };

  const getCreditsOverTimeData = () => {
    const eligibleLots = allLots.filter((lot) => 
      lot.status === "ISSUED" || lot.status === "RETIRED"
    );
    
    const timeData = {};
    
    eligibleLots.forEach((lot) => {
      const date = lot.issuedDate || lot.submittedDate;
      if (date) {
        // Enhanced credit calculation with fallbacks
        let credits = parseInt(lot.credits) || 
                     parseInt(lot.carbonCredits) || 
                     parseInt(lot.creditsEarned) ||
                     Math.floor((parseInt(lot.energy) || 0) / 20) || // Fallback calculation
                     1; // Minimum for issued/retired lots
        
        timeData[date] = (timeData[date] || 0) + credits;
      }
    });

    const result = Object.entries(timeData)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, credits]) => ({ 
        date: new Date(date).toLocaleDateString(), 
        credits 
      }));

    if (debugMode) {
      console.log("Time data for line chart:", result);
    }

    return result;
  };

  // New status distribution chart
  const getStatusDistributionData = () => {
    const statusCounts = {};
    
    allLots.forEach((lot) => {
      const status = lot.status || "UNKNOWN";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count], index) => ({
      status,
      count,
      fill: COLORS[index % COLORS.length],
    }));
  };

  // Enhanced environmental impact calculation
  const calculateEnvironmentalImpact = () => {
    const kpis = calculateKPIs();
    const totalCO2Saved = kpis.totalCreditsRetired * 2.3;
    const treesEquivalent = Math.round(totalCO2Saved * 16);
    const carsOffRoad = Math.round(totalCO2Saved / 4.6);
    const householdsPoweered = Math.round(kpis.totalCreditsRetired * 0.1);
    
    return { 
      totalCO2Saved, 
      treesEquivalent, 
      carsOffRoad, 
      householdsPoweered 
    };
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
        return styles.statusDefault || "";
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  // Enhanced data validation
  const validateData = () => {
    const issues = [];
    
    allLots.forEach(lot => {
      if (!lot.id) issues.push(`Lot missing ID: ${JSON.stringify(lot)}`);
      if (!lot.status) issues.push(`Lot ${lot.id} missing status`);
      if (!lot.credits && (lot.status === "ISSUED" || lot.status === "RETIRED")) {
        issues.push(`Lot ${lot.id} has ${lot.status} status but no credits`);
      }
      if (!lot.source && (lot.status === "ISSUED" || lot.status === "RETIRED")) {
        issues.push(`Lot ${lot.id} has ${lot.status} status but no source`);
      }
    });

    return issues;
  };

  // Load on mount
  useEffect(() => {
    fetchLots();
  }, []);

  // Debug panel toggle
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
    if (!debugMode) {
      console.log("Debug mode enabled");
      console.log("Current state:", {
        allLots: allLots.length,
        filteredLots: filteredLots.length,
        auditTrail: auditTrail.length
      });
      console.log("Data validation issues:", validateData());
    }
  };

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Error Loading System Data</h2>
          <p>{error}</p>
          <div style={{ marginTop: "1rem" }}>
            <button onClick={fetchLots} className={styles.primaryButton}>
              Retry Connection
            </button>
            <button 
              onClick={toggleDebugMode} 
              className={styles.secondaryButton}
              style={{ marginLeft: "1rem" }}
            >
              {debugMode ? "Hide Debug" : "Show Debug"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate data for display
  const kpis = calculateKPIs();
  const impact = calculateEnvironmentalImpact();
  const sourceData = getCreditsPerSourceData();
  const timeData = getCreditsOverTimeData();
  const statusData = getStatusDistributionData();
  const dataValidationIssues = validateData();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Regulator Dashboard</h1>
        <p className={styles.tagline}>
          Oversee and audit the carbon credit ecosystem
        </p>
        <div style={{ marginTop: "1rem" }}>
          <button
            onClick={fetchLots}
            className={styles.secondaryButton}
            style={{ marginRight: "1rem" }}
          >
            Refresh Data
          </button>
          <button
            onClick={toggleDebugMode}
            className={debugMode ? styles.primaryButton : styles.secondaryButton}
          >
            {debugMode ? "Debug ON" : "Debug"}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Debug Panel */}
        {debugMode && (
          <section className={styles.section} style={{ 
            backgroundColor: "#f8f9fa", 
            border: "2px solid #3182ce",
            borderRadius: "8px",
            padding: "1.5rem"
          }}>
            <h2 className={styles.sectionTitle} style={{ color: "#3182ce" }}>
              Debug Information
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
              <div style={{ 
                backgroundColor: "white", 
                padding: "1rem", 
                borderRadius: "6px",
                border: "1px solid #e2e8f0"
              }}>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "#2d3748" }}>Data Status</h4>
                <p style={{ margin: "0.25rem 0" }}>Total Lots: <strong>{allLots.length}</strong></p>
                <p style={{ margin: "0.25rem 0" }}>Filtered Lots: <strong>{filteredLots.length}</strong></p>
                <p style={{ margin: "0.25rem 0" }}>Chart Data Points: <strong>{sourceData.length}</strong></p>
                <p style={{ margin: "0.25rem 0" }}>Time Series Points: <strong>{timeData.length}</strong></p>
              </div>
              <div style={{ 
                backgroundColor: "white", 
                padding: "1rem", 
                borderRadius: "6px",
                border: "1px solid #e2e8f0"
              }}>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "#2d3748" }}>Status Breakdown</h4>
                {statusData.map(item => (
                  <p key={item.status} style={{ margin: "0.25rem 0" }}>
                    {item.status}: <strong>{item.count}</strong>
                  </p>
                ))}
              </div>
              <div style={{ 
                backgroundColor: "white", 
                padding: "1rem", 
                borderRadius: "6px",
                border: "1px solid #e2e8f0"
              }}>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "#2d3748" }}>Validation Issues</h4>
                {dataValidationIssues.length === 0 ? (
                  <p style={{ color: "#48bb78", margin: "0.25rem 0" }}>No critical issues</p>
                ) : (
                  dataValidationIssues.slice(0, 5).map((issue, idx) => (
                    <p key={idx} style={{ 
                      color: "#e53e3e", 
                      fontSize: "12px", 
                      margin: "0.25rem 0",
                      backgroundColor: "#fed7d7",
                      padding: "0.25rem",
                      borderRadius: "4px"
                    }}>
                      {issue}
                    </p>
                  ))
                )}
              </div>
            </div>
            <div style={{ 
              marginTop: "1rem", 
              padding: "1rem", 
              backgroundColor: "#e6fffa", 
              borderRadius: "6px",
              border: "1px solid #38b2ac"
            }}>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#234e52" }}>Quick Fix</h4>
              <p style={{ margin: "0", color: "#234e52" }}>
                Your backend lots are missing the 'credits' field. The system is now calculating 
                credits automatically based on energy production (1 credit per 20 kWh).
              </p>
            </div>
          </section>
        )}

        {/* KPIs Section */}
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
              <div className={styles.kpiValue}>{kpis.totalCreditsIssued.toLocaleString()}</div>
              <div className={styles.kpiLabel}>Total Credits Issued</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{kpis.outstandingCredits.toLocaleString()}</div>
              <div className={styles.kpiLabel}>Credits Outstanding</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{kpis.totalCreditsRetired.toLocaleString()}</div>
              <div className={styles.kpiLabel}>Credits Retired</div>
            </div>
          </div>
        </section>

        {/* Charts Section */}
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
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="credits"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Credits"]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>
                  <p>No credit data available</p>
                  <small>Lots must have ISSUED or RETIRED status with credits</small>
                </div>
              )}
            </div>

            {/* Status Distribution */}
            <div className={styles.chartContainer}>
              <h3 className={styles.chartTitle}>Lot Status Distribution</h3>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3182ce" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>No status data available</div>
              )}
            </div>

            {/* Credits over time */}
            <div className={styles.chartContainer} style={{ gridColumn: "1 / -1" }}>
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
                      stroke="#3182ce"
                      strokeWidth={3}
                      dot={{ fill: "#3182ce", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChart}>
                  <p>No time series data available</p>
                  <small>Lots need issued dates and credits</small>
                </div>
              )}
            </div>
          </div>

          {/* Environmental Impact */}
          <div className={styles.impactContainer}>
            <h3 className={styles.chartTitle}>Environmental Impact Summary</h3>
            <div className={styles.impactSummary}>
              <div className={styles.impactItem}>
                <span className={styles.impactIcon}>🌱</span>
                <span className={styles.impactText}>
                  <strong>{impact.totalCO2Saved.toFixed(1)} tonnes</strong> of CO₂ emissions prevented
                </span>
              </div>
              <div className={styles.impactItem}>
                <span className={styles.impactIcon}>🌳</span>
                <span className={styles.impactText}>
                  Equivalent to planting <strong>{impact.treesEquivalent.toLocaleString()} trees</strong>
                </span>
              </div>
              <div className={styles.impactItem}>
                <span className={styles.impactIcon}>🚗</span>
                <span className={styles.impactText}>
                  Equal to taking <strong>{impact.carsOffRoad.toLocaleString()} cars</strong> off the road for a year
                </span>
              </div>
              <div className={styles.impactItem}>
                <span className={styles.impactIcon}>🏠</span>
                <span className={styles.impactText}>
                  Could power <strong>{impact.householdsPoweered.toLocaleString()} households</strong> for a month
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Filters and Table Section */}
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

          {/* Enhanced Lots Table */}
          {filteredLots.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No Lots Found</h3>
              <p>No lots match the current filter: <strong>{statusFilter}</strong></p>
              <p>Try selecting "ALL" to see all available lots.</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <p>Showing {filteredLots.length} of {allLots.length} lots</p>
              </div>
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
                            {lot.producerId || "Unknown ID"}
                          </div>
                        </div>
                      </td>
                      <td>{(lot.energy || 0).toLocaleString()}</td>
                      <td>{lot.h2Produced || lot.hydrogenProduced || "N/A"}</td>
                      <td>
                        <span className={styles.sourceTag}>
                          {lot.source || lot.energySource || "Unknown"}
                        </span>
                      </td>
                      <td className={styles.credits}>
                        <strong>
                          {lot.credits || 
                           lot.carbonCredits || 
                           lot.creditsEarned ||
                           Math.floor((parseInt(lot.energy) || 0) / 20) ||
                           "0"}
                        </strong>
                        {!lot.credits && lot.energy && (
                          <small style={{ display: "block", color: "#718096" }}>
                            (calc: {Math.floor((parseInt(lot.energy) || 0) / 20)})
                          </small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${styles.status} ${getStatusColor(
                            lot.status
                          )}`}
                        >
                          {lot.status}
                        </span>
                      </td>
                      <td>{formatDateTime(lot.submittedDate || lot.issuedDate)}</td>
                      <td>{formatDateTime(lot.issuedDate)}</td>
                      <td>{lot.location || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Enhanced Audit Trail */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>System Audit Trail</h2>
          <div className={styles.auditContainer}>
            {auditTrail.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No audit trail entries available.</p>
                <p>Audit entries are generated automatically when lots are processed.</p>
              </div>
            ) : (
              <div className={styles.auditList}>
                <div className={styles.auditHeader}>
                  <p>Recent system activities (showing latest {auditTrail.length} entries)</p>
                </div>
                {auditTrail.map((entry) => (
                  <div key={entry.id} className={styles.auditItem}>
                    <div className={styles.auditItemHeader}>
                      <span className={styles.auditTime}>
                        {formatDateTime(entry.timestamp)}
                      </span>
                      <span
                        className={`${styles.auditType} ${
                          styles[`auditType${entry.type}`] || ""
                        }`}
                      >
                        {entry.type}
                      </span>
                    </div>
                    <div className={styles.auditAction}>
                      {entry.action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer with system info */}
        <footer style={{ 
          marginTop: "2rem", 
          padding: "1rem", 
          backgroundColor: "#f7fafc", 
          borderRadius: "8px",
          textAlign: "center",
          borderTop: "1px solid #e2e8f0"
        }}>
          <p style={{ margin: 0, color: "#4a5568", fontSize: "14px" }}>
            Last updated: {new Date().toLocaleString()} | 
            Backend: http://localhost:5000 | 
            System Status: {error ? "Error" : "Connected"} |
            Debug Mode: {debugMode ? "ON" : "OFF"}
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Regulator;