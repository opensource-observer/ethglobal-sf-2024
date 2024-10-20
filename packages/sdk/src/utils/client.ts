import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Database } from "types.js";
import { assertEnvVariableExists, assertOxString } from "./misc.js";
import { Octokit } from "@octokit/rest";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";
import { SplitV2Client } from "@0xsplits/splits-sdk";
import { EvmChains, SignProtocolClient, SpMode } from "@ethsign/sp-sdk";

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

assertEnvVariableExists(SUPABASE_URL, "SUPABASE_URL");
assertEnvVariableExists(SUPABASE_KEY, "SUPABASE_KEY");

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
assertEnvVariableExists(GITHUB_TOKEN, "GITHUB_TOKEN");

export const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

const INFURA_API_URL = process.env.INFURA_API_URL;
assertEnvVariableExists(INFURA_API_URL, "INFURA_API_URL");

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(INFURA_API_URL),
});

const HOT_WALLET_PRIVATE_KEY = process.env.HOT_WALLET_PRIVATE_KEY;
assertEnvVariableExists(HOT_WALLET_PRIVATE_KEY, "HOT_WALLET_PRIVATE_KEY");
assertOxString(HOT_WALLET_PRIVATE_KEY, "HOT_WALLET_PRIVATE_KEY");

const account = privateKeyToAccount(HOT_WALLET_PRIVATE_KEY);

export const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(INFURA_API_URL),
});

const SPLITS_API_KEY = process.env.SPLITS_API_KEY;
assertEnvVariableExists(SPLITS_API_KEY, "SPLITS_API_KEY");

export const splitsClient = new SplitV2Client({
  chainId: sepolia.id,
  publicClient: publicClient,
  walletClient: walletClient,
  apiConfig: {
    apiKey: SPLITS_API_KEY,
  },
});

const POPULATE_USER_ID = process.env.POPULATE_USER_ID;
assertEnvVariableExists(POPULATE_USER_ID, "POPULATE_USER_ID");

export const populateUserID = POPULATE_USER_ID;

export const signClient = new SignProtocolClient(SpMode.OnChain, {
  chain: EvmChains.sepolia,
  account,
});

const UniswapRouterABI = [
  {
    "inputs": [{
      "internalType": "uint256",
      "name": "amountIn",
      "type": "uint256",
    }, { "internalType": "address[]", "name": "path", "type": "address[]" }],
    "name": "getAmountsOut",
    "outputs": [{
      "internalType": "uint256[]",
      "name": "amounts",
      "type": "uint256[]",
    }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
    ],
    "name": "swapExactETHForTokens",
    "outputs": [{
      "internalType": "uint256[]",
      "name": "amounts",
      "type": "uint256[]",
    }],
    "stateMutability": "payable",
    "type": "function",
  },
];

export const getPrice = async (amountIn: number) => {
  const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630b4cf539739df2c5dacab9875e88690";
  const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  const uniswapClient = createPublicClient({
    chain: mainnet,
    transport: http(INFURA_API_URL),
  });

  const path = [WETH, DAI];

  const result = await uniswapClient.readContract({
    address: UNISWAP_ROUTER_ADDRESS,
    abi: UniswapRouterABI,
    functionName: "getAmountsOut",
    args: [amountIn, path],
  });

  const [amountOut] = result as [number];

  return amountOut;
};
