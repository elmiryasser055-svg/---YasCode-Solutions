// src/lib/utils.ts
//
// دالة cn() تجمع بين classnames و tailwind-merge
// تُستخدم في كل مكونات shadcn/ui والـ Skeleton

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
