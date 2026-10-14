App Router là kiến trúc routing mới của Next.js, ra mắt ổn định từ phiên bản 13 và trở thành mặc định ở Next.js 14. Nếu bạn đang chuyển từ Pages Router hoặc mới làm quen Next.js, bài này sẽ giúp bạn hiểu đúng, tránh những cú lừa phổ biến.

## App Router là gì?

App Router dùng thư mục `app/` làm gốc. Mỗi folder tương ứng một route, mỗi file đặc biệt (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`) định nghĩa một vai trò trong cây giao diện.

- `page.tsx` — nội dung chính của route.
- `layout.tsx` — khung bao, giữ nguyên khi điều hướng giữa các route con.
- `loading.tsx` — UI loading tự động dùng React Suspense.
- `error.tsx` — ranh giới lỗi (error boundary) cho nhánh con.

## Server Components vs Client Components

Trong App Router, mọi component mặc định là **Server Component**. Chúng chạy trên server, không gửi JS về client, có thể `await` trực tiếp dữ liệu.

Chỉ khi cần tương tác (state, effect, event listener), bạn mới dùng **Client Component** bằng cách thêm chỉ thị:

```
"use client";
```

> Nguyên tắc: giữ Server Component ở ngoài cùng, đẩy Client Component vào càng sâu càng tốt. Bundle JS sẽ nhỏ hơn, trang nhanh hơn.

## Data fetching: đơn giản hơn tưởng tượng

Quên `getStaticProps`, `getServerSideProps` đi. Trong Server Component bạn chỉ cần:

```
async function Page() {
  const res = await fetch("https://api.example.com/posts", { next: { revalidate: 60 } });
  const posts = await res.json();
  return 

;
}
```

Các tuỳ chọn chính:

- `cache: &quot;no-store&quot;` → SSR mỗi request.
- `next: { revalidate: N }` → ISR, cache N giây.
- Không cấu hình → cache mặc định (tối ưu).

## Routing nâng cao

1. **Dynamic routes**: `app/blog/[slug]/page.tsx`.
2. **Catch-all**: `app/docs/[...slug]/page.tsx`.
3. **Route groups**: tên folder bọc trong ngoặc `(group)` không ảnh hưởng URL — dùng để nhóm layout.
4. **Parallel routes**: slot `@sidebar`, `@modal` render song song.

## Server Actions: xử lý form không cần API route

Thêm `&quot;use server&quot;` ở đầu một hàm async và dùng trực tiếp trong form:

```
async function addTodo(formData: FormData) {
  "use server";
  await db.todos.insert({ title: formData.get("title") });
}
```

## Những sai lầm thường gặp

- Bỏ `&quot;use client&quot;` nhưng dùng `useState` → build fail.
- Fetch trong Client Component rồi than "sao chậm" — hãy đưa lên Server Component.
- Dùng `router.push` cho navigation có full reload — thay bằng `<Link>`.
- Quên `revalidateTag` / `revalidatePath` sau khi mutate → dữ liệu cũ.

## Checklist cho dự án mới

1. Khởi tạo bằng `pnpm create next-app@latest`.
2. Thiết lập `app/layout.tsx` với font + metadata.
3. Chia theo tính năng: `app/(marketing)`, `app/(app)`.
4. Thêm `loading.tsx` cho mỗi nhánh nặng dữ liệu.
5. Dùng `revalidate` hợp lý — đừng cache quá lâu dữ liệu nhạy cảm.

## Kết luận

App Router buộc bạn suy nghĩ lại về ranh giới server / client. Khi quen rồi, bạn sẽ thấy nó đơn giản và mạnh mẽ hơn Pages Router rất nhiều — đặc biệt khi kết hợp Server Components và Server Actions.
