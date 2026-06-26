'use client';

/**
 * PRDForm — edit PRD.
 *
 * 9 个 text section 全部用 textarea（service 只做长度校验，不解析结构）。
 * 提交走 server action；UI 不直接调 service。
 */
import { Button } from '@/components/ui/Button';
import type { PRD } from '@/types';

interface Props {
  initial: PRD;
  submitLabel: string;
  formAction: (formData: FormData) => Promise<void>;
  formId?: string;
}

const FIELDS: Array<{
  name: keyof Pick<
    PRD,
    | 'productPositioning'
    | 'targetUsers'
    | 'corePainPoints'
    | 'mvpFeatureScope'
    | 'pageStructure'
    | 'dataModel'
    | 'apiDesign'
    | 'acceptanceCriteria'
    | 'devPlan'
  >;
  label: string;
  hint: string;
  rows: number;
}> = [
  {
    name: 'productPositioning',
    label: '1. 产品定位',
    hint: '一段话讲清楚产品是什么、为谁做、与既有方案的差异。',
    rows: 6,
  },
  {
    name: 'targetUsers',
    label: '2. 目标用户',
    hint: '主 ICP / 次 ICP / 反 ICP。',
    rows: 6,
  },
  {
    name: 'corePainPoints',
    label: '3. 核心痛点',
    hint: '目标用户当前的 3 个核心痛点，最好量化。',
    rows: 6,
  },
  {
    name: 'mvpFeatureScope',
    label: '4. MVP 功能范围',
    hint: 'Must / Should / Won\'t-have 三段式，markdown 列表 / 表格。',
    rows: 10,
  },
  {
    name: 'pageStructure',
    label: '5. 页面结构',
    hint: 'route + 用途 + 关键组件 表格。',
    rows: 10,
  },
  {
    name: 'dataModel',
    label: '6. 数据模型',
    hint: '核心 entity + 关系，markdown 列表 / 表格。',
    rows: 10,
  },
  {
    name: 'apiDesign',
    label: '7. API 设计',
    hint: 'endpoint 列表 (Method / Path / 用途)。',
    rows: 8,
  },
  {
    name: 'acceptanceCriteria',
    label: '8. 验收标准',
    hint: '功能 / 质量 / 业务 三个维度。',
    rows: 8,
  },
  {
    name: 'devPlan',
    label: '9. 7 天开发计划',
    hint: 'Day 1..7 + tasks。',
    rows: 10,
  },
];

export function PRDForm({ initial, submitLabel, formAction, formId }: Props) {
  return (
    <form
      id={formId}
      action={formAction}
      className="flex flex-col gap-4 max-w-3xl"
    >
      <input type="hidden" name="id" value={initial.id} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-xs text-muted">
          Title <span className="text-danger">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={initial.title}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          placeholder="e.g. PRD for GEO Pulse"
        />
      </div>

      {FIELDS.map((f) => (
        <div key={f.name} className="flex flex-col gap-1.5">
          <label htmlFor={f.name} className="text-xs text-muted">
            {f.label} <span className="text-danger">*</span>
          </label>
          <p className="text-[10px] text-muted -mt-0.5">{f.hint}</p>
          <textarea
            id={f.name}
            name={f.name}
            required
            minLength={1}
            maxLength={20000}
            rows={f.rows}
            defaultValue={initial[f.name]}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none font-mono"
          />
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
