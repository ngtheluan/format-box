"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  IconArrowUp,
  IconMessageDots,
  IconX,
  IconSend,
  IconLoader2,
  IconCheck,
  IconStarFilled,
  IconStar,
  IconBug,
  IconHeartHandshake,
  IconSparkles,
  IconLink,
  IconMoodHappy,
  IconMoodNeutral,
  IconMoodSad,
  IconAlertCircle,
} from "@tabler/icons-react";

const FEEDBACK_ENDPOINT = "/api/feedback";

type Tab = "rate" | "bug";
type Helpfulness = "yes" | "partial" | "no" | null;
type SubmitStatus = "idle" | "sending" | "success" | "error";

const BUG_TYPES: { id: string; label: string }[] = [
  { id: "load", label: "Trang lỗi / không tải" },
  { id: "wrong", label: "Thông tin / kết quả sai" },
  { id: "content", label: "Nội dung / giao diện lệch" },
  { id: "action", label: "Nút hoặc chức năng không chạy" },
  { id: "other", label: "Khác" },
];

const RATING_MOODS = [
  { label: "Tệ quá", color: "#f97066" },
  { label: "Chưa ổn", color: "#f59e0b" },
  { label: "Tạm được", color: "#eab308" },
  { label: "Khá ngon", color: "#22c55e" },
  { label: "Tuyệt vời", color: "#10b981" },
];

const HELPFULNESS_LABEL: Record<Exclude<Helpfulness, null>, string> = {
  yes: "Có, xong việc",
  partial: "Một phần",
  no: "Chưa giúp được",
};

