import type { Metadata } from "next";
import dynamic from "next/dynamic";

const GiftTool = dynamic(() => import("./GiftTool"), { ssr: false });

export const metadata: Metadata = {
  title: "Dành bạn, cả một vườn thương — Happy Women's Day 20/10",
  description: "Một món quà nhỏ dịu dàng cho người bạn thương — ngày 20/10.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GiftTool />;
}
