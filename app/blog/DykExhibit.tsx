"use client";

import { Button, IconButton } from "@/components/ui";
import { stampNeeded, type DykStampPass, type DykStampStyle } from "@/lib/dyk-shared";
import { awardStamp, getStamp, useDykStamps, type DykStamp } from "@/lib/dyk-stamps";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconPhoto,
  IconPuzzle,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Stamp, type StampFace } from "./DykStamp";

type Text = { vi: string; en: string };

type QuizQuestion = {
  question: Text;
  options: Text[];
  answer: number;
  explain: Text;
  scope: "exhibit" | "topic";
};

export type DykExhibitView = {
  slug: string;
  // Số thứ tự hiện vật ("012"), cũng là mệnh giá in trên tem.
  no: string;
  title: Text;
  intro: Text;
  tag: Text;
  images: { url: string; caption: Text; credit: ImageCredit | null }[];
  quiz: QuizQuestion[];
  stamp: { style: DykStampStyle; color: string; label: Text; image: string; pass: DykStampPass };
};

export type ImageCredit = { label: string; url?: string };

export const exhibitNumber = (index: number) => String(index + 1).padStart(3, "0");

const IMAGE_HOSTS: [RegExp, string][] = [
  [/unsplash\.com$/, "Unsplash"],
  [/pexels\.com$/, "Pexels"],
  [/pixabay\.com$/, "Pixabay"],
  [/wikimedia\.org$/, "Wikimedia Commons"],
  [/pollinations\.ai$/, "Pollinations AI"],
];

// Our own storage is where uploads live, not where they came from.
const OWN_STORAGE = /r2\.dev$|r2\.cloudflarestorage\.com$|supabase\.co$|formatbox/;

// Items saved before credits were stored only have the image URL to go on.
export function imageCredit(im: { url: string; credit?: string; credit_url?: string }): ImageCredit | null {
  let host = "";
  try {
    host = new URL(im.url).hostname.replace(/^www\./, "");
  } catch {}
  const known = IMAGE_HOSTS.find(([re]) => re.test(host))?.[1];
  const source = known ?? (OWN_STORAGE.test(host) ? "" : host);
  const name = im.credit?.trim() || "";
  const label = name && source && name !== source ? `${name} / ${source}` : name || source;
  if (!label) return null;
  return { label, url: im.credit_url || undefined };
}

