"use client";
import { useToast } from "@/components/Toast";
import { IconAlertCircle, IconLoader2, IconLock, IconShieldLock, IconUser } from "@tabler/icons-react";
import { useState } from "react";
import "./admin.css";

export default function AdminLogin() {
  const [accountname, setAccountname] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountname, password: pw }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && j.ok) {
      toast("Đăng nhập thành công");
      window.location.href = "/admin";
    } else {
      const msg = j?.error || "Đăng nhập thất bại";
      setErr(msg);
      toast(msg);
    }
  }

  return (
    <div className="fx-scope fx-login" aria-busy={busy}>
      <form className={`fx-login-card${busy ? " is-busy" : ""}`} onSubmit={submit}>
        {busy && <div className="fx-login-progress" aria-hidden="true" />}
        <div className="fx-login-brand">
          <span className="dot">
            <IconShieldLock size={20} stroke={2} />
          </span>
          <span>FormatBox</span>
          <span className="fx-login-tag">Admin</span>
        </div>
        <div className="fx-login-sub">Khu vực quản trị — đăng nhập bằng tài khoản admin</div>
        <div className="fx-login-field">
          <IconUser size={16} stroke={1.8} />
          <input
            className="fx-input"
            type="text"
            value={accountname}
            onChange={(e) => setAccountname(e.target.value)}
            placeholder="Tên tài khoản"
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="fx-login-field">
          <IconLock size={16} stroke={1.8} />
          <input
            className="fx-input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Mật khẩu"
            autoComplete="current-password"
          />
        </div>
        {err && (
          <div className="fx-err">
            <IconAlertCircle size={14} stroke={2} />
            {err}
          </div>
        )}
        <button type="submit" disabled={busy || !pw || !accountname} className="fx-btn fx-btn-primary fx-btn-lg">
          {busy ? (
            <>
              <IconLoader2 size={16} stroke={2.4} className="spin" />
              <span>Đang xác thực…</span>
            </>
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>
    </div>
  );
}
