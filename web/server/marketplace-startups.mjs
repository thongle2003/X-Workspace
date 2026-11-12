const startups = [
  { id:'startup-tai-sinh-nong', name:'Tái Sinh Nông', industry:'Climate Tech', stage:'Pre-seed', location:'Cần Thơ', target:1800, goal:'Mở rộng thu gom phụ phẩm nông nghiệp và sản xuất vật liệu đóng gói sinh học.', summary:'Nền tảng kết nối hợp tác xã với đơn vị tái chế phụ phẩm nông nghiệp thành vật liệu đóng gói sinh học, hướng tới chuỗi cung ứng tuần hoàn.', market:'Khách hàng mục tiêu: hợp tác xã lúa gạo, nhà sản xuất bao bì và doanh nghiệp thực phẩm tại Đồng bằng sông Cửu Long.' },
  { id:'startup-so-may', name:'Sổ Mây', industry:'SaaS · Fintech', stage:'Seed', location:'TP. Hồ Chí Minh', target:3200, goal:'Mở rộng nền tảng quản trị tài chính và dòng tiền cho doanh nghiệp nhỏ tại Việt Nam.', summary:'Nền tảng SaaS giúp doanh nghiệp nhỏ hợp nhất thu chi từ cửa hàng, hóa đơn và tài khoản ngân hàng; tự động đối soát, theo dõi công nợ, lập báo cáo quản trị và dự báo dòng tiền. Sản phẩm hướng tới chủ doanh nghiệp và kế toán cần số liệu cập nhật mà không phải ghép nhiều bảng tính.', market:'Khách hàng mục tiêu: doanh nghiệp siêu nhỏ và nhỏ, cửa hàng bán lẻ, đơn vị dịch vụ và công ty thương mại. Người dùng chính là chủ doanh nghiệp, kế toán nội bộ và kế toán dịch vụ. Nhu cầu: chốt sổ nhanh, kiểm soát công nợ, biết số dư có thể sử dụng và dự báo thiếu hụt tiền. Kênh tiếp cận dự kiến: kế toán dịch vụ, đối tác phần mềm hóa đơn, ngân hàng và bán hàng trực tiếp. Cần xác minh quy mô phân khúc bằng nguồn dữ liệu có thể kiểm tra.' },
  { id:'startup-bac-si-so', name:'Bác Sĩ Số', industry:'Healthtech', stage:'Pre-seed', location:'Hà Nội', target:2400, goal:'Hoàn thiện nền tảng quản lý lịch hẹn và chăm sóc sau khám cho phòng khám.', summary:'Giải pháp quản lý lịch hẹn, nhắc tái khám và hồ sơ chăm sóc cơ bản cho phòng khám độc lập.', market:'Khách hàng mục tiêu: phòng khám đa khoa, chuyên khoa và trung tâm chăm sóc sức khỏe.' },
  { id:'startup-cho-nong', name:'Chợ Nông', industry:'E-commerce', stage:'Seed', location:'Đà Lạt', target:2800, goal:'Mở rộng kênh đặt hàng trực tiếp giữa nông hộ và bếp ăn tập thể.', summary:'Sàn đặt hàng nông sản theo mùa, giúp bếp ăn lập kế hoạch mua hàng và nông hộ nhận nhu cầu trước vụ thu hoạch.', market:'Khách hàng mục tiêu: nhà hàng, bếp ăn tập thể, hợp tác xã và trang trại.' },
  { id:'startup-hoc-5-phut', name:'Học 5 Phút', industry:'Edtech', stage:'Pre-seed', location:'Đà Nẵng', target:1500, goal:'Phát triển thư viện bài học ngắn về kỹ năng nghề nghiệp số.', summary:'Ứng dụng học theo bài ngắn với lộ trình thực hành kỹ năng số dành cho người đi làm.', market:'Khách hàng mục tiêu: người đi làm, sinh viên năm cuối và doanh nghiệp đào tạo nội bộ.' },
  { id:'startup-dien-sach', name:'Điện Sạch', industry:'Climate Tech', stage:'Series A', location:'Bình Dương', target:6500, goal:'Mở rộng phần mềm theo dõi tiêu thụ điện cho nhà xưởng.', summary:'Bảng điều khiển giúp nhà xưởng theo dõi mức tiêu thụ điện theo khu vực và lập kế hoạch tiết kiệm năng lượng.', market:'Khách hàng mục tiêu: cơ sở sản xuất, khu công nghiệp và đơn vị vận hành kho vận.' },
  { id:'startup-vi-mo', name:'Ví Mở', industry:'Fintech', stage:'Seed', location:'TP. Hồ Chí Minh', target:4000, goal:'Mở rộng công cụ quản lý thu chi và đối soát cho hộ kinh doanh.', summary:'Công cụ tổng hợp giao dịch từ nhiều kênh bán hàng để hộ kinh doanh theo dõi thu chi và đối soát cuối ngày.', market:'Khách hàng mục tiêu: cửa hàng bán lẻ, hộ kinh doanh và đơn vị bán hàng đa kênh.' },
  { id:'startup-kho-noi', name:'Kho Nối', industry:'SaaS', stage:'Seed', location:'Hải Phòng', target:3500, goal:'Kết nối nhu cầu lưu kho ngắn hạn với công suất kho còn trống.', summary:'Phần mềm đăng ký, tìm kiếm và quản lý công suất kho ngắn hạn cho doanh nghiệp vừa và nhỏ.', market:'Khách hàng mục tiêu: doanh nghiệp bán lẻ, nhà sản xuất và đơn vị logistics.' },
  { id:'startup-vat-lieu-moi', name:'Vật Liệu Mới', industry:'Climate Tech', stage:'Pre-seed', location:'Huế', target:2100, goal:'Mở rộng quy trình tái sử dụng vật liệu xây dựng sau tháo dỡ.', summary:'Danh mục vật liệu thu hồi, phân loại và kết nối với đơn vị có nhu cầu tái sử dụng trong công trình.', market:'Khách hàng mục tiêu: nhà thầu, đơn vị thiết kế và doanh nghiệp cung ứng vật liệu xây dựng.' },
  { id:'startup-bep-gan', name:'Bếp Gần', industry:'E-commerce', stage:'Seed', location:'Nha Trang', target:2600, goal:'Mở rộng kênh đặt nguyên liệu định kỳ cho nhà hàng địa phương.', summary:'Công cụ đặt hàng theo lịch cho nhà hàng, kết nối nhu cầu nguyên liệu với nhà cung cấp địa phương.', market:'Khách hàng mục tiêu: nhà hàng độc lập, bếp ăn và nhà cung cấp thực phẩm địa phương.' },
];

