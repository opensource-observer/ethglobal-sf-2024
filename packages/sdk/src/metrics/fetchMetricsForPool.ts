import { supabase } from "../utils/client.js";
import { Tables } from "types.js";
import { FailResult, OkResult, Result } from "typescript-monads";
import { metricsForProject, type PoolEntryMetrics } from "../utils/metrics.js";
import core from "@actions/core";
import { isAddress } from "viem";

type ExtendedMetrics = {
  info: Tables<"pool_registrations">;
  metrics: PoolEntryMetrics;
};

export const fetchMetricsForPool = async (
  poolUuid: string,
  from: Date,
  to: Date,
): Promise<Result<ExtendedMetrics[], Error>> => {
  core.info(`Fetching metrics for pool ${poolUuid}`);
  const { data, error } = await supabase
    .from("funding_pools")
    .select("*")
    .eq("id", poolUuid);
  if (error) {
    return new FailResult(error);
  }

  const [pool] = data;
  const metrics: ExtendedMetrics[] = [];

  const { data: poolData, error: poolError } = await supabase
    .from("pool_registrations")
    .select("*")
    .eq("pool_id", pool.id);

  if (poolError) {
    return new FailResult(poolError);
  }

  const hasValidAddress = poolData.filter((project) =>
    isAddress(project.wallet_address),
  );

  for (const project of hasValidAddress) {
    core.info(
      `Fetching metrics for project ${project.artifact_namespace}/${project.artifact_name}`,
    );
    const projectMetric = await metricsForProject(
      project.artifact_namespace,
      project.artifact_name,
      from,
      to,
    );

    const flatMappedMetric = projectMetric.flatMap(
      (metric) =>
        new OkResult({
          info: project,
          metrics: metric,
        }),
    );

    if (flatMappedMetric.isFail()) {
      return new FailResult(flatMappedMetric.unwrapFail());
    }

    metrics.push(flatMappedMetric.unwrap());
  }

  return new OkResult(metrics);
};
