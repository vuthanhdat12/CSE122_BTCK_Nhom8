# StayFlow – Điều phối dịch vụ trong thời gian lưu trú

BTL-08 · Phát triển ứng dụng web cơ bản (CSE122) · Lĩnh vực: Khách sạn / Hospitality

Nguyên mẫu Frontend nhiều vai trò: khách gửi yêu cầu dịch vụ, nhân viên xử lý, quản lý điều phối và theo dõi SLA, quản trị viên quản lý loại dịch vụ và tài khoản. Giao diện viết bằng HTML + Bootstrap 5 (chỉ dùng CSS của Bootstrap; JavaScript viết thuần, không nạp Bootstrap JS), không cần máy chủ, dữ liệu giả lập lưu trong LocalStorage.

## Cách chạy

Mở `index.html` bằng trình duyệt, hoặc chạy máy chủ tĩnh trong thư mục này:

```bash
python3 -m http.server 8000   # rồi mở http://localhost:8000
```

Bootstrap và Bootstrap Icons đã nằm trong `assets/vendor/` nên chạy được cả khi không có mạng (chỉ phông chữ Google Fonts cần mạng, nếu thiếu sẽ dùng phông hệ thống).

## Đăng nhập và phân quyền

Trang `index.html` là trang đăng nhập. Nhập **mã người dùng**, hệ thống tra bảng `users` trong `assets/data/seed.js` rồi tự xác định vai trò và quyền truy cập:

| Mã | Họ tên | Vai trò | Liên kết dữ liệu |
|---|---|---|---|
| `KH01` | Nguyễn Minh Anh | Khách lưu trú | Phòng 1208 |
| `KH02` | Lê Hoàng Yến | Khách lưu trú | Phòng 1502 (VIP) |
| `KH03`, `KH04`, `KH05` | Các khách còn lại | Khách lưu trú | Phòng 0715, 0903, 0610 |
| `NV01` – `NV06` | Trần Văn Hùng, Lê Thị Mai, Phạm Quốc Bảo, Võ Thanh Hà, Đỗ Minh Khôi, Ngô Bích Trâm | Nhân viên vận hành | Hồ sơ nhân viên `st1` – `st6` (bộ phận riêng) |
| `QL01` | Phan Thu Hương | Quản lý khách sạn | – |
| `AD01` | Lý Đức Thắng | Quản trị viên | – |
| `AD02` | Đặng Hoài Nam | Quản trị viên | Đã vô hiệu hóa, không đăng nhập được |

Quy tắc:

- Khách chỉ thấy yêu cầu của phòng mình; nhân viên chỉ thấy việc của mình và việc chờ nhận trong bộ phận mình.
- Chưa đăng nhập mà mở trang trong `pages/` sẽ bị đưa về trang đăng nhập. Đăng nhập sai vai trò sẽ thấy thông báo 403.
- Quản trị viên tạo tài khoản ở màn Tài khoản: mã đăng nhập, vai trò, và liên kết (khách gắn phòng, nhân viên gắn hồ sơ). Tài khoản mới đăng nhập được ngay.
- Không thể khóa hoặc xóa tài khoản đang đăng nhập, hay quản trị viên hoạt động cuối cùng.

Mã được lưu trong LocalStorage cùng dữ liệu mẫu. Nút "Đặt lại dữ liệu mẫu" trong Cài đặt đưa mọi thứ về ban đầu.

## Cấu trúc

```text
stayflow/
├── index.html                 Trang đăng nhập (gọn: biểu mẫu + tài khoản mẫu)
├── pages/                     12 màn hình theo vai trò + 403.html, 404.html
├── css/
│   ├── style.css              Màu thương hiệu, ghi đè Bootstrap, thành phần riêng
│   └── responsive.css         Bổ sung responsive (bảng xếp chồng trên điện thoại)
├── js/
│   ├── main.js                Lõi: đăng nhập, bảo vệ trang, sự kiện chung
│   ├── api.js                 Lớp dữ liệu: LocalStorage, đăng nhập, SLA, thông báo
│   └── modules/
│       ├── utils.js           Tiện ích
│       ├── ui.js              Modal, toast, thông báo, kiểm tra biểu mẫu, sáng/tối
│       ├── ai.js              3 tính năng AI mô phỏng
│       ├── guest.js           Màn hình khách lưu trú
│       ├── staff.js           Màn hình nhân viên vận hành
│       ├── manager.js         Màn hình quản lý khách sạn
│       └── admin.js           Màn hình quản trị viên
├── assets/
│   ├── vendor/                Bootstrap 5.3.3 và Bootstrap Icons 1.11.3 (bản cục bộ)
│   ├── data/seed.js           Dữ liệu giả lập
│   ├── icons/favicon.svg
│   └── images/
└── docs/screen-list.md        Bảng kiểm kê màn hình
```