const investorCaseListings = [
  { id:'case-tai-sinh-nong-seed', workspaceId:'startup-tai-sinh-nong', title:'Tái Sinh Nông · Mở rộng vật liệu đóng gói sinh học', summary:'Gọi vốn Pre-seed để tăng năng lực thu gom phụ phẩm, hoàn thiện thử nghiệm vật liệu và phát triển kênh bán hàng với hợp tác xã, nhà sản xuất bao bì và doanh nghiệp thực phẩm.' },
  { id:'case-so-may-seed', workspaceId:'startup-so-may', title:'Sổ Mây · Quản trị dòng tiền cho doanh nghiệp nhỏ', summary:'Gọi vốn Seed để hoàn thiện nền tảng quản trị tài chính, tích hợp hóa đơn và ngân hàng, tăng cường bảo mật, rồi mở rộng triển khai tới cửa hàng và doanh nghiệp nhỏ.' },
  { id:'case-bac-si-so-preseed', workspaceId:'startup-bac-si-so', title:'Bác Sĩ Số · Số hóa vận hành phòng khám', summary:'Gọi vốn Pre-seed để hoàn thiện lịch hẹn, nhắc tái khám và quy trình chăm sóc sau khám; tập trung vào tích hợp, an toàn dữ liệu và triển khai tại phòng khám độc lập.' },
  { id:'case-cho-nong-seed', workspaceId:'startup-cho-nong', title:'Chợ Nông · Kết nối nông hộ với bếp ăn', summary:'Gọi vốn Seed để mở rộng đặt hàng nông sản theo mùa, phát triển nhà cung cấp và cải thiện khâu giao nhận cho nhà hàng, bếp ăn tập thể và hợp tác xã.' },
  { id:'case-dien-sach-series-a', workspaceId:'startup-dien-sach', title:'Điện Sạch · Theo dõi năng lượng nhà xưởng', summary:'Gọi vốn Series A để triển khai thêm hệ thống đo đếm, phân tích mức tiêu thụ điện và hỗ trợ nhà xưởng xây kế hoạch tiết kiệm năng lượng.' },
];

