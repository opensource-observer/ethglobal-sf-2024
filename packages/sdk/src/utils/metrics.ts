import { octokit } from "./client.js";
import { FailResult, OkResult, Result } from "typescript-monads";
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
): Promise<Result<PoolEntryMetrics, Error>> => {
  const from = new Date();
  from.setDate(from.getDate() - 7);

  const to = new Date();

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
        `Code frequency not available for ${artifactNamespace}/${artifactName}...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return metricsForProject(artifactNamespace, artifactName);
    }

    const last7Days = codeFrequency.slice(-7);
    const linesAdded = last7Days.reduce((acc, week) => acc + week[1], 0);
    const linesDeleted = last7Days.reduce((acc, week) => acc + week[2], 0);

    return new OkResult({
      commitCount,
      issueCount,
      prCount,
      linesAdded,
      linesDeleted: Math.abs(linesDeleted),
    });
  } catch (err) {
    if (err instanceof Error) {
      return new FailResult(err);
    }
    return new FailResult(new Error("Unknown error"));
  }
};
