"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  IconArrowUp,
  IconMessageDots,
  IconX,
  IconPaperclip,
  IconSend,
  IconLoader2,
  IconCheck,
} from "@tabler/icons-react";

const FEEDBACK_ENDPOINT = "/api/feedback";

export default function ScrollTop() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setContent("");
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
  };

  const closeModal = () => {
    setOpen(false);
    setTimeout(resetForm, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    if (!name.trim() || !email.trim() || !content.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ Tên, Email và Nội dung.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrorMsg("");

    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("email", email);
      fd.append("message", content);
      if (file) fd.append("attachment", file);

      const res = await fetch(FEEDBACK_ENDPOINT, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus("success");
      setTimeout(() => {
        closeModal();
      }, 1800);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Gửi thất bại, vui lòng thử lại.");
    }
  };

  return (
    <>
      <div className="floating-actions">
        {!isAdmin && (
          <button
            className="floating-btn feedback-btn-fab show"
            aria-label="Liên hệ góp ý"
            title="Liên hệ góp ý"
            onClick={() => setOpen(true)}
          >
            <IconMessageDots size={20} stroke={2} />
          </button>
        )}
        <button
          className={`floating-btn scroll-top${show ? " show" : ""}`}
          aria-label="Về đầu trang"
          title="Về đầu trang"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <IconArrowUp size={18} stroke={2} />
        </button>
      </div>

      {open && (
        <div className="feedback-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-header">
              <h3>Liên hệ góp ý</h3>
              <button className="feedback-close" onClick={closeModal} aria-label="Đóng">
                <IconX size={18} stroke={2} />
              </button>
            </div>

            <form className="feedback-body" onSubmit={handleSubmit}>
              <label className="feedback-field">
                <span>Tên của bạn <em>*</em></span>
                <input
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                  disabled={status === "sending" || status === "success"}
                />
              </label>

              <label className="feedback-field">
                <span>Email <em>*</em></span>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={status === "sending" || status === "success"}
                />
              </label>

              <label className="feedback-field">
                <span>Nội dung góp ý <em>*</em></span>
                <textarea
                  name="message"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Chia sẻ góp ý của bạn..."
                  rows={5}
                  required
                  disabled={status === "sending" || status === "success"}
                />
              </label>

              <label className="feedback-field feedback-file">
                <span>File đính kèm</span>
                <div className="feedback-file-picker">
                  <label className="feedback-file-btn">
                    <IconPaperclip size={16} stroke={2} />
                    <span>{file ? "Đổi file" : "Chọn file"}</span>
                    <input
                      name="attachment"
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      disabled={status === "sending" || status === "success"}
                      hidden
                    />
                  </label>
                  {file && (
                    <span className="feedback-file-name" title={file.name}>
                      {file.name}
                    </span>
                  )}
                </div>
              </label>

              {status === "error" && errorMsg && (
                <div className="feedback-alert error">{errorMsg}</div>
              )}
              {status === "success" && (
                <div className="feedback-alert success">
                  <IconCheck size={16} stroke={2.4} /> Đã gửi góp ý. Cảm ơn bạn!
                </div>
              )}

              <div className="feedback-actions">
                <button
                  type="button"
                  className="feedback-btn ghost"
                  onClick={closeModal}
                  disabled={status === "sending"}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="feedback-btn primary"
                  disabled={status === "sending" || status === "success"}
                >
                  {status === "sending" ? (
                    <>
                      <IconLoader2 size={16} stroke={2.2} className="spin" /> Đang gửi...
                    </>
                  ) : (
                    <>
                      <IconSend size={16} stroke={2.2} /> Gửi góp ý
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
