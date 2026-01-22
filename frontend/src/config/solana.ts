import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'); // Devnet ID

// Mock Addresses for Devnet
export const DEFAULT_ROOM_ADDRESS = new PublicKey('11111111111111111111111111111111'); 
export const DEFAULT_TOKEN_MINT = new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL for now

// Environment variables or defaults
export const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export const SOLANA_NETWORK = 'devnet';
export const SOLANA_RPC_HOST = 'https://api.devnet.solana.com';
