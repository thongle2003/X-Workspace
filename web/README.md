# 2G2BT / X — React + Tailwind prototype

Bản prototype cho hai tài khoản mẫu và quản lý 6 startup: [Hướng dẫn dùng demo](README-DEMO.md), mở http://localhost:5180/?mode=demo#/home.

## Chạy ứng dụng

Yêu cầu Node.js tương thích Vite (đã kiểm tra trên Node 26).

```powershell
npm install
npm start
```

Mở http://127.0.0.1:5180/#/workspace. API và giao diện chạy cùng origin. Bản build cũng có API qua `npm run preview`. Chỉ mở trên localhost vì đây là môi trường thử nghiệm với hai tài khoản chuyển qua lại, chưa phải hệ thống đăng nhập cho triển khai công khai.

## Thử trọn luồng

1. Chọn **Startup demo** ở ô **Tài khoản dùng thử**.
2. Tạo workspace: nhập tên, mục tiêu và phần giới thiệu startup. Free có tối đa 1 workspace.
3. Chọn **Công bố giới thiệu** → **Công bố dự án**. Marketplace chỉ thấy các trường giới thiệu này.
4. Mở tab **Hồ sơ tài chính**, tải CSV hoặc **Dùng CSV mẫu**, rồi **Lưu hồ sơ riêng tư**.
5. Đổi sang **Nhà đầu tư demo**, mở dự án trên Marketplace và **Gửi yêu cầu xem hồ sơ**.
6. Về **Startup demo**, mở tab **Yêu cầu**, chọn **Duyệt quyền**. Có thể từ chối hoặc thu hồi sau đó.
7. Nhà đầu tư đã được duyệt mở workspace để xem số liệu, chạy AI và trao đổi tại tab **Trao đổi & thẩm định**.
8. Khi đã đầu tư, chọn **Ghi nhận khoản đầu tư** trong tab Tổng quan; cập nhật doanh thu, tiền mặt và định giá theo tháng tại **Danh mục đầu tư**.

Có thể dùng hai tab/cửa sổ cho hai vai trò. Mỗi tab nhận một phiên máy chủ riêng; giao diện cập nhật dữ liệu chung mỗi 4 giây. Không truyền role/userId từ nội dung action để cấp quyền.

**Trò chuyện** tại `#/conversations` vẫn là hội thoại cá nhân lưu trong trình duyệt. Trao đổi chung của dự án phải dùng tab **Trao đổi & thẩm định** trong workspace, được lưu và kiểm quyền trên máy chủ.

## AI thật qua ModelAPI

Copy `.env.example` thành `.env` để cấu hình trên máy chủ:

```dotenv
AI_BASE_URL=https://api.modelapi.vn/v1
AI_MODEL=gpt-6-astra
AI_API_KEY=your_server_side_key
AI_MAX_OUTPUT_TOKENS=1024
AI_REASONING_EFFORT=low
```

Có thể dùng `AI_CREDENTIALS_FILE` trỏ đến tệp JSON chứa `OPENAI_API_KEY` thay cho ghi khóa vào env. Chỉ đọc nguồn khóa khi cấu hình rõ ràng. Workspace hiện đã có cấu hình cục bộ sử dụng ModelAPI trên máy; khóa không được copy sang frontend hoặc tệp hướng dẫn.

Khóa không dùng tiền tố `VITE_`, không xuất qua `/api/ai/status`, không gửi đến trình duyệt. AI Financial Analysis và AI Agent đều gọi Responses API từ máy chủ, dùng schema báo cáo có cấu trúc và lưu provider/model/requestId cùng token API thực tế. Không tạo câu trả lời mô phỏng khi provider lỗi.

CSV mẫu LotusPay đã được gọi thật qua ModelAPI và nhận **773 token** (387 đầu vào + 386 đầu ra); kết quả kiểm tra trong `../tmp/modelapi-live-check.json`. Chi phí và token các lần chạy sau có thể khác. Token ứng dụng là tổng input + output API trả về.

Máy chủ tạm giữ ngân sách đủ cho đầu vào ước tính và trần đầu ra, sau đó hoàn phần dư theo usage thực. Nếu timeout hoặc không nhận usage, giữ khoản dự trù ở trạng thái chờ đối soát; không tự cấp lại token có thể đã bị tính phí. Không tự retry cuộc gọi có chi phí.

Tài liệu giao thức: [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). ModelAPI cung cấp endpoint tương thích; khả năng truy cập và số dư phụ thuộc tài khoản dịch vụ đang cấu hình.

## Dữ liệu và quyền

Dữ liệu mới lưu tại `../.runtime/workflow.json`, ngoài web root và ngoài Git. Lưu file nguyên tử, giữ hạn mức qua reload/restart. Dữ liệu prototype cũ trong localStorage được giữ nguyên, không tự tải hồ sơ riêng cũ lên server/provider.

Chỉ Startup tạo workspace. Nhà đầu tư chỉ nhận phần công khai; API từ chối CSV, báo cáo, trao đổi và AI dùng hồ sơ dự án cho đến khi được duyệt. Thu hồi quyền loại dữ liệu khỏi snapshot tiếp theo và kiểm tra lại cả khi một cuộc gọi AI đang chạy. Tin nhắn dự án được đọc bởi Startup sở hữu và các nhà đầu tư đang được duyệt.

Free cấp token/kết nối một lần. Gói trả phí reset mỗi thứ Hai 00:00 giờ Việt Nam; nâng/hạ gói không reset số đã dùng trong kỳ. Quyền xuất báo cáo cần gói trả phí. Chọn gói là dùng thử, chưa thu phí thuê bao; cuộc gọi AI sử dụng tài khoản API thật.

## Kiểm tra

```powershell
npm test
npm run test:server
npm run test:e2e
npm run build
```

E2E dùng Edge đã cài và backend thật trong bộ nhớ, với provider fixture rõ ràng để không phát sinh chi phí. Kiểm thử giao diện bao phủ công bố → yêu cầu → duyệt → xem CSV → trao đổi → ghi nhận đầu tư → thu hồi quyền, giới hạn gói và AI Agent/usage. Test HTTP kiểm session, quyền, dữ liệu riêng, concurrency, lỗi provider và đối soát token.

Các spec cũ ở tests/ cho bản localStorage được giữ để tham khảo; `playwright.config.js` chạy `workflow.spec.js` cho kiến trúc máy chủ hiện tại. Bài kiểm tra AI thật là smoke test riêng nêu trên, không được thay thế bằng fixture.

## Host miễn phí một tuần

Đã có server production và Blueprint Render Free. Xem [hướng dẫn Render](../docs/HOST-RENDER.md). API và React chạy chung service, PUBLIC_DEMO mở link trực tiếp và khóa việc đổi gói để giữ hạn mức API. File dữ liệu trên Render Free không được giữ qua restart/redeploy; dùng database ngoài nếu cần lưu bền.

Bản Render chia sẻ cho giảng viên bật `PUBLIC_DEMO=true`: mở link không cần mật khẩu. Hai tài khoản demo dùng chung ngân sách Free trên máy chủ; không cho nâng gói khi công khai.
