export type TastingStatus = "lobby" | "active" | "completed";
export type RoundStatus = "guessing" | "awaiting_answer" | "revealed";

export type VarietalColor = "red" | "white" | "rose" | "sparkling" | "dessert";

export interface VarietalSummary {
  id: string;
  name: string;
  color: VarietalColor;
  notes: string;
  commonDescriptors: string[];
  typicalRegions: string[];
}
