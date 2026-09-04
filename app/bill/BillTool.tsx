"use client";
import { useToast } from "@/components/Toast";
import { vndInWords } from "@/lib/vndWords";
import {
  IconCalendar,
  IconClipboardList,
  IconCopy,
  IconCreditCard,
  IconDownload,
  IconHeartFilled,
  IconLink,
  IconPencil,
  IconPhotoUp,
  IconPlus,
  IconReceipt2,
  IconStarFilled,
  IconTrash,
  IconUser,
  IconUsers,
  IconWallet,
  IconX,
} from "@tabler/icons-react";
import * as htmlToImage from "html-to-image";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = { name: string; qty: number; price: number };

type BillData = {
  title: string;
  tag: string;
  date: string;
  participants: number;
  splitType: string;
  payer: string;
  accountNumber: string;
  qrText: string;
  qrImage: string | null;
  brands: string[];
  footer: string;
  items: Item[];
};

const BANK_OPTIONS = ["MOMO", "Vietinbank", "VietQR", "napas247", "Vietcombank", "Techcombank"];

const EMPTY: BillData = {
  title: "HÓA ĐƠN THANH TOÁN",
  tag: "CHI PHÍ",
  date: new Date().toISOString().slice(0, 10),
  participants: 1,
  splitType: "Chia đều",
  payer: "",
  accountNumber: "",
  qrText: "",
  qrImage: null,
  brands: ["MOMO"],
  footer: "",
  items: [{ name: "", qty: 1, price: 0 }],
};

const fmt = new Intl.NumberFormat("vi-VN");

