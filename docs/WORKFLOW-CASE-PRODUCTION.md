# Luồng case và kết nối 2G2BT

Trạng thái: bảng giá đã được cập nhật theo file kinh tế do chủ sản phẩm cung cấp. Trang đang xem bằng `?mode=demo` và bộ chọn **Nhà đầu tư demo / Startup demo** là môi trường thử hai phía, không phải cơ chế tài khoản cho production.

## Quyết định đã chốt

- “Customer” trong ảnh trao đổi là **investor**. Investor giữ gói subscription.
- Startup (business) trả **899.000đ cho 12 tháng niêm yết một hồ sơ**, thay cho subscription của phía startup. Mức giá đã công bố; cổng thanh toán chưa mở.
- Không bán thêm lượt AI/token cho người dùng sau khi họ đã mua gói hoặc trả phí case. Hệ thống vẫn có thể đo lượng sử dụng nội bộ để kiểm soát chi phí và chống lạm dụng, nhưng không trình bày nó như một khoản tính phí theo lượt.
- Có đầu ra từ mentor trong vòng đời của case. Không gắn nhãn “đã được mentor đánh giá” cho kết quả chỉ do AI tạo.
- Kết nối một case giữa startup và investor có khoản phí **500.000đ tổng cộng**. Sau khi Startup đồng ý, hai bên chia đều: **250.000đ mỗi bên**.

## Gói Investor cập nhật từ bảng giá cũ

| Gói | Giá tháng | Giá năm | Startup đã lưu | Startup trong danh mục | Yêu cầu báo cáo |
|---|---:|---:|---:|---:|---|
| Trial | Miễn phí trong 2 tháng | — | 3 | 3 | 1 lần/quý |
| Basic | 399.000đ | 3.999.000đ | 5 | 10 | 1 lần/tháng |
| Pro | 699.000đ | 6.999.000đ | 20 | 50 | 2–3 lần/tháng |

Pro năm có thêm bản đồ sự kiện/startup gần bạn và bộ lọc theo khoảng cách, lĩnh vực, ngày tổ chức. Yêu cầu báo cáo, bản đồ và tự kết thúc Trial chưa được triển khai trong demo; giao diện giá phải ghi rõ trạng thái đó. Gói Investor Basic có 20 triệu token AI/tháng, Pro có 30 triệu token AI/tháng. Mua thêm AI/token và quảng cáo trả phí của bảng cũ đã bỏ. **AI đánh giá pitch deck** được niêm yết 200.000đ/lần nhưng tính năng và thanh toán chưa mở; đây không phải phí mentor.

## Luồng sản phẩm cần có

1. Startup tạo case ở trạng thái nháp, nhập nội dung và tài liệu; chỉ chủ case thấy dữ liệu riêng tư.
2. Startup xem giá cố định, xác nhận đặt mua. Case chỉ chuyển sang bước xử lý/đăng khi máy chủ xác nhận thanh toán thành công; thất bại hoặc bỏ dở vẫn là nháp.
3. Mentor nhận case, ghi kết quả và trạng thái xử lý. Startup được xem đầu ra; phần công khai và phần chỉ dành cho investor phải được tách rõ.
4. Investor có subscription phù hợp tìm case, xem phần công khai và gửi yêu cầu kết nối.
5. Startup chấp nhận hoặc từ chối. Nếu chấp nhận, mỗi bên thấy khoản phải trả **250.000đ** và thực hiện thanh toán. Nếu từ chối, không tạo khoản phải trả kết nối.
6. Chỉ sau khi Startup chấp thuận **và cả hai khoản thanh toán được máy chủ xác nhận**, hệ thống mở quyền xem hồ sơ riêng và trao đổi giữa hai bên. Nếu một bên chưa trả hoặc thanh toán thất bại, quyền vẫn đóng. Việc hủy/hoàn tiền và thu hồi quyền phải được xử lý nhất quán.

## Phân biệt bản đang sửa và bản production

| Hạng mục | Bản đang xem qua bộ chọn demo | Điều kiện trước khi lên production |
|---|---|---|
| Tài khoản | Có thể đổi giữa hai vai trò thử nghiệm trên cùng trình duyệt | Đăng nhập thật, định danh và phân quyền theo tài khoản; không thể tự chuyển sang tài khoản người khác |
| Gói dịch vụ | Investor hiện bảng giá mới; Startup hiện phí niêm yết 899.000đ/12 tháng và AI review pitch deck 200.000đ/lần; chưa thu tiền | Investor subscription với quyền lợi được thực thi; Startup trả theo hồ sơ; không tính phí AI theo token/lượt |
| Case/mentor | `?mode=demo#/cases` có luồng mô phỏng trong trình duyệt. Bản máy chủ lưu nháp case và trạng thái `awaiting_payment`; chưa giao mentor hoặc công bố case. | Tài khoản mentor thật; giao việc, ghi nhận, kiểm duyệt và phân quyền đầu ra trên máy chủ |
| Kết nối | Hai tài khoản demo gửi yêu cầu, duyệt, xác nhận 250.000đ mỗi bên **mô phỏng**, sau đó chat trong cùng trình duyệt | Thu hai khoản thật sau khi duyệt; máy chủ khóa quyền cho đến khi webhook xác nhận cả hai |
| Thanh toán | Chưa thu tiền thật | Tích hợp nhà cung cấp thanh toán, xác minh webhook, chống ghi nhận trùng, hóa đơn/biên nhận và xử lý hoàn tiền/thất bại |
| Dữ liệu | Demo dùng dữ liệu mẫu; một số phần lưu ở trình duyệt | Lưu bền vững trên máy chủ, sao lưu/khôi phục, nhật ký thay đổi và kiểm thử phân quyền |

Không gọi một bản là “production hoàn chỉnh” chỉ vì giao diện đã hiện các bước. Cần kiểm thử xuyên suốt bằng các tài khoản tách biệt: tạo case → xác nhận phí → mentor trả kết quả → investor gửi yêu cầu → startup quyết định → xác nhận phí kết nối → mở quyền → thu hồi/quản lý sự cố.

Bản máy chủ có trang `#/cases`: Startup tạo, sửa, gửi và rút case nháp. Khi gửi, trạng thái là `awaiting_payment`; không tạo yêu cầu thu tiền, không ghi mentor đã duyệt và không đưa case vào danh sách Investor. Giá công khai chưa phải xác nhận đã thanh toán. **Không triển khai đường chạy máy chủ đó như sản phẩm thương mại** trước khi hoàn thiện quy tắc case, mentor, thanh toán, tài liệu và phân quyền.

Máy chủ đã có chốt quyền tạm thời cho yêu cầu xem workspace: Startup đồng ý chưa mở CSV, báo cáo, AI trên hồ sơ hay tin nhắn. Cả hai biên nhận phí kết nối 250.000đ phải được ghi bằng phương thức nội bộ `settleConnectionPayment`; API cho trình duyệt không có thao tác này. Chưa có cổng thanh toán và webhook nên trạng thái này chưa thể được hoàn tất bằng tiền thật. Quyền từng được cấp trong dữ liệu cũ mà không có biên nhận sẽ khóa lại để đối soát.

## Quy tắc còn chờ xác nhận

1. Chính sách hoàn tiền/hủy sau khi một hoặc cả hai bên đã thanh toán phí kết nối.
2. Mentor là người nội bộ hay đối tác; ai có quyền giao việc, duyệt và công bố đầu ra.

Không kích hoạt thu tiền thật hoặc mở quyền dựa trên thanh toán trước khi các quy tắc này được xác nhận và luồng máy chủ được hoàn thiện.
