import yargs from "yargs";
import { updateWeights } from "./metrics/index.js";
import { populateDb } from "./utils/misc.js";

const args = await yargs(process.argv.slice(2))
  .command("populate:db", "Populate the database with initial data")
  .command("update:weights", "Update weights in the Split")
  .command("dispatch:email", "Dispatch email with the new weights")
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
    const result = await updateWeights();
    if (result.isFail()) {
      throw result.unwrapFail();
    }
  },
  "dispatch:email": () => void 0,
};

await commandMap[command]();
