import type { Status } from "../../../shared/contracts.js";

export const statusLabels: Record<Status, string> = {
  open: "Ouvert",
  investigating: "En investigation",
  resolved: "Résolu",
};
export const statusTransitions: Record<Status, Status[]> = {
  open: ["investigating", "resolved"],
  investigating: ["open", "resolved"],
  resolved: ["open"],
};
