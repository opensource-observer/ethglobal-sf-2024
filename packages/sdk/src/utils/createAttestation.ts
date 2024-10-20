import { OkResult, Result } from "typescript-monads";
import { signClient, walletClient } from "./client.js";
import { type AttestationResult } from "@ethsign/sp-sdk";
import core from "@actions/core";

type AttestationSchemaInput = {
  kind: "create" | "update";
  weights: unknown[];
};

export const createSchema = async ({
  kind,
}: Pick<AttestationSchemaInput, "kind">) => {
  const res = await signClient.createSchema({
    name: `AutoRF weight ${kind} Attestation`,
    data: [
      { name: "signer", type: "address" },
      { name: "weights", type: "string" },
    ],
  });

  return res;
};

export const createAttestation = async ({
  kind,
  weights,
}: AttestationSchemaInput): Promise<Result<AttestationResult, Error>> => {
  const { schemaId } = await createSchema({ kind });
  const signer = walletClient.account.address;

  const res = await signClient.createAttestation({
    schemaId,
    data: {
      signer,
      weights: JSON.stringify(weights),
    },
    indexingValue: signer.toLowerCase(),
  });

  core.info(`Attestation created: ${res.attestationId}`);

  return new OkResult(res);
};
