Pipeline CI/CD tốt giúp bạn phát hiện lỗi sớm, deploy an tâm và không còn "sợ Thứ Sáu". Bài này hướng dẫn bạn dựng pipeline từ con số 0 bằng GitHub Actions trong khoảng 15 phút.

## Vì sao chọn GitHub Actions?

- Tích hợp sẵn với repo — không cần tool bên ngoài.
- Miễn phí cho public repo và có hạn mức rộng rãi cho private.
- Hệ sinh thái action phong phú (`actions/checkout`, `actions/setup-node`, …).
- Hỗ trợ matrix build, caching, concurrency sẵn.

## Khái niệm cốt lõi

1. **Workflow**: file YAML trong `.github/workflows/`.
2. **Event**: thứ kích hoạt workflow (`push`, `pull_request`, `schedule`).
3. **Job**: nhóm step chạy trên cùng một runner.
4. **Step**: một lệnh hoặc một action.

## Workflow mẫu cho dự án Next.js

Tạo file `.github/workflows/ci.yml`:

```
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
```

## Thêm bước deploy lên Vercel

Thêm job thứ hai, chỉ chạy khi push vào `main`:

```
deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

> Lưu `VERCEL_TOKEN` trong **Settings → Secrets and variables → Actions**. Đừng commit token vào repo.

## Caching để tiết kiệm thời gian

`actions/setup-node` với `cache: pnpm` đã tự cache `node_modules`. Với build Next.js, cache thêm `.next/cache`:

```
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: nextjs-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('**/*.[jt]s', '**/*.[jt]sx') }}
    restore-keys: |
      nextjs-${{ hashFiles('pnpm-lock.yaml') }}-
```

## Matrix build: test trên nhiều Node version

```
strategy:
  matrix:
    node: [18, 20, 22]
steps:
  - uses: actions/setup-node@v4
    with: { node-version: ${{ matrix.node }} }
```

## Concurrency: tiết kiệm chi phí

Mỗi lần push mới huỷ workflow cũ cùng branch:

```
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

## Best practices

- Pin action theo version (`@v4`) hoặc SHA, đừng dùng `@main`.
- Chia nhỏ job để chạy song song.
- Chạy lint & type-check trước test — fail nhanh, tiết kiệm thời gian.
- Dùng `permissions:` hạn chế quyền của `GITHUB_TOKEN`.
- Thêm status badge vào README để team dễ theo dõi.

## Kết luận

CI/CD không phải thứ xa xỉ. Một file YAML 30 dòng là đủ để tăng chất lượng dự án đáng kể. Dựng pipeline hôm nay, dành thời gian còn lại cho việc viết sản phẩm.
