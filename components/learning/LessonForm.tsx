'use client';

/**
 * LessonForm — create / edit lesson.
 *
 * 11 个字段：2 个 select（projectId / launchResultId） + 9 个 textarea。
 * 9 个文本字段分 3 段：Outcome (3) / Insights (4) / Action (2)。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type { LessonLearned, MVPProject, LaunchResult } from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent font-mono';
const labelClass = 'text-xs uppercase tracking-wider text-muted';
const sectionHeaderClass =
  'text-[11px] uppercase tracking-wider text-muted font-medium border-b border-border pb-1';

interface Props {
  initial?: LessonLearned;
  /** 提交到 server action 的回调。 */
  onSubmit: (formData: FormData) => Promise<void>;
  /** create 或 edit 模式。 */
  mode: 'create' | 'edit';
  /** 可选 MVP 项目列表。 */
  mvpProjects: MVPProject[];
  /** 全部 launch result（按 mvpProjectId 过滤后供用户挑）。 */
  launchResults: LaunchResult[];
  /** 仅 create 模式：URL ?projectId= 透传。 */
  defaultProjectId?: string;
  /** 仅 create 模式：URL ?launchId= 透传，初始预选 linked launch。 */
  defaultLaunchResultId?: string;
  /** 删除回调，仅 edit 模式使用。 */
  onDelete?: () => Promise<void>;
}

export function LessonForm({
  initial,
  onSubmit,
  mode,
  mvpProjects,
  launchResults,
  defaultProjectId,
  defaultLaunchResultId,
  onDelete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (mode === 'create' && !data.get('projectId')) {
      setError('MVP project is required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this lesson?')) {
      return;
    }
    startTransition(async () => {
      try {
        await onDelete();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    });
  };

  // 优先级：URL ?projectId= > initial.projectId > 第一个 mvp
  const initialProjectId =
    defaultProjectId ?? initial?.projectId ?? mvpProjects[0]?.id ?? '';
  const [projectFilter, setProjectFilter] = useState(initialProjectId);
  const filteredLaunches = launchResults.filter(
    (l) => l.mvpProjectId === projectFilter,
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-3xl">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="projectId" className={labelClass}>
            MVP project <span className="text-danger">*</span>
          </label>
          <select
            id="projectId"
            name="projectId"
            required
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
          >
            <option value="" disabled>— pick an MVP project —</option>
            {mvpProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.stage}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="launchResultId" className={labelClass}>
            Linked launch (optional)
          </label>
          <select
            id="launchResultId"
            name="launchResultId"
            defaultValue={
              initial?.launchResultId ?? defaultLaunchResultId ?? ''
            }
            className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
          >
            <option value="">— none —</option>
            {filteredLaunches.map((l) => (
              <option key={l.id} value={l.id}>
                {l.launchDate} · {l.resultStatus} · {l.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionHeaderClass}>1. Outcome</div>

        <div className="flex flex-col gap-1">
          <label htmlFor="whatWorked" className={labelClass}>
            What worked <span className="text-danger">*</span>
          </label>
          <textarea
            id="whatWorked"
            name="whatWorked"
            required
            rows={4}
            defaultValue={initial?.whatWorked ?? ''}
            placeholder="哪些做法有效？可量化的具体行为 + 效果。"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="whatFailed" className={labelClass}>
            What failed <span className="text-danger">*</span>
          </label>
          <textarea
            id="whatFailed"
            name="whatFailed"
            required
            rows={4}
            defaultValue={initial?.whatFailed ?? ''}
            placeholder="哪些做法没生效？症状 + 影响面。"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="why" className={labelClass}>
            Why (causal reasoning) <span className="text-danger">*</span>
          </label>
          <textarea
            id="why"
            name="why"
            required
            rows={4}
            defaultValue={initial?.why ?? ''}
            placeholder="成功 / 失败背后的因果推断：哪些假设成立？哪些错位？"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionHeaderClass}>2. Insights (4 axes)</div>

        <div className="flex flex-col gap-1">
          <label htmlFor="customerInsight" className={labelClass}>
            Customer insight <span className="text-danger">*</span>
          </label>
          <textarea
            id="customerInsight"
            name="customerInsight"
            required
            rows={3}
            defaultValue={initial?.customerInsight ?? ''}
            placeholder="客户在用什么语言、卡在哪、怎么对比替代品。"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="marketInsight" className={labelClass}>
            Market insight <span className="text-danger">*</span>
          </label>
          <textarea
            id="marketInsight"
            name="marketInsight"
            required
            rows={3}
            defaultValue={initial?.marketInsight ?? ''}
            placeholder="竞品、监管、宏观趋势的影响。"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="productInsight" className={labelClass}>
            Product insight <span className="text-danger">*</span>
          </label>
          <textarea
            id="productInsight"
            name="productInsight"
            required
            rows={3}
            defaultValue={initial?.productInsight ?? ''}
            placeholder="功能 / UX / 技术债的影响。"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="geoInsight" className={labelClass}>
            GEO insight <span className="text-danger">*</span>
          </label>
          <textarea
            id="geoInsight"
            name="geoInsight"
            required
            rows={3}
            defaultValue={initial?.geoInsight ?? ''}
            placeholder="AI 搜索 / 答案引擎的可见度、引用位次、内容形态。"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionHeaderClass}>3. Action</div>

        <div className="flex flex-col gap-1">
          <label htmlFor="nextAction" className={labelClass}>
            Next action <span className="text-danger">*</span>
          </label>
          <textarea
            id="nextAction"
            name="nextAction"
            required
            rows={4}
            defaultValue={initial?.nextAction ?? ''}
            placeholder="下周具体行动：人 / 时限 / 验证方式。"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="scoreModelSuggestion" className={labelClass}>
            Score model suggestion <span className="text-danger">*</span>
          </label>
          <textarea
            id="scoreModelSuggestion"
            name="scoreModelSuggestion"
            required
            rows={4}
            defaultValue={initial?.scoreModelSuggestion ?? ''}
            placeholder="OpportunityEvaluation 9 维度的权重 / 阈值调整建议。"
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <div className="rounded border border-danger text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Create lesson'
              : 'Save changes'}
        </Button>
        {mode === 'edit' && onDelete && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={handleDelete}
            className="text-danger"
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
