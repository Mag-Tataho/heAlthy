const express = require('express');
const { auth } = require('../middleware/auth');
const {
  searchFriends,
  listIncomingRequests,
  listSentRequests,
  listFriendsForUser,
  createFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  findPendingFriendRequest,
  areFriends,
} = require('../src/db/friends');
const { getUserByEmail, listUsersByIds } = require('../src/db/users');
const router = express.Router();

const hydrateRequests = async (requests = [], field = 'from') => {
  const userIds = requests.map((request) => String(request[field])).filter(Boolean);
  const users = await listUsersByIds(userIds);
  const userMap = new Map(users.map((user) => [String(user._id), user]));

  return requests.map((request) => ({
    ...request,
    [field]: userMap.get(String(request[field])) || null,
  }));
};

// GET /api/friends/search?q=  ← MUST be before /:id
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const users = await searchFriends({ q, excludeUserId: req.user._id, limit: 10 });
    const myFriendIds = (req.user.friends || []).map(String);
    const sentRequests = await listSentRequests(req.user._id);
    const sentIds = sentRequests.map((request) => String(request.to));

    const annotated = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      isPremium: u.isPremium,
      isFriend: myFriendIds.includes(String(u._id)),
      requestSent: sentIds.includes(String(u._id)),
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
    const requests = await hydrateRequests(await listIncomingRequests(req.user._id), 'from');
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/friends/sent
router.get('/sent', auth, async (req, res) => {
  try {
    const requests = await hydrateRequests(await listSentRequests(req.user._id), 'to');
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sent requests' });
  }
});

// GET /api/friends  — get my friends list
router.get('/', auth, async (req, res) => {
  try {
    const friends = await listFriendsForUser(req.user._id);
    res.json({ friends });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// POST /api/friends/request  — send by email
router.post('/request', auth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const target = await getUserByEmail(email.toLowerCase().trim());
    if (!target) return res.status(404).json({ error: 'No user found with that email' });
    if (target._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot add yourself' });
    }

    if (await areFriends(req.user._id, target._id)) {
      return res.status(400).json({ error: 'You are already friends!' });
    }

    const existing = await findPendingFriendRequest(req.user._id, target._id);
    if (existing) return res.status(400).json({ error: 'A friend request already exists' });

    const request = await createFriendRequest({ fromUserId: req.user._id, toUserId: target._id });
    res.status(201).json({ request, message: `Friend request sent to ${target.name}! 🎉` });
  } catch (err) {
    console.error('Send request error:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// PUT /api/friends/request/:id/accept
router.put('/request/:id/accept', auth, async (req, res) => {
  try {
    const request = await acceptFriendRequest({ requestId: req.params.id, userId: req.user._id });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    res.json({ message: 'Friend added! 🎉' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// PUT /api/friends/request/:id/decline
router.put('/request/:id/decline', auth, async (req, res) => {
  try {
    await declineFriendRequest({ requestId: req.params.id, userId: req.user._id });
    res.json({ message: 'Request declined' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// DELETE /api/friends/:id — remove friend
router.delete('/:id', auth, async (req, res) => {
  try {
    await removeFriend({ userId: req.user._id, friendId: req.params.id });
    res.json({ message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router;
