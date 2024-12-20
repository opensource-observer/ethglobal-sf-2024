import { FailResult, OkResult, Result } from "typescript-monads";
import { populateUserID, supabase, walletClient } from "./client.js";
import { faker } from "@faker-js/faker";
import { randomUUID } from "crypto";

export function assertEnvVariableExists(
  variable: string | undefined,
  name: string,
): asserts variable is string {
  if (!variable) {
    throw new Error(`Environment variable ${name} is missing`);
  }
}

export function assertOxString(
  variable: string | undefined,
  name: string,
): asserts variable is `0x${string}` {
  if (!variable || !variable.startsWith("0x")) {
    throw new Error(`Environment variable ${name} is not a valid 0x string`);
  }
}

export const populateDb = async (): Promise<Result<null, Error>> => {
  const userID = populateUserID;
  const poolID = randomUUID();

  const pool = {
    created_at: new Date().toISOString(),
    deleted_at: null,
    description: faker.lorem.words(10),
    name: `${faker.person.fullName()}'s pool`,
    split_address: null,
    id: poolID,
    updated_at: new Date().toISOString(),
    user_id: userID,
  };

  const { error: insertError } = await supabase
    .from("funding_pools")
    .insert([pool]);

  if (insertError) {
    return new FailResult(new Error(insertError.message));
  }

  const { data, error } = await supabase
    .from("funding_pools")
    .select("id")
    .eq("id", pool.id)
    .single();

  if (error) {
    return new FailResult(new Error(error.message));
  }

  const { address } = walletClient.account;

  const exampleRepos = [
    "opensource-observer/oso",
    "ethereum-optimism/superchain-ops",
    "true-myth/true-myth",
    "gigobyte/purify",
    "fastrodev/fastro",
  ];

  for (let i = 0; i < 5; i++) {
    const repo = exampleRepos[i % exampleRepos.length];
    const [artifact_namespace, artifact_name] = repo.split("/");

    const registration = {
      artifact_name,
      artifact_namespace,
      artifact_source: "GITHUB",
      created_at: new Date().toISOString(),
      pool_id: data.id,
      referrer: null,
      user_id: pool.user_id,
      wallet_address: address,
    };

    const { error: registrationInsertError } = await supabase
      .from("pool_registrations")
      .insert([registration]);

    if (registrationInsertError) {
      return new FailResult(new Error(registrationInsertError.message));
    }
  }

  return new OkResult(null);
};

export const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const coerceRange = (
  range: string,
): {
  to: Date;
  from: Date;
} => {
  const regex = /(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})/;
  if (!regex.test(range)) {
    throw new Error(
      `Invalid range: ${range} does not match YYYY-MM-DD:YYYY-MM-DD`,
    );
  }

  const [from, to] = range.split(":").map((date) => new Date(date));

  if (from > to) {
    throw new Error(`Invalid range: ${from} is after ${to}`);
  }

  if (to.getTime() - from.getTime() > 60 * 24 * 60 * 60 * 1000) {
    throw new Error(
      "Range cannot be more than 60 days (GitHub API limitation)",
    );
  }

  return { from, to };
};

export const capLines = (lines: number) => Math.min(lines, 10000);
