"use client";
import { useEffect } from "react";
import { IconAlertTriangle, IconRefresh, IconHome } from "@tabler/icons-react";
import { Button, HStack } from "@/components/ui";

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
      <HStack gap={10} justify="center" wrap className="err-actions">
        <Button onClick={reset} leftIcon={<IconRefresh size={15} stroke={1.9} />}>
          Thử lại
        </Button>
        <Button href="/" variant="ghost" leftIcon={<IconHome size={15} stroke={1.9} />}>
          Về trang chủ
        </Button>
      </HStack>
    </div>
  );
}
