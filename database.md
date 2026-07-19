# THIẾT KẾ DATABASE

## 1. Các Thực Thể Và Thuộc Tính

### Thực thể 1: NGƯỜI DÙNG (User)

*   **user_id**: Mã định danh duy nhất cho từng tài khoản.
    *   *Vai trò:* **Khóa chính** - Dùng để quản lý thông tin khách hàng và phục vụ chức năng Đăng ký/Đăng nhập.
*   **username**: Tên đăng nhập của người dùng.
*   **password**: Mật khẩu để đăng nhập vào hệ thống.

### Thực thể 2: NGUỒN NGÂN SÁCH (BudgetSource)

*   **source_id**: Mã định danh duy nhất cho từng nguồn tiền.
    *   *Vai trò:* **Khóa chính** - Dùng để phân biệt các ví tiền và thiết lập liên kết dữ liệu.
*   **source_name**: Tên nguồn tiền
*   **init_amount**: Số tiền ban đầu được nạp vào ví.
*   **user_id**: Mã liên kết tới tài khoản người dùng sở hữu ví.
    *   *Vai trò:* **Khóa ngoại** - Kết nối trực tiếp với thực thể Người Dùng để xác định ví tiền này thuộc về ai.

### Thực thể 3: ĐỊA ĐIỂM TRẢI NGHIỆM (Destination)

*   **id**: Mã định danh duy nhất cho từng địa điểm.
    *   *Vai trò:* **Khóa chính** 
*   **name**: Tên của địa điểm hoặc trải nghiệm.
*   **category**: Phân loại rõ ràng các không gian/loại hình trải nghiệm
*   **budget**: Ngân sách tài chính ước tính cho trải nghiệm này.
*   **priority**: Mức độ yêu thích hoặc độ ưu tiên thực hiện.
*   **status**: Trạng thái thực hiện của chuyến đi.
    *   *Giá trị:* `False` (Chưa đi) hoặc `True` (Đã hoàn thành).
*   **source_id**: Mã liên kết tới nguồn chi trả tiền.
    *   *Vai trò:* **Khóa ngoại (Foreign Key)** - Kết nối trực tiếp với thực thể Nguồn Ngân Sách để biết địa điểm này tiêu tiền từ ví nào.

## 2. Mối quan hệ giữa các thực thể

*   **Mối quan hệ 1: Giữa thực thể `User` và thực thể `BudgetSource` (Một - Nhiều | 1 - N)**
    *   Một **Người dùng** sau khi Đăng ký/Đăng nhập có thể tạo và quản lý **Nhiều** nguồn ngân sách khác nhau để phục vụ các nhu cầu tài chính cá nhân.

*   **Mối quan hệ 2: Giữa thực thể `BudgetSource` và thực thể `Destination` (Một - Nhiều | 1 - N)**
    *   Một **Nguồn ngân sách** có thể phân bổ tài chính và dùng để chi trả cho **Nhiều** địa điểm trải nghiệm khác nhau
    *   Ngược lại, một **Địa điểm trải nghiệm** tại một thời điểm cụ thể sẽ chỉ sử dụng tiền trích ra từ **Một** nguồn ngân sách duy nhất để hệ thống dễ dàng quản lý dòng tiền, tránh nhập nhèm tài chính.