// A staged investor checklist. Answers belong to a workspace and are never
// included in the public Marketplace projection.
export const DEEP_DILIGENCE_FIELDS = [
  { key: 'productDemo', group: 'Sản phẩm & thị trường', label: 'Demo sản phẩm', hint: 'Link hoặc cách thử sản phẩm đang chạy.' },
  { key: 'productRoadmap', group: 'Sản phẩm & thị trường', label: 'Lộ trình sản phẩm', hint: 'Mốc đã hoàn thành và mốc dự kiến trong 12–18 tháng.' },
  { key: 'marketSizing', group: 'Sản phẩm & thị trường', label: 'Cách tính quy mô thị trường', hint: 'Phân khúc khách hàng, giả định và nguồn dữ liệu.' },
  { key: 'competitorMatrix', group: 'Sản phẩm & thị trường', label: 'Đối thủ và lợi thế', hint: 'Giải pháp thay thế hiện tại và điểm khác biệt có thể kiểm chứng.' },
  { key: 'goToMarket', group: 'Sản phẩm & thị trường', label: 'Kênh tiếp cận khách hàng', hint: 'Cách tìm, bán và triển khai cho khách hàng.' },
  { key: 'pricingModel', group: 'Sản phẩm & thị trường', label: 'Mô hình giá và doanh thu', hint: 'Ai trả tiền, trả cho việc gì và tần suất thanh toán.' },
  { key: 'customerContracts', group: 'Khách hàng & tăng trưởng', label: 'Khách hàng và hợp đồng', hint: 'Số khách hàng trả tiền, hợp đồng mẫu hoặc mức tập trung doanh thu.' },
  { key: 'salesPipeline', group: 'Khách hàng & tăng trưởng', label: 'Pipeline bán hàng', hint: 'Cơ hội bán hàng theo giai đoạn; tách rõ dự kiến và đã ký.' },
  { key: 'usageGrowth', group: 'Khách hàng & tăng trưởng', label: 'Tăng trưởng sử dụng', hint: 'Người dùng hoạt động hoặc lượt sử dụng theo kỳ, có nguồn số liệu.' },
  { key: 'retention', group: 'Khách hàng & tăng trưởng', label: 'Giữ chân khách hàng', hint: 'Tỷ lệ quay lại, cohort hoặc doanh thu lặp lại phù hợp mô hình.' },
  { key: 'unitEconomics', group: 'Tài chính & vòng vốn', label: 'Hiệu quả mỗi khách hàng', hint: 'Biên lợi nhuận, CAC, LTV và thời gian hoàn vốn nếu đã có dữ liệu.' },
  { key: 'revenueBreakdown', group: 'Tài chính & vòng vốn', label: 'Cơ cấu doanh thu', hint: 'Doanh thu theo sản phẩm, nhóm khách hàng và kỳ báo cáo.' },
  { key: 'pnlBurn', group: 'Tài chính & vòng vốn', label: 'Lãi lỗ và mức đốt tiền', hint: 'P&L theo tháng, chi phí chính và tiền mặt cuối kỳ.' },
  { key: 'runway', group: 'Tài chính & vòng vốn', label: 'Runway', hint: 'Số tháng hoạt động còn lại và giả định về dòng tiền.' },
  { key: 'forecast', group: 'Tài chính & vòng vốn', label: 'Dự báo và giả định', hint: 'Mốc vận hành 12–18 tháng và các giả định chính.' },
  { key: 'useOfFunds', group: 'Tài chính & vòng vốn', label: 'Phân bổ vốn gọi được', hint: 'Số tiền dùng cho từng mốc sản phẩm, tuyển dụng và bán hàng.' },
  { key: 'capTable', group: 'Tài chính & vòng vốn', label: 'Cap table và vòng vốn trước', hint: 'Cơ cấu sở hữu, ESOP và các khoản SAFE hoặc trái phiếu chuyển đổi.' },
  { key: 'founderBios', group: 'Đội ngũ, IP & pháp lý', label: 'Founder và vai trò', hint: 'Kinh nghiệm liên quan, trách nhiệm và người chủ chốt.' },
  { key: 'ipOwnership', group: 'Đội ngũ, IP & pháp lý', label: 'Quyền sở hữu IP', hint: 'Chủ sở hữu mã nguồn, nhãn hiệu, bằng sáng chế và các thỏa thuận chuyển giao.' },
  { key: 'legalRisks', group: 'Đội ngũ, IP & pháp lý', label: 'Pháp lý và rủi ro trọng yếu', hint: 'Giấy phép, hợp đồng quan trọng, tranh chấp và cách xử lý rủi ro.' },
];

export const DEEP_DILIGENCE_KEYS = new Set(DEEP_DILIGENCE_FIELDS.map(field => field.key));
