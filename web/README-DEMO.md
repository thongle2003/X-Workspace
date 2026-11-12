# Prototype với hai tài khoản mẫu

Mở **http://localhost:5180/?mode=demo#/conversations** với vai trò Investor. Tham số `mode=demo` mở bản prototype; luồng máy chủ của dự án vẫn có đường vào riêng trên cùng website.

Với Investor, **Trang chủ** mở AI Chat, còn **Dashboard đầu tư** ở `#/dashboard`. **Trò chuyện** giữ các kênh, tin nhắn, trả lời và tìm kiếm; đường dẫn hội thoại cũ vẫn mở được lịch sử. Với Startup, `#/home` vẫn là trang chủ của vai trò này.

Ở góc trên, chọn **Tài khoản dùng thử**:

- **Nhà đầu tư demo**: khám phá, lưu/so sánh startup, xem danh mục và phân tích.
- **Startup demo**: vào **Case gọi vốn** để tạo case; hồ sơ và workspace mẫu cũ vẫn có trong **Quản lý startup**. Hạn mức Startup Scale ở các trang kỹ thuật cũ chỉ phục vụ prototype, không phải gói thương mại sẽ bán.

Hai tài khoản có dữ liệu, gói và hạn mức riêng trong trình duyệt. Dữ liệu cũ được sao chép khi khởi tạo; bản lưu cũ được giữ nguyên. Công việc, tài liệu, ghi chú và báo cáo tiếp tục hoạt động. Đây là tài khoản mẫu trên thiết bị; hội thoại chưa đồng bộ giữa những người dùng khác nhau.

## Thử luồng case mới

1. Chọn **Startup demo** → **Case gọi vốn** → tạo bản nháp.
2. Xác nhận phí đăng case **mô phỏng** (giá thật chưa chốt) → nạp **đầu ra mentor mẫu** → case được công bố.
3. Chọn **Nhà đầu tư demo** → **Case & kết nối** → mở case và gửi yêu cầu.
4. Chọn **Startup demo** → đồng ý → giả lập trả phần phí 250.000đ.
5. Chọn **Nhà đầu tư demo** → giả lập trả phần phí 250.000đ. Chỉ lúc đó trao đổi chung mới mở. Startup có thể thu hồi kết nối.

Case, yêu cầu và tin nhắn của luồng này dùng chung giữa **hai tài khoản demo trên cùng trình duyệt**. Chúng được lưu ở localStorage, không đồng bộ với người dùng khác và không ghi nhận thanh toán thật. Trang **Phí theo case** thay cho gói thuê bao startup trong luồng mới; trang gói investor vẫn là subscription. Xem `../docs/WORKFLOW-CASE-PRODUCTION.md` trước khi triển khai bản thật.

AI Agent trong bản này hướng dẫn sử dụng theo chủ đề, có ghi rõ chưa kết nối AI thật và không trừ token khi hướng dẫn. Luồng AI qua máy chủ hiện có trong dự án được giữ riêng.

Chạy kiểm tra bản prototype:

```powershell
npm test
npm run test:e2e:demo
npm run build
```

Giao diện prototype nằm ở `src/DemoApp.jsx`; Agent ở `src/DemoAIAgent.jsx`. Bộ kiểm tra dùng `playwright.demo.config.js` với thư mục kết quả riêng để không ảnh hưởng kiểm tra luồng máy chủ.
