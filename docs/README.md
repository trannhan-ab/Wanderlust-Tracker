# WANDERLUST TRACKER

## 1. Giới thiệu & Mục tiêu dự án
* **Tên dự án:** Hệ thống quản lý mục tiêu trải nghiệm và ngân sách du lịch cá nhân "Wanderlust Tracker".
* **Mục tiêu:** Xây dựng ứng dụng Web restful API giúp người dùng lập kế hoạch, theo dõi tiến độ các địa điểm muốn khám phá, đồng thời quản lý tối ưu nguồn lực tài chính cá nhân.

## 2. Thành viên thực hiện
* **Họ và tên:** Trần Thị Nhàn

## 3. Mô tả chức năng
###  1. Dashboard Tổng Quan & Thống Kê
- **Thống kê ngân sách:** Theo dõi tổng quỹ, dự toán chi tiêu, chi phí thực tế và số dư còn lại theo thời gian thực.
- **Biểu đồ trực quan:** Tích hợp Chart.js hiển thị biểu đồ tròn phân bổ nguồn tiền và biểu đồ cột phân loại điểm đến.
- **Tiến độ chuyến đi & Đếm ngược:** Theo dõi tỷ lệ hoàn thành lịch trình và đồng hồ đếm ngược đến ngày khởi hành.
- **Cảnh báo ngân sách:** Tự động cảnh báo khi ngân sách đạt ngưỡng cảnh báo (≥ 80%) hoặc vượt quá quỹ dự kiến.
- **Hệ thống danh hiệu (Achievements):** Mở khóa các danh hiệu xê dịch dựa trên số chuyến đi đã hoàn thành.

###  2. Bản Đồ Hành Trình Tương Tác (Interactive Map)
- **Bản đồ OpenStreetMap & Leaflet:** Hiển thị trực quan tất cả ghim điểm đến (Phân biệt điểm đã đi và đang lên kế hoạch).
- **Tìm kiếm & Định vị tự động:** Tìm kiếm địa điểm nhanh, tự động lấy tọa độ địa lý (Geocoding) và lưu vào danh sách mong muốn.
- **Chuyển hướng nhanh:** Mở lịch trình chi tiết hoặc điều hướng sang Google Maps chỉ bằng 1 cú nhấp.

###  3. Quản Lý Điểm Đến (Destinations)
- **Danh sách đa năng:** Quản lý điểm đến theo nhóm (Biển, Núi, Văn hóa...), mức độ ưu tiên (1–5 sao), ngân sách dự kiến và nguồn tiền liên kết.
- **Lọc & Sắp xếp:** Bộ lọc tìm kiếm linh hoạt theo từ khóa, danh mục, trạng thái và thứ tự ưu tiên.

###  4. Lập Lịch Trình & Nhật Ký Chi Phi (Trip Planning)
- **Lịch trình chi tiết:** Thêm, sửa, xóa các hoạt động theo từng ngày và mốc thời gian.
- **Quản lý chi phí thực tế:** Ghi nhận từng khoản chi tiêu nhỏ lẻ trong chuyến đi để so sánh với ngân sách dự toán.
- **Ghi chú cá nhân:** Lưu danh sách đồ cần mang, mẹo du lịch với tính năng **Tự động lưu (Autosave)**.

###  5. Quỹ Nhóm Dùng Chung (Group Fund)
- **Tạo & Tham gia quỹ:** Tạo quỹ du lịch chung hoặc tham gia thông qua **Mã mời (Invite Code)**.
- **Đóng góp thời gian thực:** Theo dõi tiến độ tích lũy so với mục tiêu và lịch sử đóng góp của từng thành viên.
- **Hiệu ứng ăn mừng:** Tự động bắn pháo hoa (Confetti) khi nhóm hoàn thành 100% mục tiêu quỹ.

###  6. Cài Đặt, Bảo Mật & Báo Cáo
- **Xác thực người dùng:** Đăng ký/Đăng nhập bảo mật với mã hóa CSRF Token.
- **Xuất dữ liệu linh hoạt:** Xuất dữ liệu điểm đến, ngân sách và khoản chi ra file CSV.
- **In báo cáo:** Tạo trang in báo cáo ngân sách chuẩn hóa, gọn gàng.

## 4. Công nghệ sử dụng
* **Backend:** Node.js, Express.js
* **Frontend:** HTML5, CSS3, JavaScript
* **Lưu trữ:** File JSON đóng vai trò là Cơ sở dữ liệu (sử dụng Node.js `fs` module)
* **Công cụ phát triển:** VS Code, Git & GitHub
