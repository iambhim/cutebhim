import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, AtSign, Bell } from 'lucide-react';
import { updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNotifications, Notification } from '../hooks/useNotifications';
import Layout from '../components/Layout';
import { formatDistanceToNow } from 'date-fns';

const NotificationItem: React.FC<{ notif: Notification; onClick: () => void }> = ({ notif, onClick }) => {
  const getIcon = () => {
    switch (notif.type) {
      case 'like': return <Heart size={16} color="#FF3366" fill="#FF3366" />;
      case 'comment': return <MessageCircle size={16} color="var(--primary)" />;
      case 'follow': return <UserPlus size={16} color="#43CFCF" />;
      case 'reply': return <MessageCircle size={16} color="var(--secondary)" />;
      case 'mention': return <AtSign size={16} color="#FFD700" />;
      case 'message': return <MessageCircle size={16} color="var(--primary)" />;
      default: return <Bell size={16} color="var(--text-muted)" />;
    }
  };

  const getMessage = () => {
    switch (notif.type) {
      case 'like': return 'liked your post';
      case 'comment': return `commented: "${notif.message || ''}"`;
      case 'follow': return 'started following you';
      case 'reply': return `replied: "${notif.message || ''}"`;
      case 'mention': return 'mentioned you';
      case 'message': return 'sent you a message';
      default: return 'interacted with you';
    }
  };

  const timeAgo = notif.createdAt
    ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })
    : 'recently';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        background: notif.isRead ? 'transparent' : 'rgba(108,99,255,0.05)',
        cursor: 'pointer', borderBottom: '1px solid var(--border)',
        transition: 'background 0.2s',
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {notif.fromUserPhoto
            ? <img src={notif.fromUserPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'white', fontWeight: 700, fontSize: '16px' }}>{notif.fromDisplayName?.[0]?.toUpperCase()}</span>
          }
        </div>
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
          {getIcon()}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700 }}>{notif.fromDisplayName}</span>
          {' '}
          <span style={{ color: 'var(--text-secondary)' }}>{getMessage()}</span>
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{timeAgo}</p>
      </div>

      {/* Unread dot */}
      {!notif.isRead && (
        <div className="notif-dot" />
      )}
    </div>
  );
};

const Notifications: React.FC = () => {
  const { notifications, loading } = useNotifications();
  const navigate = useNavigate();

  // Mark all as read when visiting
  useEffect(() => {
    const markAllRead = async () => {
      const unread = notifications.filter(n => !n.isRead);
      if (unread.length === 0) return;

      try {
        const batch = writeBatch(db);
        unread.forEach(n => {
          batch.update(doc(db, 'notifications', n.id), { isRead: true });
        });
        await batch.commit();
      } catch (err) {
        console.error('Mark read error:', err);
      }
    };

    if (notifications.length > 0) {
      const timer = setTimeout(markAllRead, 2000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  const handleNotifClick = (notif: Notification) => {
    // Mark individual as read
    updateDoc(doc(db, 'notifications', notif.id), { isRead: true }).catch(() => {});

    // Navigate
    switch (notif.type) {
      case 'follow':
        navigate(`/profile/${notif.fromUsername}`);
        break;
      case 'like':
      case 'comment':
      case 'reply':
        if (notif.postId) navigate(`/post/${notif.postId}`);
        break;
      case 'message':
        navigate('/messages');
        break;
      default:
        navigate(`/profile/${notif.fromUsername}`);
    }
  };

  // Group by today / this week / older
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const grouped = {
    today: notifications.filter(n => n.createdAt && n.createdAt.toDate() >= today),
    thisWeek: notifications.filter(n => n.createdAt && n.createdAt.toDate() < today && n.createdAt.toDate() >= weekAgo),
    older: notifications.filter(n => !n.createdAt || n.createdAt.toDate() < weekAgo),
  };

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div style={{ padding: '10px 16px 6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </div>
        {items.map(notif => (
          <NotificationItem key={notif.id} notif={notif} onClick={() => handleNotifClick(notif)} />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="top-bar">
          <h1 style={{ fontWeight: 700, fontSize: '18px' }}>Notifications</h1>
        </div>

        {loading ? (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '4px 0' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="skeleton" style={{ width: '70%', height: 12 }} />
                  <div className="skeleton" style={{ width: '30%', height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🔔</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No notifications yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>When people like or comment on your posts, you'll see it here.</p>
          </div>
        ) : (
          <>
            {renderSection('Today', grouped.today)}
            {renderSection('This Week', grouped.thisWeek)}
            {renderSection('Older', grouped.older)}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
