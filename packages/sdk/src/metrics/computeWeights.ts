import { supabase } from "../utils/client.js";
import { FailResult, OkResult, Result } from "typescript-monads";
import { fetchMetricsForPool } from "./fetchMetricsForPool.js";
import core from "@actions/core";

type FundingWeight = {
  contributor: {
    id: string;
    wallet: string;
    artifact_namespace: string;
    artifact_name: string;
  };
  allocatedFunding: number;
};

export const computeWeights = async (): Promise<
  Result<Record<string, FundingWeight[]>, Error>
> => {
  core.info("Computing weights for funding pools");
  const { data: poolData, error } = await supabase
    .from("funding_pools")
    .select("*");

  if (error) {
    return new FailResult(new Error(error.message));
  }

  const fundingWeights: {
    [key: string]: FundingWeight[];
  } = {};

  for (const pool of poolData) {
    const metricsResult = await fetchMetricsForPool(pool.id);

    if (metricsResult.isFail()) {
      return new FailResult(metricsResult.unwrapFail());
    }
    const metrics = metricsResult.unwrap();

    const prWeight = 0.3;
    const issueWeight = 0.2;
    const linesWeight = 0.4;
    const commitWeight = 0.1;

    const fundingPool = 100;

    let totalPRs = 0;
    let totalIssues = 0;
    let totalLinesAdded = 0;
    let totalLinesDeleted = 0;
    let totalCommits = 0;

    metrics.forEach(({ metrics }) => {
      totalPRs += metrics.prCount;
      totalIssues += metrics.issueCount;
      totalLinesAdded += metrics.linesAdded;
      totalLinesDeleted += metrics.linesDeleted;
      totalCommits += metrics.commitCount;
    });

    const contributorsShares = metrics.map(async ({ metrics, info }) => {
      const normalizedPRs = metrics.prCount / totalPRs;
      const normalizedIssues = metrics.issueCount / totalIssues;
      const normalizedLinesAdded = metrics.linesAdded / totalLinesAdded;
      const normalizedLinesDeleted = metrics.linesDeleted / totalLinesDeleted;
      const normalizedCommits = metrics.commitCount / totalCommits;

      const normalizedLines = (normalizedLinesAdded + normalizedLinesDeleted) /
        2;

      const share = prWeight * normalizedPRs +
        issueWeight * normalizedIssues +
        linesWeight * normalizedLines +
        commitWeight * normalizedCommits;

      if (info.referrer === null) {
        return [{
          contributor: {
            id: info.user_id,
            wallet: info.wallet_address,
            artifact_namespace: info.artifact_namespace,
            artifact_name: info.artifact_name,
          },
          sharePercentage: share * 100,
        }];
      }

      const queryParams = new URLSearchParams(info.referrer);

      const referrerId = queryParams.has("referrer")
        ? queryParams.get("referrer")!
        : info.referrer;

      const { data: referrer, error } = await supabase.from(
        "pool_registrations",
      )
        .select("*").eq(
          "pool_id",
          pool.id,
        ).eq("user_id", referrerId);

      const recipients = [];

      if (!error) {
        core.info(
          `${referrer[0].artifact_namespace}/${
            referrer[0].artifact_name
          } referred ${info.artifact_namespace}/${info.artifact_name}`,
        );

        recipients.push({
          contributor: {
            id: referrer[0].user_id,
            wallet: referrer[0].wallet_address,
            artifact_namespace: referrer[0].artifact_namespace,
            artifact_name: referrer[0].artifact_name,
          },
          sharePercentage: share,
        });
      }

      recipients.push({
        contributor: {
          id: info.user_id,
          wallet: info.wallet_address,
          artifact_namespace: info.artifact_namespace,
          artifact_name: info.artifact_name,
        },
        sharePercentage: error ? share * 100 : share * 99,
      });

      return recipients;
    });

    const recipients = (await Promise.all(contributorsShares)).flat();

    const mergedRecipients = recipients.reduce<{
      contributor: FundingWeight["contributor"];
      sharePercentage: number;
    }[]>(
      (acc, current) => {
        const x = acc.find(
          (item) => item.contributor.id === current.contributor.id,
        );
        if (!x) {
          return [...acc, current];
        } else {
          x.sharePercentage += current.sharePercentage;
          return acc;
        }
      },
      [],
    );

    const fundingDistribution = mergedRecipients
      .map(
        (contributorShare) => {
          return {
            contributor: contributorShare.contributor,
            allocatedFunding: +(
              (contributorShare.sharePercentage / 100) *
              fundingPool
            ).toFixed(4),
          };
        },
      );

    fundingWeights[pool.id] = fundingDistribution;

    core.info(`Computed weights for pool ${pool.id}`);
    core.startGroup("Weights");
    fundingDistribution.forEach((fundingWeight) => {
      core.info(
        `${fundingWeight.contributor.artifact_namespace}/${fundingWeight.contributor.artifact_name}: ${fundingWeight.allocatedFunding}%`,
      );
    });
    core.endGroup();
  }

  return new OkResult(fundingWeights);
};
