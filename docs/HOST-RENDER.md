# Host demo miễn phí khoảng một tuần trên Render

Dịch vụ: [Render](https://render.com). Cấu hình trong `render.yaml` chọn **Free Web Service**, chạy React đã build và API Node.js trong cùng một service.

## Deploy từ GitHub

1. Đăng nhập [Render](https://dashboard.render.com/) bằng GitHub.
2. Mở [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fthongle2003%2FX-Workspace) và cấp quyền truy cập repo `thongle2003/X-Workspace`.
3. Render đọc `render.yaml`. Kiểm tra service đang chọn **Free**, region Singapore.
4. Nhập biến bí mật **AI_API_KEY** bằng khóa ModelAPI của bạn. Không ghi khóa vào GitHub và không gửi khóa trong chat.
5. Chọn **Deploy Blueprint** và chờ build xong. Render cấp URL `https://...onrender.com`.
6. Trong service → **Environment**, xem giá trị **SITE_PASSWORD** được Render tạo tự động. Khi mở website, nhập username **demo** và mật khẩu đó. Có thể chia sẻ mật khẩu riêng với người xem demo. Đây là khóa truy cập cho cả bản demo, không phải đăng nhập tài khoản người dùng.

API key giữ phía máy chủ. `AI_CREDENTIALS_FILE` trên máy cá nhân không được đưa lên GitHub hoặc Render; hãy dùng `AI_API_KEY` trong Environment của Render.

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
| `AI_BASE_URL` | `https://api.modelapi.vn/v1` |
| `AI_MODEL` | `gpt-6-astra` |
| `AI_API_KEY` | Khóa bí mật của bạn |
| `AI_MAX_OUTPUT_TOKENS` | `1024` |
| `AI_REASONING_EFFORT` | `low` |
| `SITE_PASSWORD` | Mật khẩu dài, riêng cho nhóm xem demo |

Render cung cấp `PORT` và `RENDER_EXTERNAL_URL` tự động. Máy chủ bind `0.0.0.0:$PORT`; chỉ chấp nhận API qua hostname đã cấu hình. Nếu dùng tên miền riêng, đặt `APP_ORIGIN=https://ten-mien-cua-ban` rồi redeploy. Không thêm đường dẫn phía sau origin.

## Giới hạn miễn phí cần biết

- Có thể dùng Free để demo trong một tuần, trong các hạn mức dịch vụ của Render; không cần chọn gói compute trả phí.
- Render Free ngủ sau **15 phút không nhận truy cập**. Lần mở tiếp theo có thể chờ khoảng một phút.
- Free dùng filesystem tạm. Dự án, CSV, tin nhắn và ngân sách lưu trong file JSON **có thể mất khi restart, redeploy hoặc service ngủ**. Vì vậy Free “không reset” chỉ giữ được trong vòng đời dữ liệu này; không thể bảo đảm qua lần host mất file. Nếu cần giữ dữ liệu và hạn mức xuyên suốt tuần, phải bổ sung database lưu bền ngoài service trước khi dùng dữ liệu cần giữ.
- Không nhập hồ sơ tài chính cần bảo quản lâu dài vào bản Render dùng file tạm. Cấu hình này dành cho demo bằng dữ liệu mẫu.
- **Phí gọi ModelAPI vẫn tính riêng**. Hosting miễn phí không cấp miễn phí token AI. Người có mật khẩu demo có thể đổi giữa hai tài khoản và gọi API trong hạn mức demo.
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

Local production mở `http://127.0.0.1:10000`. `SITE_PASSWORD` được yêu cầu khi chạy trên Render. `/api/health` được mở cho health check; các trang và API khác đều qua mật khẩu khi cấu hình.
