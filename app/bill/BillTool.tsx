"use client";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { vndInWords } from "@/lib/vndWords";
import {
  IconCalendar,
  IconClipboardList,
  IconCopy,
  IconDownload,
  IconHeartFilled,
  IconLink,
  IconPalette,
  IconPencil,
  IconPhotoUp,
  IconPlus,
  IconReceipt2,
  IconStarFilled,
  IconTrash,
  IconUsers,
  IconUsersMinus,
  IconWallet,
  IconX,
} from "@tabler/icons-react";
import * as htmlToImage from "html-to-image";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";

type Person = { id: string; name: string };
type Item = { name: string; qty: number; price: number; excludes: string[] };

type ThemeKey = "pink" | "ocean" | "emerald" | "amber" | "violet" | "slate";

type BillData = {
  title: string;
  tag: string;
  date: string;
  splitType: SplitKey;
  payer: string;
  qrText: string;
  qrImage: string | null;
  bankBin: string;
  accountNo: string;
  accountName: string;
  footer: string;
  people: Person[];
  items: Item[];
  theme: ThemeKey;
};

const BANKS: { bin: string; code: string; name: string }[] = [
  { bin: "970436", code: "VCB", name: "Vietcombank" },
  { bin: "970407", code: "TCB", name: "Techcombank" },
  { bin: "970422", code: "MB", name: "MB Bank" },
  { bin: "970418", code: "BIDV", name: "BIDV" },
  { bin: "970415", code: "CTG", name: "VietinBank" },
  { bin: "970416", code: "ACB", name: "ACB" },
  { bin: "970423", code: "TPB", name: "TPBank" },
  { bin: "970403", code: "STB", name: "Sacombank" },
  { bin: "970432", code: "VPB", name: "VPBank" },
  { bin: "970405", code: "VBA", name: "Agribank" },
  { bin: "970426", code: "MSB", name: "MSB" },
  { bin: "970443", code: "SHB", name: "SHB" },
  { bin: "970437", code: "HDB", name: "HDBank" },
  { bin: "970448", code: "OCB", name: "OCB" },
  { bin: "970440", code: "SEAB", name: "SeABank" },
  { bin: "970441", code: "VIB", name: "VIB" },
  { bin: "970431", code: "EIB", name: "Eximbank" },
];

const buildVietQR = (bin: string, acc: string, name: string, amount: number, info: string) => {
  if (!bin || !acc || amount <= 0) return null;
  const params = new URLSearchParams();
  params.set("amount", String(amount));
  if (info) params.set("addInfo", info);
  if (name) params.set("accountName", name);
  return `https://img.vietqr.io/image/${bin}-${acc}-compact2.png?${params.toString()}`;
};

type SplitKey = "equal" | "exception";
const SPLIT_KEYS: SplitKey[] = ["equal", "exception"];

const THEMES: { key: ThemeKey; label: string; color: string; qr: string }[] = [
  { key: "pink", label: "Pink", color: "#ec4899", qr: "#be185d" },
  { key: "ocean", label: "Ocean", color: "#0ea5e9", qr: "#0369a1" },
  { key: "emerald", label: "Emerald", color: "#10b981", qr: "#047857" },
  { key: "amber", label: "Amber", color: "#f59e0b", qr: "#b45309" },
  { key: "violet", label: "Violet", color: "#8b5cf6", qr: "#6d28d9" },
  { key: "slate", label: "Slate", color: "#475569", qr: "#1e293b" },
];

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_PEOPLE: Person[] = [{ id: uid(), name: "Luân" }];

const DEFAULT_DATA: BillData = {
  title: "",
  tag: "",
  date: new Date().toISOString().slice(0, 10),
  splitType: "equal",
  payer: "Luân",
  qrText: "",
  qrImage: "",
  bankBin: "",
  accountNo: "",
  accountName: "",
  footer: "",
  people: DEFAULT_PEOPLE,
  items: [],
  theme: "pink",
};

const fmt = new Intl.NumberFormat("vi-VN");

