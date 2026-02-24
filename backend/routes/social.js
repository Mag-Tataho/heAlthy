const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// GET /api/social/feed
router.get('/feed', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user._id).select('friends');
    const friendIds = (user.friends || []).map(f => typeof f === 'object' ? f._id : f);
    const allowedUsers = [req.user._id, ...friendIds];

    const posts = await Post.find({ user: { $in: allowedUsers } })
      .populate('user', 'name email isPremium')
      .populate('comments.user', 'name')
      .populate('comments.replies.user', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Post.countDocuments({ user: { $in: allowedUsers } });
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

    const post = await Post.create({
      user: req.user._id,
      type,
      content: content || '',
      data: data || {},
      visibility: visibility || 'friends',
    });
    await post.populate('user', 'name email isPremium');
    res.status(201).json({ post });
  } catch (err) {
    res.status(400).json({ error: 'Failed to create post' });
  }
});

// DELETE /api/social/post/:id — only owner can delete
router.delete('/post/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Strict owner check using toString()
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await Post.deleteOne({ _id: req.params.id });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PUT /api/social/post/:id/like
router.put('/post/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const liked = post.likes.map(String).includes(req.user._id.toString());
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== req.user._id.toString());
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();
    res.json({ likes: post.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update like' });
  }
});

// POST /api/social/post/:id/comment
router.post('/post/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.comments.push({ user: req.user._id, text: text.trim(), replies: [] });
    await post.save();
    await post.populate('comments.user', 'name');
    await post.populate('comments.replies.user', 'name');
    res.json({ comments: post.comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /api/social/post/:postId/comment/:commentId
router.delete('/post/:postId/comment/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const isCommentOwner = comment.user.toString() === req.user._id.toString();
    const isPostOwner    = post.user.toString()    === req.user._id.toString();
    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    comment.deleteOne();
    await post.save();
    await post.populate('comments.user', 'name');
    res.json({ comments: post.comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST /api/social/post/:postId/comment/:commentId/reply
router.post('/post/:postId/comment/:commentId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Reply text required' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (!comment.replies) comment.replies = [];
    comment.replies.push({ user: req.user._id, text: text.trim() });
    await post.save();
    await post.populate('comments.user', 'name');
    await post.populate('comments.replies.user', 'name');
    res.json({ comments: post.comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

module.exports = router;
