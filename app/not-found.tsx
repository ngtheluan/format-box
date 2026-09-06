import { IconHome, IconSearch } from "@tabler/icons-react";
import { Button, HStack } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="err-page">
      <div className="err-icon err-icon-404">404</div>
      <h1>Không tìm thấy trang</h1>
      <p>Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.</p>
      <HStack gap={10} justify="center" wrap className="err-actions">
        <Button href="/" leftIcon={<IconHome size={15} stroke={1.9} />}>
          Về trang chủ
        </Button>
        <Button href="/#tools" variant="ghost" leftIcon={<IconSearch size={15} stroke={1.9} />}>
          Xem tất cả công cụ
        </Button>
      </HStack>
    </div>
  );
}
