import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const Avatar = ({ name, size = 'md', premium }) => {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm';
  return (
    <div className={`${s} rounded-full bg-sage-600 flex items-center justify-center text-white font-semibold flex-shrink-0 relative`}>
      {name?.[0]?.toUpperCase()}
      {premium && <span className="absolute -top-0.5 -right-0.5 text-xs">✨</span>}
    </div>
  );
};

export default function Friends() {
  const [tab, setTab]             = useState('friends');
  const [friends, setFriends]     = useState([]);
  const [requests, setRequests]   = useState([]);
  const [sent, setSent]           = useState([]);
  const [searchQ, setSearchQ]     = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addEmail, setAddEmail]   = useState('');
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState('');
  const [error, setError]         = useState('');

  const flash = (text, isErr = false) => {
    if (isErr) setError(text); else setMsg(text);
    setTimeout(() => { setMsg(''); setError(''); }, 3000);
  };

  const fetchAll = async () => {
    try {
      const [fr, req, snt] = await Promise.all([
        api.get('/friends'), api.get('/friends/requests'), api.get('/friends/sent'),
      ]);
      setFriends(fr.data.friends || []);
      setRequests(req.data.requests || []);
      setSent(snt.data.requests || []);
    } catch { flash('Failed to load friends', true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQ.length < 2) return;
    setSearching(true);
    try {
      const { data } = await api.get(`/friends/search?q=${encodeURIComponent(searchQ)}`);
      setSearchRes(data.users || []);
    } catch { flash('Search failed', true); }
    finally { setSearching(false); }
  };

  const handleSendRequest = async () => {
    if (!addEmail.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post('/friends/request', { email: addEmail.trim() });
      flash(data.message || 'Request sent!');
      setAddEmail('');
      fetchAll();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to send request', true);
    } finally { setSending(false); }
  };

  const handleAccept = async (id) => {
    try {
      await api.put(`/friends/request/${id}/accept`);
      flash('Friend added! 🎉');
      fetchAll();
    } catch { flash('Failed', true); }
  };

  const handleDecline = async (id) => {
    try {
      await api.put(`/friends/request/${id}/decline`);
      setRequests(r => r.filter(x => x._id !== id));
    } catch { flash('Failed', true); }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this friend?')) return;
    try {
      await api.delete(`/friends/${id}`);
      setFriends(f => f.filter(x => x._id !== id));
      flash('Friend removed');
    } catch { flash('Failed', true); }
  };

  const sendFromSearch = async (userId) => {
    try {
      const user = searchRes.find(u => u._id === userId);
      await api.post('/friends/request', { email: user.email });
      flash('Request sent!');
      setSearchRes(r => r.map(u => u._id === userId ? { ...u, requestSent: true } : u));
    } catch (err) {
      flash(err.response?.data?.error || 'Failed', true);
    }
  };

  const tabs = [
    { key: 'friends',  label: `Friends${friends.length ? ` (${friends.length})` : ''}` },
    { key: 'requests', label: `Requests${requests.length ? ` (${requests.length})` : ''}` },
    { key: 'add',      label: 'Add Friend' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="animate-fadeIn">
        <h1 className="section-title">Friends</h1>
        <p className="text-sage-600 dark:text-gray-400 mt-1">Connect and share your health journey</p>
      </div>

      {msg   && <div className="p-3 bg-sage-50 dark:bg-sage-900/30 border border-sage-300 dark:border-sage-700 rounded-xl text-sage-700 dark:text-sage-300 text-sm text-center animate-fadeIn">{msg}</div>}
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center animate-fadeIn">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-sage-50 dark:bg-gray-800 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white dark:bg-gray-700 text-sage-800 dark:text-white shadow-sm' : 'text-sage-500 dark:text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Friends list */}
      {tab === 'friends' && (
        loading ? (
          <div className="card text-center py-8"><div className="loading-pulse text-3xl mb-2">👥</div><p className="text-sage-400">Loading...</p></div>
        ) : friends.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-5xl mb-3">👥</div>
            <p className="font-medium text-sage-700 dark:text-gray-300 mb-1">No friends yet</p>
            <p className="text-sage-400 dark:text-gray-500 text-sm mb-4">Add friends to see their progress and share yours</p>
            <button onClick={() => setTab('add')} className="btn-primary">Add Friends →</button>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {friends.map(f => (
              <div key={f._id} className="card flex items-center gap-3">
                <Avatar name={f.name} premium={f.isPremium} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sage-900 dark:text-white">{f.name}</p>
                  <p className="text-xs text-sage-400 dark:text-gray-500">{f.email}</p>
                </div>
                {f.isPremium && <span className="badge-premium">✨ Premium</span>}
                <button onClick={() => handleRemove(f._id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Incoming requests */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {/* Incoming */}
          <div>
            <h2 className="text-sm font-semibold text-sage-500 dark:text-gray-400 uppercase tracking-wide mb-3">Incoming</h2>
            {requests.length === 0 ? (
              <div className="card text-center py-6"><p className="text-sage-400 dark:text-gray-500 text-sm">No pending requests</p></div>
            ) : (
              <div className="space-y-2">
                {requests.map(r => (
                  <div key={r._id} className="card flex items-center gap-3">
                    <Avatar name={r.from?.name} premium={r.from?.isPremium} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sage-900 dark:text-white">{r.from?.name}</p>
                      <p className="text-xs text-sage-400 dark:text-gray-500">{r.from?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(r._id)} className="btn-primary text-xs py-1.5 px-3">Accept</button>
                      <button onClick={() => handleDecline(r._id)} className="btn-secondary text-xs py-1.5 px-3">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Sent */}
          <div>
            <h2 className="text-sm font-semibold text-sage-500 dark:text-gray-400 uppercase tracking-wide mb-3">Sent</h2>
            {sent.length === 0 ? (
              <div className="card text-center py-6"><p className="text-sage-400 dark:text-gray-500 text-sm">No sent requests</p></div>
            ) : (
              <div className="space-y-2">
                {sent.map(r => (
                  <div key={r._id} className="card flex items-center gap-3">
                    <Avatar name={r.to?.name} />
                    <div className="flex-1">
                      <p className="font-medium text-sage-900 dark:text-white">{r.to?.name}</p>
                      <p className="text-xs text-sage-400 dark:text-gray-500">{r.to?.email}</p>
                    </div>
                    <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-0.5 rounded-full">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add friend */}
      {tab === 'add' && (
        <div className="space-y-4">
          {/* Add by email */}
          <div className="card animate-fadeIn">
            <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-3">Add by Email</h2>
            <p className="text-sm text-sage-500 dark:text-gray-400 mb-3">Know their email? Send a direct request.</p>
            <div className="flex gap-2">
              <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                className="input-field flex-1" placeholder="friend@example.com"
                onKeyDown={e => e.key === 'Enter' && handleSendRequest()} />
              <button onClick={handleSendRequest} disabled={sending || !addEmail.trim()} className="btn-primary flex-shrink-0 flex items-center gap-2">
                {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '➕ Send'}
              </button>
            </div>
          </div>

          {/* Search by name */}
          <div className="card animate-fadeIn">
            <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-3">Search Users</h2>
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="input-field flex-1" placeholder="Search by name or email..." />
              <button type="submit" disabled={searching || searchQ.length < 2} className="btn-primary flex-shrink-0">
                {searching ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🔍'}
              </button>
            </form>
            {searchRes.length > 0 && (
              <div className="space-y-2">
                {searchRes.map(u => (
                  <div key={u._id} className="flex items-center gap-3 p-3 rounded-xl bg-sage-50 dark:bg-gray-800">
                    <Avatar name={u.name} premium={u.isPremium} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sage-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-sage-400 dark:text-gray-500">{u.email}</p>
                    </div>
                    {u.isFriend ? (
                      <span className="text-xs text-sage-500 dark:text-gray-400">Friends ✓</span>
                    ) : u.requestSent ? (
                      <span className="text-xs text-amber-500">Sent ✓</span>
                    ) : (
                      <button onClick={() => sendFromSearch(u._id)} className="btn-primary text-xs py-1.5 px-3">Add</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
