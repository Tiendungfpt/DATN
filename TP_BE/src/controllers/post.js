import Post from "../models/Post";

export async function getPosts(req, res) {
  // Post.find()
  try {
    const posts = await Post.find();
    return res.json(posts);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function getPostById(req, res) {
  // Post.findById()
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(post);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function addPost(req, res) {
  try {
    // Model.create(data) : data = req.body, Model = Post
    const newPost = await Post.create(req.body);
    return res.status(201).json(newPost);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function updatePost(req, res) {
  // Post.findByIdAndUpdate()
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!post) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(post);
  } catch (error) {
    return res.json({ error: error.message });
  }
}
export async function deletePost(req, res) {
  // Post.findByIdAndDelete()
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.json({ error: error.message });
  }
}
