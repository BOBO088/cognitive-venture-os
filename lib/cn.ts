import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 合并 className，clsx 负责条件 + tailwind-merge 负责去重。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
