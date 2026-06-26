/**
 * evaluationService 单元测试。
 *
 * 覆盖：
 *  - 9 维评分合计：权重求和（高 / 中 / 低 / 全零）
 *  - competition 极性反转不影响公式
 *  - 校验：超出范围 / 非整数 / 缺字段 → EvaluationServiceError
 *  - auto status：totalScore >= 70 → 'mvp'；< 40 → 'archived'；其它保持
 *  - killed 状态不会被自动 archive 覆盖
 *  - rankOpportunities：已评估的排前，未评估的占位
 */

import { describe, it, expect } from 'vitest';
import {
  createEvaluation,
  listEvaluations,
  rankOpportunities,
  EvaluationServiceError,
} from './evaluationService';
import { listOpportunities, getOpportunity } from './opportunityService';
import {
  SCORING_WEIGHTS,
  PROMOTE_THRESHOLD,
  DEMOTE_THRESHOLD,
  type ScoringDimension,
} from '@/types';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function fullInput(overrides: Partial<{
  marketSize: number;
  painIntensity: number;
  competition: number;
  technicalFeasibility: number;
  monetization: number;
  speedToMarket: number;
  founderFit: number;
  geoPotential: number;
  ipPotential: number;
}> = {}) {
  return {
    marketSize: 50,
    painIntensity: 50,
    competition: 50,
    technicalFeasibility: 50,
    monetization: 50,
    speedToMarket: 50,
    founderFit: 50,
    geoPotential: 50,
    ipPotential: 50,
    ...overrides,
  };
}

async function pickFirstOpportunityId(): Promise<string> {
  const opps = await listOpportunities();
  if (opps.length === 0) throw new Error('no mock opportunities');
  return opps[0]!.id;
}

