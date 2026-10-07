import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTransaction: vi.fn(),
  monitorTransaction: vi.fn(),
}));

vi.mock("../../lib/genlayer", () => ({
  getTransaction: mocks.getTransaction,
  monitorTransaction: mocks.monitorTransaction,
}));

import { TransactionNotice } from "../../components/TransactionNotice";

const finalized = { hash: "0xabc", phase: "FINALIZED", protocolStatus: "FINALIZED", executionStatus: "FINISHED_WITH_RETURN", raw: {} };
const failed = { hash: "0xabc", phase: "FAILED", protocolStatus: "FINALIZED", executionStatus: "TIMEOUT", raw: {} };

describe("TransactionNotice canonical lifecycle", () => {
  beforeEach(() => {
    mocks.getTransaction.mockReset();
    mocks.monitorTransaction.mockReset();
  });
  afterEach(() => cleanup());

  it("uses the manual receipt refresh path to invoke canonical readback", async () => {
    mocks.getTransaction.mockResolvedValue(finalized);
    const onFinalized = vi.fn().mockResolvedValue(undefined);
    render(<TransactionNotice hash="0xabc" label="Create engagement" onFinalized={onFinalized} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh receipt" }));
    await waitFor(() => expect(onFinalized).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Transaction lifecycle: CANONICAL_VERIFIED")).toBeInTheDocument();
  });

  it("does not mark canonical verified when finalized readback fails", async () => {
    mocks.getTransaction.mockResolvedValue(finalized);
    const onFinalized = vi.fn().mockRejectedValue(new Error("Transaction finalized, but canonical state could not yet be verified. Reconcile this exact hash before retrying."));
    render(<TransactionNotice hash="0xabc" label="Create engagement" onFinalized={onFinalized} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh receipt" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("canonical state could not yet be verified"));
    expect(screen.getByLabelText("Transaction lifecycle: FINALIZED")).toBeInTheDocument();
    expect(screen.getByText("Canonical state verified", { exact: true })).not.toHaveClass("current");
  });

  it("keeps refresh failures out of canonical readback", async () => {
    mocks.getTransaction.mockResolvedValue(failed);
    const onFinalized = vi.fn().mockResolvedValue(undefined);
    render(<TransactionNotice hash="0xabc" label="Create engagement" onFinalized={onFinalized} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh receipt" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Execution failed"));
    expect(onFinalized).not.toHaveBeenCalled();
  });

  it("keeps monitor failures out of canonical readback", async () => {
    mocks.monitorTransaction.mockResolvedValue(failed);
    const onFinalized = vi.fn().mockResolvedValue(undefined);
    render(<TransactionNotice hash="0xabc" label="Create engagement" onFinalized={onFinalized} />);

    fireEvent.click(screen.getByRole("button", { name: "Monitor to finality" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Execution failed"));
    expect(onFinalized).not.toHaveBeenCalled();
  });
});
