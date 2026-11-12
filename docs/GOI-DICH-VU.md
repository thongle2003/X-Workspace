# Thiết kế gói X Workspace

> **Giá công khai hiện tại:** Investor dùng bảng giá bên dưới. Startup trả 899.000đ/12 tháng niêm yết một hồ sơ; AI đánh giá pitch deck 200.000đ/lần khi tính năng được mở. Kết nối có phí 500.000đ tổng cộng, chia đều sau khi Startup đồng ý. Bản dùng thử chưa thu tiền thật. Xem [luồng case và điều kiện production](WORKFLOW-CASE-PRODUCTION.md).

Cập nhật ngày 01/11/2026. Đây là thiết kế thử nghiệm cho prototype, chưa phải bảng giá thương mại. Các mức giá VND là giả thuyết để kiểm chứng, không phải kết quả khảo sát willingness-to-pay.

## Cơ sở nghiên cứu

Đã đọc trực tiếp các trang chính thức dưới đây. Công cụ tìm kiếm không khả dụng trong phiên; nội dung được lấy từ chính website qua HTTP. Không dùng kết quả từ các trang bị chặn truy cập.

| Nguồn | Quan sát | Áp dụng vào X Workspace |
|---|---|---|
| [Visible — Founder Pricing](https://visible.vc/pricing/) | Có gói miễn phí; phân tầng theo data room, tài liệu, cập nhật nhà đầu tư và tính năng phân tích. | Startup trả phí để chuẩn bị hồ sơ và mở rộng workspace/tài liệu, không mua quyền quản lý danh mục đầu tư. |
| [Visible — Investor Pricing](https://visible.vc/investor-pricing/) | Bộ gói riêng cho nhà đầu tư; định giá tùy quy mô danh mục và đội ngũ, mở rộng tự động hóa và kiểm soát. | Ngân sách và quyền nhà đầu tư độc lập với startup; quy mô thẩm định/danh mục là trục nâng cấp. |
| [Dealum — Network Pricing](https://dealum.com/pricing) | Ba mức Essentials/Pro/Ultimate; tăng dung lượng hồ sơ/thành viên, tính năng danh mục và cộng tác. | Ba cấp dễ so sánh, giới hạn dung lượng cụ thể. Dealum phục vụ tổ chức angel nên không quy đổi trực tiếp giá sang sản phẩm cá nhân. |

Suy luận thiết kế: người dùng chọn vai trò trước rồi chọn cấp gói; trang giá chỉ hiển thị bộ gói tương ứng vai trò đang dùng. Chỉ Startup được tạo workspace. Free phục vụ trải nghiệm, gói giữa cho quy trình thường xuyên, gói cao cho nhiều dự án. Mức token và cơ chế reset dưới đây là quyết định sản phẩm theo yêu cầu người dùng; các nguồn trên không chứng minh chi phí hoặc định mức token này là tối ưu.

## Bảng giá mục tiêu và gói prototype còn lưu để tương thích dữ liệu

### Startup — gói cũ của prototype

| Quyền | Startup Free | Startup Launch | Startup Scale |
|---|---:|---:|---:|
| Giá đề xuất / tháng | 0đ | 199.000đ | 399.000đ |
| Token AI thực tế | 2.000 dùng một lần | 20.000 / tuần | 60.000 / tuần |
| Workspace đang lưu | 1 | 3 | 10 |
| Xem phân tích | Có | Có | Có |
| Xuất báo cáo CSV | Không | Có | Có |

Startup Free bắt đầu chưa có workspace của vai trò Startup, được tạo workspace đầu tiên. Không dùng danh mục, watchlist, so sánh hoặc gửi yêu cầu kết nối của vai trò nhà đầu tư.

### Nhà đầu tư — bảng giá mục tiêu

| Quyền | Investor Trial | Investor Basic | Investor Pro |
|---|---:|---:|---:|
| Giá / tháng | 0đ | 399.000đ | 699.000đ |
| Giá / năm | — | 3.999.000đ | 6.999.000đ |
| Thời hạn dùng thử | 2 tháng | — | — |
| Startup đã lưu | 3 | 5 | 20 |
| Startup trong danh mục | 3 | 10 | 50 |
| Yêu cầu Startup cập nhật báo cáo | 1 lần/quý | 1 lần/tháng | 2–3 lần/tháng |
| Bản đồ sự kiện/startup gần bạn và bộ lọc | — | — | Gói năm |

AI nằm trong gói, không thu phí theo lượt/token. Quyền yêu cầu báo cáo và bản đồ sự kiện mới hiển thị như quyền lợi dự kiến, chưa hoạt động trong demo. Demo cũng chưa tự kết thúc Trial sau 2 tháng. Các hạn mức AI, so sánh và kết nối còn trong mã là biện pháp kỹ thuật của prototype, không phải quyền lợi thương mại đã chốt.

Các giá Startup subscription, quảng cáo trả phí, review pitch deck với mentor và gói mua thêm AI/token từ bảng cũ đã bỏ. AI đánh giá pitch deck là dịch vụ khác mentor, đã niêm yết 200.000đ/lần nhưng chưa hoạt động.

Prototype có 6 startup mẫu. Những hạn mức lớn hơn 6 vẫn được thực thi bằng domain và kiểm thử, nhưng dữ liệu demo chưa đủ để điền kín danh mục 10–50 startup bằng giao diện. Nhà đầu tư có thể xem workspace mẫu/dữ liệu cũ, nhưng không được tạo workspace ở bất kỳ gói nào. Dữ liệu đang có được giữ lại. Danh mục mẫu có 1 khoản đầu tư và 2 startup đã lưu.

## Quy tắc hạn mức

- Free: token và yêu cầu kết nối cấp một lần cho mỗi vai trò, không reset theo tuần/tháng/năm.
- Gói Startup trả phí: token và kết nối reset lúc thứ Hai 00:00 Asia/Ho_Chi_Minh. Gói Investor trả phí: reset đầu tháng theo giờ Việt Nam. Phần dư không cộng dồn. Mở app sau mốc này sẽ tự nhận kỳ mới.
- Launch/Scale dùng chung số token đã dùng trong tuần của Startup. Basic/Pro dùng chung số đã dùng trong tháng của Nhà đầu tư. Nâng gói tăng trần; không đưa số đã dùng về 0. Hạ gói xuống dưới số đã dùng sẽ chặn thêm đến kỳ tiếp theo.
- Free và paid lưu hai bộ đếm riêng. Free → paid → Free khôi phục phần Free còn lại trước đó, không cấp lại. Chuyển vai trò không chuyển quyền, dữ liệu riêng hoặc token sang vai trò kia.
- Workspace, công việc, tài liệu, danh mục, watchlist là giới hạn số lượng đang lưu, không phải quota thời gian. Không xóa dữ liệu khi đổi tuần hoặc hạ gói; còn xem, sửa và xóa được dữ liệu cũ. Chặn thêm mới khi bằng/vượt hạn mức.
- Giá năm Investor theo bảng trên; giá năm của gói Startup prototype cũ bằng 10 tháng. Chu kỳ giá không thay đổi lịch cấp token của từng vai trò.
- Kết nối chỉ lưu mẫu tại thiết bị, chưa gửi tin. Tài liệu chỉ lưu metadata, tối đa 2 MB/tệp, không lưu nội dung tệp.

## Token và API hiện tại

AI Financial Analysis và AI Agent tích hợp DeepSeek API, model cấu hình `deepseek-flash`. Báo cáo lưu model, provider, requestId và usage. Token tính theo tổng input_tokens + output_tokens do API trả về; phần đầu vào ước tính và trần đầu ra chỉ dùng để tạm giữ ngân sách trước cuộc gọi. Không dùng bộ đếm mô phỏng làm chi phí thực.

CSV mẫu đã chạy thật: 773 token (387 vào + 386 ra). Mỗi lần có thể khác. Provider lỗi không tạo báo cáo giả. Usage chưa xác định sẽ giữ khoản dự trù chờ đối soát; lỗi có receipt tính token thực tế, không tự retry.

Dữ liệu/quota luồng mới nằm trên máy chủ tại ../.runtime/workflow.json, không tin role hoặc số token gửi từ frontend. Trước khi được Startup duyệt, nhà đầu tư không lấy được dữ liệu tài chính, báo cáo hoặc tin nhắn của workspace qua API. Đây vẫn là môi trường demo localhost có thể chuyển giữa hai tài khoản, chưa có đăng nhập production.

Dữ liệu localStorage cũ được giữ riêng, không tự đưa tài liệu cũ lên máy chủ hoặc provider. Trang gói Investor ghi rõ quyền yêu cầu báo cáo và bản đồ sự kiện chưa hoạt động trong demo. Các quyền đã chạy gồm AI trong hạn mức kỹ thuật, danh mục, lưu/so sánh và export theo gói. Bảng gói kỹ thuật cũ trong `web/domain.js` chỉ phục vụ đọc dữ liệu phiên bản trước, không phải giá đang hiển thị. Công việc/tài liệu metadata của giao diện cũ chưa được chuyển sang workflow case mới.

## Kiểm tra

`npm test`: domain/CSV, ranh giới quota 6 gói, Free lifetime, reset tuần Việt Nam, migration, vai trò và giữ dữ liệu khi hạ gói.

`npm run test:e2e`: thao tác thực trên Edge — tạo/chặn workspace, trừ token/chặn thiếu, export, đổi gói/vai trò, reset tuần qua đồng hồ giả lập và responsive 390px.
