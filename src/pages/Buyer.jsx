import React, { useState, useEffect } from 'react';

// Mock blockchain functions
const connectWallet = async () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return accounts[0];
    } catch (error) {
      throw new Error('Failed to connect wallet');
    }
  }
  // Mock for demo
  await new Promise(resolve => setTimeout(resolve, 1000));
  return '0x742d35Cc6634C0532925a3b8D0FE1A7aB1234567';
};

const getContract = async () => {
  // Mock contract interface
  return {
    totalCredits: async () => BigInt(15420),
    addCredits: async (credits) => ({
      hash: '0xabcd1234567890ef' + Date.now().toString(16),
      wait: async () => ({
        status: 1,
        blockNumber: 18500000 + Math.floor(Math.random() * 1000),
        gasUsed: BigInt(21000 + Math.floor(Math.random() * 10000))
      })
    }),
    estimateGas: {
      addCredits: async () => BigInt(21000 + Math.floor(Math.random() * 10000))
    },
    provider: {
      getNetwork: async () => ({ name: 'Ethereum Mainnet', chainId: 1 }),
      getGasPrice: async () => BigInt(20000000000 + Math.floor(Math.random() * 10000000000))
    }
  };
};

const BuyerDashboard = () => {
  // Original state
  const [lots, setLots] = useState([]);
  const [purchasedCredits, setPurchasedCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQRData] = useState(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Blockchain state
  const [walletAddress, setWalletAddress] = useState(null);
  const [contract, setContract] = useState(null);
  const [totalCreditsOnChain, setTotalCreditsOnChain] = useState(0);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [gasPrice, setGasPrice] = useState(null);

  // CSS styles object (matching HydraGreen dark theme)
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#1e2936',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e2e8f0'
    },
    loadingState: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      color: '#e2e8f0'
    },
    errorState: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      color: '#f87171'
    },
    header: {
      backgroundColor: '#1e2936',
      color: 'white',
      padding: '2rem',
      textAlign: 'center',
      borderBottom: '1px solid #374151'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      margin: 0,
      marginBottom: '0.5rem'
    },
    tagline: {
      fontSize: '1.1rem',
      margin: 0,
      opacity: 0.8,
      color: '#94a3b8'
    },
    main: {
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    section: {
      backgroundColor: '#2d3748',
      borderRadius: '8px',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      border: '1px solid #4a5568'
    },
    sectionTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#e2e8f0',
      marginBottom: '1rem'
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem'
    },
    kpiCard: {
      backgroundColor: '#374151',
      padding: '1.5rem',
      borderRadius: '8px',
      textAlign: 'center',
      border: '1px solid #4a5568'
    },
    kpiValue: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#34d399',
      marginBottom: '0.5rem'
    },
    kpiLabel: {
      fontSize: '0.9rem',
      color: '#94a3b8'
    },
    tableContainer: {
      overflowX: 'auto',
      border: '1px solid #4a5568',
      borderRadius: '8px',
      backgroundColor: '#374151'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      fontSize: '0.875rem',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'background-color 0.2s'
    },
    secondaryButton: {
      backgroundColor: '#4a5568',
      color: '#e2e8f0',
      border: '1px solid #6b7280',
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      fontSize: '0.875rem',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'background-color 0.2s'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: '#2d3748',
      borderRadius: '8px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
      border: '1px solid #4a5568'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      borderBottom: '1px solid #4a5568',
      color: '#e2e8f0'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#94a3b8'
    },
    qrContainer: {
      padding: '1.5rem',
      color: '#e2e8f0'
    },
    qrCode: {
      display: 'block',
      margin: '0 auto 1rem',
      border: '2px solid #4a5568',
      borderRadius: '8px'
    },
    certificateInfo: {
      marginTop: '1rem'
    },
    certificateDetails: {
      backgroundColor: '#374151',
      padding: '1rem',
      borderRadius: '6px',
      marginTop: '0.5rem',
      color: '#e2e8f0'
    },
    modalActions: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      marginTop: '1.5rem'
    },
    emptyState: {
      textAlign: 'center',
      padding: '2rem',
      color: '#94a3b8'
    },
    lotId: {
      fontFamily: 'monospace',
      fontWeight: 'bold',
      color: '#34d399'
    },
    credits: {
      fontWeight: 'bold',
      color: '#34d399'
    },
    status: {
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: '500'
    },
    statusRetired: {
      backgroundColor: '#065f46',
      color: '#34d399'
    }
  };

  // Mock data for demonstration
  const mockLots = [
    {
      id: 'LOT001',
      producer: 'SolarTech Solutions',
      credits: 1000,
      source: 'Solar',
      issuedDate: '2024-08-15',
      efficiency: 96,
      status: 'ISSUED',
      location: 'Rajasthan, India'
    },
    {
      id: 'LOT002',
      producer: 'WindPower Gujarat',
      credits: 2500,
      source: 'Wind',
      issuedDate: '2024-08-10',
      efficiency: 94,
      status: 'ISSUED',
      location: 'Gujarat, India'
    },
    {
      id: 'LOT003',
      producer: 'HydroGenerate Corp',
      credits: 1500,
      source: 'Hydro',
      issuedDate: '2024-08-20',
      efficiency: 98,
      status: 'ISSUED',
      location: 'Himachal Pradesh, India'
    }
  ];

  // Connect wallet functionality
  const handleConnectWallet = async () => {
    try {
      setWalletConnecting(true);
      setError(null);
      
      const address = await connectWallet();
      setWalletAddress(address);
      
      const contractInstance = await getContract();
      setContract(contractInstance);
      
      const network = await contractInstance.provider.getNetwork();
      setNetworkInfo(network);
      
      const gas = await contractInstance.provider.getGasPrice();
      setGasPrice(gas);
      
      const total = await contractInstance.totalCredits();
      setTotalCreditsOnChain(Number(total));
      
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please ensure MetaMask is installed and try again.');
    } finally {
      setWalletConnecting(false);
    }
  };

  // Original fetch lots with blockchain integration
  const fetchLots = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from API first, fallback to mock data
      let data;
      try {
        const response = await fetch('http://localhost:5000/lots');
        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error('API not available');
        }
      } catch (apiError) {
        console.log('Using mock data as API is not available');
        data = mockLots;
      }
      
      const issuedLots = data.filter(lot => lot.status === 'ISSUED');
      setLots(issuedLots);
      
      // Filter retired lots for current wallet
      const retiredLots = data.filter(lot => 
        lot.status === 'RETIRED' && 
        walletAddress && 
        lot.buyerId?.toLowerCase() === walletAddress.toLowerCase()
      );
      setPurchasedCredits(retiredLots);
      
    } catch (err) {
      console.error('Error fetching lots:', err);
      setError(`Failed to fetch lots: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced purchase with blockchain transaction
  const purchaseCredit = async (lotId) => {
    if (!contract || !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    const lot = lots.find(l => l.id === lotId);
    if (!lot) return;

    try {
      setPurchaseLoading(true);
      setError(null);

      // Submit blockchain transaction
      const tx = await contract.addCredits(lot.credits);
      console.log('Transaction submitted:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('Transaction confirmed:', receipt);

        // Update backend with blockchain data
        const updateData = {
          status: 'RETIRED',
          purchaseDate: new Date().toISOString().split('T')[0],
          buyerId: walletAddress,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        };

        try {
          const response = await fetch(`http://localhost:5000/lots/${lotId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
          });

          if (response.ok) {
            const updatedLot = await response.json();
            setLots(prev => prev.filter(lot => lot.id !== lotId));
            setPurchasedCredits(prev => [updatedLot, ...prev]);
          } else {
            // If API fails, update locally
            const updatedLot = { ...lot, ...updateData };
            setLots(prev => prev.filter(lot => lot.id !== lotId));
            setPurchasedCredits(prev => [updatedLot, ...prev]);
          }
        } catch (apiError) {
          console.log('API update failed, updating locally');
          const updatedLot = { ...lot, ...updateData };
          setLots(prev => prev.filter(lot => lot.id !== lotId));
          setPurchasedCredits(prev => [updatedLot, ...prev]);
        }
        
        // Update total credits from blockchain
        const newTotal = await contract.totalCredits();
        setTotalCreditsOnChain(Number(newTotal));
        
        console.log('Credits purchased successfully');
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (err) {
      console.error('Error purchasing credits:', err);
      let errorMessage = 'Failed to purchase credits';
      
      if (err.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (err.code === -32000) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (err.message.includes('gas')) {
        errorMessage = 'Transaction failed due to gas issues';
      }
      
      setError(errorMessage);
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Enhanced QR code generation with blockchain data
  const generateQRCode = (data) => {
    const blockchainData = {
      ...data,
      walletAddress,
      contractAddress: 'CONTRACT_ADDRESS',
      blockchain: networkInfo?.name || 'Ethereum',
      chainId: networkInfo?.chainId || 1,
      verified: true,
      timestamp: Date.now()
    };
    
    const qrString = JSON.stringify(blockchainData);
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
        <text x="100" y="155" text-anchor="middle" fill="#3b82f6" font-size="6" font-family="monospace">Blockchain Verified</text>
      </svg>
    `)}`;
  };

  // Enhanced view certificate with blockchain data
  const viewCertificate = (lot) => {
    const certificateData = {
      lotId: lot.id,
      credits: lot.credits,
      producer: lot.producer,
      source: lot.source,
      issuedDate: lot.issuedDate,
      retiredDate: lot.purchaseDate || new Date().toISOString().split('T')[0],
      buyerId: walletAddress || 'BUYER001',
      certificateId: `CERT${lot.id.replace('LOT', '')}`,
      transactionHash: lot.transactionHash,
      blockNumber: lot.blockNumber,
      gasUsed: lot.gasUsed
    };
    
    setQRData(certificateData);
    setShowQRModal(true);
  };

  // Helper function for efficiency color (preserved)
  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 95) return '#48bb78';
    if (efficiency >= 90) return '#ed8936';
    return '#f56565';
  };

  // Format wallet address
  const formatAddress = (address) => {
    if (!address) return 'Not Connected';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format transaction hash
  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  // Auto-connect wallet on mount
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await handleConnectWallet();
          }
        } catch (err) {
          console.log('Auto-connect failed:', err);
        }
      }
    };
    
    autoConnect();
  }, []);

  // Load data on component mount and when wallet connects
  useEffect(() => {
    fetchLots();
  }, [walletAddress]);

  // Listen for wallet account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setWalletAddress(null);
          setContract(null);
          setTotalCreditsOnChain(0);
          setPurchasedCredits([]);
        } else if (accounts[0] !== walletAddress) {
          handleConnectWallet();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [walletAddress]);

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <h2>Loading lots...</h2>
          <p>Please wait while we fetch the latest carbon credit data.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !walletAddress && !lots.length) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button 
            onClick={fetchLots}
            style={styles.primaryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Buyer Dashboard</h1>
        <p style={styles.tagline}>Purchase and manage your carbon credit portfolio</p>
        
        {/* Blockchain wallet status */}
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          backgroundColor: '#374151', 
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          border: '1px solid #4a5568'
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8, color: '#94a3b8' }}>Blockchain Status</div>
            <div style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>
              Wallet: {formatAddress(walletAddress)} | 
              Network: {networkInfo?.name || 'Unknown'} | 
              Total On-Chain: {totalCreditsOnChain.toLocaleString()} credits
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={fetchLots}
              style={styles.secondaryButton}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
            {!walletAddress ? (
              <button 
                onClick={handleConnectWallet}
                style={styles.primaryButton}
                disabled={walletConnecting}
              >
                {walletConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div style={{ 
                color: '#34d399', 
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#34d399',
                  borderRadius: '50%'
                }}></div>
                Connected
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#f87171'
          }}>
            {error}
          </div>
        )}
      </header>

      <main style={styles.main}>
        {/* Portfolio Summary */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>My Portfolio Summary</h2>
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiValue}>
                {purchasedCredits.reduce((sum, credit) => sum + (credit.credits || 0), 0)}
              </div>
              <div style={styles.kpiLabel}>Total Credits Owned</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiValue}>
                {purchasedCredits.length}
              </div>
              <div style={styles.kpiLabel}>Certificates</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiValue}>
                ₹{purchasedCredits.reduce((sum, credit) => 
                  sum + ((credit.credits || 0) * (credit.pricePerCredit || 25)), 0
                ).toLocaleString()}
              </div>
              <div style={styles.kpiLabel}>Estimated Portfolio Value</div>
            </div>
            <div style={styles.kpiCard}>
              <div style={{...styles.kpiValue, color: '#3b82f6'}}>
                {totalCreditsOnChain.toLocaleString()}
              </div>
              <div style={styles.kpiLabel}>Blockchain Total Credits</div>
            </div>
          </div>
        </section>

        {/* Available Credits for Purchase */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Available Credits for Purchase</h2>
          {lots.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>No Credits Available</h3>
              <p>There are currently no issued carbon credits available for purchase.</p>
              <p>Please check back later or contact support for more information.</p>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={{ backgroundColor: '#4a5568' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Lot ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Producer</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Credits</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Source</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Issued Date</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Efficiency</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Location</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr key={lot.id} style={{ borderBottom: '1px solid #4a5568', backgroundColor: '#374151' }}>
                      <td style={{...styles.lotId, padding: '1rem'}}>{lot.id}</td>
                      <td style={{ padding: '1rem', color: '#e2e8f0' }}>{lot.producer}</td>
                      <td style={{...styles.credits, padding: '1rem'}}>{lot.credits}</td>
                      <td style={{ padding: '1rem', color: '#e2e8f0' }}>{lot.source}</td>
                      <td style={{ padding: '1rem', color: '#e2e8f0' }}>{lot.issuedDate}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: getEfficiencyColor(lot.efficiency || 95) }}>
                          {lot.efficiency || 95}%
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#e2e8f0' }}>{lot.location || 'India'}</td>
                      <td style={{ padding: '1rem' }}>
                        <button
                          onClick={() => purchaseCredit(lot.id)}
                          style={{
                            ...styles.primaryButton,
                            marginRight: '0.5rem',
                            backgroundColor: !walletAddress ? '#6b7280' : styles.primaryButton.backgroundColor
                          }}
                          disabled={purchaseLoading || !walletAddress}
                        >
                          {purchaseLoading ? 'Processing...' : !walletAddress ? 'Connect Wallet' : 'Purchase'}
                        </button>
                        <button
                          onClick={() => viewCertificate(lot)}
                          style={styles.secondaryButton}
                        >
                          View
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
  <section style={styles.section}>
    <h2 style={styles.sectionTitle}>My Portfolio - Retired Credits & Certificates</h2>
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={{ backgroundColor: '#4a5568' }}>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Lot ID</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Producer</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Credits</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Source</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Purchase Date</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Transaction</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Status</th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #6b7280', color: '#e2e8f0' }}>Certificate</th>
          </tr>
        </thead>
        <tbody>
          {purchasedCredits.map((credit) => (
            <tr key={credit.id} style={{ borderBottom: '1px solid #4a5568', backgroundColor: '#374151' }}>
              <td style={{ ...styles.lotId, padding: '1rem' }}>{credit.id}</td>
              <td style={{ padding: '1rem', color: '#e2e8f0' }}>{credit.producer}</td>
              <td style={{ ...styles.credits, padding: '1rem' }}>{credit.credits}</td>
              <td style={{ padding: '1rem', color: '#e2e8f0' }}>{credit.source}</td>
              <td style={{ padding: '1rem', color: '#e2e8f0' }}>{credit.purchaseDate || credit.issuedDate}</td>
              <td style={{ padding: '1rem' }}>
                {credit.transactionHash ? (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      color: '#60a5fa'
                    }}
                    onClick={() =>
                      window.open(`https://etherscan.io/tx/${credit.transactionHash}`, '_blank')
                    }
                    title="Click to view on Etherscan"
                  >
                    {formatHash(credit.transactionHash)}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    No blockchain record
                  </span>
                )}
              </td>
              <td style={{ padding: '1rem' }}>
                <span style={{ ...styles.status, ...styles.statusRetired }}>
                  RETIRED
                </span>
              </td>
              <td style={{ padding: '1rem' }}>
                <button
                  onClick={() => viewCertificate(credit)}
                  style={styles.primaryButton}
                >
                  View Certificate
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
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Carbon Credit Retirement Certificate</h3>
              <button 
                onClick={() => setShowQRModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div style={styles.qrContainer}>
              <img 
                src={generateQRCode(qrData)} 
                alt="QR Certificate" 
                style={styles.qrCode}
              />
              
              <div style={styles.certificateInfo}>
                <h4>Certificate Details</h4>
                <div style={styles.certificateDetails}>
                  <p><strong>Certificate ID:</strong> {qrData.certificateId}</p>
                  <p><strong>Lot ID:</strong> {qrData.lotId}</p>
                  <p><strong>Credits Retired:</strong> {qrData.credits}</p>
                  <p><strong>Producer:</strong> {qrData.producer}</p>
                  <p><strong>Energy Source:</strong> {qrData.source}</p>
                  <p><strong>Issue Date:</strong> {qrData.issuedDate}</p>
                  <p><strong>Retirement Date:</strong> {qrData.retiredDate}</p>
                  <p><strong>Buyer ID:</strong> {qrData.buyerId}</p>
                  {qrData.transactionHash && (
                    <>
                      <p><strong>Transaction Hash:</strong></p>
                      <p style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.8rem',
                        wordBreak: 'break-all',
                        color: '#3b82f6',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(`https://etherscan.io/tx/${qrData.transactionHash}`, '_blank')}
                      title="Click to view on Etherscan"
                      >
                        {qrData.transactionHash}
                      </p>
                      <p><strong>Block Number:</strong> {qrData.blockNumber}</p>
                      <p><strong>Gas Used:</strong> {qrData.gasUsed}</p>
                    </>
                  )}
                  <div style={{ 
                    marginTop: '1rem',
                    padding: '0.5rem',
                    backgroundColor: '#065f46',
                    borderRadius: '6px',
                    color: '#34d399',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {qrData.transactionHash ? 'BLOCKCHAIN VERIFIED' : 'PENDING VERIFICATION'}
                  </div>
                </div>
              </div>
              
              <div style={styles.modalActions}>
                <button 
                  onClick={() => window.print()}
                  style={styles.primaryButton}
                >
                  Print Certificate
                </button>
                <button 
                  onClick={() => setShowQRModal(false)}
                  style={styles.secondaryButton}
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