export function exhibitStampFace(item: DykExhibitView, lang: "vi" | "en"): StampFace {
  const pick = (v: Text) => (lang === "en" ? v.en : v.vi);
  return {
    slug: item.slug,
    title: pick(item.title),
    label: pick(item.stamp.label) || pick(item.tag),
    image: item.stamp.image || item.images[0]?.url || "",
    no: item.no,
    style: item.stamp.style,
    color: item.stamp.color,
  };
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const pad2 = (n: number) => String(n).padStart(2, "0");

// A visit is a walk through rooms: 0 is the entrance, 1..n the images, n+1 the quiz.
export function DykExhibit({
  item,
  onClose,
  onNext,
}: {
  item: DykExhibitView;
  onClose: () => void;
  onNext?: () => void;
}) {
  const { t, lang } = useI18n();
  const tr = (v: Text) => (lang === "en" ? v.en : v.vi);

  const artCount = item.images.length;
  const hasQuiz = item.quiz.length > 0;
  const lastRoom = artCount + (hasQuiz ? 1 : 0);
  const quizRoom = hasQuiz ? lastRoom : -1;
  const needed = stampNeeded(item.stamp.pass, item.quiz.length);

  const [room, setRoom] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());

  const face = useMemo(() => exhibitStampFace(item, lang), [item, lang]);
  const owned = useDykStamps().find((s) => s.slug === item.slug) ?? null;

  const go = useCallback(
    (to: number) => {
      const target = Math.max(0, Math.min(lastRoom, to));
      setRoom(target);
      setSeen((s) => new Set(s).add(target));
    },
    [lastRoom],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Arrow keys on the volume slider must change the volume, not the room.
      if ((e.target as HTMLElement).closest?.(".bd-tools-music")) return;
      if (e.key === "ArrowRight") go(room + 1);
      else if (e.key === "ArrowLeft") go(room - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, room]);

  // Warm the next image so the "lights on" reveal doesn't play over an empty frame.
  useEffect(() => {
    const upcoming = item.images[room];
    if (!upcoming) return;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = upcoming.url;
  }, [room, item.images]);

  const leaveLabel = onNext ? t("blog_dyk_next_exhibit") : t("blog_dyk_leave");
  const leave = onNext ?? onClose;
  const atEnd = room >= lastRoom;
  const advance = () => (atEnd ? leave() : go(room + 1));
  const advanceLabel = atEnd ? leaveLabel : room === artCount ? t("blog_dyk_to_quiz") : t("blog_dyk_continue");

  const art = room >= 1 && room <= artCount ? item.images[room - 1] : null;
  const isQuiz = room === quizRoom;
  const tag = tr(item.tag);

  return (
    <>
      <span
        className="mu-progress"
        role="progressbar"
        aria-label={t("blog_dyk_rooms")}
        aria-valuemin={0}
        aria-valuemax={lastRoom}
        aria-valuenow={room}
      >
        <i style={{ width: `${lastRoom ? (room / lastRoom) * 100 : 100}%` }} />
      </span>

      <div className="mu-stage">
        {room === 0 && (
          <div className="mu-gate">
            {item.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="mu-gate-bg" src={item.images[0].url} alt="" referrerPolicy="no-referrer" />
            )}
            <div className={`mu-ticket${hasQuiz ? "" : " mu-ticket--solo"}`}>
              <div className="mu-ticket-main">
                <span className="mu-kicker">
                  {t("blog_dyk_title")} · {t("blog_dyk_exhibit")} {item.no}
                </span>
                <h2>{tr(item.title)}</h2>
                <p className="mu-gate-hook">{t("blog_dyk_gate_hook")}</p>
                <ul className="mu-gate-meta">
                  {tag && <li className="mu-gate-tag">{tag}</li>}
                  {artCount > 0 && (
                    <li>
                      <IconPhoto size={14} stroke={1.8} />
                      <b>{artCount}</b> {t("blog_dyk_gate_views")}
                    </li>
                  )}
                  {hasQuiz && (
                    <li>
                      <IconPuzzle size={14} stroke={1.8} />
                      <b>{item.quiz.length}</b> {t("blog_dyk_gate_puzzles")}
                    </li>
                  )}
                </ul>
                <Button rightIcon={<IconArrowRight size={16} stroke={2} />} onClick={advance}>
                  {lastRoom === 0 ? leaveLabel : t("blog_dyk_enter")}
                </Button>
              </div>
              {hasQuiz && (
                <div className="mu-ticket-stub">
                  <span className="mu-kicker">{owned ? t("blog_dyk_owned") : t("blog_dyk_reward")}</span>
                  <Stamp
                    face={face}
                    size="sm"
                    locked={!owned}
                    earned={owned ? { score: owned.score, total: owned.total, at: owned.earnedAt } : null}
                  />
                  <span className="mu-gate-note">
                    {owned
                      ? t("blog_dyk_owned_note")
                      : `${t("blog_dyk_need_pre")} ${needed}/${item.quiz.length} ${t("blog_dyk_need_post")}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {art && (
          <div className="mu-exhibit" key={room}>
            <div className="mu-wall">
              <figure className="mu-frame">
                <span className="mu-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={art.url} alt={tr(art.caption)} referrerPolicy="no-referrer" />
                  {art.credit && (
                    <span className="mu-credit">
                      {t("blog_photo")}:{" "}
                      {art.credit.url ? (
                        <a href={art.credit.url} target="_blank" rel="noopener noreferrer">
                          {art.credit.label}
                        </a>
                      ) : (
                        art.credit.label
                      )}
                    </span>
                  )}
                </span>
              </figure>
              <span className="mu-brass">
                {t("blog_dyk_view")} {pad2(room)} / {pad2(artCount)}
              </span>
            </div>
            <aside className="mu-placard">
              <span className="mu-placard-no" aria-hidden="true">
                {pad2(room)}
              </span>
              <span className="mu-kicker">
                {t("blog_dyk_exhibit")} {item.no}
                {tag && ` · ${tag}`}
              </span>
              <p className="mu-caption">{tr(art.caption) || tr(item.title)}</p>
              <span className="mu-rule" aria-hidden="true" />
              <span className="mu-kicker">{t("blog_dyk_curator")}</span>
              <p className="mu-note">{tr(item.intro)}</p>
            </aside>
          </div>
        )}

        {/* Stays mounted so stepping back to an image doesn't reset the attempt. */}
        {hasQuiz && (
          <div className="mu-quiz-wrap" hidden={!isQuiz}>
            <DykQuiz
              quiz={item.quiz}
              nextLabel={leaveLabel}
              onNext={leave}
              face={face}
              tag={tag}
              needed={needed}
              owned={owned}
            />
          </div>
        )}
      </div>

      {room > 0 && (
        <footer className="mu-foot">
          <IconButton
            className="mu-foot-prev"
            aria-label={t("blog_dyk_prev_room")}
            onClick={() => go(room - 1)}
          >
            <IconArrowLeft size={18} stroke={2} />
          </IconButton>

          <div className="mu-strip">
            {item.images.map((im, i) => {
              const r = i + 1;
              const veiled = !seen.has(r);
              return (
                <Button
                  key={im.url}
                  variant="ghost"
                  className={`mu-thumb${room === r ? " is-active" : ""}${veiled ? " is-veiled" : ""}`}
                  aria-label={`${t("blog_dyk_view")} ${r}`}
                  aria-current={room === r}
                  onClick={() => go(r)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
                </Button>
              );
            })}
            {hasQuiz && (
              <Button
                variant="ghost"
                className={`mu-thumb mu-thumb--quiz${isQuiz ? " is-active" : ""}`}
                aria-label={t("blog_dyk_quiz_title")}
                aria-current={isQuiz}
                onClick={() => go(quizRoom)}
              >
                <IconPuzzle size={18} stroke={1.7} />
              </Button>
            )}
          </div>

          {!isQuiz && (
            <Button
              className="mu-foot-next"
              rightIcon={<IconArrowRight size={15} stroke={2} />}
              onClick={advance}
            >
              {advanceLabel}
            </Button>
          )}
        </footer>
      )}
    </>
  );
}

type Award = { stamp: DykStamp; status: "new" | "updated" | "kept" };

function DykQuiz({
  quiz,
  nextLabel,
  onNext,
  face,
  tag,
  needed,
  owned,
}: {
  quiz: QuizQuestion[];
  nextLabel: string;
  onNext: () => void;
  face: StampFace;
  tag: string;
  needed: number;
  owned: DykStamp | null;
}) {
  const { t, lang } = useI18n();
  const tr = (v: Text) => (lang === "en" ? v.en : v.vi);

  const [at, setAt] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  // Kết quả từng câu, để vẽ thanh tiến độ đúng/sai.
  const [marks, setMarks] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  // undefined = chưa chấm; null = không đủ điểm và chưa từng có tem.
  const [award, setAward] = useState<Award | null | undefined>(undefined);

  const q = quiz[at];
  const answered = pick != null;
  const isLast = at === quiz.length - 1;
  const score = marks.filter(Boolean).length;
  const passed = score >= needed;

  function choose(option: number) {
    if (answered) return;
    setPick(option);
    setMarks((m) => [...m, option === q.answer]);
  }

  function step() {
    if (isLast) {
      setDone(true);
      return;
    }
    setAt((i) => i + 1);
    setPick(null);
  }

  function retry() {
    setAt(0);
    setPick(null);
    setMarks([]);
    setDone(false);
    setAward(undefined);
  }

  // Trao tem khi vào màn kết quả, nếu đạt ngưỡng admin đặt cho hiện vật này.
  useEffect(() => {
    if (!done || award !== undefined) return;
    if (!passed) {
      const prev = getStamp(face.slug);
      setAward(prev ? { stamp: prev, status: "kept" } : null);
      return;
    }
    const r = awardStamp({
      slug: face.slug,
      title: face.title,
      tag,
      image: face.image,
      score,
      total: quiz.length,
      earnedAt: Date.now(),
      no: face.no,
      style: face.style,
      color: face.color,
      label: face.label,
    });
    setAward({ stamp: r.best, status: r.isNew ? "new" : r.saved ? "updated" : "kept" });
  }, [done, award, passed, score, quiz.length, face, tag]);

  const needText = `${t("blog_dyk_need_pre")} ${needed}/${quiz.length} ${t("blog_dyk_need_post")}`;

  if (done) {
    const ratio = quiz.length ? score / quiz.length : 0;
    const rank = ratio === 1 ? "blog_dyk_rank_high" : ratio >= 0.5 ? "blog_dyk_rank_mid" : "blog_dyk_rank_low";
    const awardKey = !award
      ? "blog_dyk_stamp_missed"
      : !passed
        ? "blog_dyk_stamp_missed"
        : award.status === "new"
          ? "blog_dyk_stamp_new"
          : award.status === "updated"
            ? "blog_dyk_stamp_updated"
            : "blog_dyk_stamp_kept";
    return (
      <div className="mu-result" role="status">
        <div className="mu-result-stamp">
          <Stamp
            face={face}
            size="lg"
            locked={!award}
            pop={!!award && passed && award.status !== "kept"}
            earned={award ? { score: award.stamp.score, total: award.stamp.total, at: award.stamp.earnedAt } : null}
          />
        </div>
        <div className="mu-result-text">
          <span className="mu-kicker">{t(rank)}</span>
          <strong className="mu-score">
            {score}
            <small> / {quiz.length}</small>
          </strong>
          <ol className="mu-pips" aria-hidden="true">
            {quiz.map((_, i) => (
              <li key={i} className={marks[i] ? "is-right" : "is-wrong"} />
            ))}
          </ol>
          <span className={`mu-award${passed ? " is-won" : ""}`}>{t(awardKey)}</span>
          {!passed && <span className="mu-need">{needText}</span>}
          <p className="mu-end">{t("blog_dyk_end")}</p>
          <div className="mu-result-acts">
            <Button variant="ghost" leftIcon={<IconRefresh size={15} stroke={2} />} onClick={retry}>
              {t("blog_dyk_quiz_retry")}
            </Button>
            <Button rightIcon={<IconArrowRight size={15} stroke={2} />} onClick={onNext}>
              {nextLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const right = answered && pick === q.answer;

  return (
    <div className="mu-trial">
      <div className="mu-quiz">
        <div className="mu-quiz-head">
          <span className="mu-kicker">
            <IconPuzzle size={14} stroke={1.8} /> {t("blog_dyk_quiz_title")}
          </span>
          <span className="mu-kicker">
            {t("blog_dyk_quiz_q")} {at + 1} / {quiz.length}
          </span>
        </div>
        <ol className="mu-pips" aria-hidden="true">
          {quiz.map((_, i) => (
            <li
              key={i}
              className={i < marks.length ? (marks[i] ? "is-right" : "is-wrong") : i === at ? "is-now" : undefined}
            />
          ))}
        </ol>

        <span className={`mu-scope mu-scope--${q.scope}`}>
          {t(q.scope === "topic" ? "blog_dyk_scope_topic" : "blog_dyk_scope_exhibit")}
        </span>
        <h3>{tr(q.question)}</h3>

        <div className="mu-opts">
          {q.options.map((opt, i) => {
            const isRight = answered && i === q.answer;
            const isWrong = answered && i === pick && i !== q.answer;
            const state = isRight ? " is-right" : isWrong ? " is-wrong" : answered ? " is-faded" : "";
            return (
              <Button
                key={i}
                variant="ghost"
                className={`mu-opt${state}`}
                aria-disabled={answered}
                onClick={() => choose(i)}
              >
                <span className="mu-opt-key">
                  {isRight ? (
                    <IconCheck size={14} stroke={2.4} />
                  ) : isWrong ? (
                    <IconX size={14} stroke={2.4} />
                  ) : (
                    LETTERS[i]
                  )}
                </span>
                <span>{tr(opt)}</span>
              </Button>
            );
          })}
        </div>

        <div className="mu-quiz-after" aria-live="polite">
          {answered && (
            <>
              <p className={`mu-explain${right ? " is-right" : " is-wrong"}`}>
                <b>{t(right ? "blog_dyk_correct" : "blog_dyk_wrong")}</b>
                {tr(q.explain) && <span>{tr(q.explain)}</span>}
              </p>
              <Button rightIcon={<IconArrowRight size={15} stroke={2} />} onClick={step}>
                {isLast ? t("blog_dyk_quiz_finish") : t("blog_dyk_quiz_next")}
              </Button>
            </>
          )}
        </div>
      </div>

      <aside className="mu-trial-side">
        <span className="mu-kicker">{owned ? t("blog_dyk_owned") : t("blog_dyk_reward")}</span>
        <Stamp
          face={face}
          size="md"
          locked={!owned}
          earned={owned ? { score: owned.score, total: owned.total, at: owned.earnedAt } : null}
        />
        <span className="mu-trial-need">{needText}</span>
        <span className="mu-trial-score">
          {t("blog_dyk_score")} <b>{score}</b> / {quiz.length}
        </span>
      </aside>
    </div>
  );
}
