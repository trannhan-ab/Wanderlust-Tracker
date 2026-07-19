

## 1. Xây dựng CSDL Mức Logic 


*   **Bảng 1: NGƯỜI DÙNG (User)**
    *   Cấu trúc: `User` ( **user_id**, username, password )
    *   *Khóa chính (PK):* `user_id`

*   **Bảng 2: NGUỒN NGÂN SÁCH (BudgetSource)**
    *   Cấu trúc: `BudgetSource` ( **source_id**, source_name, init_amount, *user_id* )
    *   *Khóa chính (PK):* `source_id`
    *   *Khóa ngoại (FK):* `user_id` tham chiếu đến bảng `User(user_id)` để xác định ví này của ai.

*   **Bảng 3: ĐỊA ĐIỂM TRẢI NGHIỆM (Destination)**
    *   Cấu trúc: `Destination` ( **id**, name, category, budget, priority, status, *source_id* )
    *   *Khóa chính (PK):* `id`
    *   *Khóa ngoại (FK):* `source_id` tham chiếu đến bảng `BudgetSource(source_id)` để kết nối địa điểm với ví chi trả.

---

## 2.SQL Server Script
```sql
CREATE DATABASE WanderlustTracker;
GO
USE WanderlustTracker;
GO

-- Tạo bảng Người dùng (Phục vụ Đăng ký/Đăng nhập)
CREATE TABLE [User] (
    user_id INT IDENTITY(1,1),
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    CONSTRAINT PK_User PRIMARY KEY (user_id),
    CONSTRAINT UC_Username UNIQUE (username)
);

-- Tạo bảng Nguồn ngân sách
CREATE TABLE BudgetSource (
    source_id INT IDENTITY(1,1),
    source_name NVARCHAR(100) NOT NULL,
    init_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    user_id INT NOT NULL,
    CONSTRAINT PK_BudgetSource PRIMARY KEY (source_id),
    CONSTRAINT FK_BudgetSource_User FOREIGN KEY (user_id) REFERENCES [User](user_id)
);

-- Tạo bảng Địa điểm trải nghiệm
CREATE TABLE Destination (
    id INT IDENTITY(1,1),
    name NVARCHAR(255) NOT NULL,
    category NVARCHAR(50) NOT NULL,
    budget DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    priority INT NOT NULL,
    status BIT NOT NULL DEFAULT 0, -- 0: Chưa đi, 1: Đã hoàn thành
    source_id INT NOT NULL,
    CONSTRAINT PK_Destination PRIMARY KEY (id),
    CONSTRAINT FK_Destination_Budget FOREIGN KEY (source_id) REFERENCES BudgetSource(source_id),
    CONSTRAINT CK_Priority CHECK (priority BETWEEN 1 AND 5) 
);