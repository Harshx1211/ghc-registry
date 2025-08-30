import React, { useState, useEffect } from 'react';
import styles from '../styles/Page.module.css';

const CertifierDashboard = () => {
  const [pendingLots, setPendingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Fetch lots from API
  const fetchLots = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/lots');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter only pending lots
      const pendingOnly = data.filter(lot => lot.status === 'PENDING');
      setPendingLots(pendingOnly);
    } catch (err) {
      setError(`Failed to fetch lots: ${err.message}`);
      console.error('Error fetching lots:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchLots();
  }, []);

  // Approve lot and issue credits
  const approveAndIssue = async (lotId) => {
    try {
      setActionLoading(prev => ({ ...prev, [lotId]: 'approving' }));
      
      const response = await fetch(`http://localhost:5000/lots/${lotId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'ISSUED',
          issuedDate: new Date().toISOString().split('T')[0]
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to approve lot: ${response.status}`);
      }

      // Refresh the table by fetching updated data
      await fetchLots();
      console.log('Lot approved and credits issued:', lotId);
    } catch (err) {
      setError(`Failed to approve lot: ${err.message}`);
      console.error('Error approving lot:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [lotId]: null }));
    }
  };

  // Reject lot (delete)
  const rejectLot = async (lotId) => {
    try {
      setActionLoading(prev => ({ ...prev, [lotId]: 'rejecting' }));
      
      const response = await fetch(`http://localhost:5000/lots/${lotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to reject lot: ${response.status}`);
      }

      // Refresh the table by fetching updated data
      await fetchLots();
      console.log('Lot rejected:', lotId);
    } catch (err) {
      setError(`Failed to reject lot: ${err.message}`);
      console.error('Error rejecting lot:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [lotId]: null }));
    }
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 95) return '#48bb78';
    if (efficiency >= 90) return '#ed8936';
    return '#f56565';
  };

  // Calculate KPIs
  const totalCreditsToIssue = pendingLots.reduce((sum, lot) => sum + (lot.estimatedCredits || lot.credits || 0), 0);
  const avgEfficiency = pendingLots.length > 0 
    ? (pendingLots.reduce((sum, lot) => sum + (lot.efficiency || 0), 0) / pendingLots.length).toFixed(1)
    : 0;

  if (loading && pendingLots.length === 0) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Certifier Dashboard</h1>
          <p className={styles.tagline}>Verify and certify green hydrogen production claims</p>
        </header>
        <main className={styles.main}>
          <div className={styles.loading}>
            <p>Loading pending lots...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Certifier Dashboard</h1>
        <p className={styles.tagline}>Verify and certify green hydrogen production claims</p>
      </header>

      <main className={styles.main}>
        {/* Error Display */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button 
              onClick={fetchLots}
              className={styles.retryButton}
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Stats */}
        <section className={styles.section}>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{pendingLots.length}</div>
              <div className={styles.kpiLabel}>Pending Lots</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{totalCreditsToIssue}</div>
              <div className={styles.kpiLabel}>Credits to Issue</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{avgEfficiency}%</div>
              <div className={styles.kpiLabel}>Avg Efficiency</div>
            </div>
          </div>
        </section>

        {/* Pending Lots for Verification */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Pending Lots for Verification
            {loading && (
              <span className={styles.refreshing}> (Refreshing...)</span>
            )}
          </h2>
          
          {pendingLots.length === 0 && !loading ? (
            <div className={styles.emptyState}>
              <p>No pending lots for verification at this time.</p>
              <button 
                onClick={fetchLots}
                className={styles.refreshButton}
              >
                Refresh
              </button>
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
                    <th>Efficiency</th>
                    <th>Credits</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLots.map((lot) => (
                    <tr key={lot.id}>
                      <td className={styles.lotId}>{lot.id}</td>
                      <td>
                        <div>
                          <div className={styles.producerName}>
                            {lot.producerName || lot.producer || 'Unknown Producer'}
                          </div>
                          <div className={styles.producerId}>
                            {lot.producerId || lot.producerAddress || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td>{(lot.energy || lot.energyInput || 0).toLocaleString()}</td>
                      <td>{lot.h2Produced || lot.hydrogenProduced || 0}</td>
                      <td>{lot.source || lot.energySource || 'N/A'}</td>
                      <td>
                        <span 
                          className={styles.efficiency}
                          style={{ color: getEfficiencyColor(lot.efficiency || 0) }}
                        >
                          {lot.efficiency || 0}%
                        </span>
                      </td>
                      <td className={styles.credits}>
                        {lot.estimatedCredits || lot.credits || 0}
                      </td>
                      <td>{lot.submittedDate || lot.createdAt || 'N/A'}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => approveAndIssue(lot.id)}
                            className={styles.successButton}
                            disabled={actionLoading[lot.id]}
                          >
                            {actionLoading[lot.id] === 'approving' ? 'Approving...' : '✅ Approve & Issue'}
                          </button>
                          <button
                            onClick={() => rejectLot(lot.id)}
                            className={styles.rejectButton}
                            disabled={actionLoading[lot.id]}
                          >
                            {actionLoading[lot.id] === 'rejecting' ? 'Rejecting...' : '❌ Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Certification Guidelines */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Certification Guidelines</h2>
          <div className={styles.guidelines}>
            <div className={styles.guideline}>
              <h4>✅ Efficiency Standards</h4>
              <p>Green hydrogen production efficiency must be ≥90% to qualify for credits</p>
            </div>
            <div className={styles.guideline}>
              <h4>🔋 Energy Source Verification</h4>
              <p>Verify that energy source is 100% renewable (Solar, Wind, Hydro, Geothermal)</p>
            </div>
            <div className={styles.guideline}>
              <h4>📊 Data Validation</h4>
              <p>Cross-check energy input vs H₂ output ratios for consistency</p>
            </div>
            <div className={styles.guideline}>
              <h4>📍 Location Compliance</h4>
              <p>Ensure production facility meets regional environmental standards</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CertifierDashboard;