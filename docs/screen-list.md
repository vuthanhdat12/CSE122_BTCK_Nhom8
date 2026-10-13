# Bảng kiểm kê màn hình

Phân công theo mục 14 của đề: SV1 – Khách lưu trú, SV2 – Nhân viên vận hành, SV3 – Quản lý + Quản trị viên. Nhóm cần cập nhật cột Người phụ trách theo thực tế. Giao diện dùng Bootstrap 5; quyền truy cập do vai trò của tài khoản đăng nhập quyết định.

| Vai trò | Mục tiêu người dùng | Nhiệm vụ người dùng | Màn hình | Tệp | CRUD / Trạng thái | AI | Người phụ trách |
|---|---|---|---|---|---|---|---|
| Khách lưu trú | Biết tình hình yêu cầu của mình | Xem yêu cầu đang mở, gửi nhanh | Guest Dashboard | `pages/guest-dashboard.html` | R · rỗng, đang tải, lỗi | – | SV1 |
| Khách lưu trú | Gửi đúng yêu cầu, ít thao tác | Mô tả, chọn loại dịch vụ, gửi hoặc sửa | Service Request | `pages/guest-service-request.html` | C/R/U · kiểm tra hợp lệ | AI-1 | SV1 |
| Khách lưu trú | Theo dõi và kiểm soát yêu cầu | Tìm, lọc, hủy, lưu trữ, đánh giá | My Requests | `pages/guest-my-requests.html` | C/R/U/D · chờ, hủy, từ chối, hoàn thành, rỗng | – | SV1 |
| Nhân viên vận hành | Biết việc nào làm trước | Xem, lọc, nhận việc | Task Board | `pages/staff-task-board.html` | R · rỗng, đang chờ | – | SV2 |
| Nhân viên vận hành | Cập nhật tiến độ chính xác | Bắt đầu, hoàn thành, báo vướng mắc, ghi chú | Task Detail | `pages/staff-task-detail.html` | C/R/U (+D ghi chú) · đang xử lý, hoàn thành, vướng mắc | – | SV2 |
| Nhân viên vận hành | Nắm ca làm và đổi ca | Xem lịch, tạo/sửa/hủy yêu cầu đổi ca | Shift View | `pages/staff-shift-view.html` | C/R/U/D · đang chờ, duyệt, từ chối | – | SV2 |
| Quản lý khách sạn | Giao việc đúng người, đúng ưu tiên | Duyệt ưu tiên, giao việc, duyệt đổi ca | Dispatch Board | `pages/manager-dispatch-board.html` | R (+ cập nhật trạng thái) · rỗng | AI-2 | SV3 |
| Quản lý khách sạn | Không để việc trễ SLA | Theo dõi, đặt ngưỡng cảnh báo, leo thang | SLA Monitor | `pages/manager-sla-monitor.html` | C/R/U (+D gỡ leo thang) · đúng hạn, sắp trễ, trễ | – | SV3 |
| Quản lý khách sạn | Hiểu chất lượng phục vụ | Lọc, đọc phản hồi, lưu ghi chú báo cáo | Service Report | `pages/manager-service-report.html` | C/R/U/D | AI-3 | SV3 |
| Quản trị viên | Nắm sức khỏe hệ thống | Xem số liệu và nhật ký quản trị | Dashboard | `pages/admin-dashboard.html` | R | – | SV3 |
| Quản trị viên | Cấu hình dịch vụ và SLA | Thêm, sửa, bật/tắt, xóa loại dịch vụ | Service Type Management | `pages/admin-service-type-management.html` | C/R/U (+D khi chưa dùng) · bật, tắt | – | SV3 |
| Quản trị viên | Kiểm soát tài khoản | Thêm, sửa, vô hiệu hóa, xóa tài khoản | User Management | `pages/admin-user-management.html` | C/R/U/D · hoạt động, vô hiệu hóa | – | SV3 |
| Dùng chung | Biết lý do bị chặn hoặc lạc đường | Quay về màn hình chính | 403, 404 | `pages/403.html`, `pages/404.html` | – | – | SV3 |
| Dùng chung | Vào đúng khu vực theo quyền | Đăng nhập bằng mã người dùng, hệ thống tự phân quyền | Đăng nhập | `index.html` | R · bỏ trống, sai định dạng, sai mã, tài khoản bị khóa, cần đăng nhập | – | SV1 |
