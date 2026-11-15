# 2G2BT — React + Tailwind + Node.js

Bản thử giao diện và nghiệp vụ cho Startup/Investor. [Hướng dẫn dùng demo](README-DEMO.md) mở `http://localhost:5180/?mode=demo#/conversations` cho Investor; bản dùng API máy chủ mở `http://localhost:5180/`. Hai URL có dữ liệu và mức hoàn thiện khác nhau. Dashboard Investor ở `#/dashboard`. Case mới trên máy chủ nằm ở `#/cases`, hiện dừng tại trạng thái chờ mở thanh toán và không xuất hiện cho Investor.

## Admin dashboard

Local: mật khẩu admin nằm trong `web/.env`; chạy `npm start`, rồi mở `http://127.0.0.1:5180/#/admin/overview`. Bản Node production trên Render dùng cùng mật khẩu, chỉ triển khai bản băm có muối trong `web/server/admin-credential.mjs`; mật khẩu thật được giữ tại `.runtime/admin-deploy-password.txt` trên máy tạo bản triển khai và không nằm trong Git. Có thể đặt `ADMIN_DASHBOARD_PASSWORD` trên server để thay thế bản băm nếu cần. `PUBLIC_DEMO=true` và quyền truy cập trang chính không đổi. Admin có sáu mục: **Tổng quan**, **Startup**, **Tài chính**, **Kết nối**, **Tài khoản**, **API & AI**. Phiên admin riêng, hết hạn sau 8 giờ.

Từ trang chủ ứng dụng, chọn **Đăng nhập quản trị** dưới hai nút mở workspace/trò chuyện; link tương tự nằm ở cuối sidebar Startup và Investor. Sau đó nhập mật khẩu admin. Lối vào này chỉ điều hướng tới màn hình đăng nhập, không cấp quyền admin cho tài khoản Startup/Investor.

Admin đọc dữ liệu từ ứng dụng và tự cập nhật mỗi 5 giây: toàn bộ dự án trong Startup Marketplace, workspace Startup, case, yêu cầu kết nối, trạng thái thanh toán, biên nhận máy chủ và các khoản đầu tư Investor tự ghi nhận. Trong mục **Startup → Workspace**, admin có thể Flag/Bỏ flag dự án để rà soát mà không ẩn khỏi Marketplace, hoặc xóa dự án chưa có case, kết nối hay dữ liệu hoạt động liên quan. Dự án đã xóa không tự xuất hiện lại khi máy chủ khởi động. Trong **Startup → Case**, admin có thể Flag/Bỏ flag case mà không ẩn nó, hoặc xóa case khỏi cả Startup và admin; xóa case không xóa workspace hay yêu cầu kết nối. Các khoản phí đang chờ không tính vào doanh thu. Doanh thu chỉ cộng các khoản phí kết nối đã có biên nhận thanh toán do máy chủ ghi nhận. Khoản đầu tư Investor tự nhập được xem riêng và không tính là doanh thu nền tảng. Luồng niêm yết case hiện chưa mở thanh toán, nên phí niêm yết chờ xử lý chỉ hiển thị trong danh sách, chưa cộng vào doanh thu. Hồ sơ tài chính riêng tư và nội dung trao đổi không được đưa vào API admin.

Trong **Tài khoản**, admin quản lý trực tiếp từ dashboard: sửa tên/email hiển thị, tạm khóa/mở lại, đổi gói Free/Plus/Pro và chu kỳ, bật/tắt quyền quản lý dự án, case, kết nối, danh mục đầu tư, phân tích AI và AI Agent theo vai trò. Tạm khóa chặn cả phiên đang dùng lẫn lần mở phiên kế tiếp qua API máy chủ; tắt quyền tính năng được máy chủ chặn ở thao tác tương ứng. Đổi gói không đặt lại token hay lượt đã dùng. Ứng dụng hiện dùng hai danh tính thử nghiệm cố định, chưa có đăng ký tài khoản riêng hoặc thao tác tạo/xóa danh tính. Bản `?mode=demo` lưu riêng trên trình duyệt không dùng API tài khoản này.

Dữ liệu này đến từ bản ứng dụng dùng API máy chủ tại `http://127.0.0.1:5180/`. Bản `?mode=demo` lưu dữ liệu riêng trong trình duyệt, nên thay đổi ở đó không xuất hiện trong admin.

**API & AI** tại `#/admin/services` đọc trạng thái máy chủ thật. Trang hiển thị API ứng dụng, nhà cung cấp AI, AI Agent chat, phân tích tài chính và phần thanh toán chưa tích hợp. Lượt dùng và token AI lấy từ biên nhận đã lưu; 200 kết quả yêu cầu gần nhất cùng lỗi và độ trễ chỉ được giữ trong bộ nhớ từ lúc máy chủ khởi động. Nhãn gián đoạn xuất hiện khi có ít nhất hai lỗi kết nối nhà cung cấp liên tiếp trong 15 phút; một lỗi được ghi là lỗi gần đây. Chưa có yêu cầu nào thì trạng thái nhà cung cấp là **Chưa kiểm chứng**, không suy diễn downtime. Dashboard không gọi thử nhà cung cấp, nên không phát sinh chi phí AI khi mở trang. API admin không trả khóa, prompt hoặc phản hồi AI.

