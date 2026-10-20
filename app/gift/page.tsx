import { notFound } from "next/navigation";

// The bare /gift URL is intentionally hidden — the real page lives at
// /gift/[token] with a secret slug (see GIFT_TOKEN below).
export const metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  notFound();
}
