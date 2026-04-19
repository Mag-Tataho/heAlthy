const express = require('express');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const { auth } = require('../middleware/auth');
const router = express.Router();

// GET /api/friends/search?q=  ← MUST be before /:id
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name:  { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    }).select('name email isPremium').limit(10);

    const myFriendIds = (req.user.friends || []).map(f =>
      typeof f === 'object' ? f._id.toString() : f.toString()
    );

    const sentRequests = await FriendRequest.find({ from: req.user._id, status: 'pending' }).select('to');
    const sentIds = sentRequests.map(r => r.to.toString());

    const annotated = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      isPremium: u.isPremium,
      isFriend: myFriendIds.includes(u._id.toString()),
      requestSent: sentIds.includes(u._id.toString()),
    }));

    res.json({ users: annotated });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/friends/requests
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'name email isPremium');
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/friends/sent
router.get('/sent', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ from: req.user._id, status: 'pending' })
      .populate('to', 'name email');
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sent requests' });
  }
});

// GET /api/friends  — get my friends list
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name email isPremium createdAt');
    res.json({ friends: user.friends || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// POST /api/friends/request  — send by email
router.post('/request', auth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const target = await User.findOne({ email: email.toLowerCase().trim() });
    if (!target) return res.status(404).json({ error: 'No user found with that email' });
    if (target._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot add yourself' });
    }

    const myFriendIds = (req.user.friends || []).map(f =>
      typeof f === 'object' ? f._id.toString() : f.toString()
    );
    if (myFriendIds.includes(target._id.toString())) {
      return res.status(400).json({ error: 'You are already friends!' });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user._id, to: target._id },
        { from: target._id, to: req.user._id },
      ],
      status: 'pending',
    });
    if (existing) return res.status(400).json({ error: 'A friend request already exists' });

    const request = await FriendRequest.create({ from: req.user._id, to: target._id });
    await request.populate('to', 'name email');
    res.status(201).json({ request, message: `Friend request sent to ${target.name}! 🎉` });
  } catch (err) {
    console.error('Send request error:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// PUT /api/friends/request/:id/accept
router.put('/request/:id/accept', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findOne({ _id: req.params.id, to: req.user._id });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = 'accepted';
    await request.save();

    await User.findByIdAndUpdate(req.user._id,  { $addToSet: { friends: request.from } });
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: req.user._id } });

    res.json({ message: 'Friend added! 🎉' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// PUT /api/friends/request/:id/decline
router.put('/request/:id/decline', auth, async (req, res) => {
  try {
    await FriendRequest.findOneAndUpdate(
      { _id: req.params.id, to: req.user._id },
      { status: 'declined' }
    );
    res.json({ message: 'Request declined' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// DELETE /api/friends/:id — remove friend
router.delete('/:id', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id,  { $pull: { friends: req.params.id } });
    await User.findByIdAndUpdate(req.params.id, { $pull: { friends: req.user._id } });
    res.json({ message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router;