export default function BillTool() {
  const { t } = useI18n();
  const toast = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<BillData>(DEFAULT_DATA);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [qrMode, setQrMode] = useState<"manual" | "image" | "link">("manual");
  const [openExclude, setOpenExclude] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(true);

  const total = useMemo(() => data.items.reduce((s, it) => s + it.qty * it.price, 0), [data.items]);
  const words = useMemo(() => vndInWords(total), [total]);

  const exceptionMode = data.splitType === "exception";
  const splitLabel = (k: SplitKey) => (k === "equal" ? t("bill_split_equal") : t("bill_split_exception"));

  // Per-person breakdown honoring exclusions (only when in exception mode)
  const perPersonMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of data.people) map[p.id] = 0;
    if (data.people.length === 0) return map;
    for (const it of data.items) {
      const cost = it.qty * it.price;
      const excludeSet = exceptionMode ? it.excludes : [];
      const eligible = data.people.filter((p) => !excludeSet.includes(p.id));
      if (eligible.length === 0) continue;
      const share = cost / eligible.length;
      for (const p of eligible) map[p.id] += share;
    }
    return map;
  }, [data.items, data.people, exceptionMode]);

  const hasExclusions = exceptionMode && data.items.some((it) => it.excludes.length > 0);
  const equalPerPerson = data.people.length > 0 ? Math.round(total / data.people.length) : 0;
  const perPersonRange = useMemo(() => {
    const vals = Object.values(perPersonMap);
    if (vals.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.round(Math.min(...vals)),
      max: Math.round(Math.max(...vals)),
    };
  }, [perPersonMap]);

  // Split people into: "equal" (no exclusion in any item) vs "special" (has at least one exclusion)
  const { equalPeople, specialPeople } = useMemo(() => {
    if (!hasExclusions) return { equalPeople: data.people, specialPeople: [] as Person[] };
    const excludedIds = new Set<string>();
    for (const it of data.items) for (const id of it.excludes) excludedIds.add(id);
    return {
      equalPeople: data.people.filter((p) => !excludedIds.has(p.id)),
      specialPeople: data.people.filter((p) => excludedIds.has(p.id)),
    };
  }, [data.people, data.items, hasExclusions]);

  const manualReady = qrMode === "manual" && !!(data.bankBin && data.accountNo);
  const equalAmount = hasExclusions && equalPeople.length > 0
    ? Math.round(perPersonMap[equalPeople[0].id] || 0)
    : equalPerPerson;
  const specialAmount = hasExclusions && specialPeople.length > 0
    ? Math.round(perPersonMap[specialPeople[0].id] || 0)
    : 0;

  const info = (data.title || "Bill").trim();
  const manualQr1 = useMemo(
    () => (manualReady ? buildVietQR(data.bankBin, data.accountNo, data.accountName, equalAmount, info) : null),
    [manualReady, data.bankBin, data.accountNo, data.accountName, equalAmount, info],
  );
  const manualQr2 = useMemo(
    () =>
      manualReady && hasExclusions && specialPeople.length > 0
        ? buildVietQR(data.bankBin, data.accountNo, data.accountName, specialAmount, info)
        : null,
    [manualReady, hasExclusions, specialPeople.length, data.bankBin, data.accountNo, data.accountName, specialAmount, info],
  );
  const bankInfo = BANKS.find((b) => b.bin === data.bankBin);
  const brandLabel = manualReady && bankInfo ? `${bankInfo.code} · ${data.accountNo}` : "";

  useEffect(() => {
    if (qrMode === "image" && data.qrImage) {
      setQrDataUrl(data.qrImage);
      return;
    }
    if (qrMode === "manual" && manualQr1) {
      setQrDataUrl(manualQr1);
      return;
    }
    if (qrMode !== "link" || !data.qrText.trim()) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    const qrDark = THEMES.find((t) => t.key === data.theme)?.qr ?? "#be185d";
    QRCode.toDataURL(data.qrText, {
      margin: 1,
      width: 320,
      color: { dark: qrDark, light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [data.qrText, data.qrImage, data.theme, manualQr1, qrMode]);

  const update = <K extends keyof BillData>(key: K, value: BillData[K]) => setData((d) => ({ ...d, [key]: value }));

  const updateItem = (i: number, patch: Partial<Item>) =>
    setData((d) => ({
      ...d,
      items: d.items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
    }));
  const addItem = () =>
    setData((d) => ({
      ...d,
      items: [...d.items, { name: "", qty: 1, price: 0, excludes: [] }],
    }));
  const removeItem = (i: number) => setData((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));

  const toggleItemExclude = (itemIdx: number, personId: string) =>
    setData((d) => ({
      ...d,
      items: d.items.map((it, i) => {
        if (i !== itemIdx) return it;
        const has = it.excludes.includes(personId);
        return {
          ...it,
          excludes: has ? it.excludes.filter((x) => x !== personId) : [...it.excludes, personId],
        };
      }),
    }));

  // Number input helper: never clears to empty; ignores invalid input
  const numHandler =
    (setter: (n: number) => void, min = 0) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "") return; // keep previous value
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      setter(Math.max(min, n));
    };

  const addPerson = () =>
    setData((d) => ({
      ...d,
      people: [...d.people, { id: uid(), name: `Người ${d.people.length + 1}` }],
    }));
  const updatePerson = (id: string, name: string) =>
    setData((d) => ({
      ...d,
      people: d.people.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  const removePerson = (id: string) => {
    if (data.people.length <= 1) {
      toast(t("bill_toast_min_people"));
      return;
    }
    setData((d) => ({
      ...d,
      people: d.people.filter((p) => p.id !== id),
      items: d.items.map((it) => ({ ...it, excludes: it.excludes.filter((x) => x !== id) })),
    }));
  };

  const handleQrUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("bill_toast_image_only"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("qrImage", String(reader.result));
    reader.readAsDataURL(file);
  };

  const withoutEditing = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setEditing(false);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
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
      toast(t("bill_toast_downloaded"));
    } catch {
      toast(t("bill_toast_export_failed"));
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
      toast(t("bill_toast_copied"));
    } catch {
      toast(t("bill_toast_copy_failed"));
    } finally {
      setBusy(false);
    }
  };

  const ec = editing ? "bill-ec" : "bill-ec bill-ec-static";
  const dateDisplay = formatDate(data.date);
  const nameOf = (id: string) => data.people.find((p) => p.id === id)?.name ?? "?";

  return (
    <div className="bill-standalone">
      <div className="bill-preview" ref={previewRef} data-editing={editing ? "1" : "0"} data-theme={data.theme}>
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
                placeholder={t("bill_default_title")}
              />
            </h1>
            <div className="bill-tag">
              <input
                className={`${ec} bill-ec-tag`}
                value={data.tag}
                onChange={(e) => update("tag", e.target.value)}
                placeholder={t("bill_tag_placeholder")}
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
              <MetaRow icon={<IconCalendar size={16} stroke={1.7} />} label={t("bill_date")}>
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

              <MetaRow icon={<IconUsers size={16} stroke={1.7} />} label={t("bill_people_count")}>
                <span className="bill-meta-value">{data.people.length}</span>
              </MetaRow>

              <MetaRow icon={<IconClipboardList size={16} stroke={1.7} />} label={t("bill_split_type")}>
                {editing ? (
                  <span className="bill-select-wrap">
                    <select
                      className={`${ec} bill-ec-select`}
                      value={data.splitType}
                      onChange={(e) => update("splitType", e.target.value as SplitKey)}
                    >
                      {SPLIT_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {splitLabel(k)}
                        </option>
                      ))}
                    </select>
                  </span>
                ) : (
                  <span>{splitLabel(data.splitType)}</span>
                )}
              </MetaRow>

            </div>
          </div>

          <div className="bill-people">
            <div className="bill-people-head">
              <IconUsers size={14} stroke={1.8} />
              <span>{t("bill_people_head")}</span>
              {editing && (
                <button type="button" className="bill-people-add" onClick={addPerson}>
                  <IconPlus size={12} stroke={2} /> {t("bill_people_add")}
                </button>
              )}
            </div>
            <div className="bill-people-chips">
              {data.people.map((p) =>
                editing ? (
                  <span className="bill-person-chip" key={p.id}>
                    <input
                      value={p.name}
                      onChange={(e) => updatePerson(p.id, e.target.value)}
                      placeholder={t("bill_people_name_placeholder")}
                    />
                    <button
                      type="button"
                      onClick={() => removePerson(p.id)}
                      aria-label={t("bill_delete")}
                      title={t("bill_delete")}
                    >
                      <IconX size={11} stroke={2.2} />
                    </button>
                  </span>
                ) : (
                  <span className="bill-person-chip bill-person-chip-static" key={p.id}>
                    {p.name || t("bill_people_name_placeholder")}
                  </span>
                ),
              )}
            </div>
          </div>

          <table className="bill-table">
            <thead>
              <tr>
                <th>{t("bill_th_no")}</th>
                <th>{t("bill_th_name")}</th>
                <th>{t("bill_th_qty")}</th>
                <th>{t("bill_th_price")}</th>
                <th>{t("bill_th_total")}</th>
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
                      placeholder={t("bill_item_name_placeholder")}
                    />
                    {exceptionMode && it.excludes.length > 0 && (
                      <div className="bill-item-excludes">
                        {t("bill_not_counted")}: {it.excludes.map(nameOf).join(", ")}
                      </div>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`${ec} bill-ec-num bill-ec-right`}
                      value={it.qty}
                      onChange={numHandler((n) => updateItem(i, { qty: n }), 0)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`${ec} bill-ec-num bill-ec-right`}
                      value={it.price}
                      onChange={numHandler((n) => updateItem(i, { price: n }), 0)}
                    />
                  </td>
                  <td className="bill-td-total">{fmt.format(it.qty * it.price)}</td>
                  {editing && (
                    <td className="bill-td-act">
                      <div className="bill-td-act-wrap">
                        {exceptionMode && (
                          <button
                            className={`bill-row-ex${it.excludes.length ? " on" : ""}`}
                            onClick={() => setOpenExclude((cur) => (cur === i ? null : i))}
                            title={t("bill_exclude_tip")}
                            type="button"
                          >
                            <IconUsersMinus size={13} stroke={1.9} />
                          </button>
                        )}
                        <button
                          className="bill-row-del"
                          onClick={() => removeItem(i)}
                          title={t("bill_delete")}
                          type="button"
                        >
                          <IconTrash size={13} stroke={1.9} />
                        </button>

                        {openExclude === i && (
                          <div className="bill-exclude-pop" onClick={(e) => e.stopPropagation()}>
                            <div className="bill-exclude-head">{t("bill_exclude_head")}</div>
                            {data.people.length === 0 && (
                              <div className="bill-exclude-empty">{t("bill_exclude_empty")}</div>
                            )}
                            {data.people.map((p) => {
                              const on = it.excludes.includes(p.id);
                              return (
                                <label key={p.id} className={`bill-exclude-row${on ? " on" : ""}`}>
                                  <input type="checkbox" checked={on} onChange={() => toggleItemExclude(i, p.id)} />
                                  <span>{p.name}</span>
                                </label>
                              );
                            })}
                            <button type="button" className="bill-exclude-close" onClick={() => setOpenExclude(null)}>
                              {t("bill_exclude_done")}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {editing && (
                <tr className="bill-tr-add">
                  <td colSpan={6}>
                    <button className="bill-add-btn" onClick={addItem} type="button">
                      <IconPlus size={13} stroke={2} /> {t("bill_add_item")}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="bill-total">
            <div>
              <div className="bill-total-label">
                <IconWallet size={18} stroke={1.8} /> {t("bill_total_label")}
              </div>
              <div className="bill-total-words">
                {t("bill_total_words")} {words}
              </div>
            </div>
            <div className="bill-total-num">{fmt.format(total)}đ</div>
          </div>

          <div className="bill-summary">
            <div className="bill-summary-row">
              <span>{t("bill_sum_total")}</span>
              <b>{fmt.format(total)}đ</b>
            </div>
            <div className="bill-summary-row">
              <span>{t("bill_people_count")}:</span>
              <b>
                {data.people.length} {t("bill_person_unit")}
              </b>
            </div>
            <div className="bill-summary-divider" />
            {!hasExclusions ? (
              <div className="bill-summary-row bill-summary-big">
                <span>{t("bill_per_person")}</span>
                <b>{fmt.format(equalPerPerson)}đ</b>
              </div>
            ) : (
              <div className="bill-split-groups">
                {equalPeople.length > 0 && (
                  <div className="bill-split-group bill-split-group-equal">
                    <div className="bill-split-head">
                      <IconUsers size={13} stroke={1.9} />
                      <span>
                        {t("bill_group_equal")} · {equalPeople.length} {t("bill_person_unit")}
                      </span>
                      <b>
                        {fmt.format(Math.round(perPersonMap[equalPeople[0].id] || 0))}
                        {t("bill_per_person_unit")}
                      </b>
                    </div>
                    <div className="bill-split-names">
                      {equalPeople.map((p) => (
                        <span className="bill-split-name" key={p.id}>
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {specialPeople.length > 0 && (
                  <div className="bill-split-group bill-split-group-special">
                    <div className="bill-split-head">
                      <IconUsersMinus size={13} stroke={1.9} />
                      <span>
                        {t("bill_group_special")} · {specialPeople.length} {t("bill_person_unit")}
                      </span>
                    </div>
                    <div className="bill-split-list">
                      {specialPeople.map((p) => (
                        <div className="bill-split-row" key={p.id}>
                          <span>{p.name}</span>
                          <b>{fmt.format(Math.round(perPersonMap[p.id] || 0))}đ</b>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bill-qr bill-qr-end">
            <div className="bill-qr-head">{t("bill_qr_head")}</div>
            <div className="bill-qr-brands">{brandLabel || " "}</div>
            <div className={`bill-qr-grid${manualQr2 ? " bill-qr-grid-2" : ""}`}>
              <div className="bill-qr-item bill-qr-item-equal">
                {manualQr2 && (
                  <div className="bill-qr-tag bill-qr-tag-equal">
                    <IconUsers size={12} stroke={2} />
                    {t("bill_qr_for_equal")}
                  </div>
                )}
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="QR" crossOrigin="anonymous" />
                ) : (
                  <div className="bill-qr-empty">
                    <IconLink size={26} stroke={1.4} />
                    <span>{t("bill_qr_none")}</span>
                    <span className="bill-qr-empty-hint">{t("bill_qr_hint")}</span>
                  </div>
                )}
                {manualQr2 ? (
                  <div className="bill-qr-amount">{fmt.format(equalAmount)}đ</div>
                ) : hasExclusions ? (
                  perPersonRange.min === perPersonRange.max ? (
                    <div className="bill-qr-amount">{fmt.format(perPersonRange.max)}đ</div>
                  ) : (
                    <div className="bill-qr-amount bill-qr-amount-range">
                      <small>{t("bill_qr_range_small")}</small>
                      {fmt.format(perPersonRange.min)}
                      <span> – </span>
                      {fmt.format(perPersonRange.max)}đ
                    </div>
                  )
                ) : (
                  <div className="bill-qr-amount">{fmt.format(equalPerPerson)}đ</div>
                )}
              </div>
              {manualQr2 && (
                <div className="bill-qr-item bill-qr-item-special">
                  <div className="bill-qr-tag bill-qr-tag-special">
                    <IconUsersMinus size={12} stroke={2} />
                    {t("bill_qr_for_special")}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={manualQr2} alt="QR2" crossOrigin="anonymous" />
                  <div className="bill-qr-amount">{fmt.format(specialAmount)}đ</div>
                </div>
              )}
            </div>

            {editing && (
              <div className="bill-qr-edit">
                <div className="bill-qr-actions">
                  <button type="button" className="bill-qr-toggle" onClick={() => setShowQrPanel((v) => !v)}>
                    <IconPencil size={11} stroke={2} />
                    {showQrPanel ? t("bill_qr_hide") : t("bill_qr_edit")}
                  </button>
                  {data.qrImage && (
                    <button
                      type="button"
                      className="bill-qr-toggle bill-qr-toggle-danger"
                      onClick={() => update("qrImage", null)}
                      title={t("bill_qr_remove_img")}
                    >
                      <IconX size={11} stroke={2} /> {t("bill_qr_remove_img")}
                    </button>
                  )}
                </div>

                {showQrPanel && (
                  <div className="bill-qr-panel">
                    <div className="bill-qr-modes">
                      {(["manual", "image", "link"] as const).map((m) => (
                        <label key={m} className={`bill-qr-mode${qrMode === m ? " on" : ""}`}>
                          <input
                            type="checkbox"
                            checked={qrMode === m}
                            onChange={() => setQrMode(m)}
                          />
                          <span>
                            {m === "manual"
                              ? t("bill_qr_manual_label")
                              : m === "image"
                                ? t("bill_qr_upload_label")
                                : t("bill_qr_or_link")}
                          </span>
                        </label>
                      ))}
                    </div>

                    {qrMode === "manual" && (
                      <>
                        <label className="bill-qr-panel-label">{t("bill_qr_bank_select")}</label>
                        <span className="bill-select-wrap">
                          <select
                            className="bill-qr-input"
                            value={data.bankBin}
                            onChange={(e) => update("bankBin", e.target.value)}
                          >
                            <option value="">{t("bill_qr_bank_placeholder")}</option>
                            {BANKS.map((b) => (
                              <option key={b.bin} value={b.bin}>
                                {b.name} ({b.code})
                              </option>
                            ))}
                          </select>
                        </span>

                        <label className="bill-qr-panel-label">{t("bill_qr_account_no")}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="bill-qr-input"
                          value={data.accountNo}
                          onChange={(e) => update("accountNo", e.target.value.replace(/\D/g, ""))}
                        />

                        <label className="bill-qr-panel-label">{t("bill_qr_account_name")}</label>
                        <input
                          className="bill-qr-input"
                          value={data.accountName}
                          onChange={(e) => update("accountName", e.target.value.toUpperCase())}
                        />
                      </>
                    )}

                    {qrMode === "image" && (
                      <>
                        <label className="bill-qr-panel-label">{t("bill_qr_upload_label")}</label>
                        <button type="button" className="bill-qr-upload" onClick={() => qrFileRef.current?.click()}>
                          <IconPhotoUp size={14} stroke={1.8} />
                          {data.qrImage ? t("bill_qr_change_img") : t("bill_qr_choose_img")}
                        </button>
                        <input
                          ref={qrFileRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleQrUpload(e.target.files?.[0])}
                        />
                      </>
                    )}

                    {qrMode === "link" && (
                      <>
                        <label className="bill-qr-panel-label">{t("bill_qr_or_link")}</label>
                        <input
                          className="bill-qr-input"
                          value={data.qrText}
                          onChange={(e) => update("qrText", e.target.value)}
                          placeholder={t("bill_qr_link_placeholder")}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bill-footer">
            <div className="bill-footer-hi">
              {t("bill_footer_thanks")} <IconHeartFilled size={16} style={{ color: "currentColor" }} />
            </div>
            <div className="bill-footer-msg">
              <input
                className={`${ec} bill-ec-footer`}
                value={data.footer}
                onChange={(e) => update("footer", e.target.value)}
                placeholder={t("bill_footer_msg_placeholder")}
              />
            </div>
            <div className="bill-footer-cta">
              <IconStarFilled size={12} /> {t("bill_footer_cta")} <IconStarFilled size={12} />
            </div>
          </div>
        </div>
      </div>

      <aside className="bill-side">
        {editing && (
          <div className="bill-theme-bar" role="group" aria-label={t("bill_theme")}>
            <span className="bill-theme-bar-label">
              <IconPalette size={13} stroke={1.8} /> {t("bill_theme")}
            </span>
            <div className="bill-theme-swatches">
              {THEMES.map((th) => (
                <button
                  key={th.key}
                  type="button"
                  className={`bill-theme-sw${data.theme === th.key ? " on" : ""}`}
                  style={{ background: th.color }}
                  onClick={() => update("theme", th.key)}
                  title={th.label}
                  aria-label={th.label}
                  aria-pressed={data.theme === th.key}
                />
              ))}
            </div>
          </div>
        )}

        <div className="bill-side-divider" />

        <div className="bill-cta-row">
          <Button
            size="sm"
            variant="subtle"
            onClick={copyImage}
            disabled={busy}
            leftIcon={<IconCopy size={15} stroke={1.8} />}
          >
            {t("bill_btn_copy")}
          </Button>
          <Button
            className="bill-download"
            onClick={download}
            disabled={busy}
            loading={busy}
            leftIcon={!busy ? <IconDownload size={16} stroke={1.8} /> : undefined}
          >
            {busy ? t("bill_btn_exporting") : t("bill_btn_download")}
          </Button>
        </div>

        <div className="bill-side-divider" />

        <div className="bill-side-hint">
          <IconPencil size={13} stroke={1.9} />
          <span>{t("bill_hint")}</span>
        </div>
      </aside>
    </div>
  );
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bill-meta-row">
      <span className="bill-meta-icon">{icon}</span>
      <div className="bill-meta-body">
        <b>{label}</b>
        <span className="bill-meta-value">{children}</span>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
