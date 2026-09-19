"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconRefresh, IconReload, IconTrophy } from "@tabler/icons-react";
import { Button, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type WordLang = "vi" | "en";

// Common-word pools — the 200 most frequent words are plenty for a speed test.
const WORDS: Record<WordLang, string[]> = {
  en: "the of and to in is you that it he was for on are as with his they at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part over new sound take only little work know place year live me back give most very after thing our just name good sentence man think say great where help through much before line right too mean old any same tell boy follow came want show also around form three small set put end does another well large must big even such because turn here why ask went men read need land different home us move try kind hand picture again change off play spell air away animal house point page letter mother answer found study still learn should America world".split(" "),
  vi: "và của là các có một người được không này để trong đã những cho với khi từ như về trên ra hay theo cũng đến vào nếu thì sau cả nhiều nhưng lại thế nên bị mà ai gì đâu nào sao rồi vẫn chỉ còn rất quá hơn nhất mỗi bao giờ đây kia ấy vậy chúng tôi bạn anh chị em ông bà con nhà cửa nước non xanh đỏ vàng trắng đen to nhỏ dài ngắn cao thấp nhanh chậm mới cũ tốt xấu vui buồn yêu thương ghét giận cười khóc ăn uống ngủ nghỉ làm việc học hành chơi đùa đi lại chạy nhảy nói năng nghe nhìn thấy biết hiểu nhớ quên tìm gặp mua bán cho tặng nhận lấy giữ mở đóng lên xuống trước vào giữa cạnh gần đường phố quê hương thành công cố gắng ước mơ hy vọng niềm tin cuộc sống thời gian không gian".split(" "),
};

const DURATIONS = [30, 60, 120];
const WORD_COUNT = 200;

function makeWords(lang: WordLang) {
  const pool = WORDS[lang];
  const out: string[] = [];
  for (let i = 0; i < WORD_COUNT; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
  return out;
}

export default function TypingTestTool() {
  const { t, lang: uiLang } = useI18n();

  const [wordLang, setWordLang] = useState<WordLang>("vi");
  const [duration, setDuration] = useState(60);
  const [words, setWords] = useState<string[]>(() => makeWords("vi"));
  const [typed, setTyped] = useState<string[]>([]); // finalized words the user has committed
  const [current, setCurrent] = useState(""); // current input buffer
  const [idx, setIdx] = useState(0); // index of the word being typed

  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [keystrokes, setKeystrokes] = useState(0);
  const [best, setBest] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);

  const bestKey = useMemo(() => `fb-typing-best-${wordLang}-${duration}`, [wordLang, duration]);

  // load best score for current config
  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(bestKey) || 0));
    } catch {
      setBest(0);
    }
  }, [bestKey]);

  const reset = useCallback(
    (nextLang: WordLang = wordLang, regenerate = true) => {
      setWords((prev) => (regenerate ? makeWords(nextLang) : prev));
      setTyped([]);
      setCurrent("");
      setIdx(0);
      setRunning(false);
      setFinished(false);
      setKeystrokes(0);
      setTimeLeft(duration);
      startRef.current = null;
    },
    [wordLang, duration],
  );

  // reset when config changes
  useEffect(() => {
    reset(wordLang, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordLang, duration]);

  // countdown timer
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setTimeLeft((tl) => {
        if (tl <= 1) {
          window.clearInterval(id);
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return tl - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // keep the active word in view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [idx]);

  // stats
  const correctCount = useMemo(
    () => typed.reduce((n, w, i) => (w === words[i] ? n + 1 : n), 0),
    [typed, words],
  );
  const wrongCount = typed.length - correctCount;
  const elapsedMin = useMemo(() => {
    const used = duration - timeLeft;
    return used > 0 ? used / 60 : duration / 60;
  }, [duration, timeLeft]);
  const wpm = finished || running ? Math.round(correctCount / Math.max(elapsedMin, 1 / 60)) : 0;
  const cpm = useMemo(() => {
    const chars = typed.reduce((n, w, i) => (w === words[i] ? n + w.length + 1 : n), 0);
    return finished || running ? Math.round(chars / Math.max(elapsedMin, 1 / 60)) : 0;
  }, [typed, words, elapsedMin, finished, running]);
  const accuracy = keystrokes > 0 ? Math.round((correctCount / Math.max(typed.length, 1)) * 100) : 100;

  // persist best on finish
  useEffect(() => {
    if (!finished) return;
    if (wpm > best) {
      setBest(wpm);
      try {
        localStorage.setItem(bestKey, String(wpm));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (finished) return;
    const val = e.target.value;

    if (!running && val.length > 0) {
      setRunning(true);
      startRef.current = Date.now();
    }

    // space commits the current word
    if (val.endsWith(" ")) {
      const word = val.trimEnd();
      if (word.length === 0) return; // ignore leading spaces
      setTyped((prev) => [...prev, word]);
      setCurrent("");
      setIdx((i) => i + 1);
      setKeystrokes((k) => k + 1);
      return;
    }
    setCurrent(val);
    setKeystrokes((k) => k + 1);
  };

  const stats = [
    { label: t("typing_wpm"), value: wpm, accent: true },
    { label: t("typing_cpm"), value: cpm },
    { label: t("typing_accuracy"), value: `${accuracy}%` },
    { label: t("typing_correct"), value: correctCount, tone: "ok" as const },
    { label: t("typing_wrong"), value: wrongCount, tone: "err" as const },
    { label: t("typing_time_left"), value: `${timeLeft}s`, warn: timeLeft <= 10 && running },
  ];

  return (
    <div className="tt">
      {/* controls */}
      <div className="tt-controls">
        <label className="tt-ctl">
          <span>{t("typing_lang")}</span>
          <Select
            value={wordLang}
            onChange={(e) => setWordLang(e.target.value as WordLang)}
            options={[
              { value: "vi", label: t("typing_lang_vi") },
              { value: "en", label: t("typing_lang_en") },
            ]}
          />
        </label>
        <label className="tt-ctl">
          <span>{t("typing_duration")}</span>
          <Select
            value={String(duration)}
            onChange={(e) => setDuration(Number(e.target.value))}
            options={DURATIONS.map((d) => ({ value: String(d), label: `${d}s` }))}
          />
        </label>
        <div className="tt-best">
          <IconTrophy size={16} stroke={1.8} />
          <span>{t("typing_best")}</span>
          <strong>{best}</strong>
          <span className="tt-unit">{t("typing_wpm")}</span>
        </div>
      </div>

      {/* stats row */}
      <div className="tt-stats">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`tt-stat${s.accent ? " tt-stat-accent" : ""}${s.warn ? " tt-stat-warn" : ""}`}
          >
            <div
              className="tt-stat-val"
              style={s.tone === "ok" ? { color: "var(--ok)" } : s.tone === "err" ? { color: "var(--err)" } : undefined}
            >
              {s.value}
            </div>
            <div className="tt-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* words */}
      <div className="tt-words" ref={listRef} onClick={() => inputRef.current?.focus()}>
        {words.map((w, i) => {
          let cls = "tt-word";
          if (i < typed.length) cls += typed[i] === w ? " tt-word-ok" : " tt-word-bad";
          else if (i === idx) cls += " tt-word-active";
          return (
            <span key={i} className={cls} ref={i === idx ? activeRef : undefined}>
              {i === idx ? (
                <>
                  {w.split("").map((ch, ci) => {
                    const typedCh = current[ci];
                    let chCls = "";
                    if (typedCh != null) chCls = typedCh === ch ? "tt-ch-ok" : "tt-ch-bad";
                    return (
                      <span key={ci} className={chCls}>
                        {ch}
                      </span>
                    );
                  })}
                  {current.length > w.length && <span className="tt-ch-bad">{current.slice(w.length)}</span>}
                </>
              ) : (
                w
              )}
            </span>
          );
        })}
      </div>

      {/* input + actions */}
      <div className="tt-bottom">
        <input
          ref={inputRef}
          className="tt-input"
          value={current}
          onChange={onChange}
          disabled={finished}
          placeholder={finished ? t("typing_finished") : t("typing_input_placeholder")}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={t("typing_input_placeholder")}
        />
        <Button variant="subtle" onClick={() => reset(wordLang, false)} title={t("typing_restart")}>
          <IconRefresh size={16} stroke={1.8} />
          {t("typing_restart")}
        </Button>
        <Button variant="ghost" onClick={() => reset(wordLang, true)} title={t("typing_new_words")}>
          <IconReload size={16} stroke={1.8} />
          {t("typing_new_words")}
        </Button>
      </div>

      {!running && !finished && <p className="tt-hint">{t("typing_start_hint")}</p>}
    </div>
  );
}
