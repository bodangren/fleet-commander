import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges clsx and tailwind classes
 * @param inputs - class values to merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