Biểu đồ thể hiện **doanh thu thuần theo kỳ**: cộng giao dịch vào ngày thanh toán, trừ khoản hoàn vào ngày hoàn tiền. Cả thẻ biểu đồ ửng đỏ nếu nhánh cuối đi xuống hoặc tổng kỳ âm; đoạn tăng và giảm vẫn có màu riêng.

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
7. Sau khi Startup đồng ý, chỉ khi máy chủ ghi nhận đủ hai khoản phí kết nối 250.000đ thì nhà đầu tư mới mở được dữ liệu riêng, chạy AI và trao đổi. Bản dùng thử chưa có cổng thanh toán để hoàn tất bước này.
8. Khi đã đầu tư, chọn **Ghi nhận khoản đầu tư** trong tab Tổng quan; cập nhật doanh thu, tiền mặt và định giá theo tháng tại **Danh mục đầu tư**.

Có thể dùng hai tab/cửa sổ cho hai vai trò. Mỗi tab nhận một phiên máy chủ riêng; giao diện cập nhật dữ liệu chung mỗi 4 giây. Không truyền role/userId từ nội dung action để cấp quyền.

**Trò chuyện** tại `#/conversations` vẫn là hội thoại cá nhân lưu trong trình duyệt. Trao đổi chung của dự án phải dùng tab **Trao đổi & thẩm định** trong workspace, được lưu và kiểm quyền trên máy chủ.

## AI qua DeepSeek API

Copy `.env.example` thành `.env` để cấu hình local:

```dotenv
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-flash
AI_API_KEY=your_server_side_key
AI_MAX_OUTPUT_TOKENS=1024
AI_REASONING_EFFORT=low
```

Tạo API key trên [DeepSeek Platform](https://platform.deepseek.com/api_keys), đặt vào `AI_API_KEY` trong `.env` khi chạy local hoặc mục Environment của Render. Không để khóa trong Git, tài liệu hoặc frontend. Có thể dùng `AI_CREDENTIALS_FILE` trỏ đến tệp JSON chứa `DEEPSEEK_API_KEY` thay cho biến môi trường.

Kiểm tra riêng key, model và kết nối DeepSeek bằng một request ngắn, không cần chạy app:

```powershell
cd web
npm run test:deepseek
```

Script đọc `web/.env` hoặc biến môi trường `AI_API_KEY`, gọi đúng endpoint `/responses` mà app đang dùng và chỉ in trạng thái, câu trả lời ngắn cùng số token; không in key. Lệnh này gọi API thật nên có thể phát sinh một ít token. Lỗi 401 là key, 402 là số dư, 404 thường là model hoặc endpoint.

Khóa không dùng tiền tố `VITE_`, không xuất qua `/api/ai/status`, không gửi đến trình duyệt. AI Financial Analysis và AI Agent đều gọi Responses API từ máy chủ, dùng schema báo cáo có cấu trúc và lưu provider/model/requestId cùng token API thực tế. Không tạo câu trả lời mô phỏng khi provider lỗi.

Token ứng dụng là tổng input + output API trả về. Chi phí thực tế phụ thuộc giá và hạn mức hiện tại của tài khoản DeepSeek.

Máy chủ tạm giữ ngân sách đủ cho đầu vào ước tính và trần đầu ra, sau đó hoàn phần dư theo usage thực. Nếu timeout hoặc không nhận usage, giữ khoản dự trù ở trạng thái chờ đối soát; không tự cấp lại token có thể đã bị tính phí. Không tự retry cuộc gọi có chi phí.

DeepSeek hỗ trợ Responses API tương thích với định dạng OpenAI; cấu hình mặc định dùng `https://api.deepseek.com`, model `deepseek-flash` và structured output dạng JSON Schema. Xem [tài liệu Responses API của DeepSeek](https://api-docs.deepseek.com/api/create-response/) và [hướng dẫn gọi API đầu tiên](https://api-docs.deepseek.com/zh-cn/api_samples/chat_curl/).

## Dữ liệu và quyền

Dữ liệu mới lưu tại `../.runtime/workflow.json`, ngoài web root và ngoài Git. Lưu file nguyên tử, giữ hạn mức qua reload/restart. Dữ liệu prototype cũ trong localStorage được giữ nguyên, không tự tải hồ sơ riêng cũ lên server/provider.

Chỉ Startup tạo workspace. Nhà đầu tư chỉ nhận phần công khai; API từ chối CSV, báo cáo, trao đổi và AI dùng hồ sơ dự án cho đến khi được duyệt. Thu hồi quyền loại dữ liệu khỏi snapshot tiếp theo và kiểm tra lại cả khi một cuộc gọi AI đang chạy. Tin nhắn dự án được đọc bởi Startup sở hữu và các nhà đầu tư đang được duyệt.

Free cấp token/kết nối một lần. Gói Startup trả phí reset mỗi thứ Hai 00:00, gói Investor trả phí reset đầu tháng theo giờ Việt Nam; nâng/hạ gói không reset số đã dùng trong kỳ. Quyền xuất báo cáo cần gói trả phí. Chọn gói là dùng thử, chưa thu phí thuê bao; cuộc gọi AI sử dụng tài khoản API thật.

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

## Cloudflare Free — bản dự phòng đầy đủ

Website: https://x-workspace-backup.x-workspace.workers.dev

`npm run dev:cloudflare` chạy Workers cục bộ; `npm run deploy:cloudflare -- --secrets-file .env.cloudflare` build và deploy. Khóa DeepSeek và BACKUP_ADMIN_KEY chỉ nằm trong secrets, không commit. SQLite Durable Object giữ dữ liệu và hạn mức qua lần cập nhật code. Xem [hướng dẫn Cloudflare](../docs/HOST-CLOUDFLARE.md). Render và Cloudflare không tự đồng bộ các thao tác mới sau thời điểm sao chép.
