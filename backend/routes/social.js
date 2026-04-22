const express = require('express');
const { auth } = require('../middleware/auth');
const {
  listFeedPosts,
  countFeedPosts,
  createPost,
  getPostById,
  deletePost,
  toggleLikePost,
  addCommentToPost,
  deleteCommentFromPost,
  addReplyToComment,
} = require('../src/db/posts');
const router = express.Router();

// GET /api/social/feed
router.get('/feed', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const friendIds = (req.user.friends || []).map((friend) => String(friend));
    const allowedUsers = [req.user._id, ...friendIds];

    const { posts } = await listFeedPosts({ userIds: allowedUsers, page, limit });
    const total = await countFeedPosts({ userIds: allowedUsers });
    res.json({ posts, total, hasMore: total > page * limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// POST /api/social/post
router.post('/post', auth, async (req, res) => {
  try {
    const { type, content, data, visibility } = req.body;
    if (!type) return res.status(400).json({ error: 'Post type is required' });

    const post = await createPost({
      userId: req.user._id,
      type,
      content: content || '',
      data: data || {},
      visibility: visibility || 'friends',
    });
    res.status(201).json({ post });
  } catch (err) {
    res.status(400).json({ error: 'Failed to create post' });
  }
});

// DELETE /api/social/post/:id — only owner can delete
router.delete('/post/:id', auth, async (req, res) => {
  try {
    const post = await getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (String(post.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await deletePost({ postId: req.params.id, userId: req.user._id });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PUT /api/social/post/:id/like
router.put('/post/:id/like', auth, async (req, res) => {
  try {
    const result = await toggleLikePost({ postId: req.params.id, userId: req.user._id });
    if (!result) return res.status(404).json({ error: 'Post not found' });
    res.json({ likes: result.post.likes.length, liked: result.liked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update like' });
  }
});

// POST /api/social/post/:id/comment
router.post('/post/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

    const comments = await addCommentToPost({ postId: req.params.id, userId: req.user._id, text: text.trim() });
    if (!comments) return res.status(404).json({ error: 'Post not found' });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /api/social/post/:postId/comment/:commentId
router.delete('/post/:postId/comment/:commentId', auth, async (req, res) => {
  try {
    const post = await getPostById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = (post.comments || []).find((item) => String(item._id) === String(req.params.commentId));
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const isCommentOwner = String(comment.user) === String(req.user._id);
    const isPostOwner = String(post.user) === String(req.user._id);
    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    const comments = await deleteCommentFromPost({ postId: req.params.postId, commentId: req.params.commentId, userId: req.user._id });
    if (!comments) return res.status(404).json({ error: 'Post not found' });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST /api/social/post/:postId/comment/:commentId/reply
router.post('/post/:postId/comment/:commentId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Reply text required' });

    const comments = await addReplyToComment({ postId: req.params.postId, commentId: req.params.commentId, userId: req.user._id, text: text.trim() });
    if (!comments) return res.status(404).json({ error: 'Post not found' });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

module.exports = router;
