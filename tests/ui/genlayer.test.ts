import { describe, expect, it } from "vitest";
import { toTransactionRecord } from "@/lib/genlayer";

const makeRecord = (status: string, execution?: string) =>
  toTransactionRecord("0xtransaction", {
    statusName: status,
    ...(execution === undefined ? {} : { txExecutionResultName: execution }),
  });

describe("transaction execution classification", () => {
  it("accepts an explicitly successful ACCEPTED execution provisionally", () => {
    expect(makeRecord("ACCEPTED", "FINISHED_WITH_RETURN").phase).toBe(
      "ACCEPTED_PROVISIONAL",
    );
  });

  it("accepts an explicitly successful FINALIZED execution canonically", () => {
    expect(makeRecord("FINALIZED", "FINISHED_WITH_RETURN").phase).toBe(
      "FINALIZED",
    );
  });

  it.each([
    "FINISHED_WITH_ERROR",
    "TIMEOUT",
    "NONDET_DISAGREE",
    "DETERMINISTIC_VIOLATION",
    "NOT_VOTED",
    "UNKNOWN",
  ])("fails FINALIZED with execution result %s", (execution) => {
    expect(makeRecord("FINALIZED", execution).phase).toBe("FAILED");
  });

  it("fails FINALIZED when the execution result is missing", () => {
    expect(makeRecord("FINALIZED").phase).toBe("FAILED");
  });

  it("fails ACCEPTED when execution timed out", () => {
    expect(makeRecord("ACCEPTED", "TIMEOUT").phase).toBe("FAILED");
  });

  it("preserves protocol-level undetermined and canceled mappings", () => {
    expect(makeRecord("UNDETERMINED", "FINISHED_WITH_ERROR").phase).toBe(
      "UNDETERMINED",
    );
    expect(makeRecord("CANCELED", "FINISHED_WITH_ERROR").phase).toBe(
      "CANCELED",
    );
    expect(makeRecord("CANCELLED", "FINISHED_WITH_ERROR").phase).toBe(
      "CANCELED",
    );
  });
});
