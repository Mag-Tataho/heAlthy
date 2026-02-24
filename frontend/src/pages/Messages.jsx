import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function Avatar({ name, size = 'md', premium }) {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-sm';
  return (
    <div className={`${s} rounded-full bg-sage-600 flex items-center justify-center text-white font-semibold flex-shrink-0 relative`}>
      {name?.[0]?.toUpperCase() || '?'}
      {premium && <span className="absolute -top-0.5 -right-0.5 text-xs">✨</span>}
    </div>
  );
}

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return new Date(date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

// Chat window used for both DM and group
function ChatWindow({ title, messages, onSend, loading, subtitle }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const { user } = useAuth();
  const myId = user?._id?.toString();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Window header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-sage-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <p className="font-semibold text-sage-900 dark:text-white">{title}</p>
        {subtitle && <p className="text-xs text-sage-400 dark:text-gray-500">{subtitle}</p>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-center text-sage-400 dark:text-gray-500 text-sm">Loading messages...</p>}
        {!loading && messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sage-400 dark:text-gray-500 text-sm">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.sender?._id?.toString() === myId || m.sender?.toString() === myId;
          return (
            <div key={m._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && <Avatar name={m.sender?.name} size="sm" />}
              <div className={`max-w-[75%] ${isMe ? '' : ''}`}>
                {!isMe && <p className="text-xs text-sage-400 dark:text-gray-500 mb-0.5 ml-1">{m.sender?.name}</p>}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-sage-600 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 border border-sage-100 dark:border-gray-700 text-sage-800 dark:text-gray-200 rounded-bl-sm'
                }`}>
                  {m.text}
                </div>
                <p className={`text-xs text-sage-300 dark:text-gray-600 mt-0.5 ${isMe ? 'text-right' : 'ml-1'}`}>{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-sage-100 dark:border-gray-800 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          className="input-field flex-1 text-sm"
          placeholder="Type a message..."
        />
        <button onClick={send} disabled={!text.trim()} className="btn-primary text-sm px-4">→</button>
      </div>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const [tab,           setTab]           = useState('dm');        // dm | groups
  const [conversations, setConversations] = useState([]);
  const [groups,        setGroups]        = useState([]);
  const [friends,       setFriends]       = useState([]);
  const [activeDM,      setActiveDM]      = useState(null);   // { _id, name }
  const [activeGroup,   setActiveGroup]   = useState(null);   // group object
  const [dmMessages,    setDmMessages]    = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [showNewGroup,  setShowNewGroup]  = useState(false);
  const [groupName,     setGroupName]     = useState('');
  const [groupDesc,     setGroupDesc]     = useState('');
  const [groupEmoji,    setGroupEmoji]    = useState('💪');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creating,      setCreating]      = useState(false);
  const [error,         setError]         = useState('');

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConversations(data.conversations || []);
    } catch {}
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/groups');
      setGroups(data.groups || []);
    } catch {}
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const { data } = await api.get('/friends');
      setFriends(data.friends || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadConversations();
    loadGroups();
    loadFriends();
  }, [loadConversations, loadGroups, loadFriends]);

  const openDM = async (friend) => {
    setActiveDM(friend);
    setActiveGroup(null);
    setLoadingMsgs(true);
    try {
      const { data } = await api.get(`/messages/dm/${friend._id}`);
      setDmMessages(data.messages || []);
    } catch { setError('Failed to load messages'); }
    finally { setLoadingMsgs(false); }
  };

  const openGroup = async (group) => {
    setActiveGroup(group);
    setActiveDM(null);
    setLoadingMsgs(true);
    try {
      const { data } = await api.get(`/messages/groups/${group._id}/messages`);
      setGroupMessages(data.messages || []);
    } catch { setError('Failed to load group messages'); }
    finally { setLoadingMsgs(false); }
  };

  const sendDM = async (text) => {
    try {
      const { data } = await api.post(`/messages/dm/${activeDM._id}`, { text });
      setDmMessages(m => [...m, data.message]);
      loadConversations();
    } catch (err) { setError(err.response?.data?.error || 'Failed to send'); }
  };

  const sendGroup = async (text) => {
    try {
      const { data } = await api.post(`/messages/groups/${activeGroup._id}/messages`, { text });
      setGroupMessages(m => [...m, data.message]);
    } catch (err) { setError(err.response?.data?.error || 'Failed to send'); }
  };

  const createGroup = async () => {
    if (!groupName.trim()) return setError('Group name required');
    setCreating(true); setError('');
    try {
      const { data } = await api.post('/messages/groups', {
        name:      groupName.trim(),
        description: groupDesc.trim(),
        emoji:     groupEmoji,
        memberIds: selectedMembers,
      });
      setGroups(g => [data.group, ...g]);
      setShowNewGroup(false);
      setGroupName(''); setGroupDesc(''); setGroupEmoji('💪'); setSelectedMembers([]);
      openGroup(data.group);
    } catch (err) { setError(err.response?.data?.error || 'Failed to create group'); }
    finally { setCreating(false); }
  };

  const toggleMember = (id) => setSelectedMembers(m => m.includes(id) ? m.filter(x => x !== id) : [...m, id]);

  const EMOJIS = ['💪','🥗','🏃','🌿','⚖️','🏋️','🥦','🍎','❤️','🔥'];

  const chatTitle   = activeDM ? activeDM.name : activeGroup ? `${activeGroup.emoji} ${activeGroup.name}` : '';
  const chatSubtitle = activeGroup ? `${activeGroup.members?.length || 0} members` : activeDM ? 'Direct Message' : '';

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn" style={{ height: 'calc(100dvh - 8rem)' }}>
      <div className="flex h-full border border-sage-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">

        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-sage-100 dark:border-gray-800 flex flex-col">
          {/* Tabs */}
          <div className="flex gap-1 p-3 border-b border-sage-100 dark:border-gray-800">
            <button onClick={() => setTab('dm')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'dm' ? 'bg-sage-600 text-white' : 'text-sage-500 dark:text-gray-400 hover:bg-sage-50 dark:hover:bg-gray-800'}`}>
              💬 DMs
            </button>
            <button onClick={() => setTab('groups')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'groups' ? 'bg-sage-600 text-white' : 'text-sage-500 dark:text-gray-400 hover:bg-sage-50 dark:hover:bg-gray-800'}`}>
              👥 Groups
            </button>
          </div>

          {/* DM list */}
          {tab === 'dm' && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-sage-50 dark:border-gray-800">
                <p className="text-xs font-semibold text-sage-400 dark:text-gray-500 uppercase tracking-wide mb-2">Friends</p>
                {friends.length === 0 && <p className="text-xs text-sage-400 dark:text-gray-500">No friends yet. <a href="/friends" className="underline">Add some!</a></p>}
                {friends.map(f => {
                  const conv = conversations.find(c => c.user._id === f._id);
                  return (
                    <button key={f._id} onClick={() => openDM(f)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all mb-1 text-left ${activeDM?._id === f._id ? 'bg-sage-50 dark:bg-gray-800' : 'hover:bg-sage-50 dark:hover:bg-gray-800'}`}>
                      <Avatar name={f.name} size="sm" premium={f.isPremium} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-sage-900 dark:text-white truncate">{f.name}</p>
                        {conv?.lastMessage && (
                          <p className="text-xs text-sage-400 dark:text-gray-500 truncate">
                            {conv.lastMessage.sender?.name === user?.name ? 'You: ' : ''}{conv.lastMessage.text}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        {conv?.lastMessage && <span className="text-xs text-sage-300 dark:text-gray-600">{timeAgo(conv.lastMessage.createdAt)}</span>}
                        {conv?.unread > 0 && <span className="w-5 h-5 bg-sage-600 text-white text-xs rounded-full flex items-center justify-center">{conv.unread}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Groups list */}
          {tab === 'groups' && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3">
                <button onClick={() => setShowNewGroup(true)}
                  className="w-full btn-primary text-sm py-2 mb-3 flex items-center justify-center gap-2">
                  + New Group
                </button>
                {groups.length === 0 && <p className="text-xs text-sage-400 dark:text-gray-500 text-center py-4">No groups yet</p>}
                {groups.map(g => (
                  <button key={g._id} onClick={() => openGroup(g)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all mb-1 text-left ${activeGroup?._id === g._id ? 'bg-sage-50 dark:bg-gray-800' : 'hover:bg-sage-50 dark:hover:bg-gray-800'}`}>
                    <div className="w-9 h-9 rounded-full bg-sage-100 dark:bg-gray-700 flex items-center justify-center text-lg flex-shrink-0">{g.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sage-900 dark:text-white truncate">{g.name}</p>
                      <p className="text-xs text-sage-400 dark:text-gray-500">{g.members?.length || 0} members</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {(activeDM || activeGroup) ? (
            <ChatWindow
              title={chatTitle}
              subtitle={chatSubtitle}
              messages={activeDM ? dmMessages : groupMessages}
              onSend={activeDM ? sendDM : sendGroup}
              loading={loadingMsgs}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <p className="text-5xl mb-3">💬</p>
                <p className="font-medium text-sage-700 dark:text-gray-300 mb-1">Select a conversation</p>
                <p className="text-sage-400 dark:text-gray-500 text-sm">Choose a friend or group from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Group modal */}
      {showNewGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn">
            <h3 className="font-display text-xl font-semibold text-sage-900 dark:text-white mb-4">Create Group Chat</h3>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <div className="space-y-3 mb-4">
              <div>
                <label className="label">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => setGroupEmoji(e)}
                      className={`w-9 h-9 text-xl rounded-xl border-2 transition-all ${groupEmoji === e ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/40' : 'border-sage-200 dark:border-gray-700'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Group Name *</label>
                <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
                  className="input-field" placeholder="e.g. Weight Loss Crew" maxLength={80} />
              </div>
              <div>
                <label className="label">Description <span className="font-normal text-sage-400">optional</span></label>
                <input type="text" value={groupDesc} onChange={e => setGroupDesc(e.target.value)}
                  className="input-field" placeholder="What's this group about?" maxLength={200} />
              </div>
              <div>
                <label className="label">Add Friends</label>
                {friends.length === 0 && <p className="text-xs text-sage-400 dark:text-gray-500">No friends to add yet</p>}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {friends.map(f => (
                    <label key={f._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-sage-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input type="checkbox" checked={selectedMembers.includes(f._id)}
                        onChange={() => toggleMember(f._id)}
                        className="w-4 h-4 accent-sage-600" />
                      <Avatar name={f.name} size="sm" />
                      <span className="text-sm text-sage-800 dark:text-gray-200">{f.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={createGroup} disabled={creating || !groupName.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {creating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Creating...</> : '✅ Create Group'}
              </button>
              <button onClick={() => { setShowNewGroup(false); setError(''); }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