## Cách HTML và JS phối hợp

Mỗi trang trong `pages/` là một tệp HTML đầy đủ: thanh điều hướng, thanh bên, tiêu đề, bộ lọc, bảng, biểu mẫu và các hộp thoại (modal) đều viết sẵn bằng Bootstrap. JS chỉ làm hai việc: điền dữ liệu vào các vùng có `id` (ví dụ `#list`, `#tBody`, `#kOpen`) và xử lý sự kiện.

- `<body data-page="..." data-role="...">` khai báo trang và vai trò được phép vào.
- Mỗi trang có sẵn bốn trạng thái: đang tải (`#stLoading`), lỗi (`#stError`), không có quyền (`#stDenied`) và nội dung (`#content`).
- `main.js` tạo ba bảng đăng ký `A` (hành động click qua `data-act`), `I` (nhập liệu qua `data-in`), `F` (gửi biểu mẫu qua `data-form`). Mỗi module vai trò đăng ký hàm điền dữ liệu vào `PAGES['tên-trang']` và thêm xử lý vào ba bảng đó.
- Thứ tự nạp script (không dùng ES module để mở được bằng `file://`): `utils.js` → `seed.js` → `api.js` → `validate.js` → (`ai.js` nếu trang có AI) → `ui.js` → `main.js` → module vai trò.
- Mọi dữ liệu người dùng nhập đều đi qua `esc()` trước khi hiển thị.

## Thêm một màn hình mới

1. Sao chép một trang cùng vai trò trong `pages/`, đổi `data-page`, `<title>` và phần nội dung trong `#content`; thêm liên kết vào thanh điều hướng của các trang cùng vai trò.
2. Trong module vai trò, thêm `PAGES['tên-trang'] = () => { ... }` để điền dữ liệu, cùng các xử lý `A/I/F` nếu cần.
3. Cập nhật `docs/screen-list.md` và bảng danh sách màn hình ở `index.html`.

## Về AI

Cả ba tính năng AI chạy theo quy tắc từ khóa ở phía Frontend, chưa gọi LLM thật:

| Mã | Tính năng | Màn hình |
|---|---|---|
| AI-1 | Request Classifier | `guest-service-request.html` |
| AI-2 | Priority Assistant | `manager-dispatch-board.html` |
| AI-3 | Feedback Summarizer | `manager-service-report.html` |

Mỗi tính năng có luồng nhập → đang xử lý → kết quả → lý do → chấp nhận / sửa / từ chối / tạo lại, cùng trạng thái "chưa chắc chắn" và lỗi. Khi khai báo trong `docs/ai-usage-report.md`, hãy ghi rõ đây là mock.

## Mẹo khi demo

Menu tài khoản (góc trên bên phải) → Cài đặt có công tắc "Giả lập lỗi tải dữ liệu", "Giả lập AI không phản hồi", chế độ sáng/tối và nút đặt lại dữ liệu mẫu.

## JavaScript thuần và kiểm tra hợp lệ

- **Không dùng Bootstrap JS**: modal, offcanvas, menu thả xuống, toast do `js/modules/ui.js` tự viết (`data-open`, `data-close`, `data-dropdown`; hỗ trợ Esc, bấm nền mờ, giữ tiêu điểm trong hộp thoại). Bootstrap chỉ cung cấp lớp CSS.
- **Validation chuẩn trình duyệt** (`js/modules/validate.js`): luật khai báo ngay trong HTML (`required`, `minlength`, `maxlength`, `pattern`, `type="email"`, `min`/`max`/`step`), JS hỏi Constraint Validation API và hiển thị bằng `.is-invalid` / `.invalid-feedback` với thông báo tiếng Việt. Luật nghiệp vụ (trùng tên/mã/email, mã đăng nhập không tồn tại, khóa quản trị viên cuối) đi qua `setCustomValidity()`.
- **Ba tính năng AI** gắn nhãn trên thanh điều hướng: AI-1 (khách – gợi ý phân loại), AI-2 (quản lý – ưu tiên/điều phối), AI-3 (quản lý – tóm tắt báo cáo).
