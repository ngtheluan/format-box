"use client";
import { useState } from "react";
import { IconAlertCircle, IconLock, IconShieldLock } from "@tabler/icons-react";
import "./admin.css";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) window.location.href = "/admin/menu";
    else setErr("Sai mật khẩu");
  }

  return (
    <div className="fb-scope fb-login">
      <form className="fb-login-card" onSubmit={submit}>
        <div className="fb-login-brand">
          <span className="dot">
            <IconShieldLock size={20} stroke={2} />
          </span>
          <span>FormatBox</span>
          <span className="fb-login-tag">Admin</span>
        </div>
        <div className="fb-login-sub">Khu vực quản trị — cần mật khẩu để tiếp tục</div>
        <div className="fb-login-field">
          <IconLock size={16} stroke={1.8} />
          <input
            className="ad-input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Mật khẩu quản trị"
            autoFocus
          />
        </div>
        {err && (
          <div className="ad-err">
            <IconAlertCircle size={14} stroke={2} />
            {err}
          </div>
        )}
        <button type="submit" disabled={busy || !pw} className="ad-btn ad-btn-primary ad-btn-lg">
          {busy ? "Đang xác thực…" : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
