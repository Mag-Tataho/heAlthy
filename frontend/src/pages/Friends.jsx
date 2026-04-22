import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatGoal } from '../utils/nutrition';
import {
  Activity,
  Check,
  Droplets,
  Leaf,
  Locked,
  Plus,
  Search,
  Sparkles,
  User,
  Users,
  X,
} from '../components/OpenMojiIcons';

const Avatar = ({ name, size = 'md', premium }) => {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm';
  return (
    <div className={`${s} rounded-full bg-sage-600 flex items-center justify-center text-white font-semibold flex-shrink-0 relative`}>
      {name?.[0]?.toUpperCase()}
      {premium && <Sparkles className="absolute -top-0.5 -right-0.5 h-3 w-3" aria-hidden="true" />}
    </div>
  );
};

// Friend Profile Modal
function FriendProfileModal({ friendId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/profile/friend/${friendId}`)
      .then(({ data }) => setData(data))
      .catch(err => setError(err.response?.data?.error || 'Could not load profile'))
      .finally(() => setLoading(false));
  }, [friendId]);

  const friend   = data?.friend;
  const progress = data?.progress || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-fadeIn"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-5 py-4 border-b border-sage-100 dark:border-gray-800 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-display text-lg font-semibold text-sage-900 dark:text-white">Friend Profile</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-sage-100 dark:bg-gray-800 flex items-center justify-center text-sage-600 dark:text-gray-400 hover:bg-sage-200 transition-colors">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loading && (
            <div className="text-center py-8 text-sage-400 dark:text-gray-500">
              <User className="h-8 w-8 mx-auto mb-2 loading-pulse" aria-hidden="true" />
              Loading profile...
            </div>
          )}

          {error && <p className="text-center text-red-500 py-4">{error}</p>}

          {!loading && friend && (
            <>
              {/* Friend info */}
              <div className="flex items-center gap-4">
                <Avatar name={friend.name} size="lg" premium={friend.isPremium} />
                <div>
                  <h4 className="font-display text-xl font-semibold text-sage-900 dark:text-white">{friend.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`${friend.isPremium ? 'badge-premium' : 'badge-free'} inline-flex items-center gap-1.5`}>
                      {friend.isPremium ? <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> : <Leaf className="h-3.5 w-3.5" aria-hidden="true" />}
                      {friend.isPremium ? 'Premium' : 'Free'}
                    </span>
                    {friend.friendCount > 0 && (
                      <span className="text-xs text-sage-400 dark:text-gray-500">{friend.friendCount} friends</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Goal */}
              {friend.goal && (
                <div className="bg-sage-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-semibold text-sage-400 dark:text-gray-500 uppercase tracking-wide mb-1">Health Goal</p>
                  <p className="text-sm font-medium text-sage-800 dark:text-gray-200">
                    {formatGoal(friend.goal)}
                  </p>
                </div>
              )}

              {/* Profile details */}
              {friend.profile && (
                <div className="bg-sage-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-semibold text-sage-400 dark:text-gray-500 uppercase tracking-wide mb-3">Body Info</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Age',    value: friend.profile.age ? `${friend.profile.age} yrs` : null },
                      { label: 'Height', value: friend.profile.height ? `${friend.profile.height} cm` : null },
                      { label: 'Weight', value: friend.profile.weight ? `${friend.profile.weight} kg` : null },
                      { label: 'Target', value: friend.profile.targetWeight ? `${friend.profile.targetWeight} kg` : null },
                    ].filter(i => i.value).map(({ label, value }) => (
                      <div key={label} className="text-center bg-white dark:bg-gray-700 rounded-lg p-2">
                        <p className="text-sm font-semibold text-sage-800 dark:text-white">{value}</p>
                        <p className="text-xs text-sage-400 dark:text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress history */}
              {progress.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-sage-400 dark:text-gray-500 uppercase tracking-wide mb-3">Progress History</p>
                  <div className="space-y-2">
                    {progress.slice(0, 10).map((entry, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 bg-sage-50 dark:bg-gray-800 rounded-xl">
                        <span className="text-xs text-sage-500 dark:text-gray-400">
                          {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex gap-3 text-xs">
                          {entry.weight   && <span className="text-sage-700 dark:text-gray-300 font-medium">{entry.weight} kg</span>}
                          {entry.calories && <span className="text-amber-600 dark:text-amber-400 font-medium">{entry.calories} cal</span>}
                          {entry.water    && <span className="text-blue-500 font-medium inline-flex items-center gap-1"><Droplets className="h-3.5 w-3.5" aria-hidden="true" />{entry.water}</span>}
                          {entry.workout?.type && <span className="text-sage-500 dark:text-gray-400 inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" aria-hidden="true" />{entry.workout.type}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {progress.length > 10 && (
                    <p className="text-xs text-sage-400 dark:text-gray-500 text-center mt-2">Showing 10 of {progress.length} entries</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-sage-400 dark:text-gray-500 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Locked className="h-4 w-4" aria-hidden="true" />
                    Progress is private or not yet logged
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [viewFriendId, setViewFriendId] = useState(null);

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
      flash('Friend added!');
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
          <div className="card text-center py-8"><Users className="h-8 w-8 mx-auto mb-2 loading-pulse" aria-hidden="true" /><p className="text-sage-400">Loading...</p></div>
        ) : friends.length === 0 ? (
          <div className="card text-center py-10">
            <Users className="h-12 w-12 mx-auto mb-3" aria-hidden="true" />
            <p className="font-medium text-sage-700 dark:text-gray-300 mb-1">No friends yet</p>
            <p className="text-sage-400 dark:text-gray-500 text-sm mb-4">Add friends to see their progress and share yours</p>
            <button onClick={() => setTab('add')} className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Friends
            </button>
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
                {f.isPremium && (
                  <span className="badge-premium inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Premium
                  </span>
                )}
                <button onClick={() => setViewFriendId(f._id)}
                  className="text-xs text-sage-600 dark:text-sage-400 hover:text-sage-800 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-sage-50 dark:hover:bg-gray-800 transition-colors">
                  View Profile
                </button>
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
          <div className="card animate-fadeIn">
            <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-3">Add by Email</h2>
            <p className="text-sm text-sage-500 dark:text-gray-400 mb-3">Know their email? Send a direct request.</p>
            <div className="flex gap-2">
              <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                className="input-field flex-1" placeholder="friend@example.com"
                onKeyDown={e => e.key === 'Enter' && handleSendRequest()} />
              <button onClick={handleSendRequest} disabled={sending || !addEmail.trim()} className="btn-primary flex-shrink-0 flex items-center gap-2">
                {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus className="h-4 w-4" aria-hidden="true" />Send</>}
              </button>
            </div>
          </div>
          <div className="card animate-fadeIn">
            <h2 className="font-display text-lg font-semibold text-sage-800 dark:text-white mb-3">Search Users</h2>
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="input-field flex-1" placeholder="Search by name or email..." />
              <button type="submit" disabled={searching || searchQ.length < 2} className="btn-primary flex-shrink-0">
                {searching ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="h-4 w-4" aria-hidden="true" />}
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
                      <span className="text-xs text-sage-500 dark:text-gray-400 inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" />Friends</span>
                    ) : u.requestSent ? (
                      <span className="text-xs text-amber-500 inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" />Sent</span>
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

      {/* Friend Profile Modal */}
      {viewFriendId && (
        <FriendProfileModal friendId={viewFriendId} onClose={() => setViewFriendId(null)} />
      )}
    </div>
  );
}
