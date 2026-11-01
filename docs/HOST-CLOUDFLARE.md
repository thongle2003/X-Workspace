# Bản dự phòng đầy đủ trên Cloudflare Free

Kiến trúc dự phòng chạy độc lập với Render:

| Phần | Cloudflare |
|---|---|
| Giao diện React đã build | Workers Static Assets |
| API, phân quyền và gọi ModelAPI | Cloudflare Worker |
| Workspace, hồ sơ, tin nhắn, danh mục và sổ token | Durable Object dùng SQLite |

Chỉ dùng **Workers Free** và **SQLite-backed Durable Objects** trên Free. Không cần Containers, R2, tên miền trả phí hoặc nâng Workers Paid. AI vẫn gọi ModelAPI bằng khóa của bạn; **Cloudflare Free không cấp miễn phí token ModelAPI**.

## Giới hạn miễn phí

Theo tài liệu chính thức được kiểm tra ngày 01/11/2026:

| Hạng mục | Hạn mức Free |
|---|---:|
| Request chạy Worker | 100.000 / ngày |
| CPU Worker | 10 ms / lần gọi |
| Request Durable Object | 100.000 / ngày |
| Thời gian Durable Object | 13.000 GB-s / ngày |
| Đọc SQLite Durable Object | 5 triệu dòng / ngày |
| Ghi SQLite Durable Object | 100.000 dòng / ngày |
| Tổng lưu trữ SQLite Durable Object | 5 GB |

Request phục vụ trực tiếp static assets miễn phí và không giới hạn theo bảng static assets. Request `/api/*` vẫn chạy Worker và Durable Object, nên chịu hạn mức API. Free vượt giới hạn sẽ báo lỗi thay vì tự nâng gói. Hạn mức ngày của Cloudflare reset lúc 00:00 UTC; lịch này khác lịch token ứng dụng trả phí reset thứ Hai theo giờ Việt Nam.

Giao diện nên chỉ cập nhật trạng thái khi tab đang hiển thị và không gọi polling dày liên tục. Cấu hình phù hợp để demo quy mô nhỏ trong khoảng một tuần nếu nằm trong các giới hạn trên; không cam kết tài nguyên vô hạn hoặc SLA của dịch vụ trả phí.

Nguồn: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).

## Deploy toàn bộ app

Thực hiện tại thư mục `web` của repository. Wrangler dùng cấu hình `web/wrangler.jsonc`; namespace `WORKFLOW` trỏ đến class `Workflow`, migration đầu tiên tạo SQLite-backed Durable Object. Không đổi tên namespace, class hoặc xóa object khi chỉ cập nhật code, vì đó là nơi giữ dữ liệu.

```powershell
cd web
npm ci --include=dev
npm run build
npx wrangler login
```

Đăng nhập đúng tài khoản Cloudflare và xác nhận tài khoản đang dùng **Workers Free**. Không chấp nhận lời mời nâng cấp Paid nếu xuất hiện. Nếu chưa có quyền truy cập tài khoản thì chỉ có thể chuẩn bị cấu hình và kiểm thử cục bộ, chưa thể khẳng định đã deploy thành công.

Tạo tệp riêng `web/.env.cloudflare` trên máy, nằm trong quy tắc bỏ qua `.env.*` của Git:

```dotenv
AI_API_KEY=nhap_khoa_ModelAPI_thuc_te_o_day
BACKUP_ADMIN_KEY=mot_chuoi_bi_mat_dai_rieng_cho_sao_luu
```

Không commit tệp này và không nhập khóa vào frontend. `BACKUP_ADMIN_KEY` phải khác khóa ModelAPI. Các giá trị không bí mật như `AI_BASE_URL`, `AI_MODEL`, `PUBLIC_DEMO` nằm trong cấu hình Worker; giá trị mặc định dùng `https://api.modelapi.vn/v1` và `gpt-6-astra`.

```powershell
npx wrangler deploy --secrets-file .env.cloudflare
```

Wrangler trả về URL `workers.dev` của tài khoản. Mở URL đó và kiểm tra website, `/api/health`, `/api/ai/status`, sau đó thử luồng bằng dữ liệu mẫu. Khóa được lưu bằng Workers Secrets; không trả ra qua endpoint trạng thái.

