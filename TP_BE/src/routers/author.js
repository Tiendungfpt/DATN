import { Router } from "express";
import {
  addAuthor,
  deleteAuthor,
  getAuthorById,
  getAuthors,
  updateAuthor,
} from "../controllers/author";

const authorRouter = Router();

// GET api/authors
authorRouter.get("/", getAuthors);

// GET api/authors/:id
authorRouter.get("/:id", getAuthorById);

// POST api/authors
authorRouter.post("/", addAuthor);

// PUT api/authors/:id
authorRouter.put("/:id", updateAuthor);

// DELETE // api/authors/:id
authorRouter.delete("/:id", deleteAuthor);

export default authorRouter;
