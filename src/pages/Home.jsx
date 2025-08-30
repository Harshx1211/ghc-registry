import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { getContract } from '../blockchain';
import styles from '../styles/Page.module.css';

const ROLES_CONFIG = [
  {
    title: 'Producer',
    description: 'Submit hydrogen production data and generate carbon credits',
    path: '/producer',
    icon: '🏭',
    gradient: 'from-emerald-500 to-green-600',
    hoverGradient: 'from-emerald-400 to-green-500',
    stats: '1,234 Credits Generated',
    color: '#22c55e'
  },
  {
    title: 'Certifier',
    description: 'Verify and certify green hydrogen production claims',
    path: '/certifier',
    icon: '✅',
    gradient: 'from-blue-500 to-cyan-600',
    hoverGradient: 'from-blue-400 to-cyan-500',
    stats: '892 Certifications',
    color: '#3b82f6'
  },
  {
    title: 'Buyer',
    description: 'Purchase and manage carbon credit portfolios',
    path: '/buyer',
    icon: '💼',
    gradient: 'from-purple-500 to-indigo-600',
    hoverGradient: 'from-purple-400 to-indigo-500',
    stats: '567 Credits Traded',
    color: '#8b5cf6'
  },
  {
    title: 'Regulator',
    description: 'Oversee and audit the carbon credit ecosystem',
    path: '/regulator',
    icon: '🏛️',
    gradient: 'from-orange-500 to-red-600',
    hoverGradient: 'from-orange-400 to-red-500',
    stats: '45 Audits Complete',
    color: '#f97316'
  }
];

const PROCESS_STEPS = [
  {
    icon: "🏭",
    title: "Production",
    description: "Hydrogen producers submit verified production data to the blockchain with IoT sensor integration",
    color: "#22c55e",
    step: "01"
  },
  {
    icon: "✅",
    title: "Certification", 
    description: "Independent certifiers verify and validate production claims using standardized processes",
    color: "#3b82f6",
    step: "02"
  },
  {
    icon: "🪙",
    title: "Tokenization",
    description: "Verified production data generates tradeable carbon credits on blockchain",
    color: "#a855f7", 
    step: "03"
  },
  {
    icon: "💼",
    title: "Trading",
    description: "Buyers purchase and manage carbon credit portfolios in a secure marketplace",
    color: "#f97316",
    step: "04"
  }
];

const Home = () => {
  const [state, setState] = useState({
    account: null,
    isConnecting: false,
    walletError: null,
    contractValue: null,
    isLoadingContract: false,
    networkInfo: null,
    balance: null,
    showStatsPanel: false
  });

  // Memoized utility functions
  const formatAddress = useCallback((address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const formatBalance = useCallback((bal) => {
    if (!bal) return '0';
    return parseFloat(bal).toFixed(4);
  }, []);

  // Memoized update function to prevent unnecessary re-renders
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Wallet event handlers
  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length === 0) {
      updateState({
        account: null,
        walletError: 'Wallet disconnected',
        contractValue: null,
        balance: null,
        networkInfo: null,
        showStatsPanel: false
      });
    } else {
      updateState({
        account: accounts[0],
        walletError: null
      });
    }
  }, [updateState]);

  const handleChainChanged = useCallback(() => {
    window.location.reload();
  }, []);

  // Account details fetcher
  const fetchAccountDetails = useCallback(async (account) => {
    if (!account || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const [network, balanceWei] = await Promise.all([
        provider.getNetwork(),
        provider.getBalance(account)
      ]);

      updateState({
        networkInfo: {
          name: network.name,
          chainId: Number(network.chainId)
        },
        balance: ethers.formatEther(balanceWei)
      });
    } catch (error) {
      console.error('Error fetching account details:', error);
      updateState({
        walletError: 'Failed to fetch account details'
      });
    }
  }, [updateState]);

  // Initial wallet check
  const checkWalletConnection = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0].address;
        updateState({ account });
        await fetchAccountDetails(account);
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  }, [updateState, fetchAccountDetails]);

  // Wallet connection
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      updateState({
        walletError: 'MetaMask not detected! Please install MetaMask to continue.'
      });
      return;
    }

    updateState({ isConnecting: true, walletError: null });

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts[0];
      
      updateState({ account, isConnecting: false });
      await fetchAccountDetails(account);
      
      const network = await provider.getNetwork();
      console.log('Connected to network:', network.name);
    } catch (error) {
      const errorMessage = error.code === 4001 
        ? 'Connection rejected by user'
        : 'Failed to connect wallet. Please try again.';
      
      updateState({
        walletError: errorMessage,
        isConnecting: false
      });
      console.error('Error connecting wallet:', error);
    }
  }, [updateState, fetchAccountDetails]);

  // Wallet disconnection
  const disconnectWallet = useCallback(() => {
    updateState({
      account: null,
      walletError: null,
      contractValue: null,
      balance: null,
      networkInfo: null,
      showStatsPanel: false
    });
  }, [updateState]);

  // Contract interaction
  const fetchContractValue = useCallback(async () => {
    if (!state.account) {
      updateState({
        walletError: 'Connect wallet first to interact with contract!'
      });
      return;
    }

    updateState({ isLoadingContract: true, walletError: null });

    try {
      const contract = await getContract();
      const value = await contract.someValue();
      
      updateState({
        contractValue: value.toString(),
        showStatsPanel: true,
        isLoadingContract: false
      });
    } catch (error) {
      console.error('Error fetching contract value:', error);
      updateState({
        walletError: 'Error reading from contract. Ensure contract is deployed and network is correct.',
        isLoadingContract: false
      });
    }
  }, [state.account, updateState]);

  // Setup wallet event listeners (only once)
  useEffect(() => {
    let mounted = true;

    const setupWallet = async () => {
      if (mounted) {
        await checkWalletConnection();
      }
    };

    setupWallet();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      mounted = false;
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [checkWalletConnection, handleAccountsChanged, handleChainChanged]);

  // Memoized styles to prevent recreation
  const containerStyles = useMemo(() => ({
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0d1b2a 100%)',
    position: 'relative',
    overflow: 'hidden'
  }), []);

  const backgroundStyles = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 20%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 60%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)
    `,
    animation: 'pulse 4s ease-in-out infinite alternate'
  }), []);

  return (
    <div style={containerStyles}>
      <div style={backgroundStyles} />
      
      <div className={styles.container} style={{ position: 'relative', zIndex: 1 }}>
        <Header 
          state={state}
          connectWallet={connectWallet}
          disconnectWallet={disconnectWallet}
          fetchContractValue={fetchContractValue}
          formatAddress={formatAddress}
          formatBalance={formatBalance}
        />
        
        <ErrorDisplay error={state.walletError} />
        <ContractStatsPanel 
          show={state.showStatsPanel} 
          value={state.contractValue} 
        />
        
        <RoleCards roles={ROLES_CONFIG} isConnected={!!state.account} />
        <HowItWorksSection steps={PROCESS_STEPS} />
      </div>
    </div>
  );
};

// Memoized Header Component
const Header = React.memo(({ 
  state, 
  connectWallet, 
  disconnectWallet, 
  fetchContractValue, 
  formatAddress, 
  formatBalance 
}) => (
  <header className={styles.header}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '40px',
      flexWrap: 'wrap',
      gap: '20px'
    }}>
      <TitleSection />
      <WalletPanel 
        state={state}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        fetchContractValue={fetchContractValue}
        formatAddress={formatAddress}
        formatBalance={formatBalance}
      />
    </div>
  </header>
));

// Memoized Title Section
const TitleSection = React.memo(() => (
  <div style={{ flex: '1', minWidth: '300px' }}>
    <h1 style={{
      fontSize: 'clamp(2.5rem, 5vw, 4rem)',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #22c55e, #3b82f6, #a855f7)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      marginBottom: '16px',
      letterSpacing: '-0.02em'
    }}>
      Green Hydrogen Credits
    </h1>
    <p style={{
      fontSize: '1.25rem',
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '400',
      lineHeight: '1.6',
      maxWidth: '600px'
    }}>
      Transforming clean energy into verifiable carbon credits through{' '}
      <span style={{
        background: 'linear-gradient(135deg, #22c55e, #3b82f6)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        fontWeight: '600'
      }}>
        blockchain technology
      </span>
    </p>
  </div>
));

// Memoized Wallet Panel
const WalletPanel = React.memo(({ 
  state, 
  connectWallet, 
  disconnectWallet, 
  fetchContractValue, 
  formatAddress, 
  formatBalance 
}) => {
  const panelStyles = useMemo(() => ({
    minWidth: '320px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
  }), []);

  if (!state.account) {
    return (
      <div style={panelStyles}>
        <ConnectWalletButton 
          isConnecting={state.isConnecting}
          onConnect={connectWallet}
        />
      </div>
    );
  }

  return (
    <div style={panelStyles}>
      <ConnectedWalletInfo 
        account={state.account}
        balance={state.balance}
        networkInfo={state.networkInfo}
        isLoadingContract={state.isLoadingContract}
        onDisconnect={disconnectWallet}
        onTestContract={fetchContractValue}
        formatAddress={formatAddress}
        formatBalance={formatBalance}
      />
    </div>
  );
});

// Memoized Connect Button
const ConnectWalletButton = React.memo(({ isConnecting, onConnect }) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyles = useMemo(() => ({
    background: isConnecting
      ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
      : 'linear-gradient(135deg, #f97316, #ea580c)',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '16px',
    cursor: isConnecting ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: '700',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isConnecting ? 'scale(0.95)' : isHovered ? 'scale(1.05)' : 'scale(1)',
    boxShadow: isConnecting
      ? 'none'
      : isHovered 
        ? '0 8px 30px rgba(249, 115, 22, 0.6)'
        : '0 4px 20px rgba(249, 115, 22, 0.4)',
    width: '100%'
  }), [isConnecting, isHovered]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '3rem',
        marginBottom: '16px',
        filter: 'grayscale(0.5)'
      }}>🦊</div>
      <button
        onClick={onConnect}
        disabled={isConnecting}
        style={buttonStyles}
        onMouseEnter={() => !isConnecting && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
      </button>
    </div>
  );
});

// Memoized Connected Wallet Info
const ConnectedWalletInfo = React.memo(({ 
  account, 
  balance, 
  networkInfo, 
  isLoadingContract,
  onDisconnect, 
  onTestContract, 
  formatAddress, 
  formatBalance 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const testButtonStyles = useMemo(() => ({
    background: isLoadingContract
      ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
      : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: 'white',
    border: 'none',
    padding: '14px 20px',
    borderRadius: '12px',
    cursor: isLoadingContract ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    width: '100%',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isLoadingContract ? 'scale(0.98)' : isHovered ? 'scale(1.02)' : 'scale(1)',
    boxShadow: isLoadingContract
      ? 'none'
      : isHovered
        ? '0 6px 25px rgba(139, 92, 246, 0.4)'
        : '0 4px 20px rgba(139, 92, 246, 0.3)'
  }), [isLoadingContract, isHovered]);

  return (
    <>
      <WalletHeader onDisconnect={onDisconnect} />
      <AddressDisplay address={account} formatAddress={formatAddress} />
      {balance && <BalanceDisplay balance={balance} formatBalance={formatBalance} />}
      {networkInfo && <NetworkDisplay networkInfo={networkInfo} />}
      
      <button
        onClick={onTestContract}
        disabled={isLoadingContract}
        style={testButtonStyles}
        onMouseEnter={() => !isLoadingContract && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isLoadingContract ? 'Loading...' : '🔗 Test Contract'}
      </button>
    </>
  );
});

// Individual display components
const WalletHeader = React.memo(({ onDisconnect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#22c55e',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#22c55e',
          animation: 'pulse 2s ease-in-out infinite'
        }} />
        Connected
      </div>
      <button
        onClick={onDisconnect}
        style={{
          background: isHovered ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
          color: isHovered ? '#ef4444' : 'rgba(255, 255, 255, 0.7)',
          border: `1px solid ${isHovered ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.2)'}`,
          padding: '6px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '12px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        Disconnect
      </button>
    </div>
  );
});

const AddressDisplay = React.memo(({ address, formatAddress }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }}>
    <div style={{
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '12px',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      Wallet Address
    </div>
    <div style={{
      color: 'white',
      fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
      fontSize: '16px',
      wordBreak: 'break-all'
    }}>
      {formatAddress(address)}
    </div>
  </div>
));

const BalanceDisplay = React.memo(({ balance, formatBalance }) => (
  <div style={{
    background: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid rgba(34, 197, 94, 0.2)'
  }}>
    <div style={{
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '12px',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      Balance
    </div>
    <div style={{
      color: '#22c55e',
      fontSize: '18px',
      fontWeight: '600'
    }}>
      {formatBalance(balance)} ETH
    </div>
  </div>
));

const NetworkDisplay = React.memo(({ networkInfo }) => (
  <div style={{
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '20px',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }}>
    <div>
      <div style={{
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Network
      </div>
      <div style={{ color: '#3b82f6', fontWeight: '600' }}>
        {networkInfo.name || 'Unknown'}
      </div>
    </div>
    <div style={{
      background: 'rgba(59, 130, 246, 0.2)',
      color: '#3b82f6',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: '600'
    }}>
      {networkInfo.chainId}
    </div>
  </div>
));

// Memoized Error Display
const ErrorDisplay = React.memo(({ error }) => {
  if (!error) return null;

  return (
    <div style={{
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#f87171',
      padding: '16px 20px',
      borderRadius: '12px',
      marginBottom: '30px',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <span style={{ fontSize: '20px' }}>⚠️</span>
      <span style={{ fontWeight: '500' }}>{error}</span>
    </div>
  );
});

// Memoized Contract Stats Panel
const ContractStatsPanel = React.memo(({ show, value }) => {
  if (!show || !value) return null;

  return (
    <div style={{
      background: 'rgba(34, 197, 94, 0.1)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '30px',
      backdropFilter: 'blur(15px)',
      animation: 'slideIn 0.5s ease-out'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '24px' }}>📊</span>
        <h3 style={{ color: '#22c55e', margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Contract Data
        </h3>
      </div>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '16px',
        borderRadius: '12px',
        fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
        fontSize: '16px',
        color: 'white',
        wordBreak: 'break-all'
      }}>
        {value}
      </div>
    </div>
  );
});

// Memoized Role Cards
const RoleCards = React.memo(({ roles, isConnected }) => (
  <main style={{
    marginBottom: '60px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    padding: '20px 0'
  }}>
    {roles.map((role, idx) => (
      <RoleCard 
        key={`${role.title}-${idx}`}
        role={role} 
        isConnected={isConnected} 
      />
    ))}
  </main>
));

// Memoized Role Card
const RoleCard = React.memo(({ role, isConnected }) => {
  const [isHovered, setIsHovered] = useState(false);

  const cardStyles = useMemo(() => ({
    textDecoration: 'none',
    color: 'inherit',
    opacity: isConnected ? 1 : 0.4,
    pointerEvents: isConnected ? 'auto' : 'none',
    filter: isConnected ? 'none' : 'grayscale(1)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isConnected && isHovered ? 'translateY(-8px)' : 'translateY(0)'
  }), [isConnected, isHovered]);

  const gradientMap = useMemo(() => ({
    emerald: 'linear-gradient(135deg, #10b981, #059669)',
    blue: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    purple: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    orange: 'linear-gradient(135deg, #f97316, #ea580c)',
    default: 'linear-gradient(135deg, #6b7280, #4b5563)'
  }), []);

  const getGradient = useCallback((gradientString) => {
    if (!isConnected) return gradientMap.default;
    
    if (gradientString.includes('emerald')) return gradientMap.emerald;
    if (gradientString.includes('blue')) return gradientMap.blue;
    if (gradientString.includes('purple')) return gradientMap.purple;
    if (gradientString.includes('orange')) return gradientMap.orange;
    return gradientMap.default;
  }, [isConnected, gradientMap]);

  return (
    <Link
      to={role.path}
      style={cardStyles}
      onMouseEnter={() => isConnected && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '32px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundImage: getGradient(role.gradient)
        }} />
        
        <div style={{ 
          fontSize: '3rem', 
          marginBottom: '20px', 
          textAlign: 'center', 
          filter: isConnected ? 'none' : 'grayscale(1)' 
        }}>
          {role.icon}
        </div>
        
        <h3 style={{ 
          color: 'white', 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          marginBottom: '12px', 
          textAlign: 'center' 
        }}>
          {role.title}
        </h3>
        
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          fontSize: '16px', 
          lineHeight: '1.6', 
          textAlign: 'center', 
          marginBottom: '20px', 
          flex: '1' 
        }}>
          {role.description}
        </p>
        
        {isConnected ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
            marginTop: 'auto'
          }}>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              fontSize: '12px', 
              marginBottom: '4px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Statistics
            </div>
            <div style={{ 
              color: 'white', 
              fontSize: '14px', 
              fontWeight: '600' 
            }}>
              {role.stats}
            </div>
          </div>
        ) : (
          <div style={{
            fontSize: '14px',
            color: '#fbbf24',
            textAlign: 'center',
            fontWeight: '500',
            background: 'rgba(251, 191, 36, 0.1)',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(251, 191, 36, 0.2)'
          }}>
            🔒 Connect wallet to access
          </div>
        )}
      </div>
    </Link>
  );
});

// Memoized How It Works Section
const HowItWorksSection = React.memo(({ steps }) => (
  <section style={{
    marginTop: '80px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '24px',
    padding: '48px',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 16px 64px rgba(0, 0, 0, 0.3)'
  }}>
    <h2 style={{
      color: 'white',
      marginBottom: '16px',
      textAlign: 'center',
      fontSize: '2.5rem',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #22c55e, #3b82f6)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent'
    }}>
      How It Works
    </h2>

    <p style={{
      textAlign: 'center',
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '18px',
      marginBottom: '48px',
      maxWidth: '600px',
      marginLeft: 'auto',
      marginRight: 'auto'
    }}>
      A transparent, decentralized ecosystem for green hydrogen carbon credits
    </p>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '32px'
    }}>
      {steps.map((step, idx) => (
        <StepCard key={`${step.title}-${idx}`} {...step} />
      ))}
    </div>
  </section>
));

// Memoized Step Card
const StepCard = React.memo(({ icon, title, description, color, step }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '32px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'transform 0.3s ease'
  }}>
    <div style={{ fontSize: '3rem' }}>{icon}</div>
    <h3 style={{ margin: 0, fontWeight: '700' }}>{title}</h3>
    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)' }}>{description}</p>
    <div style={{
      marginTop: 'auto',
      fontWeight: '700',
      fontSize: '1.25rem',
      color
    }}>
      {step}
    </div>
  </div>
));

// Add CSS animations
const globalStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

export default Home;