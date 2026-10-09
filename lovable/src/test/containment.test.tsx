import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { ContainmentCard } from "@/components/investigation/ContainmentCard";
import type { ContainmentAction } from "@/types";
const approve = vi.hoisted(() => vi.fn());
vi.mock("@/api", () => ({
  isDemoMode: false,
  api: { approveContainment: approve, rejectContainment: vi.fn() },
}));
afterEach(() => {
  cleanup();
  approve.mockReset();
});
const action = {
  id: "a",
  caseId: "c",
  title: "Pause",
  target: "agent",
  effect: "Synthetic only",
  reversible: "Replay",
  checks: [],
  status: "proposed",
} as ContainmentAction;
const wrap = (a: ContainmentAction) => (
  <QueryClientProvider client={new QueryClient()}>
    <ContainmentCard action={a} />
  </QueryClientProvider>
);
it("follows fresh server status and isolates local decisions to the action", () => {
  const view = render(wrap(action));
  expect(screen.getByRole("button", { name: /Approve simulated/ })).toBeEnabled();
  view.rerender(wrap({ ...action, status: "approved" }));
  expect(screen.queryByRole("button", { name: /Approve simulated/ })).toBeNull();
  view.rerender(wrap({ ...action, id: "b", status: "proposed" }));
  expect(screen.getByRole("button", { name: /Approve simulated/ })).toBeEnabled();
  view.rerender(wrap({ ...action, status: "rejected" }));
  expect(screen.getByText(/Rejected. The decision/)).toBeVisible();
});
it("disables duplicate decisions during requests and exposes failures", async () => {
  let reject!: (reason: Error) => void;
  approve.mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  render(wrap(action));
  fireEvent.click(screen.getByRole("button", { name: /Approve simulated/ }));
  expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
  reject(new Error("Backend unavailable"));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Backend unavailable"));
  expect(screen.getByRole("button", { name: /Approve simulated/ })).toBeEnabled();
});
