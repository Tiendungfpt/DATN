import Author from "../models/Author";

export async function getAuthors(req, res) {
  // Author.find()
  try {
    const authors = await Author.find();
    return res.json(authors);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function getAuthorById(req, res) {
  // Author.findById()
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(author);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function addAuthor(req, res) {
  try {
    // Model.create(data) : data = req.body, Model = Author
    const newAuthor = await Author.create(req.body);
    return res.status(201).json(newAuthor);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function updateAuthor(req, res) {
  // Author.findByIdAndUpdate()
  try {
    const author = await Author.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!author) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(author);
  } catch (error) {
    return res.json({ error: error.message });
  }
}
export async function deleteAuthor(req, res) {
  // Author.findByIdAndDelete()
  try {
    const author = await Author.findByIdAndDelete(req.params.id);
    if (!author) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.json({ error: error.message });
  }
}
