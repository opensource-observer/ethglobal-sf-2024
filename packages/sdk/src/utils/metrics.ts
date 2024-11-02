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
    const commits = await octokit.paginate(
      octokit.rest.repos.listCommits,
      {
        owner: artifactNamespace,
        repo: artifactName,
        since: from.toISOString(),
        until: to.toISOString(),
        per_page: 100,
      },
      (response) => response.data,
    );
    const commitCount = commits.length;

    const issues = await octokit.paginate(
      octokit.rest.issues.listForRepo,
      {
        owner: artifactNamespace,
        repo: artifactName,
        state: "all",
        per_page: 100,
      },
      (response) => response.data,
    );
    const validIssues = issues.filter((issue) => {
      const createdAt = new Date(issue.created_at).getTime();
      return createdAt >= from.getTime() && createdAt <= to.getTime();
    });
    const issueCount = validIssues.length;

    const prs = await octokit.paginate(
      octokit.rest.pulls.list,
      {
        owner: artifactNamespace,
        repo: artifactName,
        state: "all",
        per_page: 100,
      },
      (response) => response.data,
    );
    const validPRs = prs.filter((pr) => {
      const createdAt = new Date(pr.created_at).getTime();
      return createdAt >= from.getTime() && createdAt <= to.getTime();
    });
    const prCount = validPRs.length;

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

    const validDays = codeFrequency.filter(
      ([timestamp]) =>
        from.getTime() <= timestamp * 1000 && timestamp * 1000 <= to.getTime(),
    );
    const linesAdded = validDays.reduce(
      (acc, [, additions]) => acc + additions,
      0,
    );
    const linesDeleted = validDays.reduce(
      (acc, [, , deletions]) => acc + deletions,
      0,
    );

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
