"use client";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { enablePush, getPushState, resetPushSubscription, sendTestPush, type PushState } from "@/lib/admin-push-client";
import {
  IconBell,
  IconBellOff,
  IconBellRinging,
  IconDeviceMobileShare,
  IconRefresh,
  IconSend,
  IconStethoscope,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

const TEXT: Record<Exclude<PushState, "checking">, string> = {
  "ios-install":
    "iPhone/iPad chỉ nhận thông báo khi mở từ Màn hình chính: bấm Chia sẻ → Thêm vào MH chính, mở app FB Admin, đăng nhập rồi bật thông báo tại đây.",
  unsupported: "Trình duyệt này không hỗ trợ Web Push.",
  "no-vapid": "Server chưa có NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.",
  denied: "Đã chặn thông báo. Mở Cài đặt → Thông báo → FB Admin (hoặc cài đặt site) để cho phép lại.",
  default: "Bật để nhận thông báo Duyệt / Từ chối khi auto sinh xong bài, kể cả khi đã khoá màn hình.",
  granted: "Thiết bị này sẽ nhận thông báo khi có bài mới chờ duyệt.",
};

// Trạng thái + nút bật Web Push cho đúng thiết bị đang mở trang admin.
export default function PushSetup() {
  const toast = useToast();
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => setState(getPushState()), []);

  if (state === "checking") return null;

  function enable() {
    setBusy(true);
    // enablePush() gọi requestPermission() đồng bộ trong click — bắt buộc trên Safari.
    void enablePush().then((r) => {
      setBusy(false);
      setState(getPushState());
      toast(r.ok ? "Đã bật thông báo trên thiết bị này" : r.error || "Không bật được thông báo");
    });
  }

  async function test() {
    setBusy(true);
    const r = await sendTestPush();
    setBusy(false);
    toast(r.ok ? "Đã gửi thử — thông báo sẽ hiện sau vài giây" : `Gửi thử lỗi: ${r.error}`);
  }

  async function reset() {
    setBusy(true);
    const r = await resetPushSubscription();
    setBusy(false);
    toast(r.ok ? "Đã tạo đăng ký mới trên thiết bị này" : `Đăng ký lại lỗi: ${r.error}`);
  }

  async function diagnose() {
    setBusy(true);
    try {
      const r = await fetch("/api/blog/push/diagnose", { credentials: "same-origin" });
      const j = await r.json();
      const pair = j.pair === "match" ? "khớp" : `KHÔNG khớp (${j.pair})`;
      toast(
        `VAPID: public/private ${pair}. Subject: ${j.subject} (${j.subjectValid ? "valid" : "INVALID"}). Public: ${j.publicKeyPreview || "trống"}. Server time: ${j.serverTime}`,
      );
    } catch (e) {
      toast(`Chẩn đoán lỗi: ${(e as Error)?.message || e}`);
    }
    setBusy(false);
  }

  const icon =
    state === "granted" ? (
      <IconBellRinging size={14} stroke={2} />
    ) : state === "ios-install" ? (
      <IconDeviceMobileShare size={14} stroke={2} />
    ) : state === "default" ? (
      <IconBell size={14} stroke={2} />
    ) : (
      <IconBellOff size={14} stroke={2} />
    );

  return (
    <div className="bga-push" data-state={state}>
      <span className="bga-push-ic">{icon}</span>
      <span className="bga-push-text">{TEXT[state]}</span>
      {state === "default" && (
        <Button size="sm" loading={busy} leftIcon={<IconBell size={14} />} onClick={enable}>
          Bật thông báo
        </Button>
      )}
      {state === "granted" && (
        <>
          <Button size="sm" variant="subtle" loading={busy} leftIcon={<IconSend size={14} />} onClick={test}>
            Gửi thử
          </Button>
          <Button
            size="sm"
            variant="subtle"
            loading={busy}
            leftIcon={<IconRefresh size={14} />}
            onClick={reset}
            title="Dùng khi báo BadJwtToken: xoá subscription cũ và tạo mới khớp VAPID key hiện tại"
          >
            Đăng ký lại
          </Button>
          <Button
            size="sm"
            variant="subtle"
            loading={busy}
            leftIcon={<IconStethoscope size={14} />}
            onClick={diagnose}
            title="Kiểm tra VAPID keys server (public/private có cùng cặp không, subject hợp lệ, giờ server)"
          >
            Chẩn đoán
          </Button>
        </>
      )}
    </div>
  );
}
