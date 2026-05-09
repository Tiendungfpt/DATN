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

// GET /api/posts - Lấy danh sách bài viết
postRouter.get("/", getPosts);

// GET /api/posts/:id - Lấy chi tiết bài viết
postRouter.get("/:id", getPostById);

// POST /api/posts - Thêm bài viết mới
postRouter.post("/", checkAuth, addPost);

// DELETE /api/posts/:id - Xóa bài viết
postRouter.delete("/:id", checkAuth, deletePost);

// PUT /api/posts/:id - Cập nhật bài viết
postRouter.put("/:id", checkAuth, updatePost);

export default postRouter;
