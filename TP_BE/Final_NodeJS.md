# 🧾 ĐỀ KIỂM TRA NODEJS

## Chủ đề: ỨNG DỤNG QUẢN LÝ KHÓA HỌC (COURSE MANAGEMENT)

---

## 1. Tạo Router và Model Course & User (1đ)

### 1.1. Tạo Router (0.5đ)

Xây dựng các API endpoint:

| Phương thức | Endpoint         | Mô tả                  |
| ----------- | ---------------- | ---------------------- |
| **GET**     | `/courses`       | Lấy danh sách khóa học |
| **POST**    | `/courses`       | Thêm khóa học mới      |
| **GET**     | `/courses/:id`   | Lấy chi tiết khóa học  |
| **PUT**     | `/courses/:id`   | Cập nhật khóa học      |
| **DELETE**  | `/courses/:id`   | Xóa khóa học           |
| **POST**    | `/auth/register` | Đăng ký người dùng mới |
| **POST**    | `/auth/login`    | Đăng nhập người dùng   |

### 1.2. Tạo Model Course và User (0.5đ)

**Model Course (course.model.js):**

| Trường       | Kiểu dữ liệu | Ràng buộc         |
| ------------ | ------------ | ----------------- |
| `courseName` | String       | required          |
| `views`      | Number       | default: 0        |
| `thumbnail`  | String       | required          |
| `note`       | String       | optional          |
| `category`   | String       | required          |
| `createdAt`  | Date         | default: Date.now |

**Model User (user.model.js):**

| Trường     | Kiểu dữ liệu | Ràng buộc                                |
| ---------- | ------------ | ---------------------------------------- |
| `email`    | String       | required, unique                         |
| `password` | String       | required, min length 6                   |
| `role`     | String       | enum: ["user", "admin"], default: "user" |

---

## 2. Hiển thị danh sách khóa học (2.0đ)

### 2.1. Lấy danh sách khóa học (1.0đ)

- Trả về danh sách **tất cả các khóa học** từ database.
- Nếu không có dữ liệu → trả về mảng rỗng `[]`.

### 2.2. Thêm query parameters (1.0đ)

Thêm query để lọc:

| Tham số                | Ý nghĩa                    |
| ---------------------- | -------------------------- |
| `?category=Javascript` | Lọc khóa học theo danh mục |

---

## 3. Thêm và đọc khóa học (2.0đ)

### 3.1. Thêm khóa học (1.0đ)

- Nhận dữ liệu từ body request và lưu vào MongoDB.
- Validate bằng **Joi** hoặc **Yup**:
  - `courseName` là bắt buộc, không được để trống.
  - `views` ≥ 0.
  - `thumbnail` phải là URL hợp lệ.
  - `category` không được để trống.

### 3.2. Đọc thông tin khóa học (1.0đ)

- Trả về chi tiết khóa học theo `id`.

---

## 4. Cập nhật và xóa khóa học (2.0đ)

### 4.1. Cập nhật khóa học (1.0đ)

- Cập nhật dữ liệu theo `id`.
- Validate đầu vào trước khi lưu.

### 4.2. Xóa khóa học (1.0đ)

- Xóa khóa học theo `id`.

---

## 5. API Đăng ký và Đăng nhập (2.0đ)

### 5.1. Đăng ký người dùng (1.0đ)

- Validate đầu vào bằng **Joi/Yup**:
  - `email` hợp lệ, không trùng.
  - `password` ≥ 6 ký tự.
- Mã hóa mật khẩu bằng **bcrypt**.
- Lưu tài khoản người dùng vào MongoDB.

### 5.2. Đăng nhập người dùng (1.0đ)

- Validate dữ liệu đầu vào bằng **Joi**.
- Kiểm tra `email` tồn tại.
- So sánh mật khẩu bằng **bcrypt.compare()**.
- Nếu đúng → tạo JWT token (ví dụ hết hạn sau 1 ngày).
- Trả về token:

```json
{
  "message": "Login success",
  "token": "JWT_TOKEN"
}
```

---

## Bonus (+0.5đ)

- Tạo middleware `checkAuth` để xác thực người dùng khi thêm, sửa, xóa khóa học.
- Chỉ cho phép **role = "admin"** thực hiện các thao tác thêm, sửa, xóa.

---

## 💾 Ví dụ dữ liệu mẫu Course:

```json
{
  "courseName": "JS Cơ bản",
  "views": 20,
  "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/8/8a/Javascript.jpg",
  "note": "none",
  "category": "Javascript"
}
```
