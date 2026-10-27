"use client";
import { useToast } from "@/components/Toast";
import { Button, Input, Modal, Textarea } from "@/components/ui";
import {
  IconDeviceFloppy,
  IconEdit,
  IconKey,
  IconLayoutGrid,
  IconMail,
  IconNote,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUser,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminBody from "../AdminBody";

type Role = "user" | "admin" | "superadmin";

const ROLE_COLORS: Record<Role, string> = {
  superadmin: "var(--err)",
  admin: "var(--accent)",
  user: "var(--bg3)",
};

type AppUser = {
  id: string;
  accountname: string;
  email: string | null;
  firstname: string;
  lastname: string;
  role: Role;
  note?: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  id?: string;
  accountname: string;
  email: string;
  firstname: string;
  lastname: string;
  password: string;
  role: Role;
  note: string;
};

const emptyForm: FormState = {
  accountname: "",
  email: "",
  firstname: "",
  lastname: "",
  password: "",
  role: "user",
  note: "",
};

function formatTime(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("vi-VN", { hour12: false });
}

export default function UsersManager() {
  const toast = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<AppUser | null>(null);
  const [confirmReset, setConfirmReset] = useState<AppUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setUsers(j.users);
      else toast(j.error || "Lỗi tải");
    } catch (e) {
      toast(String(e));
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => users, [users]);
  const isEdit = !!form?.id;

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? {
            id: form.id,
            firstname: form.firstname,
            lastname: form.lastname,
            email: form.email,
            password: form.password || undefined,
            role: form.role,
            note: form.note,
          }
        : form;
      const r = await fetch("/api/admin/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) {
        toast(j.error || "Lỗi lưu");
        return;
      }
      toast(isEdit ? "Đã cập nhật" : "Đã tạo");
      setForm(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!confirmReset) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: confirmReset.id }),
      });
      const j = await r.json();
      if (!j.ok) {
        toast(j.error || "Lỗi reset");
        return;
      }
      toast(`Đã gửi mật khẩu mới tới ${j.sentTo}`);
      setConfirmReset(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDel) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/users?id=${confirmDel.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) {
        toast(j.error || "Lỗi xoá");
        return;
      }
      toast("Đã xoá");
      setConfirmDel(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
        { label: "Users", icon: <IconUsers size={13} stroke={1.8} />, current: true },
      ]}
      search={{ value: q, onChange: setQ, placeholder: "Tìm theo tên tài khoản, họ tên…" }}
      title="Quản lý Users"
      description={`${users.length} tài khoản`}
      titleActions={
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" leftIcon={<IconRefresh size={14} />} onClick={load} disabled={loading}>
            Tải lại
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<IconPlus size={14} />}
            onClick={() => setForm({ ...emptyForm })}
          >
            Thêm user
          </Button>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
        {filtered.map((u) => (
          <div
            key={u.id}
            style={{
              background: "var(--fx-card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--bg3)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <IconUser size={16} stroke={1.7} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.firstname} {u.lastname}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, fontFamily: "var(--font-mono, monospace)" }}>@{u.accountname}</div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: ROLE_COLORS[u.role] ?? "var(--bg3)",
                  color: u.role === "user" ? "var(--text)" : "#fff",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  flexShrink: 0,
                }}
              >
                {u.role}
              </span>
            </div>
            {u.email && (
              <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, opacity: 0.8, overflow: "hidden" }}>
                <IconMail size={12} stroke={1.7} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</span>
              </div>
            )}
            {u.note && (
              <div
                style={{
                  fontSize: 12,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 4,
                  opacity: 0.85,
                  background: "var(--bg3)",
                  padding: "6px 8px",
                  borderRadius: 6,
                  lineHeight: 1.4,
                }}
              >
                <IconNote size={12} stroke={1.7} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{u.note}</span>
              </div>
            )}
            <div style={{ fontSize: 11, opacity: 0.6 }}>Tạo: {formatTime(u.created_at)}</div>
            <div style={{ display: "flex", gap: 6, marginTop: "auto", flexWrap: "wrap" }}>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<IconEdit size={13} />}
                onClick={() =>
                  setForm({
                    id: u.id,
                    accountname: u.accountname,
                    email: u.email ?? "",
                    firstname: u.firstname,
                    lastname: u.lastname,
                    password: "",
                    role: u.role,
                    note: u.note ?? "",
                  })
                }
                style={{ flex: 1 }}
              >
                Sửa
              </Button>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<IconKey size={13} />}
                onClick={() => setConfirmReset(u)}
                disabled={!u.email}
                title={u.email ? "Gửi mật khẩu mới qua email" : "User chưa có email"}
              >
                Reset
              </Button>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<IconTrash size={13} />}
                onClick={() => setConfirmDel(u)}
                style={{ color: "var(--err)" }}
              >
                Xoá
              </Button>
            </div>
          </div>
        ))}
        {!loading && !filtered.length && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 32, opacity: 0.6 }}>Chưa có user nào.</div>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={isEdit ? "Sửa user" : "Thêm user"}>
        {form && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input
                placeholder="Họ"
                value={form.firstname}
                onChange={(e) => setForm({ ...form, firstname: e.target.value })}
              />
              <Input
                placeholder="Tên"
                value={form.lastname}
                onChange={(e) => setForm({ ...form, lastname: e.target.value })}
              />
            </div>
            <Input
              placeholder="Tên tài khoản"
              value={form.accountname}
              onChange={(e) => setForm({ ...form, accountname: e.target.value })}
              disabled={isEdit}
            />
            <Input
              type="email"
              placeholder="Email (để nhận mật khẩu reset)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              type="password"
              placeholder={isEdit ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu (≥ 6 ký tự)"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Vai trò</label>
              <div style={{ display: "flex", gap: 6 }}>
                {(["user", "admin", "superadmin"] as Role[]).map((r) => {
                  const active = form.role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className="fx-btn"
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        background: active ? ROLE_COLORS[r] : "var(--bg3)",
                        color: active ? "#fff" : "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, opacity: 0.65 }}>
                {form.role === "superadmin"
                  ? "Superadmin: toàn quyền tuyệt đối, không bị giới hạn bởi cấu hình tool trong /admin."
                  : form.role === "admin"
                  ? "Admin: vào được panel quản trị, chỉ truy cập các tool được chọn trong /admin."
                  : "User: chỉ xem các tool được cho phép, không vào được admin."}
              </div>
            </div>
            <Textarea
              placeholder="Ghi chú về user (nội bộ)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <Button variant="ghost" size="sm" leftIcon={<IconX size={14} />} onClick={() => setForm(null)}>
                Huỷ
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<IconDeviceFloppy size={14} />}
                onClick={save}
                disabled={busy}
              >
                Lưu
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!confirmReset} onClose={() => setConfirmReset(null)} title="Reset mật khẩu">
        {confirmReset && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              Tạo mật khẩu mới cho <b>@{confirmReset.accountname}</b> và gửi tới{" "}
              <b>{confirmReset.email}</b>?
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                Mật khẩu cũ sẽ không còn dùng được.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(null)}>
                Huỷ
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<IconKey size={14} />}
                onClick={resetPassword}
                disabled={busy}
              >
                Gửi mật khẩu mới
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Xác nhận xoá">
        {confirmDel && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 14 }}>
              Xoá user <b>@{confirmDel.accountname}</b> ({confirmDel.firstname} {confirmDel.lastname})?
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDel(null)}>
                Huỷ
              </Button>
              <Button variant="danger" size="sm" leftIcon={<IconTrash size={14} />} onClick={remove} disabled={busy}>
                Xoá
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminBody>
  );
}
