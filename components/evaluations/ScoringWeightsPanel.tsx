/**
 * ScoringWeightsPanel — 展示 9 个评分维度的权重表。
 * 纯展示（RSC），用于 evaluations / ranking 页头部。
 */
import { SCORING_WEIGHTS, type ScoringDimension } from '@/types';

const DIM_LABEL: Record<ScoringDimension, string> = {
  marketSize: 'Market size',
  painIntensity: 'Pain intensity',
  competition: 'Competition gap',
  technicalFeasibility: 'Technical feasibility',
  monetization: 'Monetization',
  speedToMarket: 'Speed to market',
  founderFit: 'Founder fit',
  geoPotential: 'GEO potential',
  ipPotential: 'IP potential',
};

const DIM_HINT: Record<ScoringDimension, string> = {
  marketSize: 'Higher = larger TAM',
  painIntensity: 'Higher = more acute pain',
  competition: 'Higher = less competition (inverted polarity)',
  technicalFeasibility: 'Higher = easier to build',
  monetization: 'Higher = cleaner revenue model',
  speedToMarket: 'Higher = faster to first dollar',
  founderFit: 'Higher = stronger team fit',
  geoPotential: 'Higher = stronger AI-search visibility upside',
  ipPotential: 'Higher = stronger IP / moat upside',
};

const DIMS: ScoringDimension[] = Object.keys(SCORING_WEIGHTS) as ScoringDimension[];

export function ScoringWeightsPanel() {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs uppercase tracking-wider text-muted mb-2">
        Scoring weights
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
        {DIMS.map((dim) => {
          const w = SCORING_WEIGHTS[dim];
          return (
            <div key={dim} className="flex items-baseline justify-between gap-2">
              <span className="text-text">{DIM_LABEL[dim]}</span>
              <span className="text-muted">
                {(w * 100).toFixed(0)}%
                <span className="ml-1 text-[10px] text-muted/70">— {DIM_HINT[dim]}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-muted">
        Thresholds: total ≥ 70 → status <span className="text-text">mvp</span> ·
        total &lt; 40 → status <span className="text-text">archived</span> (auto).
      </div>
    </div>
  );
}
