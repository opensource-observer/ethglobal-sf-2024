import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Database } from "types.js";
import { assertEnvVariableExists, assertOxString } from "./misc.js";
import { Octokit } from "@octokit/rest";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { SplitV2Client } from "@0xsplits/splits-sdk";

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
