Passkey đang dần thay thế mật khẩu truyền thống. Apple, Google, Microsoft đều đã hỗ trợ. Vậy passkey là gì, hoạt động thế nào, và vì sao nó an toàn hơn hẳn password + 2FA?

## Vấn đề của password truyền thống

- Người dùng chọn mật khẩu yếu, dùng lại nhiều nơi.
- Dễ bị phishing — chỉ cần một trang giả mạo là lộ.
- 2FA SMS có thể bị SIM swap, OTP qua email có thể bị chặn.
- Database bị lộ → hàng triệu hash mật khẩu bị crack.

## Passkey hoạt động như thế nào?

Passkey dùng mã hoá bất đối xứng (public/private key) theo chuẩn **WebAuthn** và **FIDO2**:

1. Khi đăng ký, thiết bị của bạn tạo một cặp khoá.
2. Khoá công khai gửi lên server, khoá bí mật ở lại trên thiết bị (hoặc trong Secure Enclave / TPM).
3. Khi đăng nhập, server gửi một thử thách (challenge), thiết bị dùng khoá bí mật ký lại.
4. Server xác thực bằng khoá công khai đã lưu.

> Vì khoá bí mật không bao giờ rời thiết bị, phishing không còn hiệu quả — kẻ tấn công không thể "lấy" được thứ chưa bao giờ được gửi đi.

## Trải nghiệm thực tế của người dùng

Khi bạn đăng nhập một trang có passkey:

- iPhone/Mac hiện prompt Face ID / Touch ID.
- Android hiện prompt vân tay.
- Windows hiện Windows Hello.

Xong trong 1&ndash;2 giây, không gõ gì cả, không OTP.

## Passkey đồng bộ giữa các thiết bị

Thông qua iCloud Keychain, Google Password Manager, 1Password, Bitwarden — passkey được đồng bộ end-to-end encrypted giữa các thiết bị của bạn. Mất điện thoại vẫn đăng nhập được từ máy khác.

## Khi nào bạn *phải* dùng password?

Nhiều dịch vụ cho phép đăng ký passkey nhưng vẫn giữ password cũ như fallback. Khuyến nghị:

1. Thêm passkey ngay khi dịch vụ hỗ trợ.
2. Đổi password cũ thành chuỗi ngẫu nhiên dài 40+ ký tự lưu trong password manager — bạn gần như không bao giờ gõ lại nó.
3. Bật 2FA bằng ứng dụng (Authy, 1Password) chứ không phải SMS.

## Dịch vụ nào đã hỗ trợ passkey?

- Google, Apple ID, Microsoft Account, GitHub.
- Amazon, eBay, PayPal, Shopify.
- WhatsApp, X (Twitter), LinkedIn.
- Nhiều ngân hàng Việt Nam đã bắt đầu hỗ trợ qua app ngân hàng.

## Thiết lập passkey trên tài khoản Google (ví dụ)

1. Vào `myaccount.google.com` → Security.
2. Chọn "Passkeys and security keys".
3. Nhấn "Create a passkey" → xác thực sinh trắc trên thiết bị.
4. Lặp lại trên các thiết bị tin cậy của bạn.

## Dành cho developer: thêm passkey vào app

Dùng thư viện `@simplewebauthn/server` và `@simplewebauthn/browser`. Luồng chính:

1. Server sinh registration options → client gọi `startRegistration()`.
2. Client gửi credential về server → server verify và lưu public key.
3. Khi đăng nhập, lặp lại với `startAuthentication()`.

## Kết luận

Passkey không phải xu hướng — nó là tiêu chuẩn mới. Nếu bạn vận hành sản phẩm có người dùng, hỗ trợ passkey ngay năm nay. Nếu bạn là người dùng, hãy bật passkey cho email, ngân hàng, và GitHub trước tiên.
