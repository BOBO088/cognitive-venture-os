import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('合并 className', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('忽略 falsy 值', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('去重 tailwind 冲突类', () => {
    // 后写的覆盖前写的
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
