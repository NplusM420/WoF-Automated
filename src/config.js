import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Wallet Configuration
  privateKey: process.env.PRIVATE_KEY,
  walletAddress: process.env.WALLET_ADDRESS,
  
  // ApeChain Configuration
  rpcUrl: process.env.RPC_URL || 'https://rpc.apechain.com',
  chainId: parseInt(process.env.CHAIN_ID) || 33139,
  
  // Contract Configuration
  contractAddress: process.env.CONTRACT_ADDRESS || '0x075893707e168162234b62a5b39650e124ff3321', // MULTIBALL tokens
  prizeTicketAddress: process.env.PRIZE_TICKET_ADDRESS || '0x618be6e12dc29e9731e81818c9b9d6bec961b28e', // Prize Ticket NFTs
  secretSantaAddress: process.env.SECRET_SANTA_ADDRESS || '0x80a5e6d411002891e519f531785e7686b3c467ed', // SecretSanta conversion contract
  
  // Minting Configuration
  maxDailyMint: parseInt(process.env.MAX_DAILY_MINT) || 500,
  mintQuantityPerTx: parseInt(process.env.MINT_QUANTITY_PER_TX) || 10,
  
  // Gas Configuration
  gasLimit: 300000,
  maxFeePerGas: '30000000000', // 30 gwei (increased for ApeChain)
  maxPriorityFeePerGas: '5000000000' // 5 gwei
};