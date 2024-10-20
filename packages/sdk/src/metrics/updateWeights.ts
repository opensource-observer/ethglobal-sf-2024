import { computeWeights } from "./computeWeights.js";
import { FailResult, OkResult, Result } from "typescript-monads";
import { splitsClient, supabase, walletClient } from "../utils/client.js";
import type {
  CreateSplitV2Config,
  UpdateSplitV2Config,
} from "@0xsplits/splits-sdk";
import { SplitV2Type } from "@0xsplits/splits-sdk/types";
import { sepolia } from "viem/chains";
import { assertOxString } from "../utils/misc.js";
import core from "@actions/core";

export const updateWeights = async (): Promise<Result<null, Error>> => {
  const newWeights = await computeWeights();
  if (newWeights.isFail()) {
    return new FailResult(newWeights.unwrapFail());
  }

  const weights = newWeights.unwrap();
  const entries = Object.entries(weights);
  const { address } = walletClient.account;

  for (const [id, weights] of entries) {
    if (!weights.length) {
      core.warning(`No weights for pool ${id}`);
      continue;
    }

    const { data: poolData, error } = await supabase
      .from("funding_pools")
      .select("*")
      .eq("id", id);
    if (error) {
      return new FailResult(new Error(error.message));
    }
    const [pool] = poolData;

    const total = weights.reduce(
      (acc, { allocatedFunding }) => acc + allocatedFunding,
      0,
    );

    if (total !== 100) {
      weights[0].allocatedFunding += 100 - total;
    }

    if (pool.split_address === null) {
      const config: CreateSplitV2Config = {
        recipients: weights.map(({ allocatedFunding, contributor }) => ({
          address: contributor.wallet,
          percentAllocation: allocatedFunding,
        })),
        distributorFeePercent: 0,
        splitType: SplitV2Type.Push,
        ownerAddress: address,
        creatorAddress: address,
        chainId: sepolia.id,
      };

      const { splitAddress, event } = await splitsClient.createSplit(config);

      const { error } = await supabase
        .from("funding_pools")
        .update({ split_address: splitAddress })
        .eq("id", id);

      if (error) {
        return new FailResult(new Error(error.message));
      }

      core.info(`Created split: ${splitAddress}, Event: ${event}`);
      core.startGroup(`Split Details for ${id}`);
      core.info(`Address: ${splitAddress}`);
      core.info(`Pool Name: ${pool.name}`);
      weights.forEach(({ allocatedFunding, contributor }) => {
        core.info(
          `${contributor.artifact_namespace}/${contributor.artifact_name}: ${allocatedFunding}%`,
        );
      });
      core.endGroup();
    } else {
      assertOxString(pool.split_address, "pool.split_address");

      const config: UpdateSplitV2Config = {
        splitAddress: pool.split_address,
        recipients: weights.map(({ allocatedFunding, contributor }) => ({
          address: contributor.wallet,
          percentAllocation: allocatedFunding,
        })),
        distributorFeePercent: 0,
      };

      const { event } = await splitsClient.updateSplit(config);
      core.info(`Updated split: ${pool.split_address}, Event: ${event}`);
      core.startGroup(`Split Details for ${id}`);
      core.info(`Address: ${pool.split_address}`);
      core.info(`Pool Name: ${pool.name}`);
      weights.forEach(({ allocatedFunding, contributor }) => {
        core.info(
          `${contributor.artifact_namespace}/${contributor.artifact_name}: ${allocatedFunding}%`,
        );
      });
      core.endGroup();
    }
  }

  return new OkResult(null);
};
