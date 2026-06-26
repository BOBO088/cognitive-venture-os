'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type {
  ResearchCard,
  ResearchTopic,
  SourceItem,
} from '@/types';
import {
  generateCardDraftAction,
  createCardFromSourceAction,
  createCardFromTopicAction,
} from '@/app/research/cards/actions';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: ResearchCard;
  topics: ResearchTopic[];
  sources: SourceItem[];
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  onDelete?: () => Promise<void>;
}

function arrayToMultiline(arr: string[] | undefined): string {
  return (arr ?? []).join('\n');
}

function arrayToCsv(arr: string[] | undefined): string {
  return (arr ?? []).join(', ');
}

type GenMode = 'blank' | 'from-source' | 'from-topic';

export function CardForm({ initial, topics, sources, onSubmit, mode, onDelete }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [genMode, setGenMode] = useState<GenMode>('blank');
  const [genSourceId, setGenSourceId] = useState<string>('');
  const [genTopicId, setGenTopicId] = useState<string>('');
  const [draftApplied, setDraftApplied] = useState(false);
  const [oneClickBusy, setOneClickBusy] = useState(false);

  /** 用 AI 草稿预填表单字段。 */
  const handleGenerate = () => {
    setError(null);
    if (genMode === 'from-source' && !genSourceId) {
      setError('Pick a source first.');
      return;
    }
    if (genMode === 'from-topic' && !genTopicId) {
      setError('Pick a topic first.');
      return;
    }
    startTransition(async () => {
      try {
        const draft =
          genMode === 'from-source'
            ? await generateCardDraftAction({ sourceId: genSourceId })
            : await generateCardDraftAction({ topicId: genTopicId });
        if (!draft) {
          setError('Generation returned no draft.');
          return;
        }
        // 写入表单字段
        const form = document.querySelector<HTMLFormElement>('form[data-card-form]');
        if (!form) return;
        const setVal = (name: string, value: string) => {
          const el = form.elements.namedItem(name);
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.value = value;
          }
        };
        setVal('title', draft.title);
        setVal('summary', draft.summary);
        setVal('keyInsights', draft.keyInsights.join('\n'));
        setVal('evidence', draft.evidence.join('\n'));
        setVal('risks', draft.risks.join('\n'));
        setVal('tags', draft.tags.join(', '));
        setVal('score', String(draft.score));
        if (genMode === 'from-source' && genSourceId) {
          setVal('sourceIds', genSourceId);
          // 顺便设置 topicId
          const source = sources.find((s) => s.id === genSourceId);
          if (source?.topicId) {
            setVal('topicId', source.topicId);
            setGenTopicId(source.topicId);
          }
        }
        if (genMode === 'from-topic' && genTopicId) {
          setVal('topicId', genTopicId);
        }
        setDraftApplied(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
      }
    });
  };

  /** 一步式：生成 + 立即入库 + 跳详情。 */
  const handleOneClick = () => {
    setError(null);
    if (genMode === 'from-source' && !genSourceId) {
      setError('Pick a source first.');
      return;
    }
    if (genMode === 'from-topic' && !genTopicId) {
      setError('Pick a topic first.');
      return;
    }
    setOneClickBusy(true);
    startTransition(async () => {
      try {
        let result: { id: string } | null = null;
        if (genMode === 'from-source') {
          // 一步式需要先确定 topicId：来自 source 的 topicId
          const source = sources.find((s) => s.id === genSourceId);
          const topicId = source?.topicId;
          if (!topicId) {
            setError('Source must be bound to a topic for one-click creation.');
            setOneClickBusy(false);
            return;
          }
          result = await createCardFromSourceAction({ sourceId: genSourceId, topicId });
        } else {
          result = await createCardFromTopicAction({ topicId: genTopicId, sourceIds: [] });
        }
        if (result) {
          window.location.href = `/research/cards/${result.id}`;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'One-click create failed');
        setOneClickBusy(false);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (mode === 'create' && !data.get('title')) {
      setError('Title is required.');
      return;
    }
    if (mode === 'create' && !data.get('summary')) {
      setError('Summary is required.');
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
    if (typeof window !== 'undefined' && !window.confirm('Delete this card?')) {
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

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {mode === 'create' && (
        <div className="rounded-md border border-border bg-panel-2 p-3 flex flex-col gap-2">
          <div className="text-xs font-semibold text-text">
            AI 生成（可选）
          </div>
          <div className="text-xs text-muted">
            mock LLMProvider 会基于 source / topic 生成结构化草稿。你可以预填后再修改，或点"一步式"直接生成+入库。
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-muted">
              <input
                type="radio"
                name="genMode"
                value="blank"
                checked={genMode === 'blank'}
                onChange={() => setGenMode('blank')}
                className="mr-1"
              />
              空白
            </label>
            <label className="text-xs text-muted">
              <input
                type="radio"
                name="genMode"
                value="from-source"
                checked={genMode === 'from-source'}
                onChange={() => setGenMode('from-source')}
                className="mr-1"
              />
              从 source
            </label>
            <label className="text-xs text-muted">
              <input
                type="radio"
                name="genMode"
                value="from-topic"
                checked={genMode === 'from-topic'}
                onChange={() => setGenMode('from-topic')}
                className="mr-1"
              />
              从 topic
            </label>
          </div>
          {genMode === 'from-source' && (
            <select
              value={genSourceId}
              onChange={(e) => setGenSourceId(e.target.value)}
              className={inputClass}
            >
              <option value="">— pick a source —</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          )}
          {genMode === 'from-topic' && (
            <select
              value={genTopicId}
              onChange={(e) => setGenTopicId(e.target.value)}
              className={inputClass}
            >
              <option value="">— pick a topic —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          )}
          {genMode !== 'blank' && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={handleGenerate} disabled={pending}>
                {pending ? 'Generating…' : 'Generate draft (prefill form)'}
              </Button>
              <Button type="button" variant="primary" onClick={handleOneClick} disabled={pending || oneClickBusy}>
                {oneClickBusy ? 'Creating…' : 'One-click: generate + save'}
              </Button>
            </div>
          )}
          {draftApplied && (
            <div className="text-xs text-ok">✓ Draft prefilled — review and Save below.</div>
          )}
        </div>
      )}

      <form data-card-form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className={labelClass}>Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={initial?.title}
            placeholder="一句话讲清这张卡片的结论"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="summary" className={labelClass}>Summary (核心摘要)</label>
          <textarea
            id="summary"
            name="summary"
            rows={3}
            required
            defaultValue={initial?.summary}
            placeholder="一段话说清楚这张卡片的结论"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="topicId" className={labelClass}>Topic</label>
            <select
              id="topicId"
              name="topicId"
              required
              defaultValue={initial?.topicId ?? ''}
              className={inputClass}
            >
              <option value="">— pick a topic —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="score" className={labelClass}>Score (0-100)</label>
            <input
              id="score"
              name="score"
              type="number"
              min={0}
              max={100}
              step={1}
              defaultValue={initial?.score}
              placeholder="80"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sourceIds" className={labelClass}>Source IDs (one per line)</label>
          <textarea
            id="sourceIds"
            name="sourceIds"
            rows={2}
            defaultValue={arrayToMultiline(initial?.sourceIds)}
            placeholder="src_perplexity_funding"
            className={`${inputClass} font-mono text-xs`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="keyInsights" className={labelClass}>Key insights (one per line)</label>
          <textarea
            id="keyInsights"
            name="keyInsights"
            rows={3}
            defaultValue={arrayToMultiline(initial?.keyInsights)}
            placeholder={'Insight 1\nInsight 2\nInsight 3'}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="evidence" className={labelClass}>Evidence (one per line)</label>
          <textarea
            id="evidence"
            name="evidence"
            rows={3}
            defaultValue={arrayToMultiline(initial?.evidence)}
            placeholder="支撑论点的数据 / 引用 / URL"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="risks" className={labelClass}>Risks (one per line)</label>
          <textarea
            id="risks"
            name="risks"
            rows={2}
            defaultValue={arrayToMultiline(initial?.risks)}
            placeholder="可证伪点 / 反例 / 局限"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tags" className={labelClass}>Tags (comma or newline separated)</label>
          <input
            id="tags"
            name="tags"
            type="text"
            defaultValue={arrayToCsv(initial?.tags)}
            placeholder="geo, ai-search"
            className={inputClass}
          />
        </div>

        {error && (
          <div className="rounded border border-danger text-danger text-sm px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Saving…' : mode === 'create' ? 'Create card' : 'Save changes'}
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
    </div>
  );
}
