import type { ReactNode } from "react";

// Blog pages hide the global Nav for an immersive, editorial reading experience.
// The `blog-root` class is a CSS hook (see blog.css) that hides the fixed nav
// and strips the body's top padding that normally reserves space for it.
export default function BlogLayout({ children }: { children: ReactNode }) {
  return <div className="blog-root">{children}</div>;
}