export function createInvestorCaseListings(workspaces) {
  const byId=new Map(workspaces.filter(workspace=>workspace.published).map(workspace=>[workspace.id,workspace]));
  return investorCaseListings.flatMap(listing=>{
    const workspace=byId.get(listing.workspaceId);
    if(!workspace)return [];
    const {profile}=workspace;
    return [{...listing,workspaceName:profile.name,industry:profile.industry,stage:profile.stage,location:profile.location,target:profile.target,raised:profile.raised,useOfFunds:profile.useOfFunds}];
  });
}

const details = {
  'startup-tai-sinh-nong': { fundingRoundIndex:1, fundingRoundTotal:4, raised:420, traction:'Đã khảo sát 12 hợp tác xã và hoàn thành 3 lô thử nghiệm vật liệu; doanh thu thương mại chưa được công bố.', customerReferences:'HTX Đồng Xanh\nBao Bì Mekong', team:'Đội ngũ kết hợp kinh nghiệm về chuỗi cung ứng nông nghiệp, vật liệu sinh học và vận hành sản phẩm.', useOfFunds:'Thử nghiệm vật liệu sinh học (40%)\nThiết bị thu gom và sơ chế (30%)\nPhát triển sản phẩm (20%)\nPháp lý và vận hành (10%)' },
  'startup-so-may': { fundingRoundIndex:2, fundingRoundTotal:4, raised:900, traction:'Kế hoạch thử nghiệm: tuyển nhóm tối đa 80 cửa hàng để kiểm tra quy trình nhập dữ liệu, đối soát, công nợ và dự báo tiền mặt. Chưa có số liệu người dùng hoạt động, khách hàng trả phí, doanh thu định kỳ hoặc tỷ lệ duy trì được xác minh trong hồ sơ này.', customerReferences:'Chưa công bố hợp đồng hoặc khách hàng trả phí. Nhóm thử nghiệm 80 cửa hàng là mục tiêu kế hoạch, không phải số lượng người dùng đã xác nhận.', team:'Đội ngũ định hướng sản phẩm SaaS, tích hợp dữ liệu kế toán và ngân hàng, bảo mật thông tin tài chính, hỗ trợ triển khai cho doanh nghiệp nhỏ. Hồ sơ kinh nghiệm và phân công toàn thời gian cần được bổ sung để thẩm định.', useOfFunds:'Phát triển sản phẩm, bảo mật và hạ tầng (40%)\nTích hợp hóa đơn điện tử, ngân hàng và nền tảng bán hàng (25%)\nBán hàng, triển khai và hỗ trợ khách hàng (25%)\nPháp lý, tuân thủ và vận hành (10%)' },
  'startup-bac-si-so': { fundingRoundIndex:1, fundingRoundTotal:4, raised:300, traction:'Quy trình triển khai tại 5 phòng khám, với năng lực mục tiêu 2.000 lịch hẹn mỗi tháng.', customerReferences:'Phòng khám An Khang\nPhòng khám Hồng Mai', team:'Đội ngũ chuyên môn về vận hành phòng khám, phát triển phần mềm y tế và bảo vệ dữ liệu.', useOfFunds:'Hoàn thiện sản phẩm và an toàn dữ liệu (40%)\nThử nghiệm quy trình (25%)\nTích hợp hệ thống (20%)\nVận hành và pháp lý (15%)' },
  'startup-cho-nong': { fundingRoundIndex:2, fundingRoundTotal:4, raised:700, traction:'Kết nối 25 nhà cung cấp nông sản với 40 bếp ăn; tập trung vào đơn hàng theo mùa và logistics lạnh.', customerReferences:'Bếp Nhà Mộc\nNông Trại Đồi Xanh', team:'Đội ngũ có kinh nghiệm về thu mua nông sản, logistics lạnh và thương mại điện tử.', useOfFunds:'Sản phẩm và công cụ đặt hàng (35%)\nKiểm soát chất lượng (25%)\nLogistics và chuỗi lạnh (25%)\nPhát triển thị trường (15%)' },
  'startup-hoc-5-phut': { fundingRoundIndex:1, fundingRoundTotal:4, raised:150, traction:'Hoàn thiện 40 bài học chuyên môn và lộ trình học 6 tuần dành cho kỹ năng số.', customerReferences:'Cao đẳng Sao Việt\nTrung tâm Hướng Dương', team:'Đội ngũ chuyên môn về thiết kế học liệu, công nghệ giáo dục và đo lường kết quả học tập.', useOfFunds:'Sản xuất học liệu (35%)\nPhát triển nền tảng (30%)\nHợp tác chuyên gia (20%)\nVận hành và kiểm định nội dung (15%)' },
  'startup-dien-sach': { fundingRoundIndex:3, fundingRoundTotal:4, raised:3200, traction:'Kế hoạch triển khai tại 12 nhà xưởng, đặt mục tiêu tiết kiệm điện trung bình 8% mỗi năm.', customerReferences:'Nhà máy Nam Phát\nKhu công nghiệp Bình An', team:'Đội ngũ chuyên môn về quản lý năng lượng, IoT công nghiệp và phân tích dữ liệu.', useOfFunds:'Triển khai thiết bị đo (35%)\nPhát triển phân tích năng lượng (30%)\nĐội ngũ triển khai (20%)\nVận hành và chứng nhận (15%)' },
  'startup-vi-mo': { fundingRoundIndex:2, fundingRoundTotal:4, raised:600, traction:'Tích hợp 3 kênh thanh toán và chuẩn bị chương trình triển khai với 50 cửa hàng.', customerReferences:'Cửa hàng Tâm An\nMộc Gia Store', team:'Đội ngũ chuyên môn về sản phẩm fintech, đối soát thanh toán và quản trị rủi ro.', useOfFunds:'Tích hợp và bảo mật (35%)\nPhát triển sản phẩm (30%)\nHỗ trợ hộ kinh doanh (20%)\nTuân thủ và vận hành (15%)' },
  'startup-kho-noi': { fundingRoundIndex:2, fundingRoundTotal:4, raised:840, traction:'Danh mục kết nối 15 kho với tổng công suất chào thuê 4.000 m²; ưu tiên hợp đồng lưu kho ngắn hạn.', customerReferences:'Kho Nam Dương\nKho Hạ Long', team:'Đội ngũ có kinh nghiệm về vận hành kho, logistics và phát triển phần mềm doanh nghiệp.', useOfFunds:'Nền tảng quản lý kho (35%)\nTích hợp dữ liệu và định vị (25%)\nPhát triển đối tác (25%)\nVận hành (15%)' },
  'startup-vat-lieu-moi': { fundingRoundIndex:1, fundingRoundTotal:4, raised:210, traction:'Hoàn thiện quy trình phân loại 6 nhóm vật liệu và chuẩn bị triển khai tại 2 công trình.', customerReferences:'Công trình Vĩnh An\nAn Phú Materials', team:'Đội ngũ chuyên môn về kỹ thuật vật liệu, thiết kế tuần hoàn và quản lý công trình.', useOfFunds:'Kiểm định vật liệu (35%)\nPhát triển danh mục và truy xuất (25%)\nThử nghiệm quy trình (25%)\nPháp lý và vận hành (15%)' },
  'startup-bep-gan': { fundingRoundIndex:2, fundingRoundTotal:4, raised:520, traction:'Kết nối 30 nhà hàng với 20 nhà cung cấp, tập trung vào đơn hàng định kỳ và nguồn nguyên liệu địa phương.', customerReferences:'Bếp Nhà Mộc\nNhà hàng Cát Biển', team:'Đội ngũ chuyên môn về vận hành nhà hàng, thương mại điện tử và chuỗi cung ứng thực phẩm.', useOfFunds:'Sản phẩm đặt hàng định kỳ (35%)\nPhát triển nhà cung cấp (25%)\nKiểm soát chất lượng (20%)\nHỗ trợ và vận hành (20%)' },
};

