import yargs from "yargs";
import { updateWeights } from "./metrics/index.js";
import { coerceRange, daysAgo, populateDb } from "./utils/misc.js";

const args = await yargs(process.argv.slice(2))
  .command("populate:db", "Populate the database with initial data")
  .command("update:weights", "Update weights in the Split", {
    range: {
      type: "string",
      description: "Range of the weights to update (YYYY-MM-DD:YYYY-MM-DD)",
      coerce: coerceRange,
    },
  })
  .demandCommand(1)
  .help().argv;

const [command] = args._;

const commandMap: {
  [key: string]: () => unknown;
} = {
  "populate:db": async () => {
    const result = await populateDb();
    if (result.isFail()) {
      throw result.unwrapFail();
    }
  },
  "update:weights": async () => {
    const range = args.range as { from: Date; to: Date } | undefined;
    const result = await updateWeights(
      range?.from ?? daysAgo(7),
      range?.to
        ? new Date(range.to.getTime() + 24 * 60 * 60 * 1000 - 1)
        : new Date(),
    );
    if (result.isFail()) {
      throw result.unwrapFail();
    }
  },
};

await commandMap[command]();
