'use client';

/**
 * BrandEntityProfileForm — create / edit brand entity profile.
 *
 * 10 个字段：
 *   必填: name / description / category / targetAudience
 *   自由文本列表（textarea, 一行一项）:
 *     competitors / keyClaims / proofPoints
 *   链接（textarea, 一行一项, 必须是 http(s) URL）:
 *     officialLinks
 *   引用 ID 列表（textarea, 一行一项）+ 下方"Available"参考列表:
 *     relatedProjectIds (MVPProject) / relatedEntityIds (GraphEntity)
 *
 * ID 列表用 textarea 而非 multi-select 是为了与同模块其它 list 字段保持一致，
 * 也便于一次性粘贴多个 ID。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import {
  BRAND_ENTITY_CATEGORIES,
  BRAND_ENTITY_CATEGORY_LABEL,
} from '@/types';
import type {
  BrandEntityProfile,
  MVPProject,
  GraphEntity,
} from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';
const sectionHeaderClass =
  'text-[11px] uppercase tracking-wider text-muted font-medium border-b border-border pb-1';

function listToTextarea(items: string[] | undefined): string {
  return (items ?? []).join('\n');
}

function textareaToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface Props {
  initial?: BrandEntityProfile;
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  /** create 模式用：?projectId=&entityId= 预填引用列。 */
  defaultProjectIds?: string[];
  defaultEntityIds?: string[];
  /** 给"Available"参考列表用。 */
  mvpProjects: MVPProject[];
  graphEntities: GraphEntity[];
  onDelete?: () => Promise<void>;
}

export function BrandEntityProfileForm({
  initial,
  onSubmit,
  mode,
  defaultProjectIds,
  defaultEntityIds,
  mvpProjects,
  graphEntities,
  onDelete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // 把 textarea 的多行字符串转成数组再塞回 FormData
    data.set('competitors', JSON.stringify(textareaToList((data.get('competitors') as string) ?? '')));
    data.set('keyClaims', JSON.stringify(textareaToList((data.get('keyClaims') as string) ?? '')));
    data.set('proofPoints', JSON.stringify(textareaToList((data.get('proofPoints') as string) ?? '')));
    data.set('officialLinks', JSON.stringify(textareaToList((data.get('officialLinks') as string) ?? '')));
    data.set(
      'relatedProjectIds',
      JSON.stringify(textareaToList((data.get('relatedProjectIds') as string) ?? '')),
    );
    data.set(
      'relatedEntityIds',
      JSON.stringify(textareaToList((data.get('relatedEntityIds') as string) ?? '')),
    );

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
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this brand profile?')
    ) {
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

  const initialProjectIds = initial?.relatedProjectIds ?? defaultProjectIds ?? [];
  const initialEntityIds = initial?.relatedEntityIds ?? defaultEntityIds ?? [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-4xl">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="flex flex-col gap-3">
        <div className={sectionHeaderClass}>1. Identity</div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className={labelClass}>
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={200}
              defaultValue={initial?.name ?? ''}
              placeholder="e.g. Cognitive Venture OS"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="category" className={labelClass}>
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="category"
              name="category"
              required
              defaultValue={initial?.category ?? 'product'}
              className={inputClass}
            >
              {BRAND_ENTITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {BRAND_ENTITY_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className={labelClass}>
            Description <span className="text-danger">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            maxLength={4000}
            defaultValue={initial?.description ?? ''}
            placeholder="1-2 段: 是什么 / 为谁 / 解决什么"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="targetAudience" className={labelClass}>
            Target audience <span className="text-danger">*</span>
          </label>
          <textarea
            id="targetAudience"
            name="targetAudience"
            required
            rows={2}
            maxLength={1000}
            defaultValue={initial?.targetAudience ?? ''}
            placeholder="谁会用？"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionHeaderClass}>2. Positioning</div>

        <div className="flex flex-col gap-1">
          <label htmlFor="competitors" className={labelClass}>
            Competitors (one per line, ≤ 20)
          </label>
          <textarea
            id="competitors"
            name="competitors"
            rows={3}
            defaultValue={listToTextarea(initial?.competitors)}
            placeholder={'Profound\nOtterly\nScrunch'}
            className={inputClass + ' font-mono text-xs'}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="keyClaims" className={labelClass}>
              Key claims (one per line, ≤ 20)
            </label>
            <textarea
              id="keyClaims"
              name="keyClaims"
              rows={4}
              defaultValue={listToTextarea(initial?.keyClaims)}
              placeholder={'我们对外讲的最关键的 3-5 个 claim'}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="proofPoints" className={labelClass}>
              Proof points (one per line, ≤ 20)
            </label>
            <textarea
              id="proofPoints"
              name="proofPoints"
              rows={4}
              defaultValue={listToTextarea(initial?.proofPoints)}
              placeholder={'每个 claim 背后的数据 / 案例'}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="officialLinks" className={labelClass}>
            Official links (one per line, http/https URL, ≤ 20)
          </label>
          <textarea
            id="officialLinks"
            name="officialLinks"
            rows={3}
            defaultValue={listToTextarea(initial?.officialLinks)}
            placeholder={'https://example.com\nhttps://github.com/example/x'}
            className={inputClass + ' font-mono text-xs'}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className={sectionHeaderClass}>3. Cross-links</div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="relatedProjectIds" className={labelClass}>
              MVP Project IDs (one per line)
            </label>
            <textarea
              id="relatedProjectIds"
              name="relatedProjectIds"
              rows={3}
              defaultValue={listToTextarea(initialProjectIds)}
              placeholder={'mvp_xxx'}
              className={inputClass + ' font-mono text-xs'}
            />
            <details className="text-[10px] text-muted">
              <summary className="cursor-pointer hover:text-text">
                Available MVP projects ({mvpProjects.length})
              </summary>
              <ul className="mt-1 ml-3 flex flex-col gap-0.5 font-mono text-[10px] max-h-40 overflow-auto">
                {mvpProjects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const ta = document.getElementById(
                          'relatedProjectIds',
                        ) as HTMLTextAreaElement | null;
                        if (!ta) return;
                        if (ta.value.split('\n').map((s) => s.trim()).includes(p.id)) return;
                        ta.value = ta.value
                          ? `${ta.value.replace(/\n+$/, '')}\n${p.id}`
                          : p.id;
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                      }}
                      className="hover:text-accent text-left"
                    >
                      {p.id} — {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="relatedEntityIds" className={labelClass}>
              Graph Entity IDs (one per line)
            </label>
            <textarea
              id="relatedEntityIds"
              name="relatedEntityIds"
              rows={3}
              defaultValue={listToTextarea(initialEntityIds)}
              placeholder={'entity_xxx'}
              className={inputClass + ' font-mono text-xs'}
            />
            <details className="text-[10px] text-muted">
              <summary className="cursor-pointer hover:text-text">
                Available Graph entities ({graphEntities.length})
              </summary>
              <ul className="mt-1 ml-3 flex flex-col gap-0.5 font-mono text-[10px] max-h-40 overflow-auto">
                {graphEntities.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const ta = document.getElementById(
                          'relatedEntityIds',
                        ) as HTMLTextAreaElement | null;
                        if (!ta) return;
                        if (ta.value.split('\n').map((s) => s.trim()).includes(e.id)) return;
                        ta.value = ta.value
                          ? `${ta.value.replace(/\n+$/, '')}\n${e.id}`
                          : e.id;
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                      }}
                      className="hover:text-accent text-left"
                    >
                      {e.id} — {e.name}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
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
              ? 'Save brand profile'
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