Có thể thêm/cập nhật từng secret riêng bằng `npx wrangler secret put AI_API_KEY` và `npx wrangler secret put BACKUP_ADMIN_KEY`. Theo tài liệu, `secret put` cũng tạo phiên bản và deploy ngay. [Hướng dẫn Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/).

## Chuyển dữ liệu từ Render sang bản dự phòng

Đây là bản sao tại một thời điểm, không phải cơ chế đồng bộ hai chiều hoặc tự động chuyển khi Render lỗi. Sau khi sao chép, thay đổi ở Render và Cloudflare đi vào hai bộ dữ liệu riêng. Nên chọn một link chính để cập nhật và tạo bản sao mới có chủ đích khi cần.

1. Cấu hình `BACKUP_ADMIN_KEY` trong Render Environment và deploy bản API có chức năng backup. Không dùng API key ModelAPI làm khóa quản trị backup.
2. Tạm ngừng nhập dữ liệu mới trên Render trong lúc xuất để xác định rõ thời điểm chụp.
3. Gọi `GET https://x-workspace-demo.onrender.com/api/admin/backup`, gửi header `Authorization: Bearer <BACKUP_ADMIN_KEY>`.
4. Lưu nguyên JSON trả về vào một tệp riêng ngoài Git. Envelope có dạng `{format:"2g2bt-backup-v1",exportedAt,data}`. Trường `data` chứa dữ liệu, quyền và sổ sử dụng token; không chứa khóa ModelAPI.
5. Kiểm tra revision hiện tại của bản Cloudflare qua snapshot `/api/workflow` trong phiên demo. Dùng revision này làm `expectedRevision` để ngăn ghi đè nhầm lên dữ liệu vừa thay đổi.
6. Gọi `POST https://<worker-cua-ban>.workers.dev/api/admin/restore`, gửi cùng loại header quản trị của **Cloudflare**, body JSON `{backup:<nguyen-envelope-da-luu>,expectedRevision:<revision-hien-tai>}`. Secret quản trị hai nơi có thể khác nhau.
7. Chỉ xác nhận sao chép thành công khi API trả `{ok:true,revision:...}` và các bản ghi quan trọng cùng sổ token được đối chiếu lại. Khi revision đã đổi, xuất/kiểm tra lại trước khi quyết định restore; không tự ép ghi đè.

Tệp backup có hồ sơ tài chính riêng tư, tin nhắn và thông tin đầu tư. Giữ tệp ở nơi riêng, không commit lên GitHub và không đặt trong thư mục static assets. Endpoint quản trị cần secret riêng, không được bật quyền quản trị qua nút chuyển vai trò demo hoặc query string.

Dữ liệu Cloudflare nằm trong SQLite của Durable Object, không nằm trong filesystem tạm của Render. Vì vậy bản Cloudflare không cần Render đang hoạt động để xem dữ liệu đã sao chép hoặc gọi AI. Deploy lại code Worker không phải thao tác xóa dữ liệu; vẫn cần giữ bản JSON backup độc lập và tránh xóa namespace/object.

## Kiểm tra trước khi gửi link

- Build React và bundle Worker phải thành công trên cấu hình Free; không dùng binding dịch vụ Paid.
- Trình duyệt mới mở website không cần mật khẩu; đổi gói trên bản công khai vẫn bị chặn phía API.
- Nhà đầu tư chưa được duyệt không đọc được CSV, báo cáo hoặc tin nhắn; thu hồi quyền chặn cả yêu cầu AI đang chạy.
- Reload, tạo phiên mới và cập nhật code không cấp lại token Free đã dùng; snapshot SQLite giữ số liệu sau khi object được tạo lại.
- Lỗi ModelAPI không tạo báo cáo giả. Usage chưa rõ giữ khoản dự trù chờ đối soát; không tự retry có thể tính phí hai lần.
- Backup không có secret; restore từ người không có `BACKUP_ADMIN_KEY`, dữ liệu hỏng hoặc revision cũ đều bị từ chối.

Các kiểm tra tự động dùng provider fixture để không tính phí. Một lần smoke test AI thật riêng mới xác nhận được kết nối và quyền dùng model của tài khoản ModelAPI đang cấu hình.
