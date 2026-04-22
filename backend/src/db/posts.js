const crypto = require('crypto');
const { supabase, assertSupabaseConfigured } = require('../config/supabase');
const { listUsersByIds, sanitizeUser } = require('./users');

const TABLE = 'posts';

const client = () => {
  assertSupabaseConfigured();
  if (!supabase) throw new Error('Supabase client is not configured');
  return supabase;
};

const newId = () => crypto.randomUUID();

const normalizeComments = (comments = []) => {
  return Array.isArray(comments) ? comments : [];
};

const toPost = (row = {}) => ({
  _id: row._id,
  user: row.user_id,
  type: row.type,
  content: row.content || '',
  data: row.data || {},
  likes: Array.isArray(row.likes) ? row.likes : [],
  comments: normalizeComments(row.comments),
  visibility: row.visibility || 'friends',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const hydratePosts = async (posts = []) => {
  const userIds = new Set();

  posts.forEach((post) => {
    if (post.user) userIds.add(String(post.user));
    (post.comments || []).forEach((comment) => {
      if (comment.user) userIds.add(String(comment.user));
      (comment.replies || []).forEach((reply) => {
        if (reply.user) userIds.add(String(reply.user));
      });
    });
  });

  const users = await listUsersByIds([...userIds]);
  const userMap = new Map(users.map((user) => [user._id, sanitizeUser({ _id: user._id, name: user.name, email: user.email, isPremium: user.isPremium, avatarUrl: user.avatarUrl })]));

  return posts.map((post) => ({
    ...post,
    user: userMap.get(post.user) || null,
    comments: (post.comments || []).map((comment) => ({
      ...comment,
      user: userMap.get(String(comment.user)) || null,
      replies: (comment.replies || []).map((reply) => ({
        ...reply,
        user: userMap.get(String(reply.user)) || null,
      })),
    })),
  }));
};

const listFeedPosts = async ({ userIds = [], page = 1, limit = 20 } = {}) => {
  const offset = (Number(page) - 1) * Number(limit);
  const { data, error } = await client()
    .from(TABLE)
    .select('*', { count: 'exact' })
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (error) throw error;
  const posts = (data || []).map(toPost);
  const hydrated = await hydratePosts(posts);
  return { posts: hydrated, total: data?.length ? undefined : 0 };
};

const countFeedPosts = async ({ userIds = [] } = {}) => {
  const { count, error } = await client()
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .in('user_id', userIds);

  if (error) throw error;
  return count || 0;
};

const createPost = async ({ userId, type, content = '', data = {}, visibility = 'friends' }) => {
  const { data: row, error } = await client()
    .from(TABLE)
    .insert({
      user_id: userId,
      type,
      content,
      data,
      visibility,
      likes: [],
      comments: [],
    })
    .select('*')
    .single();

  if (error) throw error;
  const [hydrated] = await hydratePosts([toPost(row)]);
  return hydrated;
};

const getPostById = async (postId) => {
  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .eq('_id', postId)
    .maybeSingle();

  if (error) throw error;
  return data ? toPost(data) : null;
};

const deletePost = async ({ postId, userId }) => {
  const { data, error } = await client()
    .from(TABLE)
    .delete()
    .eq('_id', postId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? toPost(data) : null;
};

const toggleLikePost = async ({ postId, userId }) => {
  const post = await getPostById(postId);
  if (!post) return null;

  const liked = (post.likes || []).map(String).includes(String(userId));
  const likes = liked
    ? (post.likes || []).filter((id) => String(id) !== String(userId))
    : [...(post.likes || []), userId];

  const { data, error } = await client()
    .from(TABLE)
    .update({ likes })
    .eq('_id', postId)
    .select('*')
    .single();

  if (error) throw error;
  return { post: toPost(data), liked: !liked };
};

const addCommentToPost = async ({ postId, userId, text }) => {
  const post = await getPostById(postId);
  if (!post) return null;

  const comments = [
    ...(post.comments || []),
    { _id: newId(), user: userId, text, replies: [], createdAt: new Date().toISOString() },
  ];

  const { data, error } = await client()
    .from(TABLE)
    .update({ comments })
    .eq('_id', postId)
    .select('*')
    .single();

  if (error) throw error;
  const [hydrated] = await hydratePosts([toPost(data)]);
  return hydrated.comments;
};

const deleteCommentFromPost = async ({ postId, commentId, userId }) => {
  const post = await getPostById(postId);
  if (!post) return null;

  const comments = (post.comments || []).filter((comment) => {
    const isCommentOwner = String(comment.user) === String(userId);
    const isPostOwner = String(post.user) === String(userId);
    if (String(comment._id) !== String(commentId)) return true;
    return !(isCommentOwner || isPostOwner);
  });

  const { data, error } = await client()
    .from(TABLE)
    .update({ comments })
    .eq('_id', postId)
    .select('*')
    .single();

  if (error) throw error;
  const [hydrated] = await hydratePosts([toPost(data)]);
  return hydrated.comments;
};

const addReplyToComment = async ({ postId, commentId, userId, text }) => {
  const post = await getPostById(postId);
  if (!post) return null;

  const comments = (post.comments || []).map((comment) => {
    if (String(comment._id) !== String(commentId)) return comment;
    return {
      ...comment,
      replies: [
        ...(comment.replies || []),
        { _id: newId(), user: userId, text, createdAt: new Date().toISOString() },
      ],
    };
  });

  const { data, error } = await client()
    .from(TABLE)
    .update({ comments })
    .eq('_id', postId)
    .select('*')
    .single();

  if (error) throw error;
  const [hydrated] = await hydratePosts([toPost(data)]);
  return hydrated.comments;
};

module.exports = {
  toPost,
  hydratePosts,
  listFeedPosts,
  countFeedPosts,
  createPost,
  getPostById,
  deletePost,
  toggleLikePost,
  addCommentToPost,
  deleteCommentFromPost,
  addReplyToComment,
};