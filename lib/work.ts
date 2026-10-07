export type WorkSectionKey = "created" | "incoming" | "accepted";

export const WORK_SECTION_CONFIG: Array<{ key: WorkSectionKey; title: string; description: string; method: string }> = [
  { key: "created", title: "Requester-created work", description: "Every proposal you created, including terminal outcomes.", method: "get_requester_engagements" },
  { key: "incoming", title: "Incoming proposals", description: "Proposals addressed to this wallet. Accepted work is shown separately below.", method: "get_performer_incoming" },
  { key: "accepted", title: "Accepted performer work", description: "Only proposals this wallet explicitly accepted.", method: "get_performer_engagements" },
];

export function workSectionLabel(key: WorkSectionKey): string {
  if (key === "created") return "Requester";
  if (key === "incoming") return "Incoming";
  return "Accepted performer";
}
