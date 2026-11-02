"use client";

import { useEffect, useState, type ReactNode } from "react";

export type PBAction = {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  primary?: boolean;
  disabled?: boolean;
};
export type PBConfig = { active: boolean; actions: PBAction[] };

let current: PBConfig = { active: false, actions: [] };
const subs = new Set<(c: PBConfig) => void>();
let handler: ((id: string) => void) | null = null;

export function setPhotoboothMobileUI(c: PBConfig) {
  current = c;
  subs.forEach((s) => s(c));
}

export function setPhotoboothMobileHandler(h: ((id: string) => void) | null) {
  handler = h;
}

export function invokePhotoboothMobileAction(id: string) {
  if (handler) handler(id);
}

export function usePhotoboothMobileUI(): PBConfig {
  const [c, setC] = useState<PBConfig>(current);
  useEffect(() => {
    subs.add(setC);
    setC(current);
    return () => {
      subs.delete(setC);
    };
  }, []);
  return c;
}
