# Host demo miễn phí khoảng một tuần trên Render

Dịch vụ: [Render](https://render.com). Cấu hình trong `render.yaml` chọn **Free Web Service**, chạy React đã build và API Node.js trong cùng một service.

## Deploy từ GitHub

1. Đăng nhập [Render](https://dashboard.render.com/) bằng GitHub.
2. Mở [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fthongle2003%2FX-Workspace) và cấp quyền truy cập repo `thongle2003/X-Workspace`.
3. Render đọc `render.yaml`. Kiểm tra service đang chọn **Free**, region Singapore.
4. Nhập biến bí mật **AI_API_KEY** bằng khóa DeepSeek của bạn. Không ghi khóa vào GitHub và không gửi khóa trong chat.
5. Chọn **Deploy Blueprint** và chờ build xong. Render cấp URL `https://...onrender.com`.
6. Mở URL được cấp và gửi trực tiếp cho giảng viên. `PUBLIC_DEMO=true` bỏ yêu cầu mật khẩu; hai vai trò thử nghiệm vẫn hoạt động. Bản công khai không cho đổi gói qua giao diện hoặc API, nhằm giữ chi phí trong hạn mức đã cấp.

API key giữ phía máy chủ. `AI_CREDENTIALS_FILE` trên máy cá nhân không được đưa lên GitHub hoặc Render; hãy dùng `AI_API_KEY` trong Environment của Render. Tạo khóa tại [DeepSeek Platform](https://platform.deepseek.com/api_keys), rồi trong Render mở service → **Environment**, đặt `AI_API_KEY` bằng khóa vừa tạo và bấm **Save, rebuild, and deploy** (hoặc lưu rồi deploy lại). Để dùng local, chép `web/.env.example` thành `web/.env` rồi đặt `AI_API_KEY=...` trong tệp riêng đó.

## Đổi service Render đang chạy sang DeepSeek

Sau khi cập nhật mã nguồn, mở service hiện tại trên Render → **Environment** và đặt các giá trị sau. Thay `AI_API_KEY` bằng key mới tạo trên DeepSeek Platform; không gửi key qua chat hoặc commit vào GitHub.

| Biến | Giá trị |
|---|---|
| `AI_BASE_URL` | `https://api.deepseek.com` |
| `AI_MODEL` | `deepseek-flash` |
| `AI_API_KEY` | Key mới từ DeepSeek Platform |

Lưu biến môi trường và chọn **Save, rebuild, and deploy**. Key ModelAPI cũ không dùng được với DeepSeek; thay đúng biến `AI_API_KEY` rồi mới gọi AI. Có thể kiểm tra provider/model trong thẻ Ngân sách AI sau khi deploy.

## Nếu tạo Web Service thủ công

| Mục | Giá trị |
|---|---|
| Repository | `https://github.com/thongle2003/X-Workspace` |
| Language | Node |
| Root Directory | `web` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start:prod` |
| Instance Type | **Free** |
| Health Check Path | `/api/health` |
| Region | Singapore |

Các biến Environment:

| Biến | Giá trị |
|---|---|
| `NODE_VERSION` | `22.22.0` |
| `NODE_ENV` | `production` |
| `AI_BASE_URL` | `https://api.deepseek.com` |
| `AI_MODEL` | `deepseek-flash` |
| `AI_API_KEY` | Khóa bí mật của bạn |
| `AI_MAX_OUTPUT_TOKENS` | `1024` |
| `AI_REASONING_EFFORT` | `low` |
| `PUBLIC_DEMO` | `true` — mở bản demo không cần mật khẩu |

Render cung cấp `PORT` và `RENDER_EXTERNAL_URL` tự động. Máy chủ bind `0.0.0.0:$PORT`; chỉ chấp nhận API qua hostname đã cấu hình. Nếu dùng tên miền riêng, đặt `APP_ORIGIN=https://ten-mien-cua-ban` rồi redeploy. Không thêm đường dẫn phía sau origin.

## Giới hạn miễn phí cần biết

- Có thể dùng Free để demo trong một tuần, trong các hạn mức dịch vụ của Render; không cần chọn gói compute trả phí.
- Render Free ngủ sau **15 phút không nhận truy cập**. Lần mở tiếp theo có thể chờ khoảng một phút.
- Free dùng filesystem tạm. Dự án, CSV, tin nhắn và ngân sách lưu trong file JSON **có thể mất khi restart, redeploy hoặc service ngủ**. Vì vậy Free “không reset” chỉ giữ được trong vòng đời dữ liệu này; không thể bảo đảm qua lần host mất file. Nếu cần giữ dữ liệu và hạn mức xuyên suốt tuần, phải bổ sung database lưu bền ngoài service trước khi dùng dữ liệu cần giữ.
- Không nhập hồ sơ tài chính cần bảo quản lâu dài vào bản Render dùng file tạm. Cấu hình này dành cho demo bằng dữ liệu mẫu.
- **Phí gọi DeepSeek API vẫn tính riêng**. Hosting miễn phí không cấp miễn phí token AI. Người có link có thể đổi giữa hai tài khoản thử nghiệm và gọi API trong hạn mức tài khoản DeepSeek dùng chung; việc nâng gói bị khóa trên máy chủ.
- Sau restart, phiên làm việc được cấp lại; nếu tab còn báo hết phiên, tải lại trang.

Tài liệu chính thức: [Render Free](https://render.com/docs/free), [deploy Node.js từ GitHub](https://render.com/docs/deploy-node-express-app), [biến môi trường mặc định](https://render.com/docs/environment-variables).

## Kiểm tra trước khi đưa lên host

```powershell
cd web
npm ci --include=dev
npm run build
npm run test:server
npm run start:prod
```

Local production mở `http://127.0.0.1:10000`. Render Blueprint bật `PUBLIC_DEMO=true`, nên website và API không yêu cầu mật khẩu Basic. Quyền xem hồ sơ vẫn được kiểm tra theo phiên và quyết định duyệt của Startup. Render mặc định mở bản chia sẻ ngay khi deploy code mới, kể cả service cũ chưa đồng bộ biến PUBLIC_DEMO. Nếu muốn dùng chế độ riêng, đặt PUBLIC_DEMO=false và cấu hình SITE_PASSWORD.
