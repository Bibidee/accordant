export const APP_NAME = "Accordant";
export const CHAIN_ID = 61999;
export const CHAIN_ID_HEX = `0x${CHAIN_ID.toString(16)}`;
export const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC || "https://studio.genlayer.com/api";
export const EXPLORER_URL = "https://explorer-studio.genlayer.com";
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ACCORDANT_CONTRACT || "0x0000000000000000000000000000000000000000";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
