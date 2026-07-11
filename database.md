# THIẾT KẾ DATABASE

## 1. Các Thực Thể Và Thuộc Tính

### Thực thể 1: ĐỊA ĐIỂM TRẢI NGHIỆM (Destination)

*   **id**: Mã định danh duy nhất cho từng địa điểm.
    *   *Kiểu dữ liệu:* Số nguyên (Integer).
    *   *Vai trò:* **Khóa chính (Primary Key)** - Dùng để phân biệt các địa điểm trùng tên và phục vụ chức năng Sửa/Xóa.
*   **name**: Tên của địa điểm hoặc trải nghiệm 
    *   *Kiểu dữ liệu:* Chuỗi ký tự (String).
*   **category**: Phân loại không gian/loại hình
    *   *Kiểu dữ liệu:* Chuỗi ký tự (String).
*   **budget**: Ngân sách tài chính ước tính cho trải nghiệm này.
    *   *Kiểu dữ liệu:* Số thực (Float/Double).
*   **priority**: Mức độ yêu thích hoặc độ ưu tiên thực hiện.
    *   *Kiểu dữ liệu:* Số nguyên (Integer) trong khoảng từ 1 (Thấp) đến 5 (Cao nhất).
*   **status**: Trạng thái thực hiện của chuyến đi.
    *   *Kiểu dữ liệu:* Logic (Boolean).
    *   *Giá trị:* `False` (Chưa đi) hoặc `True` (Đã hoàn thành).
*   **source_id**: Mã liên kết tới nguồn chi trả tiền.
    *   *Kiểu dữ liệu:* Số nguyên (Integer).
    *   *Vai trò:* **Khóa ngoại (Foreign Key)** - Kết nối trực tiếp với thực thể Nguồn Ngân Sách để biết địa điểm này tiêu tiền từ ví nào.

### Thực thể 2: NGUỒN NGÂN SÁCH (BudgetSource)

*   **source_id**: Mã định danh duy nhất cho từng nguồn tiền.
    *   *Kiểu dữ liệu:* Số nguyên (Integer).
    *   *Vai trò:* **Khóa chính (Primary Key)** - Dùng để phân biệt các ví tiền và thiết lập liên kết dữ liệu.
*   **source_name**: Tên nguồn tiền (Ví dụ: Tiền tiết kiệm, Tiền làm thêm, Quỹ đi chơi).
    *   *Kiểu dữ liệu:* Chuỗi ký tự (String).
*   **total_amount**: Tổng số tiền hiện có trong ví.
    *   *Kiểu dữ liệu:* Số thực (Float/Double).

## 2. Mối quan hệ giữa các thực thể

*   **Loại quan hệ:** Mối quan hệ **Một - Nhiều (1 - N)** từ thực thể `BudgetSource` đến thực thể `Destination`.
    *   Một **Nguồn ngân sách** có thể phân bổ tài chính và dùng để chi trả cho **Nhiều** địa điểm trải nghiệm khác nhau (Ví dụ: Từ một quỹ đi chơi có thể trích tiền đi cafe, đi xem phim, đi du lịch).
    *   Ngược lại, một **Địa điểm trải nghiệm** tại một thời điểm cụ thể sẽ chỉ sử dụng tiền trích ra từ **Một** nguồn ngân sách duy nhất để hệ thống dễ dàng quản lý dòng tiền, tránh nhập nhèm tài chính.