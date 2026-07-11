# WANDERLUST TRACKER

## 1. Giới thiệu & Mục tiêu dự án
* **Tên dự án:** Xây dựng hệ thống quản lý mục tiêu trải nghiệm và ngân sách cá nhân "Wanderlust Tracker".
* **Mục tiêu:** Ứng dụng ngôn ngữ Python để tạo ra một công cụ CLI giúp người dùng lập kế hoạch, theo dõi tiến độ các địa điểm muốn khám phá, đồng thời quản lý tối ưu nguồn lực tài chính cá nhân.

## 2. Thành viên thực hiện
* **Họ và tên:** Trần Thị Nhàn

## 3. Mô tả chức năng
* **Yêu cầu chức năng:**
  * Thêm địa điểm trải nghiệm mới (Tên, phân loại, ngân sách, độ ưu tiên).
  * Hiển thị danh sách trực quan dưới dạng bảng CLI.
  * Tìm kiếm địa điểm thông minh và Sắp xếp danh sách theo ngân sách/độ ưu tiên.
  * Quản lí nguồn tiền phù hợp quỹ tài chính
  * Thay đổi trạng thái (Chưa đi -> Đã đi).
* **Yêu cầu phi chức năng:**
  * Lưu trữ dữ liệu bền vững (Data Persistence) vào file JSON để dữ liệu không bị mất khi tắt app.
  * Hệ thống chạy ổn định, bắt lỗi nhập liệu tốt để tránh crash app.

## 4. Công nghệ sử dụng
* **Ngôn ngữ:** Python
* **Lưu trữ:** File JSON  đóng vai trò là Cơ sở dữ liệu.
* **Công cụ phát triển:** VS Code, Git & GitHub