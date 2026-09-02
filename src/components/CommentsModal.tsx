import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, CornerDownRight, Trash2, Send } from 'lucide-react';
import {
  collection, addDoc, query, orderBy, onSnapshot,
  updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp,
  deleteDoc, increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../hooks/usePosts';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  userPhoto: string;
  text: string;
  likedBy: string[];
  createdAt: { toDate(): Date } | null;
  replyTo?: string;
}

interface CommentsModalProps {
  post: Post;
  onClose: () => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ post, onClose }) => {
  const { currentUser, userProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Comment[]);
      setLoading(false);
    });
    return unsub;
  }, [post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUser || !userProfile) return;
    setSubmitting(true);

    try {
      const comment = {
        userId: currentUser.uid,
        username: userProfile.username,
        displayName: userProfile.displayName,
        userPhoto: userProfile.photoURL || '',
        text: text.trim(),
        likedBy: [],
        createdAt: serverTimestamp(),
        replyTo: replyTo?.id || null,
      };

      await addDoc(collection(db, 'posts', post.id, 'comments'), comment);
      await updateDoc(doc(db, 'posts', post.id), { commentsCount: increment(1) });

      // Create notification if not own post
      if (post.userId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          type: 'comment',
          fromUserId: currentUser.uid,
          fromUsername: userProfile.username,
          fromDisplayName: userProfile.displayName,
          fromUserPhoto: userProfile.photoURL || '',
          toUserId: post.userId,
          postId: post.id,
          message: text.trim().slice(0, 60),
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }

      setText('');
      setReplyTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    if (!currentUser) return;
    const isLiked = comment.likedBy.includes(currentUser.uid);
    const ref = doc(db, 'posts', post.id, 'comments', comment.id);
    await updateDoc(ref, {
      likedBy: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
    });
  };

  const handleDelete = async (comment: Comment) => {
    if (comment.userId !== currentUser?.uid && post.userId !== currentUser?.uid) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id, 'comments', comment.id));
      await updateDoc(doc(db, 'posts', post.id), { commentsCount: increment(-1) });
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    setText(`@${comment.username} `);
    inputRef.current?.focus();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Comments</h3>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="splash-loader" />
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map(comment => {
              const isLiked = currentUser ? comment.likedBy.includes(currentUser.uid) : false;
              const isOwner = currentUser?.uid === comment.userId || currentUser?.uid === post.userId;
              return (
                <div key={comment.id} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {comment.userPhoto
                      ? <img src={comment.userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '12px', fontWeight: 700 }}>{comment.displayName?.[0]}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '8px 12px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{comment.displayName}</span>
                      {' '}
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{comment.text}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', paddingLeft: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'recently'}
                      </span>
                      {comment.likedBy.length > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{comment.likedBy.length} likes</span>
                      )}
                      <button onClick={() => handleReply(comment)} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Reply
                      </button>
                      {isOwner && (
                        <button onClick={() => handleDelete(comment)} style={{ fontSize: '11px', color: '#FF3366', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleLikeComment(comment)} style={{ background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '8px', color: isLiked ? '#FF3366' : 'var(--text-muted)' }}>
                    <Heart size={14} fill={isLiked ? '#FF3366' : 'none'} />
                  </button>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div style={{ padding: '8px 16px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <CornerDownRight size={12} />
              Replying to @{replyTo.username}
            </div>
            <button onClick={() => { setReplyTo(null); setText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="comment-input-area">
          <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {userProfile?.photoURL
              ? <img src={userProfile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700, fontSize: '12px' }}>{userProfile?.displayName?.[0]}</span>
            }
          </div>
          <input
            ref={inputRef}
            type="text"
            className="input-field"
            style={{ borderRadius: '20px', padding: '8px 14px', fontSize: '13px' }}
            placeholder="Add a comment..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button type="submit" disabled={!text.trim() || submitting} style={{ background: 'none', border: 'none', cursor: text.trim() ? 'pointer' : 'default', color: text.trim() ? 'var(--primary)' : 'var(--text-muted)', padding: '4px' }}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommentsModal;
