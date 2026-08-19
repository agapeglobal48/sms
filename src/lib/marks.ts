export type Component = {
  id: string;
  name: string;
  weight: number;
  included: boolean;
  sort_order: number;
};

/**
 * Weighted total = sum of (score * weight/100) across INCLUDED components
 * only. A missing score counts as 0 for that component's contribution,
 * same convention as the old fixed first/mid/final system.
 */
export function computeWeightedTotal(
  components: Component[],
  scoresByComponentId: Map<string, number | null>
): number {
  let total = 0;
  for (const c of components) {
    if (!c.included) continue;
    const score = scoresByComponentId.get(c.id) ?? 0;
    total += (score * c.weight) / 100;
  }
  return Math.round(total * 10) / 10;
}

export function sumIncludedWeights(components: { weight: number; included: boolean }[]): number {
  return components.filter((c) => c.included).reduce((sum, c) => sum + c.weight, 0);
}

export const DEFAULT_COMPONENTS = [
  { name: "First Term", weight: 25, sort_order: 0 },
  { name: "Second Term", weight: 25, sort_order: 1 },
  { name: "Final Term", weight: 50, sort_order: 2 },
];
