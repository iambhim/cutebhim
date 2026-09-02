import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'reply' | 'mention' | 'message';
  fromUserId: string;
  fromUsername: string;
  fromUserPhoto: string;
  fromDisplayName: string;
  toUserId: string;
  postId?: string;
  commentId?: string;
  message?: string;
  isRead: boolean;
  createdAt: { toDate(): Date } | null;
}

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
      setLoading(false);
    }, (error) => {
      console.error('Notifications error:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  return { notifications, unreadCount, loading };
};
