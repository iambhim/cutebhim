import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, orderBy, limit, startAfter,
  getDocs, doc, updateDoc, arrayUnion, arrayRemove,
  onSnapshot, where, DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export interface Post {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  userPhoto: string;
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
  aspectRatio?: number;
  location?: string;
  likedBy: string[];
  savedBy: string[];
  commentsCount: number;
  likesCount: number;
  sharesCount: number;
  allowComments: boolean;
  createdAt: { toDate(): Date } | null;
  taggedUsers?: string[];
}

const PAGE_SIZE = 10;

export const usePosts = () => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Post[];
      setPosts(data);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Post[];
      setPosts(prev => [...prev, ...data]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    try {
      await updateDoc(postRef, {
        likedBy: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        likesCount: isLiked
          ? (posts.find(p => p.id === postId)?.likesCount ?? 1) - 1
          : (posts.find(p => p.id === postId)?.likesCount ?? 0) + 1,
      });
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          likedBy: isLiked ? p.likedBy.filter(id => id !== currentUser.uid) : [...p.likedBy, currentUser.uid],
          likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1,
        };
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const toggleSave = async (postId: string, isSaved: boolean) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    try {
      await updateDoc(postRef, {
        savedBy: isSaved ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      });
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          savedBy: isSaved ? p.savedBy.filter(id => id !== currentUser.uid) : [...p.savedBy, currentUser.uid],
        };
      }));
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Real-time listener for new posts
  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const newPost = { id: change.doc.id, ...change.doc.data() } as Post;
          setPosts(prev => {
            if (prev.find(p => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
        }
      });
    });

    return unsubscribe;
  }, []);

  return { posts, loading, loadingMore, hasMore, fetchMore, fetchPosts, toggleLike, toggleSave };
};

export const useUserPosts = (userId: string) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Post[]);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { posts, loading };
};