const teams = {
  'startup-tai-sinh-nong': [['Nguyễn Gia Hân','CEO · Chuỗi cung ứng'],['Võ Minh Trí','CTO · Vật liệu sinh học'],['Lê Quốc Bảo','COO · Vận hành nông nghiệp']],
  'startup-so-may': [['Trần Thanh Tùng','CEO · Sản phẩm SaaS'],['Lê Phương Nhi','CTO · Nền tảng dữ liệu'],['Nguyễn Hải Yến','CFO · Kế toán doanh nghiệp']],
  'startup-bac-si-so': [['Phạm Hoàng Long','CEO · Vận hành y tế'],['Đặng Minh Châu','CTO · Phần mềm y tế'],['Trần Thu Hà','COO · Chăm sóc khách hàng']],
  'startup-cho-nong': [['Nguyễn Bảo Anh','CEO · Phát triển thị trường'],['Lê Quốc Huy','CTO · Thương mại điện tử'],['Phan Thanh Tâm','COO · Logistics lạnh']],
  'startup-hoc-5-phut': [['Võ Khánh Linh','CEO · Thiết kế học tập'],['Trần Đức Anh','CTO · Nền tảng Edtech'],['Nguyễn Bích Ngọc','COO · Học liệu']],
  'startup-dien-sach': [['Lê Nhật Minh','CEO · Hiệu quả năng lượng'],['Phạm Hương Giang','CTO · IoT công nghiệp'],['Đỗ Quốc Khánh','COO · Triển khai nhà xưởng']],
  'startup-vi-mo': [['Nguyễn Tuấn Kiệt','CEO · Sản phẩm Fintech'],['Trịnh Ngọc Lan','CTO · Thanh toán'],['Bùi Minh Tài','CRO · Quản trị rủi ro']],
  'startup-kho-noi': [['Hoàng Gia Bảo','CEO · Logistics'],['Phan Minh Châu','CTO · Phần mềm kho vận'],['Lê Đức Duy','COO · Kết nối kho']],
  'startup-vat-lieu-moi': [['Đặng Thảo Vy','CEO · Kinh tế tuần hoàn'],['Trần Gia Hưng','CTO · Kỹ thuật vật liệu'],['Nguyễn Nhật Anh','COO · Công trình']],
  'startup-bep-gan': [['Lê Hoàng Yến','CEO · Vận hành nhà hàng'],['Nguyễn Mạnh Hùng','CTO · Thương mại điện tử'],['Võ Thu Trang','COO · Chuỗi cung ứng']],
};

