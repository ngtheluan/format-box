"use client";

import { Corners } from "@/components/BlogCard";
import { Button, IconButton } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconPuzzle,
  IconRefresh,
  IconRosette,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

type Text = { vi: string; en: string };

type QuizQuestion = { question: Text; options: Text[]; answer: number; explain: Text };

export type DykExhibitView = {
  slug: string;
  title: Text;
  intro: Text;
  tag: Text;
  images: { url: string; caption: Text; credit: ImageCredit | null }[];
  quiz: QuizQuestion[];
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

const LETTERS = ["A", "B", "C", "D", "E", "F"];

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

  const [room, setRoom] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());

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

  return (
    <>
      <div className="mu-stage">
        {room === 0 && (
          <div className="mu-gate">
            {item.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="mu-gate-bg" src={item.images[0].url} alt="" referrerPolicy="no-referrer" />
            )}
            <div className="mu-gate-text">
              <span className="mu-kicker">{t("blog_dyk_title")}</span>
              <h2>{tr(item.title)}</h2>
              <p>{t("blog_dyk_gate_hook")}</p>
              <span className="mu-gate-meta">
                {artCount > 0 && (
                  <span>
                    {artCount} {t("blog_dyk_gate_views")}
                  </span>
                )}
                {hasQuiz && (
                  <span>
                    {item.quiz.length} {t("blog_dyk_gate_puzzles")}
                  </span>
                )}
              </span>
              <Button rightIcon={<IconArrowRight size={16} stroke={2} />} onClick={advance}>
                {lastRoom === 0 ? leaveLabel : t("blog_dyk_enter")}
              </Button>
            </div>
          </div>
        )}

        {art && (
          <div className="mu-exhibit" key={room}>
            <figure className="mu-frame">
              <Corners />
              <span className="mu-beam" aria-hidden="true" />
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
            <aside className="mu-placard">
              <span className="mu-kicker">
                {t("blog_dyk_view")} {room} / {artCount}
              </span>
              <p className="mu-caption">{tr(art.caption)}</p>
              <span className="mu-rule" aria-hidden="true" />
              <span className="mu-kicker">{t("blog_dyk_curator")}</span>
              <p className="mu-note">{tr(item.intro)}</p>
            </aside>
          </div>
        )}

        {/* Stays mounted so stepping back to an image doesn't reset the attempt. */}
        {hasQuiz && (
          <div className="mu-quiz-wrap" hidden={!isQuiz}>
            <DykQuiz quiz={item.quiz} nextLabel={leaveLabel} onNext={leave} />
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

function DykQuiz({
  quiz,
  nextLabel,
  onNext,
}: {
  quiz: QuizQuestion[];
  nextLabel: string;
  onNext: () => void;
}) {
  const { t, lang } = useI18n();
  const tr = (v: Text) => (lang === "en" ? v.en : v.vi);

  const [at, setAt] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = quiz[at];
  const answered = pick != null;
  const isLast = at === quiz.length - 1;

  function choose(option: number) {
    if (answered) return;
    setPick(option);
    if (option === q.answer) setScore((s) => s + 1);
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
    setScore(0);
    setDone(false);
  }

  if (done) {
    const ratio = score / quiz.length;
    const rank = ratio === 1 ? "blog_dyk_rank_high" : ratio >= 0.5 ? "blog_dyk_rank_mid" : "blog_dyk_rank_low";
    return (
      <div className="mu-result" role="status">
        <IconRosette size={44} stroke={1.3} />
        <strong className="mu-score">
          {score}
          <small> / {quiz.length}</small>
        </strong>
        <span className="mu-rank">{t(rank)}</span>
        <p className="mu-end">{t("blog_dyk_end")}</p>
        <div className="mu-result-acts">
          <Button
            variant="ghost"
            leftIcon={<IconRefresh size={15} stroke={2} />}
            onClick={retry}
          >
            {t("blog_dyk_quiz_retry")}
          </Button>
          <Button rightIcon={<IconArrowRight size={15} stroke={2} />} onClick={onNext}>
            {nextLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mu-quiz">
      <div className="mu-quiz-head">
        <span className="mu-kicker">
          <IconPuzzle size={14} stroke={1.8} /> {t("blog_dyk_quiz_title")}
        </span>
        <span className="mu-kicker">
          {t("blog_dyk_quiz_q")} {at + 1} / {quiz.length}
        </span>
      </div>
      <h3>{tr(q.question)}</h3>

      <div className="mu-opts">
        {q.options.map((opt, i) => {
          const right = answered && i === q.answer;
          const wrong = answered && i === pick && i !== q.answer;
          const state = right ? " is-right" : wrong ? " is-wrong" : answered ? " is-faded" : "";
          return (
            <Button
              key={i}
              variant="ghost"
              className={`mu-opt${state}`}
              aria-disabled={answered}
              onClick={() => choose(i)}
            >
              <span className="mu-opt-key">
                {right ? (
                  <IconCheck size={14} stroke={2.4} />
                ) : wrong ? (
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
            {tr(q.explain) && <p className="mu-explain">{tr(q.explain)}</p>}
            <Button rightIcon={<IconArrowRight size={15} stroke={2} />} onClick={step}>
              {isLast ? t("blog_dyk_quiz_finish") : t("blog_dyk_quiz_next")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
