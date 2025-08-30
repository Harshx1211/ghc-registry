import React, { useState, useEffect } from 'react';
import styles from '../styles/Page.module.css';

const BuyerDashboard = () => {
  // State management
  const [lots, setLots] = useState([]);
  const [purchasedCredits, setPurchasedCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQRData] = useState(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

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
      
      // Filter only ISSUED lots for purchase
      const issuedLots = data.filter(lot => lot.status === 'ISSUED');
      setLots(issuedLots);
      
      // Filter retired lots for portfolio (assuming they have a buyer field)
      const retiredLots = data.filter(lot => lot.status === 'RETIRED');
      setPurchasedCredits(retiredLots);
      
    } catch (err) {
      console.error('Error fetching lots:', err);
      setError(`Failed to fetch lots: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Purchase credits (mark lot as RETIRED)
  const purchaseCredit = async (lotId) => {
    try {
      setPurchaseLoading(true);
      
      const response = await fetch(`http://localhost:5000/lots/${lotId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'RETIRED',
          purchaseDate: new Date().toISOString().split('T')[0],
          buyerId: 'BUYER001' // This would come from auth context in real app
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedLot = await response.json();
      
      // Remove from available lots and add to purchased credits
      setLots(prev => prev.filter(lot => lot.id !== lotId));
      setPurchasedCredits(prev => [updatedLot, ...prev]);
      
      console.log('Credits purchased successfully:', updatedLot);
      
    } catch (err) {
      console.error('Error purchasing credits:', err);
      setError(`Failed to purchase credits: ${err.message}`);
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Generate QR code data
  const generateQRCode = (data) => {
    // Simple QR code placeholder - in real app you'd use a QR library like qrcode.js
    const qrString = JSON.stringify(data);
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <rect x="10" y="10" width="180" height="180" fill="#000" opacity="0.1" rx="10"/>
        <rect x="30" y="30" width="20" height="20" fill="#000"/>
        <rect x="60" y="30" width="20" height="20" fill="#000"/>
        <rect x="120" y="30" width="20" height="20" fill="#000"/>
        <rect x="150" y="30" width="20" height="20" fill="#000"/>
        <rect x="30" y="60" width="20" height="20" fill="#000"/>
        <rect x="90" y="60" width="20" height="20" fill="#000"/>
        <rect x="150" y="60" width="20" height="20" fill="#000"/>
        <text x="100" y="110" text-anchor="middle" fill="#000" font-size="10" font-family="monospace">QR Certificate</text>
        <text x="100" y="125" text-anchor="middle" fill="#000" font-size="8" font-family="monospace">${data.lotId}</text>
        <text x="100" y="140" text-anchor="middle" fill="#000" font-size="8" font-family="monospace">${data.credits} Credits</text>
      </svg>
    `)}`;
  };

  // View certificate
  const viewCertificate = (lot) => {
    const certificateData = {
      lotId: lot.id,
      credits: lot.credits,
      producer: lot.producer,
      source: lot.source,
      issuedDate: lot.issuedDate,
      retiredDate: lot.purchaseDate || new Date().toISOString().split('T')[0],
      buyerId: 'BUYER001',
      certificateId: `CERT${lot.id.replace('LOT', '')}`
    };
    
    setQRData(certificateData);
    setShowQRModal(true);
  };

  // Helper function for efficiency color
  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 95) return '#48bb78';
    if (efficiency >= 90) return '#ed8936';
    return '#f56565';
  };

  // Load data on component mount
  useEffect(() => {
    fetchLots();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <h2>Loading lots...</h2>
          <p>Please wait while we fetch the latest carbon credit data.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button 
            onClick={fetchLots}
            className={styles.primaryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Buyer Dashboard</h1>
        <p className={styles.tagline}>Purchase and manage your carbon credit portfolio</p>
        <button 
          onClick={fetchLots}
          className={styles.secondaryButton}
          style={{ marginTop: '1rem' }}
        >
          🔄 Refresh Data
        </button>
      </header>

      <main className={styles.main}>
        {/* Portfolio Summary */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>My Portfolio Summary</h2>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>
                {purchasedCredits.reduce((sum, credit) => sum + (credit.credits || 0), 0)}
              </div>
              <div className={styles.kpiLabel}>Total Credits Owned</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>
                {purchasedCredits.length}
              </div>
              <div className={styles.kpiLabel}>Certificates</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>
                ₹{purchasedCredits.reduce((sum, credit) => 
                  sum + ((credit.credits || 0) * (credit.pricePerCredit || 25)), 0
                ).toLocaleString()}
              </div>
              <div className={styles.kpiLabel}>Estimated Portfolio Value</div>
            </div>
          </div>
        </section>

        {/* Available Credits for Purchase */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Available Credits for Purchase</h2>
          {lots.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No Credits Available</h3>
              <p>There are currently no issued carbon credits available for purchase.</p>
              <p>Please check back later or contact support for more information.</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot ID</th>
                    <th>Producer</th>
                    <th>Credits</th>
                    <th>Source</th>
                    <th>Issued Date</th>
                    <th>Efficiency</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr key={lot.id}>
                      <td className={styles.lotId}>{lot.id}</td>
                      <td>{lot.producer}</td>
                      <td className={styles.credits}>{lot.credits}</td>
                      <td>{lot.source}</td>
                      <td>{lot.issuedDate}</td>
                      <td>
                        <span style={{ color: getEfficiencyColor(lot.efficiency || 95) }}>
                          {lot.efficiency || 95}%
                        </span>
                      </td>
                      <td>{lot.location || 'India'}</td>
                      <td>
                        <button
                          onClick={() => purchaseCredit(lot.id)}
                          className={styles.primaryButton}
                          disabled={purchaseLoading}
                          style={{ marginRight: '0.5rem' }}
                        >
                          {purchaseLoading ? '⏳' : '🛒'} Purchase
                        </button>
                        <button
                          onClick={() => viewCertificate(lot)}
                          className={styles.secondaryButton}
                        >
                          🔍 View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* My Portfolio - Purchased Credits */}
        {purchasedCredits.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>My Portfolio - Retired Credits & Certificates</h2>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot ID</th>
                    <th>Producer</th>
                    <th>Credits</th>
                    <th>Source</th>
                    <th>Purchase Date</th>
                    <th>Status</th>
                    <th>Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasedCredits.map((credit) => (
                    <tr key={credit.id}>
                      <td className={styles.lotId}>{credit.id}</td>
                      <td>{credit.producer}</td>
                      <td className={styles.credits}>{credit.credits}</td>
                      <td>{credit.source}</td>
                      <td>{credit.purchaseDate || credit.issuedDate}</td>
                      <td>
                        <span className={`${styles.status} ${styles.statusRetired}`}>
                          RETIRED
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => viewCertificate(credit)}
                          className={styles.primaryButton}
                        >
                          🏆 View Certificate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* QR Certificate Modal */}
      {showQRModal && qrData && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>🏆 Carbon Credit Retirement Certificate</h3>
              <button 
                onClick={() => setShowQRModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div className={styles.qrContainer}>
              <img 
                src={generateQRCode(qrData)} 
                alt="QR Certificate" 
                className={styles.qrCode}
              />
              
              <div className={styles.certificateInfo}>
                <h4>Certificate Details</h4>
                <div className={styles.certificateDetails}>
                  <p><strong>Certificate ID:</strong> {qrData.certificateId}</p>
                  <p><strong>Lot ID:</strong> {qrData.lotId}</p>
                  <p><strong>Credits Retired:</strong> {qrData.credits}</p>
                  <p><strong>Producer:</strong> {qrData.producer}</p>
                  <p><strong>Energy Source:</strong> {qrData.source}</p>
                  <p><strong>Issue Date:</strong> {qrData.issuedDate}</p>
                  <p><strong>Retirement Date:</strong> {qrData.retiredDate}</p>
                  <p><strong>Buyer ID:</strong> {qrData.buyerId}</p>
                </div>
              </div>
              
              <div className={styles.modalActions}>
                <button 
                  onClick={() => window.print()}
                  className={styles.primaryButton}
                >
                  🖨️ Print Certificate
                </button>
                <button 
                  onClick={() => setShowQRModal(false)}
                  className={styles.secondaryButton}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerDashboard;