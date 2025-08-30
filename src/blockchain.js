import { ethers } from 'ethers';

// Replace with your contract's deployed address
const CONTRACT_ADDRESS = '0xAf02DD050A989FE4e1e0811B56B5b714b3F36478';

// Replace with your contract ABI
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "producer", "type": "address" }
    ],
    "name": "CreditsAdded",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "addCredits",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalCredits",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Returns a contract instance connected to the wallet (MetaMask)
 */
export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected! Please install MetaMask.');
  }

  // Create an ethers provider
  const provider = new ethers.BrowserProvider(window.ethereum);

  // Get signer (wallet)
  const signer = await provider.getSigner();

  // Create contract instance
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  return contract;
};

/**
 * Connect MetaMask wallet and return the connected account address
 */
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected!');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  // Request wallet connection
  const accounts = await provider.send("eth_requestAccounts", []);

  // Return first connected account address
  return accounts[0];
};
