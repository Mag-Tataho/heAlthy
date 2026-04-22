import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Bot, Leaf, Sparkles, Trash2 } from '../components/OpenMojiIcons';
import PremiumGate from '../components/PremiumGate';
import api from '../utils/api';

const suggestions = [
  'What should I eat before a morning workout?',
  'How much protein do I need daily?',
  'Suggest healthy Filipino snacks under 200 calories',
  'What are the best foods for weight loss?',
  'How do I reduce sugar cravings?',
  'What should I eat after a workout?',
];

const stripEmojis = (value = '') => String(value)
  .replace(/\p{Extended_Pictographic}/gu, '')
  .replace(/[\uFE0F\u200D]/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const sanitizeChatMessages = (items = []) => items.map((message) => (
  message?.role === 'assistant'
    ? { ...message, content: stripEmojis(message.content) }
    : message
));

export default function Chat() {
  const { user } = useAuth();
  const storageKey = `healthy_chat_${user?._id || user?.id || 'guest'}`;

  const getInitialMessages = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return sanitizeChatMessages(JSON.parse(saved));
    } catch {}
    return [
      {
        role: 'assistant',
        content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your personal nutrition coach powered by Groq AI. I can help with meal suggestions, nutrition questions, and personalized advice based on your profile. What's on your mind?`,
      },
    ];
  };

  const [messages, setMessages] = useState(getInitialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearChat = () => {
    const fresh = [
      {
        role: 'assistant',
        content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your personal nutrition coach powered by Groq AI. I can help with meal suggestions, nutrition questions, and personalized advice based on your profile. What's on your mind?`,
      },
    ];
    setMessages(fresh);
    localStorage.removeItem(storageKey);
  };

  const send = async (text) => {
    if (!text.trim() || sending) return;
    setError('');
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);
    try {
      const { data } = await api.post('/ai/chat', {
        messages: newMessages.filter((m) => m.role !== 'system').slice(-10),
      });
      setMessages([...newMessages, { role: 'assistant', content: stripEmojis(data.reply) }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to send. Check that GROQ_API_KEY is set in your backend .env file.';
      setError(errMsg);
      setMessages(newMessages.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  return (
    <PremiumGate featureName="AI Nutrition Coach">
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100dvh - 8rem)' }}>
        {/* Header */}
        <div className="animate-fadeIn mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-600 flex items-center justify-center text-white">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-sage-900 dark:text-white">AI Nutrition Coach</h1>
              <p className="text-xs text-sage-500 dark:text-gray-400">Powered by Groq Llama AI · Personalized to your profile</p>
            </div>
            <span className="ml-auto badge-premium inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Premium
            </span>
            {messages.length > 1 && (
              <button onClick={clearChat}
                className="text-xs text-sage-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                <span className="inline-flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear chat
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-sage-600 flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 mt-0.5">
                  <Leaf className="h-4 w-4" aria-hidden="true" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-sage-600 text-white rounded-br-sm'
                  : 'bg-white dark:bg-gray-800 border border-sage-100 dark:border-gray-700 text-sage-800 dark:text-gray-200 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-lg bg-sage-600 flex items-center justify-center text-white text-xs mr-2 flex-shrink-0">
                <Leaf className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-sage-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-sage-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
            {suggestions.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-xs bg-white dark:bg-gray-800 border border-sage-200 dark:border-gray-700 text-sage-600 dark:text-gray-300 px-3 py-1.5 rounded-full hover:border-sage-400 dark:hover:border-gray-500 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex-shrink-0">
            {error}
          </div>
        )}

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-3 flex-shrink-0">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            className="input-field flex-1" placeholder="Ask about nutrition, meals, diet advice..."
            disabled={sending} />
          <button type="submit" disabled={sending || !input.trim()} className="btn-primary flex-shrink-0 flex items-center gap-2">
            {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </form>
      </div>
    </PremiumGate>
  );
}
