"use client";
import { useI18n } from "@/lib/i18n";

export default function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={lang === "vi" ? "on" : ""}
        onClick={() => setLang("vi")}
        aria-pressed={lang === "vi"}
      >
        VI
      </button>
      <button
        type="button"
        className={lang === "en" ? "on" : ""}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}
