"use client";

import { useSyncExternalStore } from "react";

const KEY = "fb-blog-saved";
// The `storage` event only fires in other tabs; this one covers the current tab.
const CHANGE_EVENT = "fb-blog-saved-change";
const EMPTY: string[] = [];

let cachedRaw: string | null = null;
let cachedList = EMPTY;

function getSnapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : EMPTY;
      cachedList = Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      cachedList = EMPTY;
    }
  }
  return cachedList;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useSavedSlugs(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

// Returns whether the post ends up saved.
export function toggleSavedPost(slug: string): boolean {
  const list = getSnapshot();
  const wasSaved = list.includes(slug);
  const next = wasSaved ? list.filter((s) => s !== slug) : [...list, slug];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return wasSaved;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return !wasSaved;
}
