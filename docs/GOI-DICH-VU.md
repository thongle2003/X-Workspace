# Thiết kế gói X Workspace

Cập nhật ngày 01/11/2026. Đây là thiết kế thử nghiệm cho prototype, chưa phải bảng giá thương mại. Các mức giá VND là giả thuyết để kiểm chứng, không phải kết quả khảo sát willingness-to-pay.

## Cơ sở nghiên cứu

Đã đọc trực tiếp các trang chính thức dưới đây. Công cụ tìm kiếm không khả dụng trong phiên; nội dung được lấy từ chính website qua HTTP. Không dùng kết quả từ các trang bị chặn truy cập.

| Nguồn | Quan sát | Áp dụng vào X Workspace |
|---|---|---|
| [Visible — Founder Pricing](https://visible.vc/pricing/) | Có gói miễn phí; phân tầng theo data room, tài liệu, cập nhật nhà đầu tư và tính năng phân tích. | Startup trả phí để chuẩn bị hồ sơ và mở rộng workspace/tài liệu, không mua quyền quản lý danh mục đầu tư. |
| [Visible — Investor Pricing](https://visible.vc/investor-pricing/) | Bộ gói riêng cho nhà đầu tư; định giá tùy quy mô danh mục và đội ngũ, mở rộng tự động hóa và kiểm soát. | Ngân sách và quyền nhà đầu tư độc lập với startup; quy mô thẩm định/danh mục là trục nâng cấp. |
| [Dealum — Network Pricing](https://dealum.com/pricing) | Ba mức Essentials/Pro/Ultimate; tăng dung lượng hồ sơ/thành viên, tính năng danh mục và cộng tác. | Ba cấp dễ so sánh, giới hạn dung lượng cụ thể. Dealum phục vụ tổ chức angel nên không quy đổi trực tiếp giá sang sản phẩm cá nhân. |

Suy luận thiết kế: người dùng chọn vai trò trước rồi chọn cấp gói; trang giá chỉ hiển thị bộ gói tương ứng vai trò đang dùng. Chỉ Startup được tạo workspace. Free phục vụ trải nghiệm, gói giữa cho quy trình thường xuyên, gói cao cho nhiều dự án. Mức token và cơ chế reset dưới đây là quyết định sản phẩm theo yêu cầu người dùng; các nguồn trên không chứng minh chi phí hoặc định mức token này là tối ưu.

## Hai bộ gói độc lập

### Startup

| Quyền | Startup Free | Startup Launch | Startup Scale |
|---|---:|---:|---:|
| Giá đề xuất / tháng | 0đ | 199.000đ | 399.000đ |
| Token AI thực tế | 2.000 dùng một lần | 20.000 / tuần | 60.000 / tuần |
| Workspace đang lưu | 1 | 3 | 10 |
| Xem phân tích | Có | Có | Có |
| Xuất báo cáo CSV | Không | Có | Có |

Startup Free bắt đầu chưa có workspace của vai trò Startup, được tạo workspace đầu tiên. Không dùng danh mục, watchlist, so sánh hoặc gửi yêu cầu kết nối của vai trò nhà đầu tư.

### Nhà đầu tư

| Quyền | Investor Free | Investor Analyst | Investor Pro |
|---|---:|---:|---:|
| Giá đề xuất / tháng | 0đ | 299.000đ | 699.000đ |
| Token AI thực tế | 4.000 dùng một lần | 40.000 / tuần | 120.000 / tuần |
| Tạo workspace | Không | Không | Không |
| Startup trong danh mục | 3 | 10 | 30 |
| Startup đã lưu | 3 | 15 | 50 |
| So sánh đồng thời | 2 | 3 | 6 |
| Yêu cầu kết nối mẫu | 2 dùng một lần | 10 / tuần | 30 / tuần |
| Xuất báo cáo CSV | Không | Có | Có |

Prototype có 6 startup mẫu. Những hạn mức lớn hơn 6 vẫn được thực thi bằng domain và kiểm thử, nhưng dữ liệu demo chưa đủ để điền kín danh mục 10–30 startup bằng giao diện. Nhà đầu tư có thể xem workspace mẫu/dữ liệu cũ, nhưng không được tạo workspace ở bất kỳ gói nào. Dữ liệu đang có được giữ lại. Danh mục mẫu có 1 khoản đầu tư và 2 startup đã lưu.

## Quy tắc hạn mức

- Free: token và yêu cầu kết nối cấp một lần cho mỗi vai trò, không reset theo tuần/tháng/năm.
- Gói trả phí: token và kết nối reset về hạn mức gói lúc thứ Hai 00:00 Asia/Ho_Chi_Minh (Chủ nhật 17:00 UTC). Phần dư không cộng dồn. Mở app sau mốc này sẽ tự nhận kỳ mới.
- Launch/Scale dùng chung số token đã dùng trong tuần của Startup. Analyst/Pro dùng chung số đã dùng của Nhà đầu tư. Nâng gói tăng trần; không đưa số đã dùng về 0. Hạ gói xuống dưới số đã dùng sẽ chặn thêm đến kỳ tiếp theo.
- Free và paid lưu hai bộ đếm riêng. Free → paid → Free khôi phục phần Free còn lại trước đó, không cấp lại. Chuyển vai trò không chuyển quyền, dữ liệu riêng hoặc token sang vai trò kia.
- Workspace, công việc, tài liệu, danh mục, watchlist là giới hạn số lượng đang lưu, không phải quota thời gian. Không xóa dữ liệu khi đổi tuần hoặc hạ gói; còn xem, sửa và xóa được dữ liệu cũ. Chặn thêm mới khi bằng/vượt hạn mức.
- Mua thử theo năm có giá bằng 10 tháng. Chu kỳ giá không thay đổi lịch token mỗi tuần.
- Kết nối chỉ lưu mẫu tại thiết bị, chưa gửi tin. Tài liệu chỉ lưu metadata, tối đa 2 MB/tệp, không lưu nội dung tệp.

## Token và API hiện tại

AI Financial Analysis và AI Agent đã tích hợp API thật qua ModelAPI, model cấu hình gpt-6-astra. Báo cáo lưu model, provider, requestId và usage. Token tính theo tổng input_tokens + output_tokens do API trả về; phần đầu vào ước tính và trần đầu ra chỉ dùng để tạm giữ ngân sách trước cuộc gọi. Không dùng bộ đếm mô phỏng làm chi phí thực.

CSV mẫu đã chạy thật: 773 token (387 vào + 386 ra). Mỗi lần có thể khác. Provider lỗi không tạo báo cáo giả. Usage chưa xác định sẽ giữ khoản dự trù chờ đối soát; lỗi có receipt tính token thực tế, không tự retry.

Dữ liệu/quota luồng mới nằm trên máy chủ tại ../.runtime/workflow.json, không tin role hoặc số token gửi từ frontend. Trước khi được Startup duyệt, nhà đầu tư không lấy được dữ liệu tài chính, báo cáo hoặc tin nhắn của workspace qua API. Đây vẫn là môi trường demo localhost có thể chuyển giữa hai tài khoản, chưa có đăng nhập production.

Dữ liệu localStorage cũ được giữ riêng, không tự đưa tài liệu cũ lên máy chủ hoặc provider. Trang gói hiện chỉ quảng cáo các quyền đã nối vào luồng mới: token, workspace Startup, kết nối, danh mục, lưu/so sánh và export. Công việc/tài liệu metadata của giao diện cũ chưa được chuyển sang workflow này.

## Kiểm tra

`npm test`: domain/CSV, ranh giới quota 6 gói, Free lifetime, reset tuần Việt Nam, migration, vai trò và giữ dữ liệu khi hạ gói.

`npm run test:e2e`: thao tác thực trên Edge — tạo/chặn workspace, trừ token/chặn thiếu, export, đổi gói/vai trò, reset tuần qua đồng hồ giả lập và responsive 390px.
