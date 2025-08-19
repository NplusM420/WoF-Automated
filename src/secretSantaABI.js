// SecretSanta Contract ABI - Contains the swapForPrize function
export const secretSantaABI = [
  {
    "inputs": [
      {"internalType": "uint8", "name": "ballType", "type": "uint8"},
      {"internalType": "uint256[]", "name": "ballTokenIds", "type": "uint256[]"},
      {"internalType": "uint256", "name": "traceId", "type": "uint256"}
    ],
    "name": "swapForPrize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "requestId", "type": "uint256"},
      {"internalType": "uint256", "name": "randomNumber", "type": "uint256"}
    ],
    "name": "randomNumberCallback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "name": "requests",
    "outputs": [
      {"internalType": "address", "name": "player", "type": "address"},
      {"internalType": "uint8", "name": "ballType", "type": "uint8"},
      {"internalType": "uint64", "name": "requestedAt", "type": "uint64"},
      {"internalType": "bool", "name": "fulfilled", "type": "bool"},
      {"internalType": "uint256", "name": "prizeId", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "requestId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint8", "name": "ballType", "type": "uint8"}
    ],
    "name": "RandomRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "requestId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "prizeId", "type": "uint256"}
    ],
    "name": "PrizeAssigned",
    "type": "event"
  }
];

// Ball types enum
export const BallType = {
  Gold: 0,
  Silver: 1,
  Multi: 2
};