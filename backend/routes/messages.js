const express = require('express');
const { auth } = require('../middleware/auth');
const {
  listDmMessages,
  markDmMessagesRead,
  createDmMessage,
  listConversationSummaries,
  listGroupsForUser,
  createGroup,
  getGroupById,
  hydrateGroups,
  listGroupMessages,
  createGroupMessage,
  addMemberToGroup,
  removeMemberFromGroup,
} = require('../src/db/messages');
const { areFriends } = require('../src/db/friends');
const router = express.Router();

// ── PRIVATE MESSAGES ──────────────────────────────

// GET /api/messages/dm/:userId  — conversation with a user
router.get('/dm/:userId', auth, async (req, res) => {
  try {
    const messages = await listDmMessages({ userId: req.user._id, otherUserId: req.params.userId, limit: 100 });
    await markDmMessagesRead({ senderId: req.params.userId, recipientId: req.user._id, readerId: req.user._id });

    res.json({ messages });
  } catch (err) { res.status(500).json({ error: 'Failed to load messages' }); }
});

// POST /api/messages/dm/:userId  — send DM
router.post('/dm/:userId', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Message text required' });

    if (!(await areFriends(req.user._id, req.params.userId))) {
      return res.status(403).json({ error: 'You can only message friends' });
    }

    const msg = await createDmMessage({ senderId: req.user._id, recipientId: req.params.userId, text: text.trim() });
    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ error: 'Failed to send message' }); }
});

// GET /api/messages/conversations  — list of DM conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await listConversationSummaries(req.user._id);
    res.json({ conversations });
  } catch (err) { res.status(500).json({ error: 'Failed to load conversations' }); }
});

// ── GROUP CHAT ─────────────────────────────────────

// GET /api/messages/groups  — my groups
router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await listGroupsForUser(req.user._id);
    res.json({ groups });
  } catch (err) { res.status(500).json({ error: 'Failed to load groups' }); }
});

// POST /api/messages/groups  — create group
router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description, emoji, memberIds = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });

    const friendIds = (req.user.friends || []).map(String);
    const validMembers = memberIds.filter(id => friendIds.includes(id));

    const group = await createGroup({
      name: name.trim(), description, emoji: emoji || 'Dumbbell',
      creatorId: req.user._id,
      memberIds: validMembers,
    });
    res.status(201).json({ group });
  } catch (err) { res.status(500).json({ error: 'Failed to create group' }); }
});

// GET /api/messages/groups/:id/messages
router.get('/groups/:id/messages', auth, async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!(group.members || []).map(String).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    const [hydratedGroup] = await hydrateGroups([group]);
    const messages = await listGroupMessages({ groupId: req.params.id, limit: 100 });
    res.json({ messages, group: hydratedGroup });
  } catch (err) { res.status(500).json({ error: 'Failed to load messages' }); }
});

// POST /api/messages/groups/:id/messages  — send to group
router.post('/groups/:id/messages', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Message text required' });

    const group = await getGroupById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!(group.members || []).map(String).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'Not a group member' });
    }

    const msg = await createGroupMessage({ groupId: req.params.id, senderId: req.user._id, text: text.trim() });
    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ error: 'Failed to send message' }); }
});

// POST /api/messages/groups/:id/join  — add member
router.post('/groups/:id/join', auth, async (req, res) => {
  try {
    const group = await addMemberToGroup({ groupId: req.params.id, userId: req.user._id });
    res.json({ group });
  } catch (err) { res.status(500).json({ error: 'Failed to join group' }); }
});

// DELETE /api/messages/groups/:id/leave
router.delete('/groups/:id/leave', auth, async (req, res) => {
  try {
    await removeMemberFromGroup({ groupId: req.params.id, userId: req.user._id });
    res.json({ message: 'Left group' });
  } catch (err) { res.status(500).json({ error: 'Failed to leave group' }); }
});

module.exports = router;
