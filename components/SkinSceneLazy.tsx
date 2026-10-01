"use client";
import dynamic from "next/dynamic";
import { useSkin } from "@/lib/skin-context";

// three.js is only needed for the seasonal skins — keep it out of the shared
// bundle so the default skin never downloads or parses it.
const SkinScene = dynamic(() => import("./SkinScene"), { ssr: false });

export default function SkinSceneLazy() {
  const { skin } = useSkin();
  if (skin === "modern") return null;
  return <SkinScene />;
}
