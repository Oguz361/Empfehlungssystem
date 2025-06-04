import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Percentage formatting
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Mastery score to color
export function getMasteryColor(score: number): string {
  if (score >= 0.8) return "text-green-600";
  if (score >= 0.6) return "text-yellow-600";
  if (score >= 0.4) return "text-orange-600";
  return "text-red-600";
}

// Difficulty to color
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "sehr_einfach":
      return "text-green-600";
    case "einfach":
      return "text-green-500";
    case "mittel":
      return "text-yellow-600";
    case "schwer":
      return "text-orange-600";
    case "sehr_schwer":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}