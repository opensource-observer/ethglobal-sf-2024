import { readFile } from "node:fs/promises";
import { supabase } from "./utils/client.js";
import type { FundingWeight } from "./metrics/computeWeights.js";

// Utility function to create a fundingWeight from
// a dump of the format:
// $artifact_namespace/$artifact_name: $weight%
// Useful to avoid having to pull all the data again if
// the step after fetching GitHub data fails.
export const textToWeight = async (poolId: string, path = "./weights.txt") => {
  const file = (await readFile(path)).toString();

  const out: FundingWeight[] = [];

  for (const line of file.split("\n")) {
    const [project, percentage] = line.split(": ");
    const weight = +parseFloat(percentage).toFixed(4);
    const [namespace, name] = project.split("/");

    const { data: poolData, error } = await supabase
      .from("pool_registrations")
      .select("*")
      .eq("artifact_namespace", namespace)
      .eq("artifact_name", name);

    if (error) {
      console.error(error);
      continue;
    }

    const [data] = poolData;
    if (!data) {
      console.error(`No pool found for ${namespace}/${name}`);
      continue;
    }

    out.push({
      contributor: {
        id: data.user_id,
        wallet: data.wallet_address,
        artifact_namespace: namespace,
        artifact_name: name,
      },
      kind: "referrer",
      allocatedFunding: weight,
    });
  }

  return {
    [poolId]: out,
  };
};