export default function BillTool() {
  const toast = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<BillData>(EMPTY);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(true);
  const qrFileRef = useRef<HTMLInputElement>(null);

  const total = useMemo(
    () => data.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0),
    [data.items],
  );
  const perPerson = data.participants > 0 ? Math.round(total / data.participants) : 0;
  const words = useMemo(() => vndInWords(total), [total]);

  useEffect(() => {
    if (data.qrImage) {
      setQrDataUrl(data.qrImage);
      return;
    }
    if (!data.qrText.trim()) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(data.qrText, {
      margin: 1,
      width: 320,
      color: { dark: "#be185d", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [data.qrText, data.qrImage]);

  const handleQrUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Chỉ hỗ trợ file ảnh");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("qrImage", String(reader.result));
    reader.readAsDataURL(file);
  };

  const toggleBrand = (b: string) =>
    setData((d) => ({
      ...d,
      brands: d.brands.includes(b) ? d.brands.filter((x) => x !== b) : [...d.brands, b],
    }));

  const update = <K extends keyof BillData>(key: K, value: BillData[K]) => setData((d) => ({ ...d, [key]: value }));
  const updateItem = (i: number, patch: Partial<Item>) =>
    setData((d) => ({ ...d, items: d.items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) }));
  const addItem = () => setData((d) => ({ ...d, items: [...d.items, { name: "", qty: 1, price: 0 }] }));
  const removeItem = (i: number) => setData((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));

  const withoutEditing = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setEditing(false);
    // let React flush
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      return await fn();
    } finally {
      setEditing(true);
    }
  };

  const download = async () => {
    if (!previewRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await withoutEditing(() =>
        htmlToImage.toPng(previewRef.current!, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#ffffff",
        }),
      );
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `bill-${data.date}.png`;
      a.click();
      toast("Đã tải bill");
    } catch {
      toast("Xuất ảnh thất bại");
    } finally {
      setBusy(false);
    }
  };

  const copyImage = async () => {
    if (!previewRef.current) return;
    setBusy(true);
    try {
      const blob = await withoutEditing(() =>
        htmlToImage.toBlob(previewRef.current!, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#ffffff",
        }),
      );
      if (!blob) throw new Error("no blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("Đã copy ảnh vào clipboard");
    } catch {
      toast("Copy thất bại");
    } finally {
      setBusy(false);
    }
  };

  const ec = editing ? "bill-ec" : "bill-ec bill-ec-static";
  const dateDisplay = formatDate(data.date);

  return (
    <div className="bill-standalone">
      <div className="bill-preview" ref={previewRef} data-editing={editing ? "1" : "0"}>
        <div className="bill-inner">
          <div className="bill-header">
            <div className="bill-mark">
              <IconReceipt2 size={34} stroke={1.6} />
            </div>

            <h1>
              <input
                className={`${ec} bill-ec-title`}
                value={data.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="HÓA ĐƠN THANH TOÁN"
              />
            </h1>

            <div className="bill-tag">
              <input
                className={`${ec} bill-ec-tag`}
                value={data.tag}
                onChange={(e) => update("tag", e.target.value)}
                placeholder="CHI PHÍ..."
              />
            </div>

            <div className="bill-divider">
              <span />
              <IconStarFilled size={10} />
              <span />
            </div>
          </div>

          <div className="bill-meta">
            <div className="bill-meta-left">
              <MetaRow icon={<IconCalendar size={16} stroke={1.7} />} label="Ngày thanh toán">
                {editing ? (
                  <input
                    type="date"
                    className={`${ec} bill-ec-date`}
                    value={data.date}
                    onChange={(e) => update("date", e.target.value)}
                  />
                ) : (
                  <span className="bill-meta-value">{dateDisplay}</span>
                )}
              </MetaRow>

              <MetaRow icon={<IconUsers size={16} stroke={1.7} />} label="Số người tham gia">
                <input
                  type="number"
                  min={1}
                  className={`${ec} bill-ec-num`}
                  value={data.participants}
                  onChange={(e) => update("participants", Math.max(1, Number(e.target.value) || 1))}
                />
              </MetaRow>

              <MetaRow icon={<IconClipboardList size={16} stroke={1.7} />} label="Hình thức">
                <input
                  className={ec}
                  value={data.splitType}
                  onChange={(e) => update("splitType", e.target.value)}
                  placeholder="Chia đều"
                />
              </MetaRow>

              <MetaRow icon={<IconUser size={16} stroke={1.7} />} label="Người thanh toán">
                <input
                  className={`${ec} bill-ec-upper`}
                  value={data.payer}
                  onChange={(e) => update("payer", e.target.value.toUpperCase())}
                  placeholder="Nhập tên..."
                />
              </MetaRow>

              <MetaRow icon={<IconCreditCard size={16} stroke={1.7} />} label="STK">
                <input
                  className={ec}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={data.accountNumber}
                  onChange={(e) => update("accountNumber", e.target.value.replace(/\D+/g, ""))}
                  placeholder="Nhập STK..."
                />
              </MetaRow>
            </div>

            <div className="bill-qr">
              <div className="bill-qr-head">QUÉT MÃ THANH TOÁN</div>
              <div className="bill-qr-brands">{data.brands.length ? data.brands.join(" · ") : " "}</div>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR" />
              ) : (
                <div className="bill-qr-empty">
                  <IconLink size={22} stroke={1.4} />
                  <span>Chưa có QR</span>
                </div>
              )}
              <div className="bill-qr-amount">{fmt.format(perPerson)}đ</div>

              {editing && (
                <div className="bill-qr-edit">
                  <div className="bill-qr-actions">
                    <button type="button" className="bill-qr-toggle" onClick={() => setShowQrPanel((v) => !v)}>
                      <IconPencil size={11} stroke={2} />
                      {showQrPanel ? "Ẩn" : "Chỉnh QR"}
                    </button>
                    {data.qrImage && (
                      <button
                        type="button"
                        className="bill-qr-toggle bill-qr-toggle-danger"
                        onClick={() => update("qrImage", null)}
                        title="Xoá ảnh QR đã upload"
                      >
                        <IconX size={11} stroke={2} /> Xoá ảnh
                      </button>
                    )}
                  </div>

                  {showQrPanel && (
                    <div className="bill-qr-panel">
                      <label className="bill-qr-panel-label">Ngân hàng / ví hiển thị</label>
                      <div className="bill-qr-brand-chips">
                        {BANK_OPTIONS.map((b) => (
                          <button
                            key={b}
                            type="button"
                            className={`bill-qr-chip${data.brands.includes(b) ? " on" : ""}`}
                            onClick={() => toggleBrand(b)}
                          >
                            {b}
                          </button>
                        ))}
                      </div>

                      <label className="bill-qr-panel-label">Ảnh QR (upload)</label>
                      <button type="button" className="bill-qr-upload" onClick={() => qrFileRef.current?.click()}>
                        <IconPhotoUp size={14} stroke={1.8} />
                        {data.qrImage ? "Đổi ảnh khác" : "Chọn ảnh QR"}
                      </button>
                      <input
                        ref={qrFileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleQrUpload(e.target.files?.[0])}
                      />

                      {!data.qrImage && (
                        <>
                          <label className="bill-qr-panel-label">Hoặc dán link để tạo QR</label>
                          <input
                            className="bill-qr-input"
                            value={data.qrText}
                            onChange={(e) => update("qrText", e.target.value)}
                            placeholder="https://... hoặc chuỗi VietQR"
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <table className="bill-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>NỘI DUNG</th>
                <th>SL</th>
                <th>ĐƠN GIÁ</th>
                <th>THÀNH TIỀN</th>
                {editing && <th className="bill-th-act" aria-label=""></th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <input
                      className={`${ec} bill-ec-name`}
                      value={it.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      placeholder="Nhập tên..."
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      className={`${ec} bill-ec-num bill-ec-right`}
                      value={it.qty}
                      onChange={(e) => updateItem(i, { qty: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      className={`${ec} bill-ec-num bill-ec-right`}
                      value={it.price}
                      onChange={(e) => updateItem(i, { price: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="bill-td-total">{fmt.format(it.qty * it.price)}</td>
                  {editing && (
                    <td className="bill-td-act">
                      <button className="bill-row-del" onClick={() => removeItem(i)} title="Xoá" type="button">
                        <IconTrash size={13} stroke={1.9} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {editing && (
                <tr className="bill-tr-add">
                  <td colSpan={6}>
                    <button className="bill-add-btn" onClick={addItem} type="button">
                      <IconPlus size={13} stroke={2} /> Thêm item
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="bill-total">
            <div>
              <div className="bill-total-label">
                <IconWallet size={18} stroke={1.8} /> TỔNG CỘNG
              </div>
              <div className="bill-total-words">(Bằng chữ): {words}</div>
            </div>
            <div className="bill-total-num">{fmt.format(total)}đ</div>
          </div>

          <div className="bill-summary">
            <div className="bill-summary-row">
              <span>Tổng chi phí:</span>
              <b>{fmt.format(total)}đ</b>
            </div>
            <div className="bill-summary-row">
              <span>Số người tham gia:</span>
              <b>{data.participants} người</b>
            </div>
            <div className="bill-summary-divider" />
            <div className="bill-summary-row bill-summary-big">
              <span>CHI PHÍ MỖI NGƯỜI:</span>
              <b>{fmt.format(perPerson)}đ</b>
            </div>
          </div>

          <div className="bill-footer">
            <div className="bill-footer-hi">
              Cảm ơn mọi người <IconHeartFilled size={16} style={{ color: "#db2777" }} />
            </div>
            <div className="bill-footer-msg">
              <input
                className={`${ec} bill-ec-footer`}
                value={data.footer}
                onChange={(e) => update("footer", e.target.value)}
                placeholder="Lời nhắn (tuỳ chọn)..."
              />
            </div>
            <div className="bill-footer-cta">
              <IconStarFilled size={12} /> Chơi hết mình – Thanh toán văn minh <IconStarFilled size={12} />
            </div>
          </div>
        </div>
      </div>

      <div className="bill-hint">
        <IconPencil size={13} stroke={1.9} /> Click vào bất kỳ ô nào để chỉnh sửa
      </div>

      <div className="bill-cta-row">
        <button className="btn btn-s" onClick={copyImage} disabled={busy}>
          <IconCopy size={15} stroke={1.8} /> Copy ảnh
        </button>
        <button className="btn btn-p bill-download" onClick={download} disabled={busy}>
          <IconDownload size={16} stroke={1.8} />
          {busy ? "Đang xuất..." : "Tải ảnh PNG"}
        </button>
      </div>
    </div>
  );
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bill-meta-row">
      <span className="bill-meta-icon">{icon}</span>
      <b>{label}:</b>
      <span className="bill-meta-value">{children}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