const soMayFinancialCsv = `period,revenue,cogs,opex,cash,operating_cash_flow,receivables
2025-11,120,12,240,1080,-132,18
2025-12,135,13.5,245,950,-130,21
2026-01,150,15,250,835,-115,24
2026-02,165,16.5,255,735,-100,27
2026-03,180,18,260,655,-80,30
2026-04,195,19.5,265,590,-65,34
2026-05,210,21,270,540,-50,38
2026-06,225,22.5,275,505,-35,43
2026-07,240,24,280,485,-20,48
2026-08,255,25.5,285,475,-10,54
2026-09,270,27,290,470,-5,61
2026-10,285,28.5,295,465,-5,68`;

// Private founder workspace notes. Unknowns are called out so the assistant
// can analyze gaps instead of treating planning assumptions as verified facts.
export const SO_MAY_DILIGENCE = Object.freeze({
  productDemo:'Phạm vi sản phẩm: nhập hoặc đồng bộ giao dịch; phân loại thu chi; đối soát hóa đơn và giao dịch; theo dõi công nợ phải thu/phải trả; bảng điều khiển dòng tiền; dự báo số dư 4–13 tuần. Cần bổ sung đường dẫn bản chạy, ảnh sản phẩm, tình trạng từng tính năng và kết quả kiểm thử.',
  productRoadmap:'0–3 tháng: hoàn thiện nhập dữ liệu, phân quyền, nhật ký thay đổi và báo cáo dòng tiền. 3–6 tháng: tích hợp hóa đơn điện tử và một số ngân hàng theo khả năng đối tác. 6–12 tháng: dự báo, cảnh báo công nợ và báo cáo đa cửa hàng. Đây là lộ trình dự kiến; cần cập nhật mốc đã hoàn thành, nguồn lực và tiêu chí nghiệm thu.',
  marketSizing:'Phân khúc ưu tiên ban đầu: doanh nghiệp nhỏ/cửa hàng có kế toán nội bộ hoặc thuê ngoài và đang ghép dữ liệu từ nhiều nguồn. Chưa có số liệu TAM/SAM/SOM được dẫn nguồn. Khi phân tích, dùng công thức số doanh nghiệp phù hợp × tỷ lệ có nhu cầu × doanh thu thuê bao năm; tách rõ nguồn thống kê, địa bàn và giả định chuyển đổi.',
  competitorMatrix:'Nhóm thay thế: bảng tính tự lập; phần mềm kế toán; phần mềm bán hàng/POS; dịch vụ kế toán thuê ngoài; công cụ quản trị dòng tiền quốc tế. Cần so sánh theo đồng bộ dữ liệu, đối soát, công nợ, dự báo, đa cửa hàng, giá, thời gian triển khai và khả năng xuất dữ liệu. Chưa có kiểm chứng lợi thế cạnh tranh hoặc bảng so sánh sản phẩm cụ thể.',
  goToMarket:'Kênh dự kiến: bán trực tiếp cho chủ doanh nghiệp; giới thiệu qua kế toán dịch vụ; hợp tác với nhà cung cấp hóa đơn điện tử, POS và ngân hàng; nội dung hướng dẫn quản trị dòng tiền. Thử nghiệm đề xuất: phỏng vấn 20 doanh nghiệp, mời nhóm thử nghiệm tối đa 80 cửa hàng, đo kích hoạt, dùng hàng tuần, chuyển đổi trả phí và thời gian hỗ trợ. Đây là kế hoạch, chưa phải kết quả đạt được.',
  pricingModel:'Giả thuyết giá để kiểm tra: gói cơ bản 199.000 đ/tháng cho một đơn vị; gói tăng trưởng 499.000 đ/tháng cho nhiều nguồn dữ liệu và nhiều người dùng; gói tùy chỉnh báo giá. Chưa có khảo sát sẵn lòng chi trả hay doanh thu thuê bao xác nhận. Cần thử nghiệm giá theo quy mô giao dịch, số điểm bán và mức hỗ trợ.',
  customerContracts:'Chưa cung cấp hợp đồng, hóa đơn bán hàng, số khách hàng trả phí hoặc mức tập trung doanh thu. Mục tiêu thử nghiệm 80 cửa hàng không đồng nghĩa với khách hàng đang hoạt động. Cần bổ sung hợp đồng đã ký, trạng thái gia hạn, giá trị hợp đồng và đồng ý tham chiếu khách hàng.',
  salesPipeline:'Chưa có pipeline bán hàng được xác nhận. Nên theo dõi theo từng cơ hội: khách hàng tiềm năng, đã khám phá nhu cầu, dùng thử, đàm phán, ký hợp đồng, doanh thu dự kiến, xác suất và ngày dự kiến chốt. Không tính khách hàng tiềm năng hoặc thử nghiệm vào doanh thu đã ký.',
  usageGrowth:'Chưa cung cấp số tài khoản đăng ký, người dùng hoạt động tuần/tháng, cửa hàng đã kết nối dữ liệu, số giao dịch xử lý hoặc tỷ lệ kích hoạt. Theo dõi cohort theo tháng và tách tài khoản dùng thử khỏi khách hàng trả phí.',
  retention:'Chưa có dữ liệu churn, giữ chân logo, giữ chân doanh thu hoặc cohort. Cần định nghĩa khách hàng hoạt động, chu kỳ gia hạn và cách xử lý mùa vụ; báo cáo theo tháng bắt đầu sử dụng.',
  unitEconomics:'Chưa có CAC, LTV, tỷ lệ chuyển đổi dùng thử, biên lợi nhuận theo khách hàng hoặc thời gian hoàn vốn được xác minh. Chi phí phục vụ cần gồm phí tích hợp dữ liệu, hạ tầng, hỗ trợ và bán hàng. Có thể phân tích kịch bản sau khi thay giả định giá và tỷ lệ duy trì bằng dữ liệu thực.',
  revenueBreakdown:'CSV tài chính đính kèm là kịch bản lập kế hoạch 12 tháng, đơn vị triệu đồng, chưa phải báo cáo kế toán và chưa được kiểm toán/đối soát. Chưa có doanh thu thực tế theo thuê bao, phí triển khai, khách hàng hay kênh bán. Thay bằng sổ doanh thu và sao kê khi có dữ liệu thật.',
  pnlBurn:'CSV tài chính đính kèm là kịch bản lập kế hoạch; doanh thu, giá vốn, chi phí vận hành, tiền mặt, dòng tiền hoạt động và phải thu đều cần được thay/đối chiếu bằng chứng từ. Chưa có P&L, bảng cân đối, sao kê hoặc chính sách ghi nhận doanh thu đã kiểm tra.',
  runway:'Theo kịch bản CSV, runway được tính từ tiền mặt cuối kỳ chia cho mức đốt tiền hoạt động bình quân ba tháng gần nhất. Con số này không phải dự báo chắc chắn; chưa tính đầy đủ lịch giải ngân, nợ phải trả, thuế, vốn lưu động hoặc phương án gọi vốn. Cần cập nhật số dư ngân hàng và nghĩa vụ thanh toán.',
  forecast:'Kịch bản CSV giả định doanh thu tăng dần và chi phí vận hành tăng chậm; chưa được hiệu chỉnh theo khách hàng thực. Dự báo cần có ba kịch bản, giả định số khách hàng mới, giá thuê bao, churn, chi phí tích hợp, tuyển dụng và thời điểm thu tiền; cập nhật hàng tháng so với thực tế.',
  useOfFunds:'Kế hoạch vòng này: 40% sản phẩm/bảo mật/hạ tầng; 25% tích hợp hóa đơn và ngân hàng; 25% bán hàng, triển khai và hỗ trợ; 10% pháp lý/vận hành. Cần gắn từng khoản với ngân sách, người phụ trách, mốc sản phẩm và kết quả đo được.',
  capTable:'Mục tiêu vòng Seed 3.200 triệu đồng; hồ sơ ghi nhận đã huy động 900 triệu đồng. Chưa có cap table, tỷ lệ sở hữu, định giá, ESOP, cổ đông, SAFE/trái phiếu chuyển đổi hoặc hồ sơ vòng trước. Cần đối chiếu giấy tờ pháp nhân và chứng từ góp vốn.',
  founderBios:'Hồ sơ đang nêu CEO phụ trách sản phẩm SaaS, CTO phụ trách nền tảng dữ liệu và CFO phụ trách nghiệp vụ kế toán. Chưa có CV, thành tích, cam kết toàn thời gian, tỷ lệ sở hữu hoặc hồ sơ xác minh danh tính; các vai trò cần được startup xác nhận trước thẩm định.',
  ipOwnership:'Chưa cung cấp đăng ký pháp nhân, thỏa thuận chuyển giao mã nguồn, quyền sở hữu nhãn hiệu, hợp đồng nhân sự/nhà thầu hoặc giấy phép thư viện bên thứ ba. Cần lập danh mục tài sản trí tuệ và xác nhận quyền sở hữu thuộc pháp nhân.',
  legalRisks:'Rủi ro cần rà soát: bảo vệ dữ liệu tài chính và dữ liệu cá nhân; phân quyền và lưu nhật ký truy cập; điều khoản đồng bộ với ngân hàng/nhà cung cấp hóa đơn; an toàn thông tin; trách nhiệm khi số liệu nhập sai; lưu trữ và xóa dữ liệu. Chưa có ý kiến pháp lý, chứng nhận bảo mật hay đánh giá tác động dữ liệu được cung cấp.'
});

function startupTeam(id) {
  const [leader, coLeader, member]=teams[id];
  const biography='Phụ trách phát triển sản phẩm, phối hợp đối tác và triển khai kế hoạch tăng trưởng.';
  const person=([name,title])=>({name,title,bio:biography});
  return {leader:person(leader),coLeader:person(coLeader),members:[person(member)]};
}

export function createMarketplaceStartups(stamp) {
  return startups.map(({ id, name, industry, stage, location, target, goal, summary, market }) => ({
    id,
    ownerId:'founder',
    name,
    goal,
    profile:{ name, industry, stage, location, summary, target, ...details[id], market, teamRoster:startupTeam(id) },
    published:true,
    publishedAt:stamp,
    financial:id==='startup-so-may'?{csv:soMayFinancialCsv,name:'Sổ Mây - kịch bản tài chính 12 tháng',updatedAt:stamp}:null,
    diligence:id==='startup-so-may'?{...SO_MAY_DILIGENCE}:{},
    createdAt:stamp,
    updatedAt:stamp,
    catalogListing:true,
  }));
}

export const LEGACY_MARKETPLACE_IDS = Object.freeze(Object.fromEntries(startups.map(({id})=>[`demo-${id.slice('startup-'.length)}`,id])));
