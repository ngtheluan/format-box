import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

// Secret slug — only this value unlocks the page. Rotate anytime by changing
// this string (and resending the new link to the recipient). Not stored
// anywhere else, so leaking a share link is the only way to leak the gift.
const GIFT_TOKEN = "bu-bu-20102026-M8e6dalU-wEliA";

const GiftTool = dynamic(() => import("../GiftTool"), { ssr: false });

export const metadata: Metadata = {
  title: "Dành bạn, cả một vườn thương — Happy Women's Day 20/10",
  description: "Một món quà nhỏ dịu dàng cho người bạn thương — ngày 20/10.",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page({ params }: { params: { token: string } }) {
  if (params.token !== GIFT_TOKEN) notFound();
  return <GiftTool />;
}
