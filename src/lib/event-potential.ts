/** The same editorial relevance index is used before and after campaign generation. */
export function eventCampaignPotential(input: {
  matches: number; references: number; signature: boolean; affinity?: number;
  start: number; end: number; now: number; insideArea: boolean;
}) {
  const affinity = input.affinity ?? 0;
  const factors = [
    // Nearby place references are the strongest Qloo link; shared taste tags alone still count, with fewer points.
    { label: 'Menu tags connected to Qloo', points: input.matches > 0 ? 30 : affinity >= 0.5 ? 20 : affinity > 0 ? 10 : 0, max: 30 },
    { label: 'Nearby references for this offer', points: Math.min(20, input.references * 5), max: 20 },
    { label: 'Your place DNA', points: input.signature ? 20 : 10, max: 20 },
    { label: 'Time to prepare', points: input.end - input.start >= 30 * 60000 ? 15 : 0, max: 15 },
    { label: 'Inside your local area', points: input.insideArea ? 15 : 0, max: 15 },
  ];
  const score = input.end > input.now && input.end - input.start >= 30 * 60000 && input.insideArea
    ? factors.reduce((sum, factor) => sum + factor.points, 0) : null;
  return { score, factors };
}

export type EventPotential = {
  score: number | null;
  label: string;
  reason: string;
  offer?: { id: string; title: string; price: string };
  window?: { startLocal: string; endLocal: string };
  references: string[];
  radiusM: number;
  factors: { label: string; points: number; max: number }[];
  checkedAt: string;
  campaignId?: string;
};
