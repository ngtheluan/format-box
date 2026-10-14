"use client";
import { Button, Spinner } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { IconArrowLeft, IconDownload, IconRoute } from "@tabler/icons-react";
import * as htmlToImage from "html-to-image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import TripCard from "../TripCard";
import { decodeTrip, type Trip } from "../shared";

export default function TripView() {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "invalid">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) {
      setStatus("invalid");
      return;
    }
    const decoded = decodeTrip(raw);
    if (decoded) {
      setTrip(decoded);
      setStatus("ready");
    } else {
      setStatus("invalid");
    }
  }, []);

  const download = useCallback(async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      const slug = (trip?.title || "lo-trinh").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      a.download = `${slug || "lo-trinh"}.png`;
      a.click();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }, [trip]);

  if (status === "loading") {
    return (
      <div className="trip-view-state">
        <Spinner />
      </div>
    );
  }

  if (status === "invalid" || !trip) {
    return (
      <div className="trip-view-state">
        <IconRoute size={40} stroke={1.3} />
        <p>{t("trip_view_invalid")}</p>
        <Button href="/travel-plan" variant="primary" leftIcon={<IconArrowLeft size={16} />}>
          {t("trip_view_make")}
        </Button>
      </div>
    );
  }

  return (
    <div className="trip-view">
      <div className="trip-view-bar">
        <Link href="/travel-plan" className="trip-view-back">
          <IconArrowLeft size={16} />
          {t("trip_view_make")}
        </Link>
        <Button size="sm" loading={busy} leftIcon={<IconDownload size={16} />} onClick={download}>
          {t("trip_download")}
        </Button>
      </div>
      <div className="trip-view-card">
        <TripCard ref={cardRef} trip={trip} />
      </div>
    </div>
  );
}
