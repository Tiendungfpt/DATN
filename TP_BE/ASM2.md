# WEB503_NODEJS

## Assignment 2: Tiếp nối Assignment 1 - Xây dựng API Authentication với JWT (Cơ bản & Nâng cao)

### Mục tiêu
Mở rộng từ Assignment 1: Thêm đăng ký/đăng nhập user với validation, JWT token, middleware quyền truy cập cho `/products`. **Nâng cao**: Thêm model Category và Comment, cho phép user bình luận sản phẩm.

Sử dụng Express.js, Mongoose, bcrypt, jsonwebtoken. Test bằng Postman. Lưu data vào MongoDB.

### Yêu cầu cơ bản: Authentication
1. **Model User**: username (unique), email (unique), password (hashed), role ('user'|'admin').

2. **API /api/auth**:
   - **POST /api/auth/register**: Body {username, email, password}. Validate unique & password >=6. Trả {message, user (no password)}.
   - **POST /api/auth/login**: Body {email, password}. Validate & compare hash. Trả {message, token (JWT, expire 1h), user}.
   - **GET /api/auth/profile**: Yêu cầu token. Trả user info.

3. **Middleware**:
   - `authMiddleware`: Verify JWT, attach user.
   - Áp dụng `/products`:
     - POST: Yêu cầu login.
     - PUT/DELETE /:id: Owner hoặc admin.
   - Cập nhật Product: Thêm userId (ref User).

4. **Test cơ bản**:
   - Register/login, lưu token.
   - Test products với `Authorization: Bearer <token>`.
   - Kiểm tra unauthorized.

### Yêu cầu nâng cao: Category & Comment
1. **Model Category**: name (unique), description.
   - API /api/categories (CRUD):
     - GET: Pagination (page, limit).
     - POST/PUT/DELETE: Admin only.
   - Cập nhật Product: Thêm categoryId (ref Category).

2. **Model Comment**: content, productId (ref Product), userId (ref User), createdAt.
   - API:
     - **POST /api/products/:productId/comments**: Body {content}. Yêu cầu login. Trả comment với user info.
     - **GET /api/products/:productId/comments**: Pagination (page, limit).
     - **PUT/DELETE /api/comments/:id**: Owner only.

3. **Query nâng cao Products**:
   - **GET /api/products?category=name&minPrice=num&maxPrice=num&page=num&limit=num**:
     - Filter category (exact), price range.
     - Pagination default page=1, limit=10. Sort createdAt desc.
     - Populate category name & comment count.

4. **Test nâng cao**:
   - Tạo category, gán product.
   - Thêm/lấy comment với token.
   - Kiểm tra quyền (user không xóa category).

### Database Diagram
Vẽ ER Diagram: User (1:N) Product/Category/Comment. Quan hệ: Product-Category (1:N), Product-Comment (1:N), User-Product/Comment (1:N).

### Hướng dẫn nộp bài
- Code GitHub (branch asm2).
- Postman Collection (.json).
- Report Markdown với screenshot test.
- Diagram (.png).

**Deadline**: [Ngày nộp]. Điểm cơ bản: 7/10. Nâng cao: +3/10.