export default function ScrollTop() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("rate");

  // rating tab
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [helpfulness, setHelpfulness] = useState<Helpfulness>(null);
  const [rateMessage, setRateMessage] = useState("");

  // bug tab
  const [bugTypes, setBugTypes] = useState<string[]>([]);
  const [bugMessage, setBugMessage] = useState("");

  // shared
  const [senderName, setSenderName] = useState("");
  const [contact, setContact] = useState("");
  const [allowContact, setAllowContact] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onOpenFeedback = () => setOpen(true);
    window.addEventListener("fb:open-feedback", onOpenFeedback);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("fb:open-feedback", onOpenFeedback);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try {
      setPageUrl(window.location.pathname + window.location.search);
    } catch {}
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setHelpfulness(null);
    setRateMessage("");
    setBugTypes([]);
    setBugMessage("");
    setSenderName("");
    setContact("");
    setAllowContact(false);
    setStatus("idle");
    setErrorMsg("");
    setTab("rate");
  };

  const closeModal = () => {
    setOpen(false);
    setTimeout(resetForm, 220);
  };

  const toggleBugType = (id: string) => {
    setBugTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const displayRating = hoverRating || rating;
  const mood = displayRating > 0 ? RATING_MOODS[displayRating - 1] : null;

  const rateMax = 1000;
  const bugMax = 1000;
  const bugMessageLen = bugMessage.trim().length;
  const bugReady = bugTypes.length > 0 && bugMessageLen >= 10;
  const rateReady = rating > 0;

  const canSubmit =
    status !== "sending" && status !== "success" && (tab === "rate" ? rateReady : bugReady);

  const contactLooksLikeEmail = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()),
    [contact],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("sending");
    setErrorMsg("");

    const payload: Record<string, string> = {
      kind: tab === "rate" ? "rating" : "bug",
      pageUrl,
      senderName: senderName.trim(),
      contact: contact.trim(),
      allowContact: allowContact ? "1" : "0",
    };

    if (tab === "rate") {
      payload.rating = String(rating);
      payload.helpfulness = helpfulness || "";
      payload.content = rateMessage.trim();
    } else {
      payload.errorTypes = bugTypes.join(",");
      payload.content = bugMessage.trim();
    }

    try {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));

      const res = await fetch(FEEDBACK_ENDPOINT, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus("success");
      fireConfetti();
      setTimeout(() => {
        closeModal();
      }, 2200);
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
            aria-label="Góp ý cho Format Box"
            title="Góp ý cho Format Box"
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
        <div className="fx-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="fx-modal" ref={dialogRef} onClick={(e) => e.stopPropagation()}>
            <div className="fx-glow" aria-hidden />
            <div className="fx-header">
              <div className="fx-head-text">
                <span className="fx-eyebrow" aria-hidden>
                  <IconSparkles size={14} stroke={2.2} />
                </span>
                <h3>Góp ý cho Format Box</h3>
              </div>
              <button className="fx-close" onClick={closeModal} aria-label="Đóng">
                <IconX size={16} stroke={2.2} />
              </button>
            </div>

            <div className="fx-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "rate"}
                className={`fx-tab${tab === "rate" ? " active" : ""}`}
                onClick={() => setTab("rate")}
                type="button"
              >
                <IconHeartHandshake size={14} stroke={2.2} />
                <span>Đánh giá</span>
              </button>
              <button
                role="tab"
                aria-selected={tab === "bug"}
                className={`fx-tab${tab === "bug" ? " active" : ""}`}
                onClick={() => setTab("bug")}
                type="button"
              >
                <IconBug size={14} stroke={2.2} />
                <span>Báo lỗi trang này</span>
              </button>
              <span className={`fx-tab-slider ${tab}`} aria-hidden />
            </div>

            {status === "success" ? (
              <SuccessState tab={tab} />
            ) : (
              <form className="fx-body" onSubmit={handleSubmit}>
                {tab === "rate" ? (
                  <>
                    <section className="fx-section">
                      <label className="fx-label">
                        Nhìn chung, bạn thấy Format Box thế nào? <em>*</em>
                      </label>
                      <div
                        className="fx-stars"
                        role="radiogroup"
                        aria-label="Chấm sao đánh giá"
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        {[1, 2, 3, 4, 5].map((n) => {
                          const active = n <= displayRating;
                          return (
                            <button
                              key={n}
                              type="button"
                              role="radio"
                              aria-checked={rating === n}
                              aria-label={`${n} sao`}
                              className={`fx-star${active ? " active" : ""}${
                                hoverRating && n <= hoverRating ? " preview" : ""
                              }`}
                              onMouseEnter={() => setHoverRating(n)}
                              onFocus={() => setHoverRating(n)}
                              onClick={() => setRating(n)}
                            >
                              {active ? (
                                <IconStarFilled size={26} />
                              ) : (
                                <IconStar size={26} stroke={1.8} />
                              )}
                            </button>
                          );
                        })}
                        {mood ? (
                          <span
                            className="fx-mood"
                            style={{ color: mood.color }}
                            aria-live="polite"
                          >
                            {displayRating === 5 ? (
                              <IconMoodHappy size={16} stroke={2.2} />
                            ) : displayRating >= 3 ? (
                              <IconMoodNeutral size={16} stroke={2.2} />
                            ) : (
                              <IconMoodSad size={16} stroke={2.2} />
                            )}
                            {mood.label}
                          </span>
                        ) : (
                          <span className="fx-mood muted">Chạm vào sao để chấm</span>
                        )}
                      </div>
                    </section>

                    <section className="fx-section">
                      <label className="fx-label">
                        Hôm nay Format Box có giúp bạn xong việc?
                      </label>
                      <div className="fx-chips">
                        {(["yes", "partial", "no"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            className={`fx-chip${helpfulness === v ? " selected" : ""}`}
                            onClick={() =>
                              setHelpfulness((prev) => (prev === v ? null : v))
                            }
                          >
                            {HELPFULNESS_LABEL[v]}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="fx-section">
                      <div className="fx-label-row">
                        <label className="fx-label" htmlFor="fx-rate-msg">
                          Kể thêm cho Format Box{" "}
                          <span className="fx-sublabel">(không bắt buộc)</span>
                        </label>
                        <span
                          className={`fx-counter${rateMessage.length > rateMax * 0.9 ? " warn" : ""}`}
                        >
                          {rateMessage.length}/{rateMax}
                        </span>
                      </div>
                      <textarea
                        id="fx-rate-msg"
                        className="fx-textarea"
                        placeholder="Điểm nào bạn thích, điểm nào có thể làm tốt hơn..."
                        rows={3}
                        maxLength={rateMax}
                        value={rateMessage}
                        onChange={(e) => setRateMessage(e.target.value)}
                      />
                    </section>
                  </>
                ) : (
                  <>
                    <section className="fx-section">
                      <label className="fx-label">
                        Lỗi gì vậy bạn? <em>*</em>
                      </label>
                      <div className="fx-chips">
                        {BUG_TYPES.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`fx-chip${bugTypes.includes(t.id) ? " selected" : ""}`}
                            onClick={() => toggleBugType(t.id)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="fx-section">
                      <div className="fx-label-row">
                        <label className="fx-label" htmlFor="fx-bug-msg">
                          Chuyện gì đã xảy ra? <em>*</em>
                        </label>
                        <span
                          className={`fx-counter${bugMessage.length > bugMax * 0.9 ? " warn" : ""}`}
                        >
                          {bugMessage.length}/{bugMax}
                        </span>
                      </div>
                      <textarea
                        id="fx-bug-msg"
                        className="fx-textarea"
                        placeholder="Bạn bấm gì, thấy gì, đáng lẽ phải ra sao... (ít nhất 10 ký tự)"
                        rows={4}
                        maxLength={bugMax}
                        value={bugMessage}
                        onChange={(e) => setBugMessage(e.target.value)}
                        required
                      />
                      {bugMessage.length > 0 && bugMessageLen < 10 && (
                        <span className="fx-hint">
                          <IconAlertCircle size={13} stroke={2.2} />
                          Mô tả cần ít nhất 10 ký tự để Format Box hiểu rõ hơn.
                        </span>
                      )}
                      {pageUrl && (
                        <span className="fx-page-chip" title={pageUrl}>
                          <IconLink size={13} stroke={2.2} />
                          Trang: <code>{pageUrl}</code>
                        </span>
                      )}
                    </section>
                  </>
                )}

                <section className="fx-section">
                  <div className="fx-label-row">
                    <label className="fx-label" htmlFor="fx-name">
                      Tên của bạn{" "}
                      <span className="fx-sublabel">(không bắt buộc)</span>
                    </label>
                  </div>
                  <input
                    id="fx-name"
                    className="fx-input"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    placeholder="Để Format Box biết nên gọi bạn thế nào"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </section>

                <section className="fx-section">
                  <div className="fx-label-row">
                    <label className="fx-label" htmlFor="fx-contact">
                      Liên hệ của bạn{" "}
                      <span className="fx-sublabel">
                        (email / SĐT / Zalo — không bắt buộc)
                      </span>
                    </label>
                    {contact && (
                      <span className="fx-contact-badge">
                        {contactLooksLikeEmail ? "email" : "liên hệ"}
                      </span>
                    )}
                  </div>
                  <input
                    id="fx-contact"
                    className="fx-input"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Để Format Box phản hồi lại bạn"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                  <label className="fx-check">
                    <input
                      type="checkbox"
                      checked={allowContact}
                      onChange={(e) => setAllowContact(e.target.checked)}
                      disabled={!contact.trim()}
                    />
                    <span className="fx-check-box" aria-hidden>
                      <IconCheck size={12} stroke={3} />
                    </span>
                    <span>Cho phép Format Box liên hệ hỏi thêm</span>
                  </label>
                </section>

                {status === "error" && errorMsg && (
                  <div className="fx-alert error">
                    <IconAlertCircle size={16} stroke={2.3} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="fx-footer">
                  <p className="fx-footer-note">
                    Có kèm trang &amp; thiết bị để xử lý nhanh hơn.
                  </p>
                  <button
                    type="submit"
                    className={`fx-submit${canSubmit ? "" : " disabled"}`}
                    disabled={!canSubmit}
                  >
                    {status === "sending" ? (
                      <>
                        <IconLoader2 size={16} stroke={2.4} className="spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <IconSend size={16} stroke={2.4} />
                        Gửi góp ý
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SuccessState({ tab }: { tab: Tab }) {
  return (
    <div className="fx-success" role="status" aria-live="polite">
      <div className="fx-success-ring">
        <div className="fx-success-check">
          <IconCheck size={26} stroke={3} />
        </div>
      </div>
      <h4>
        {tab === "rate" ? "Cảm ơn bạn đã chấm điểm!" : "Đã nhận báo lỗi."}
      </h4>
      <p>
        {tab === "rate"
          ? "Mỗi sao là một nhịp để Format Box tốt hơn."
          : "Mình sẽ xem lại và sửa sớm. Cảm ơn bạn!"}
      </p>
    </div>
  );
}

async function fireConfetti() {
  try {
    const mod: any = await import("canvas-confetti");
    const confetti = mod.default || mod;
    const colors = ["#7565f6", "#22c5e8", "#ec5cb0", "#10b981", "#f59e0b"];
    confetti({
      particleCount: 90,
      spread: 65,
      startVelocity: 35,
      origin: { y: 0.35 },
      colors,
      scalar: 0.9,
      disableForReducedMotion: true,
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 90,
        startVelocity: 25,
        origin: { x: 0.2, y: 0.5 },
        colors,
        scalar: 0.8,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 50,
        spread: 90,
        startVelocity: 25,
        origin: { x: 0.8, y: 0.5 },
        colors,
        scalar: 0.8,
        disableForReducedMotion: true,
      });
    }, 180);
  } catch {}
}
