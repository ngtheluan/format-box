"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastCtx = (msg: string) => void;
const Ctx = createContext<ToastCtx>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    // Message dài cần đọc lâu hơn — khoảng 60ms/ký tự, tối thiểu 2s, tối đa 8s.
    const ms = Math.min(8000, Math.max(2000, m.length * 60));
    timer.current = setTimeout(() => setShow(false), ms);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className={`toast${show ? " show" : ""}`}>{msg}</div>
    </Ctx.Provider>
  );
}
