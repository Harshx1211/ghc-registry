import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../blockchain';
import styles from '../styles/Page.module.css';

const ProducerDashboard = () => {
  const [formData, setFormData] = useState({
    energy: '',
    h2Produced: '',
    source: 'Solar'
  });

  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState('');
  const [pendingBlockchainLot, setPendingBlockchainLot] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);

  // Fetch lots from API
  const fetchLots = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/lots');
      if (!response.ok) throw new Error(`Failed to fetch lots: ${response.status} ${response.statusText}`);
      const data = await response.json();
      setLots(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching lots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Generate next lot ID
  const generateLotId = () => {
    const maxId = lots.reduce((max, lot) => {
      const lotNumber = parseInt(lot.id.replace('LOT', '')) || 0;
      return Math.max(max, lotNumber);
    }, 0);
    return `LOT${String(maxId + 1).padStart(3, '0')}`;
  };

  // Calculate efficiency (memoized to avoid repeated calculations)
  const calculateEfficiency = (energy, h2Produced) => {
    if (!energy || !h2Produced || h2Produced <= 0) return null;
    return (energy / h2Produced).toFixed(1);
  };

  // Get network-specific explorer URL
  const getExplorerUrl = (txHash, networkId = 1) => {
    const explorers = {
      1: 'https://etherscan.io/tx/',           // Ethereum Mainnet
      5: 'https://goerli.etherscan.io/tx/',   // Goerli Testnet
      137: 'https://polygonscan.com/tx/',     // Polygon
      80001: 'https://mumbai.polygonscan.com/tx/', // Mumbai Testnet
      11155111: 'https://sepolia.etherscan.io/tx/' // Sepolia Testnet
    };
    return `${explorers[networkId] || explorers[1]}${txHash}`;
  };

  // Submit lot to blockchain
  const submitLotToBlockchain = async (lotData, lotId) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected! Connect your wallet first.');
    }

    try {
      setBlockchainStatus('Connecting to blockchain...');
      const contract = await getContract();
      
      setBlockchainStatus('Submitting transaction...');
      // Adjust decimal precision based on your contract requirements
      // Use parseUnits(value, 0) for whole numbers, or parseUnits(value, 6) for 6 decimals, etc.
      const tx = await contract.addProductionLot(
        lotId,
        ethers.parseUnits(lotData.energy.toString(), 0), // Whole numbers - adjust if needed
        ethers.parseUnits(lotData.h2Produced.toString(), 2), // 2 decimals - adjust if needed
        lotData.source
      );

      setLastTxHash(tx.hash);
      setBlockchainStatus(`Transaction submitted! Hash: ${tx.hash.slice(0, 10)}...`);
      
      setBlockchainStatus('Waiting for confirmation...');
      const receipt = await tx.wait(); // Wait for transaction confirmation
      
      console.log('Lot submitted on blockchain:', receipt);
      setBlockchainStatus('✅ Successfully submitted to blockchain!');
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setBlockchainStatus('');
        setLastTxHash(null);
      }, 5000);
      
      return receipt;
    } catch (error) {
      console.error('Blockchain submission failed:', error);
      let errorMessage = 'Blockchain submission failed';
      
      if (error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.code === -32603) {
        errorMessage = 'Internal JSON-RPC error. Check your contract deployment.';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for gas fees';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  // Submit new lot to API and blockchain
  const submitLot = async (lotData) => {
    try {
      setSubmitting(true);
      setError(null);
      setBlockchainStatus('');

      const newLotId = generateLotId();
      const newLot = {
        id: newLotId,
        energy: parseFloat(lotData.energy),
        h2Produced: parseFloat(lotData.h2Produced),
        source: lotData.source,
        status: 'PENDING',
        submittedDate: new Date().toISOString().split('T')[0],
        producer: 'GreenTech Hydrogen Co.', 
        location: 'Gujarat, India',
        estimatedCredits: Math.round(parseFloat(lotData.energy) * 0.05),
        blockchainTx: null // Will store transaction hash
      };

      // Submit to JSON Server first
      setBlockchainStatus('Submitting to database...');
      const response = await fetch('http://localhost:5000/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLot)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit lot: ${response.status} ${response.statusText}. ${errorText}`);
      }

      await response.json();

      // Submit to blockchain
      try {
        const receipt = await submitLotToBlockchain(lotData, newLotId);
        
        // Find the lot by ID to get the correct database ID for PATCH
        const lotsResponse = await fetch('http://localhost:5000/lots');
        const currentLots = await lotsResponse.json();
        const lotToUpdate = currentLots.find(l => l.id === newLotId);
        
        if (lotToUpdate) {
          // Update using the actual database record ID
          const updateUrl = lotToUpdate._id ? 
            `http://localhost:5000/lots/${lotToUpdate._id}` : 
            `http://localhost:5000/lots/${newLotId}`;
            
          await fetch(updateUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blockchainTx: receipt.hash })
          });
        }
        
      } catch (blockchainErr) {
        // Blockchain failed but database submission succeeded
        setError(`Database submission successful, but blockchain failed: ${blockchainErr.message}`);
        setBlockchainStatus('❌ Blockchain submission failed');
        setPendingBlockchainLot(newLot); // Save for retry
      }

      // Reset form
      setFormData({ energy: '', h2Produced: '', source: 'Solar' });
      // Refresh lots
      await fetchLots();

    } catch (err) {
      setError(`Submission failed: ${err.message}`);
      console.error('Error submitting lot:', err);
      setBlockchainStatus('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.energy || !formData.h2Produced) {
      setError('Please fill in all required fields');
      return;
    }
    if (parseFloat(formData.energy) <= 0 || parseFloat(formData.h2Produced) <= 0) {
      setError('Energy and H₂ values must be positive numbers');
      return;
    }
    if (submitting) return;
    submitLot(formData);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return styles.statusPending;
      case 'VERIFIED': return styles.statusVerified;
      case 'ISSUED': return styles.statusIssued;
      case 'RETIRED': return styles.statusRetired;
      default: return '';
    }
  };

  // Retry blockchain submission for a failed lot
  const retryBlockchainSubmission = async () => {
    if (!pendingBlockchainLot) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const receipt = await submitLotToBlockchain(
        {
          energy: pendingBlockchainLot.energy,
          h2Produced: pendingBlockchainLot.h2Produced,
          source: pendingBlockchainLot.source
        },
        pendingBlockchainLot.id
      );
      
      // Update the lot with blockchain transaction hash
      const lotsResponse = await fetch('http://localhost:5000/lots');
      const currentLots = await lotsResponse.json();
      const lotToUpdate = currentLots.find(l => l.id === pendingBlockchainLot.id);
      
      if (lotToUpdate) {
        const updateUrl = lotToUpdate._id ? 
          `http://localhost:5000/lots/${lotToUpdate._id}` : 
          `http://localhost:5000/lots/${pendingBlockchainLot.id}`;
          
        await fetch(updateUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockchainTx: receipt.hash })
        });
      }
      
      setPendingBlockchainLot(null);
      await fetchLots();
      
    } catch (err) {
      setError(`Blockchain retry failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setBlockchainStatus('');
    setPendingBlockchainLot(null);
    fetchLots();
  };

  // Summary statistics
  const stats = {
    totalLots: lots.length,
    pendingLots: lots.filter(lot => lot.status === 'PENDING').length,
    issuedLots: lots.filter(lot => lot.status === 'ISSUED').length,
    retiredLots: lots.filter(lot => lot.status === 'RETIRED').length,
    totalCredits: lots.reduce((sum, lot) => sum + (lot.credits || lot.estimatedCredits || 0), 0),
    totalEnergy: lots.reduce((sum, lot) => sum + (lot.energy || 0), 0),
    totalH2: lots.reduce((sum, lot) => sum + (lot.h2Produced || 0), 0),
    blockchainLots: lots.filter(lot => lot.blockchainTx).length
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Producer Dashboard</h1>
        <p className={styles.tagline}>Submit production data and track your hydrogen lots</p>
        <button 
          onClick={fetchLots}
          className={styles.secondaryButton}
          disabled={loading}
          style={{ marginTop: '1rem' }}
        >
          {loading ? '⏳' : '🔄'} Refresh Data
        </button>
      </header>

      <main className={styles.main}>
        {/* Error Display */}
        {error && (
          <section className={styles.section}>
            <div className={styles.errorMessage}>
              <h3>⚠️ Error</h3>
              <p>{error}</p>
              <div style={{ marginTop: '10px' }}>
                <button onClick={handleRetry} className={styles.secondaryButton}>Retry</button>
                {pendingBlockchainLot && (
                  <button 
                    onClick={retryBlockchainSubmission} 
                    className={styles.primaryButton}
                    disabled={submitting}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {submitting ? '⏳ Retrying...' : '🔗 Retry Blockchain Only'}
                  </button>
                )}
                <button 
                  onClick={() => {
                    setError(null);
                    setPendingBlockchainLot(null);
                  }} 
                  className={styles.secondaryButton}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Blockchain Status Display */}
        {blockchainStatus && (
          <section className={styles.section}>
            <div style={{
              background: blockchainStatus.includes('✅') ? 'rgba(72, 187, 120, 0.1)' : 
                         blockchainStatus.includes('❌') ? 'rgba(245, 101, 101, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${blockchainStatus.includes('✅') ? 'rgba(72, 187, 120, 0.3)' : 
                                  blockchainStatus.includes('❌') ? 'rgba(245, 101, 101, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
              color: blockchainStatus.includes('✅') ? '#48bb78' : 
                     blockchainStatus.includes('❌') ? '#f56565' : '#3b82f6',
              padding: '10px 15px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>🔗 Blockchain Status</h3>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{blockchainStatus}</p>
              {lastTxHash && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                  <a 
                    href={getExplorerUrl(lastTxHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'underline' }}
                  >
                    View on Explorer: {lastTxHash.slice(0, 10)}...
                  </a>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Submit Production Lot */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Submit New Production Lot</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Energy Used (kWh) *</label>
                <input
                  type="number"
                  name="energy"
                  value={formData.energy}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="e.g., 1500"
                  min="1"
                  step="0.1"
                  required
                  disabled={submitting}
                />
                <small className={styles.fieldHint}>
                  Total renewable energy consumed for H₂ production
                </small>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>H₂ Produced (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  name="h2Produced"
                  value={formData.h2Produced}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="e.g., 45.2"
                  min="1"
                  required
                  disabled={submitting}
                />
                <small className={styles.fieldHint}>
                  Total green hydrogen produced in kilograms
                </small>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Energy Source</label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                  className={styles.select}
                  disabled={submitting}
                >
                  <option value="Solar">Solar</option>
                  <option value="Wind">Wind</option>
                  <option value="Hydro">Hydro</option>
                  <option value="Geothermal">Geothermal</option>
                  <option value="Biomass">Biomass</option>
                </select>
                <small className={styles.fieldHint}>
                  Primary renewable energy source used
                </small>
              </div>
            </div>

            {/* Efficiency */}
            {formData.energy && formData.h2Produced && (
              <div className={styles.efficiencyDisplay}>
                <h4>Production Efficiency</h4>
                <p><strong>Energy per kg H₂:</strong> {(formData.energy / formData.h2Produced).toFixed(2)} kWh/kg</p>
                <p><strong>Estimated Credits:</strong> {Math.round(formData.energy * 0.05)} credits</p>
              </div>
            )}

            <button 
              type="submit" 
              className={styles.primaryButton}
              disabled={submitting || !formData.energy || !formData.h2Produced}
            >
              {submitting ? '⏳ Submitting...' : '📤 Submit Production Lot'}
            </button>
            
            {submitting && (
              <p style={{ 
                textAlign: 'center', 
                color: '#6b7280', 
                fontSize: '14px', 
                marginTop: '10px' 
              }}>
                This will submit to both database and blockchain...
              </p>
            )}
          </form>
        </section>

        {/* Summary Stats */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Production Summary</h2>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.totalLots}</div>
              <div className={styles.kpiLabel}>Total Lots</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.pendingLots}</div>
              <div className={styles.kpiLabel}>Pending Review</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.issuedLots}</div>
              <div className={styles.kpiLabel}>Approved Lots</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.blockchainLots}</div>
              <div className={styles.kpiLabel}>On Blockchain</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.totalCredits}</div>
              <div className={styles.kpiLabel}>Total Credits</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.totalEnergy.toLocaleString()}</div>
              <div className={styles.kpiLabel}>Total Energy (kWh)</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{stats.totalH2.toFixed(1)}</div>
              <div className={styles.kpiLabel}>Total H₂ (kg)</div>
            </div>
          </div>
        </section>

        {/* Lots Table */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Your Production Lots {loading && <span className={styles.loadingText}>(Loading...)</span>}
          </h2>
          
          {loading && lots.length === 0 ? (
            <div className={styles.loadingState}>
              <h3>Loading Production Data</h3>
              <p>Please wait while we fetch your production lots...</p>
            </div>
          ) : lots.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No Production Lots Yet</h3>
              <p>You haven't submitted any production lots yet.</p>
              <p>Use the form above to submit your first green hydrogen production lot for verification.</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot ID</th>
                    <th>Energy (kWh)</th>
                    <th>H₂ (kg)</th>
                    <th>Efficiency</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Credits</th>
                    <th>Blockchain</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr key={lot.id}>
                      <td className={styles.lotId}>{lot.id}</td>
                      <td>{(lot.energy || 0).toLocaleString()}</td>
                      <td>{lot.h2Produced || 'N/A'}</td>
                      <td>
                        {lot.energy && lot.h2Produced ? (
                          <span style={{ 
                            color: calculateEfficiency(lot.energy, lot.h2Produced) <= 50 ? '#48bb78' : 
                                   calculateEfficiency(lot.energy, lot.h2Produced) <= 60 ? '#ed8936' : '#f56565' 
                          }}>
                            {calculateEfficiency(lot.energy, lot.h2Produced)} kWh/kg
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td>{lot.source || 'N/A'}</td>
                      <td>
                        <span className={`${styles.status} ${getStatusColor(lot.status)}`}>
                          {lot.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td>{lot.submittedDate || lot.issuedDate || 'N/A'}</td>
                      <td>
                        <span className={styles.credits}>
                          {lot.credits || lot.estimatedCredits || 'TBD'}
                          {lot.status === 'PENDING' && lot.estimatedCredits && (
                            <small style={{ display: 'block', opacity: 0.7 }}>(estimated)</small>
                          )}
                        </span>
                      </td>
                      <td>
                        {lot.blockchainTx ? (
                          <span style={{ color: '#48bb78', fontSize: '12px' }}>
                            ✅ On-chain
                            <br />
                            <a 
                              href={getExplorerUrl(lot.blockchainTx)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                color: '#48bb78', 
                                textDecoration: 'underline',
                                opacity: 0.7 
                              }}
                            >
                              {lot.blockchainTx.slice(0, 8)}...
                            </a>
                          </span>
                        ) : (
                          <span style={{ color: '#f56565', fontSize: '12px' }}>
                            ❌ Off-chain
                            <br />
                            <small style={{ opacity: 0.7 }}>Not on blockchain</small>
                          </span>
                        )}
                      </td>
                      <td>
                        {lot.status === 'ISSUED' && (
                          <button className={styles.secondaryButton}>📋 View Details</button>
                        )}
                        {lot.status === 'PENDING' && (
                          <span className={styles.pendingText}>⏳ Under Review</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ProducerDashboard;