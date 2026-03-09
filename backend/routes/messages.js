const express = require('express');
const Message = require('../models/Message');
const Group   = require('../models/Group');
const User    = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// ── PRIVATE MESSAGES ──────────────────────────────

// GET /api/messages/dm/:userId  — conversation with a user
router.get('/dm/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      group: null,
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id },
      ],
    }).populate('sender', 'name').sort({ createdAt: 1 }).limit(100);

    // Mark as read
    await Message.updateMany(
      { sender: req.params.userId, recipient: req.user._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ messages });
  } catch (err) { res.status(500).json({ error: 'Failed to load messages' }); }
});

// POST /api/messages/dm/:userId  — send DM
router.post('/dm/:userId', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Message text required' });

    // Must be friends
    const me = await User.findById(req.user._id).select('friends');
    const friendIds = (me.friends || []).map(f => typeof f === 'object' ? f._id.toString() : f.toString());
    if (!friendIds.includes(req.params.userId)) {
      return res.status(403).json({ error: 'You can only message friends' });
    }

    const msg = await Message.create({ sender: req.user._id, recipient: req.params.userId, text: text.trim() });
    await msg.populate('sender', 'name');
    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ error: 'Failed to send message' }); }
});

// GET /api/messages/conversations  — list of DM conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    // Find all users I've exchanged messages with
    const sent     = await Message.distinct('recipient', { sender: req.user._id, group: null });
    const received = await Message.distinct('sender',    { recipient: req.user._id, group: null });
    const userIds  = [...new Set([...sent.map(String), ...received.map(String)])];

    const users = await User.find({ _id: { $in: userIds } }).select('name email isPremium');

    // Add last message + unread count per conversation
    const conversations = await Promise.all(users.map(async (u) => {
      const last = await Message.findOne({
        group: null,
        $or: [
          { sender: req.user._id, recipient: u._id },
          { sender: u._id, recipient: req.user._id },
        ],
      }).sort({ createdAt: -1 }).populate('sender', 'name');

      const unread = await Message.countDocuments({
        sender: u._id, recipient: req.user._id,
        readBy: { $ne: req.user._id },
      });

      return { user: u, lastMessage: last, unread };
    }));

    conversations.sort((a, b) => new Date(b.lastMessage?.createdAt) - new Date(a.lastMessage?.createdAt));
    res.json({ conversations });
  } catch (err) { res.status(500).json({ error: 'Failed to load conversations' }); }
});

// ── GROUP CHAT ─────────────────────────────────────

// GET /api/messages/groups  — my groups
router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('creator', 'name')
      .populate('members', 'name isPremium')
      .sort({ updatedAt: -1 });
    res.json({ groups });
  } catch (err) { res.status(500).json({ error: 'Failed to load groups' }); }
});

// POST /api/messages/groups  — create group
router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description, emoji, memberIds = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });

    // Must be friends with all added members
    const me = await User.findById(req.user._id).select('friends');
    const friendIds = (me.friends || []).map(f => typeof f === 'object' ? f._id.toString() : f.toString());
    const validMembers = memberIds.filter(id => friendIds.includes(id));

    const group = await Group.create({
      name: name.trim(), description, emoji: emoji || '💪',
      creator: req.user._id,
      members: [req.user._id, ...validMembers],
      admins:  [req.user._id],
    });
    await group.populate('members', 'name isPremium');
    res.status(201).json({ group });
  } catch (err) { res.status(500).json({ error: 'Failed to create group' }); }
});

// GET /api/messages/groups/:id/messages
router.get('/groups/:id/messages', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!group.members.map(String).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    const messages = await Message.find({ group: req.params.id })
      .populate('sender', 'name isPremium')
      .sort({ createdAt: 1 }).limit(100);
    res.json({ messages, group });
  } catch (err) { res.status(500).json({ error: 'Failed to load messages' }); }
});

// POST /api/messages/groups/:id/messages  — send to group
router.post('/groups/:id/messages', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Message text required' });

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!group.members.map(String).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not a group member' });
    }

    const msg = await Message.create({ sender: req.user._id, group: req.params.id, text: text.trim() });
    await msg.populate('sender', 'name isPremium');
    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ error: 'Failed to send message' }); }
});

// POST /api/messages/groups/:id/join  — add member
router.post('/groups/:id/join', auth, async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.user._id } },
      { new: true }
    ).populate('members', 'name isPremium');
    res.json({ group });
  } catch (err) { res.status(500).json({ error: 'Failed to join group' }); }
});

// DELETE /api/messages/groups/:id/leave
router.delete('/groups/:id/leave', auth, async (req, res) => {
  try {
    await Group.findByIdAndUpdate(req.params.id, { $pull: { members: req.user._id } });
    res.json({ message: 'Left group' });
  } catch (err) { res.status(500).json({ error: 'Failed to leave group' }); }
});

module.exports = router;
