import { Router } from "express";

import {
  addPost,
  deletePost,
  getPostById,
  getPosts,
  updatePost,
} from "../controllers/post";
import { checkAuth } from "../middlewares/checkAuth";

const postRouter = Router();

postRouter.use(checkAuth);

// GET /api/posts - Lấy danh sách bài viết
postRouter.get("/", getPosts);

// GET /api/posts/:id - Lấy chi tiết bài viết
postRouter.get("/:id", getPostById);

// POST /api/posts - Thêm bài viết mới
postRouter.post("/", addPost);

// DELETE /api/posts/:id - Xóa bài viết
postRouter.delete("/:id", deletePost);

// PUT /api/posts/:id - Cập nhật bài viết
postRouter.put("/:id", updatePost);

export default postRouter;
