import { octokit } from "./client.js";
import { OkResult, Result } from "typescript-monads";
import core from "@actions/core";

export type PoolEntryMetrics = {
  commitCount: number;
  issueCount: number;
  prCount: number;
  linesAdded: number;
  linesDeleted: number;
};

export const metricsForProject = async (
  artifactNamespace: string,
  artifactName: string,
  from: Date,
  to: Date,
  retries = 5,
): Promise<Result<PoolEntryMetrics, Error>> => {
  if (retries < 0) {
    core.warning(
      `Failed to fetch metrics for ${artifactNamespace}/${artifactName}. Retries exhausted...`,
    );

    return new OkResult({
      commitCount: 0,
      issueCount: 0,
      prCount: 0,
      linesAdded: 0,
      linesDeleted: 0,
    });
  }

  try {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner: artifactNamespace,
      repo: artifactName,
      since: from.toISOString(),
      until: to.toISOString(),
    });
    const commitCount = commits.length;

    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner: artifactNamespace,
      repo: artifactName,
      since: from.toISOString(),
      state: "all",
    });
    const issueCount = issues.length;

    const { data: prs } = await octokit.rest.pulls.list({
      owner: artifactNamespace,
      repo: artifactName,
      state: "all",
    });
    const prCount = prs.length;

    const { data: codeFrequency } =
      await octokit.rest.repos.getCodeFrequencyStats({
        owner: artifactNamespace,
        repo: artifactName,
      });

    // fetching the code frequency is an expensive operation
    // so we wait for 10 seconds before trying again
    // to allow GitHub to catch up
    if (!Array.isArray(codeFrequency)) {
      core.warning(
        `Code frequency not available for ${artifactNamespace}/${artifactName}. Retrying... (${retries} left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, 10000));

      return metricsForProject(
        artifactNamespace,
        artifactName,
        from,
        to,
        retries - 1,
      );
    }

    // GitHub only provides the last 60 days of code frequency data
    const daysBetween = Math.min(
      Math.floor(((to.getTime() - from.getTime()) / 24) * 60 * 60 * 1000),
      60,
    );
    const lastDays = codeFrequency.slice(-daysBetween);
    const linesAdded = lastDays.reduce((acc, week) => acc + week[1], 0);
    const linesDeleted = lastDays.reduce((acc, week) => acc + week[2], 0);

    return new OkResult({
      commitCount,
      issueCount,
      prCount,
      linesAdded,
      linesDeleted: Math.abs(linesDeleted),
    });
  } catch {
    core.warning(
      `Failed to fetch metrics for ${artifactNamespace}/${artifactName}. Retrying... (${retries} left)`,
    );

    return metricsForProject(
      artifactNamespace,
      artifactName,
      from,
      to,
      retries - 1,
    );
  }
};
