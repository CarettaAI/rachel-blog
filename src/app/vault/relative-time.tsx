"use client";

const UNITS: [string, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60 * 1000) return "just now";
  for (const [unit, ms] of UNITS) {
    const val = Math.floor(diff / ms);
    if (val >= 1) return `${val} ${unit}${val > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

export function RelativeTime({ date }: { date: string }) {
  return <time dateTime={date}>{formatRelative(date)}</time>;
}
