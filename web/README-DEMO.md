# Prototype với hai tài khoản mẫu

Mở **http://localhost:5180/?mode=demo#/home**. Tham số `mode=demo` mở bản prototype; luồng máy chủ của dự án vẫn có đường vào riêng trên cùng website.

**Trang chủ** gộp phần giới thiệu và tổng quan theo tài khoản. **Trò chuyện** có mục riêng, giữ các kênh, tin nhắn, trả lời và tìm kiếm. Đường dẫn cũ `#/dashboard` chuyển về Trang chủ; đường dẫn hội thoại cũ vẫn mở được lịch sử.

Ở góc trên, chọn **Tài khoản dùng thử**:

- **Nhà đầu tư demo**: khám phá, lưu/so sánh startup, xem danh mục và phân tích.
- **Startup demo**: khởi tạo với gói Startup Scale; vào **Quản lý startup** để chỉnh sửa cả 6 hồ sơ mẫu, cập nhật số liệu và tạo workspace cho startup đang chọn.

Hai tài khoản có dữ liệu, gói và hạn mức riêng trong trình duyệt. Dữ liệu cũ được sao chép khi khởi tạo; bản lưu cũ được giữ nguyên. Công việc, tài liệu, ghi chú và báo cáo tiếp tục hoạt động. Đây là tài khoản mẫu trên thiết bị; hội thoại chưa đồng bộ giữa những người dùng khác nhau.

AI Agent trong bản này hướng dẫn sử dụng theo chủ đề, có ghi rõ chưa kết nối AI thật và không trừ token khi hướng dẫn. Luồng AI qua máy chủ hiện có trong dự án được giữ riêng.

Chạy kiểm tra bản prototype:

```powershell
npm test
npm run test:e2e:demo
npm run build
```

Giao diện prototype nằm ở `src/DemoApp.jsx`; Agent ở `src/DemoAIAgent.jsx`. Bộ kiểm tra dùng `playwright.demo.config.js` với thư mục kết quả riêng để không ảnh hưởng kiểm tra luồng máy chủ.