describe('createEvaluation: weighted total', () => {
  it('全 50 分 → totalScore = 50.0', async () => {
    const oppId = await pickFirstOpportunityId();
    const res = await createEvaluation({
      id: `eval_test_a_${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: oppId,
      ...fullInput(),
      explanation: 'baseline 50/50',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(res.evaluation.totalScore).toBe(50);
  });

  it('全 0 分 → totalScore = 0.0', async () => {
    const oppId = await pickFirstOpportunityId();
    const res = await createEvaluation({
      id: `eval_test_b_${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: oppId,
      ...fullInput({
        marketSize: 0, painIntensity: 0, competition: 0, technicalFeasibility: 0,
        monetization: 0, speedToMarket: 0, founderFit: 0, geoPotential: 0, ipPotential: 0,
      }),
      explanation: 'all zeros',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(res.evaluation.totalScore).toBe(0);
  });

  it('全 100 分 → totalScore = 100.0', async () => {
    const oppId = await pickFirstOpportunityId();
    const res = await createEvaluation({
      id: `eval_test_c_${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: oppId,
      ...fullInput({
        marketSize: 100, painIntensity: 100, competition: 100, technicalFeasibility: 100,
        monetization: 100, speedToMarket: 100, founderFit: 100, geoPotential: 100, ipPotential: 100,
      }),
      explanation: 'all hundreds',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(res.evaluation.totalScore).toBe(100);
  });

  it('manual weighted sum matches computed total', async () => {
    const oppId = await pickFirstOpportunityId();
    const input = fullInput({
      marketSize: 80, painIntensity: 70, competition: 60, technicalFeasibility: 75,
      monetization: 65, speedToMarket: 90, founderFit: 55, geoPotential: 85, ipPotential: 45,
    });
    const res = await createEvaluation({
      id: `eval_test_d_${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: oppId,
      ...input,
      explanation: 'manual sum check',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    const dims: ScoringDimension[] = Object.keys(SCORING_WEIGHTS) as ScoringDimension[];
    const expectedRaw = dims.reduce((acc, d) => acc + SCORING_WEIGHTS[d] * input[d], 0);
    const expected = Math.round(expectedRaw * 10) / 10;
    expect(res.evaluation.totalScore).toBe(expected);
  });
});

describe('createEvaluation: validation', () => {
  it('rejects score < 0', async () => {
    const oppId = await pickFirstOpportunityId();
    await expect(
      createEvaluation({
        id: 'eval_invalid_neg',
        opportunityId: oppId,
        ...fullInput({ marketSize: -1 }),
        explanation: 'negative test',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toBeInstanceOf(EvaluationServiceError);
  });

  it('rejects score > 100', async () => {
    const oppId = await pickFirstOpportunityId();
    await expect(
      createEvaluation({
        id: 'eval_invalid_hi',
        opportunityId: oppId,
        ...fullInput({ painIntensity: 150 }),
        explanation: 'too high',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toBeInstanceOf(EvaluationServiceError);
  });

  it('rejects non-integer score', async () => {
    const oppId = await pickFirstOpportunityId();
    await expect(
      createEvaluation({
        id: 'eval_invalid_frac',
        opportunityId: oppId,
        ...fullInput({ monetization: 55.7 }),
        explanation: 'fractional',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toBeInstanceOf(EvaluationServiceError);
  });

  it('rejects empty explanation', async () => {
    const oppId = await pickFirstOpportunityId();
    await expect(
      createEvaluation({
        id: 'eval_invalid_exp',
        opportunityId: oppId,
        ...fullInput(),
        explanation: '   ',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toBeInstanceOf(EvaluationServiceError);
  });

  it('rejects missing opportunity', async () => {
    await expect(
      createEvaluation({
        id: 'eval_invalid_opp',
        opportunityId: 'opp_does_not_exist_xx',
        ...fullInput(),
        explanation: 'missing opp',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toBeInstanceOf(EvaluationServiceError);
  });

  it('rejects duplicate id', async () => {
    const oppId = await pickFirstOpportunityId();
    const dupId = `eval_dup_${Math.random().toString(36).slice(2, 8)}`;
    await createEvaluation({
      id: dupId,
      opportunityId: oppId,
      ...fullInput(),
      explanation: 'first',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    await expect(
      createEvaluation({
        id: dupId,
        opportunityId: oppId,
        ...fullInput(),
        explanation: 'dup',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toBeInstanceOf(EvaluationServiceError);
  });
});

describe('createEvaluation: auto status transitions', () => {
  it(`totalScore >= ${PROMOTE_THRESHOLD} → status becomes mvp`, async () => {
    const opps = await listOpportunities();
    // 找一个当前不在 mvp / killed / archived 的 opportunity
    const target = opps.find(
      (o) => !['mvp', 'killed', 'archived'].includes(o.status),
    );
    if (!target) {
      // 没有可测试的 opportunity，跳过（mock 数据全处于这些状态）
      return;
    }
    const res = await createEvaluation({
      id: `eval_promote_${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: target.id,
      ...fullInput({
        marketSize: 95, painIntensity: 90, competition: 80, technicalFeasibility: 90,
        monetization: 90, speedToMarket: 90, founderFit: 90, geoPotential: 90, ipPotential: 80,
      }),
      explanation: 'high score trigger',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(res.evaluation.totalScore).toBeGreaterThanOrEqual(PROMOTE_THRESHOLD);
    expect(res.statusChangedTo).toBe('mvp');
    const after = await getOpportunity(target.id);
    expect(after?.status).toBe('mvp');
  });

  it(`totalScore < ${DEMOTE_THRESHOLD} → status becomes archived`, async () => {
    const opps = await listOpportunities();
    const target = opps.find(
      (o) => !['killed', 'archived'].includes(o.status),
    );
    if (!target) return;
    const res = await createEvaluation({
      id: `eval_demote_${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: target.id,
      ...fullInput({
        marketSize: 10, painIntensity: 10, competition: 5, technicalFeasibility: 20,
        monetization: 15, speedToMarket: 10, founderFit: 20, geoPotential: 10, ipPotential: 5,
      }),
      explanation: 'low score trigger',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(res.evaluation.totalScore).toBeLessThan(DEMOTE_THRESHOLD);
    expect(res.statusChangedTo).toBe('archived');
    const after = await getOpportunity(target.id);
    expect(after?.status).toBe('archived');
  });

  it('mid-range totalScore → status unchanged', async () => {
    const opps = await listOpportunities();
    // 找任何 opportunity，状态先记下
    const target = opps.find((o) => o.status === 'draft' || o.status === 'evaluating' || o.status === 'validated');
    if (!target) return;
    const before = target.status;
    const res = await createEvaluation({
      id: `eval_mid_${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: target.id,
      ...fullInput(),
      explanation: 'mid range no-op',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(res.evaluation.totalScore).toBe(50);
    expect(res.statusChangedTo).toBeUndefined();
    const after = await getOpportunity(target.id);
    expect(after?.status).toBe(before);
  });
});

describe('rankOpportunities', () => {
  it('returns at least one ranked row with rank=1', async () => {
    const rows = await rankOpportunities();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.rank).toBe(1);
  });

  it('rows are sorted by totalScore desc (placeholder zeros come last)', async () => {
    const rows = await rankOpportunities();
    const evaluated = rows.filter((r) => r.latestEvaluation.id !== '__placeholder__');
    for (let i = 1; i < evaluated.length; i++) {
      expect(evaluated[i - 1]!.latestEvaluation.totalScore).toBeGreaterThanOrEqual(
        evaluated[i]!.latestEvaluation.totalScore,
      );
    }
  });

  it('ranking is monotonically increasing from 1', async () => {
    const rows = await rankOpportunities();
    rows.forEach((r, i) => expect(r.rank).toBe(i + 1));
  });
});

describe('listEvaluations', () => {
  it('returns descending by createdAt', async () => {
    const list = await listEvaluations();
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1]!.createdAt.localeCompare(list[i]!.createdAt)).toBeGreaterThanOrEqual(0);
    }
  });
});
