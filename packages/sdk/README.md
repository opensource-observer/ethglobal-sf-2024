# sdk

This package contains the SDK for the **AutoRF** project. It provides the
following functionalities:

- Minting on-chain project registration attestations using the
  [Sign protocol](https://docs.sign.global)
- Collecting data required to compute a project's impact metrics
- Creating a funding pool with [0xSplits](https://splits.org) contracts
- Adjusting the split contract weights according to project impact
- Enabling funding distribution over a designated period

## Quick start

0. Populate the `.env` file with the example content:

```sh
cp .env.example .env
```

1. Install dependencies

```sh
pnpm install
```

2. Transpile the code

```sh
pnpm run build
```

3. Add some data to the database

```sh
pnpm run populate:db
```

4. Create the `0xSplits` if they don't exist, or modify them according to the
   last week of impact metrics.

```sh
pnpm run update:weights
```
