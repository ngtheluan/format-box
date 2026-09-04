"use client";
import { useEffect, useState } from "react";
import { IconArrowUp } from "@tabler/icons-react";

export default function ScrollTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      className={`scroll-top${show ? " show" : ""}`}
      aria-label="Về đầu trang"
      title="Về đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <IconArrowUp size={18} stroke={2} />
    </button>
  );
}
