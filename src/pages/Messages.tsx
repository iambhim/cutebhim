import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Send, Image, Phone, Video, CheckCheck } from 'lucide-react';
import {
  collection, query, where, orderBy, onSnapshot, addDoc,
  serverTimestamp, updateDoc, doc, getDocs, limit, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  participants: string[];
  participantProfiles: Record<string, { username: string; displayName: string; photoURL: string }>;
  lastMessage: string;
  lastMessageTime: Timestamp | null;
  lastSenderId: string;
  unreadCount: Record<string, number>;
  createdAt: Timestamp | null;
}

interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: { toDate(): Date } | null;
  isRead: boolean;
  deletedBy?: string[];
}

const Messages: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUser = searchParams.get('user');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{uid: string; username: string; displayName: string; photoURL: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch conversations
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Conversation[]);
      setLoading(false);
    }, (err) => {
      console.error('Conversations error:', err);
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  // Handle target user from URL
  useEffect(() => {
    if (!targetUser || !currentUser || !userProfile) return;
    const findOrCreate = async () => {
      const q = query(collection(db, 'users'), where('username', '==', targetUser));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const targetProfile = snap.docs[0].data();
      await openConversation({ uid: snap.docs[0].id, ...targetProfile } as {uid: string; username: string; displayName: string; photoURL: string});
    };
    findOrCreate();
  }, [targetUser, currentUser, userProfile]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConv) return;
    const q = query(
      collection(db, 'conversations', activeConv.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Message[]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [activeConv]);

  const openConversation = async (user: {uid: string; username: string; displayName: string; photoURL: string}) => {
    if (!currentUser || !userProfile) return;

    // Find existing conversation
    const existing = conversations.find(c =>
      c.participants.includes(user.uid) && c.participants.includes(currentUser.uid) && c.participants.length === 2
    );

    if (existing) {
      setActiveConv(existing);
      return;
    }

    // Create new conversation
    const convData = {
      participants: [currentUser.uid, user.uid],
      participantProfiles: {
        [currentUser.uid]: {
          username: userProfile.username,
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL || '',
        },
        [user.uid]: {
          username: user.username,
          displayName: user.displayName,
          photoURL: user.photoURL || '',
        },
      },
      lastMessage: '',
      lastMessageTime: null,
      lastSenderId: '',
      unreadCount: { [currentUser.uid]: 0, [user.uid]: 0 },
      createdAt: serverTimestamp(),
    };

    const convRef = await addDoc(collection(db, 'conversations'), convData);
    const newConv = { id: convRef.id, ...convData } as unknown as Conversation;
    setActiveConv(newConv);
    setShowNewChat(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !currentUser || !activeConv || !userProfile) return;
    setSending(true);

    try {
      const msg = {
        senderId: currentUser.uid,
        senderUsername: userProfile.username,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
        isRead: false,
        deletedBy: [],
      };

      await addDoc(collection(db, 'conversations', activeConv.id, 'messages'), msg);
      await updateDoc(doc(db, 'conversations', activeConv.id), {
        lastMessage: messageText.trim().slice(0, 100),
        lastMessageTime: serverTimestamp(),
        lastSenderId: currentUser.uid,
      });

      setMessageText('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !activeConv || !userProfile) return;

    try {
      const storageRef = ref(storage, `messages/${activeConv.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const msg = {
        senderId: currentUser.uid,
        senderUsername: userProfile.username,
        mediaUrl: url,
        mediaType: 'image',
        createdAt: serverTimestamp(),
        isRead: false,
        deletedBy: [],
      };

      await addDoc(collection(db, 'conversations', activeConv.id, 'messages'), msg);
      await updateDoc(doc(db, 'conversations', activeConv.id), {
        lastMessage: '📷 Image',
        lastMessageTime: serverTimestamp(),
        lastSenderId: currentUser.uid,
      });
    } catch (err) {
      toast.error('Failed to send image');
    }
  };

  const searchUsers = async (text: string) => {
    setNewChatSearch(text);
    if (!text.trim()) { setSearchResults([]); return; }

    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', text.toLowerCase()),
        where('username', '<=', text.toLowerCase() + '\uf8ff'),
        limit(8)
      );
      const snap = await getDocs(q);
      const results = snap.docs
        .filter(d => d.id !== currentUser?.uid)
        .map(d => ({ uid: d.id, ...d.data() })) as {uid: string; username: string; displayName: string; photoURL: string}[];
      setSearchResults(results);
    } catch {}
  };

  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participants.find(id => id !== currentUser?.uid) || '';
    return conv.participantProfiles?.[otherId] || { username: 'Unknown', displayName: 'Unknown', photoURL: '' };
  };

  const filteredConvs = conversations.filter(c => {
    if (!searchText) return true;
    const other = getOtherParticipant(c);
    return other.username.includes(searchText) || other.displayName.toLowerCase().includes(searchText.toLowerCase());
  });

  // Mobile: show conversation list or chat
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    if (activeConv) setMobileView('chat');
  }, [activeConv]);

  const ConversationList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="top-bar" style={{ position: 'relative' }}>
        <h1 style={{ fontWeight: 700, fontSize: '18px' }}>Messages</h1>
        <button onClick={() => setShowNewChat(true)} style={{ background: 'linear-gradient(135deg, #6C63FF, #FF6584)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          + New
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px' }}>
        <div className="search-input-wrapper">
          <Search size={16} />
          <input type="text" className="input-field" style={{ paddingLeft: '40px', borderRadius: '12px' }} placeholder="Search conversations..." value={searchText} onChange={e => setSearchText(e.target.value)} />
        </div>
      </div>

      {/* Conversations */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: '12px' }}>
                <div className="skeleton" style={{ width: 52, height: 52, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                  <div className="skeleton" style={{ width: '50%', height: 12 }} />
                  <div className="skeleton" style={{ width: '70%', height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConvs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>💬</div>
            <p style={{ fontWeight: 700, marginBottom: '8px' }}>No conversations yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Start a conversation with someone!</p>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => setShowNewChat(true)}>
              Start Chat
            </button>
          </div>
        ) : (
          filteredConvs.map(conv => {
            const other = getOtherParticipant(conv);
            const isActive = activeConv?.id === conv.id;
            const unread = conv.unreadCount?.[currentUser?.uid || ''] || 0;

            return (
              <div
                key={conv.id}
                onClick={() => { setActiveConv(conv); setMobileView('chat'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                  cursor: 'pointer', background: isActive ? 'rgba(108,99,255,0.08)' : 'transparent',
                  borderBottom: '1px solid var(--border)', transition: 'background 0.2s',
                }}
              >
                <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {other.photoURL
                    ? <img src={other.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{other.displayName?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: '14px' }}>{other.displayName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {conv.lastMessageTime ? formatDistanceToNow(conv.lastMessageTime.toDate(), { addSuffix: false }) : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {conv.lastSenderId === currentUser?.uid && <CheckCheck size={12} color="var(--primary)" />}
                    <span style={{ fontSize: '12px', color: unread > 0 ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread > 0 ? 600 : 400 }}>
                      {conv.lastMessage || 'Start chatting...'}
                    </span>
                    {unread > 0 && (
                      <div style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', borderRadius: '10px', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', padding: '0 4px', flexShrink: 0 }}>
                        {unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const ChatView = () => {
    if (!activeConv) return null;
    const other = getOtherParticipant(activeConv);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Chat header */}
        <div className="top-bar">
          <button onClick={() => { setMobileView('list'); setActiveConv(null); }} className="btn-ghost" style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/profile/${other.username}`)}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {other.photoURL
                ? <img src={other.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'white', fontWeight: 700 }}>{other.displayName?.[0]}</span>
              }
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{other.displayName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{other.username}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn-ghost" style={{ padding: '8px' }}><Phone size={18} /></button>
            <button className="btn-ghost" style={{ padding: '8px' }}><Video size={18} /></button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-primary)' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>👋</div>
              <p>Say hi to {other.displayName}!</p>
            </div>
          )}
          {messages.map(msg => {
            const isMine = msg.senderId === currentUser?.uid;
            const timeAgo = msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : '';
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
                {!isMine && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {other.photoURL
                      ? <img src={other.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>{other.displayName?.[0]}</span>
                    }
                  </div>
                )}
                <div style={{ maxWidth: '70%' }}>
                  {msg.mediaUrl ? (
                    <img src={msg.mediaUrl} alt="" style={{ maxWidth: '100%', borderRadius: '14px', display: 'block' }} />
                  ) : (
                    <div className={`message-bubble ${isMine ? 'sent' : 'received'}`}>
                      {msg.text}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', textAlign: isMine ? 'right' : 'left' }}>
                    {timeAgo}
                    {isMine && msg.isRead && <CheckCheck size={10} style={{ marginLeft: 4, display: 'inline' }} color="var(--primary)" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px' }}>
            <Image size={20} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={sendImage} style={{ display: 'none' }} />
          <input
            type="text"
            className="input-field"
            style={{ flex: 1, borderRadius: '20px', padding: '10px 16px', fontSize: '14px' }}
            placeholder="Message..."
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
          />
          <button
            type="submit"
            disabled={!messageText.trim() || sending}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: messageText.trim() ? 'linear-gradient(135deg, #6C63FF, #FF6584)' : 'var(--border)',
              border: 'none', cursor: messageText.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <Send size={16} color={messageText.trim() ? 'white' : 'var(--text-muted)'} />
          </button>
        </form>
      </div>
    );
  };

  return (
    <Layout>
      {/* New chat modal */}
      {showNewChat && (
        <div className="modal-overlay center" onClick={() => setShowNewChat(false)}>
          <div className="modal-content center-modal" onClick={e => e.stopPropagation()} style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>New Message</h3>
            <div className="search-input-wrapper" style={{ marginBottom: '16px' }}>
              <Search size={16} />
              <input type="text" className="input-field" style={{ paddingLeft: '40px' }} placeholder="Search username..." value={newChatSearch} onChange={e => searchUsers(e.target.value)} autoFocus />
            </div>
            {searchResults.map(user => (
              <div key={user.uid} onClick={() => openConversation(user)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {user.photoURL ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'white', fontWeight: 700 }}>{user.displayName?.[0]}</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.displayName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{user.username}</div>
                </div>
              </div>
            ))}
            {newChatSearch && searchResults.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No users found</p>
            )}
          </div>
        </div>
      )}

      {/* Desktop: split view / Mobile: conditional */}
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
        {/* Left: conversation list (desktop always, mobile when no chat) */}
        <div style={{
          width: '100%',
          maxWidth: '420px',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: mobileView === 'list' ? 'block' : 'none',
        }}
          className="mobile-list-panel"
        >
          <style>{`@media(min-width:768px){.mobile-list-panel{display:block!important;}}`}</style>
          <ConversationList />
        </div>

        {/* Right: chat view */}
        <div style={{
          flex: 1,
          display: mobileView === 'chat' || activeConv ? 'block' : 'none',
        }}
          className="mobile-chat-panel"
        >
          <style>{`@media(min-width:768px){.mobile-chat-panel{display:block!important;}}`}</style>
          {activeConv ? <ChatView /> : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '60px' }}>💬</div>
              <h3 style={{ fontWeight: 700, fontSize: '18px' }}>Your Messages</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Select a conversation or start a new one</p>
              <button className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => setShowNewChat(true)}>
                New Message
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
