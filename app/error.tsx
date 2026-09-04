"use client";
import { useEffect } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconRefresh, IconHome } from "@tabler/icons-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="err-page">
      <div className="err-icon">
        <IconAlertTriangle size={46} stroke={1.6} />
      </div>
      <h1>Đã có lỗi xảy ra</h1>
      <p>{error.message || "Something went wrong. Try again."}</p>
      {error.digest && <code className="err-digest">digest: {error.digest}</code>}
      <div className="err-actions">
        <button className="btn btn-p" onClick={reset}>
          <IconRefresh size={15} stroke={1.9} /> Thử lại
        </button>
        <Link className="btn btn-g" href="/">
          <IconHome size={15} stroke={1.9} /> Về trang chủ
        </Link>
      </div>
    </div>
  );
}
