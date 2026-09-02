import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Flag, Copy, UserPlus } from 'lucide-react';
import { doc, deleteDoc, addDoc, collection, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../hooks/usePosts';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: Post;
  onLike: (postId: string, isLiked: boolean) => void;
  onSave: (postId: string, isSaved: boolean) => void;
  onDeleted?: (postId: string) => void;
  onOpenComments?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onSave, onDeleted, onOpenComments }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const lastTap = useRef<number>(0);

  const isLiked = currentUser ? post.likedBy.includes(currentUser.uid) : false;
  const isSaved = currentUser ? post.savedBy.includes(currentUser.uid) : false;
  const isOwner = currentUser?.uid === post.userId;

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!isLiked) {
        onLike(post.id, false);
        setHeartAnim(true);
        setTimeout(() => setHeartAnim(false), 800);
      }
    }
    lastTap.current = now;
  }, [isLiked, onLike, post.id]);

  const handleDelete = async () => {
    if (!isOwner) return;
    if (!confirm('Delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      // Update user post count
      await updateDoc(doc(db, 'users', post.userId), { postsCount: increment(-1) });
      onDeleted?.(post.id);
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
    setShowMenu(false);
  };

  const handleReport = async () => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'post',
        postId: post.id,
        reportedBy: currentUser.uid,
        reportedUserId: post.userId,
        createdAt: serverTimestamp(),
        status: 'pending',
      });
      toast.success('Post reported. We will review it.');
    } catch {
      toast.error('Failed to report post');
    }
    setShowMenu(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${post.displayName} on CuteBhim`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!');
      } catch {
        toast.error('Could not share');
      }
    }
  };

  const formatCaption = (caption: string) => {
    const parts = caption.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#')) return <span key={i} className="hashtag" onClick={() => navigate(`/explore?tag=${part.slice(1)}`)}>{part}</span>;
      if (part.startsWith('@')) return <span key={i} className="mention">{part}</span>;
      return part;
    });
  };

  const timeAgo = post.createdAt
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true })
    : 'recently';

  return (
    <div className="card animate-fade-in" style={{ borderRadius: '0', border: 'none', borderBottom: '1px solid var(--border)', marginBottom: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '10px' }}>
        <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', padding: '2px', flexShrink: 0 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-primary)', padding: '2px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {post.userPhoto
                ? <img src={post.userPhoto} alt={post.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <span style={{ color: 'white', fontWeight: 700, fontSize: '14px', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{post.displayName?.[0]?.toUpperCase()}</span>
              }
            </div>
          </div>
        </Link>

        <div style={{ flex: 1 }}>
          <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{post.displayName}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{post.username} {post.location && `• ${post.location}`}</div>
          </Link>
        </div>

        {!isOwner && (
          <button className="follow-btn not-following" style={{ fontSize: '12px', padding: '4px 12px' }}>
            Follow
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(!showMenu)} className="btn-ghost" style={{ padding: '6px' }} aria-label="More options">
            <MoreHorizontal size={20} />
          </button>
          {showMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowMenu(false)} />
              <div style={{
                position: 'absolute', right: 0, top: '100%', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden',
                minWidth: '180px', zIndex: 20, boxShadow: 'var(--shadow)',
              }}>
                {isOwner && (
                  <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#FF3366', fontSize: '14px', fontWeight: 500 }}>
                    <Trash2 size={16} /> Delete Post
                  </button>
                )}
                <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px' }}>
                  <Copy size={16} /> Copy Link
                </button>
                {!isOwner && (
                  <button onClick={handleReport} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#FF8C00', fontSize: '14px' }}>
                    <Flag size={16} /> Report Post
                  </button>
                )}
                <button onClick={() => { navigate(`/profile/${post.username}`); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px' }}>
                  <UserPlus size={16} /> View Profile
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="post-media-container" style={{ position: 'relative' }} onClick={handleDoubleTap}>
        {post.mediaUrls && post.mediaUrls.length > 0 ? (
          <>
            {post.mediaTypes?.[currentMediaIndex] === 'video' ? (
              <video
                src={post.mediaUrls[currentMediaIndex]}
                controls
                playsInline
                style={{ width: '100%', height: 'auto', maxHeight: '600px', display: 'block', objectFit: 'contain', background: '#000' }}
              />
            ) : (
              <img
                src={post.mediaUrls[currentMediaIndex]}
                alt="Post"
                loading="lazy"
                style={{ width: '100%', height: 'auto', maxHeight: '600px', display: 'block', objectFit: 'contain' }}
              />
            )}

            {/* Multiple media dots */}
            {post.mediaUrls.length > 1 && (
              <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                {post.mediaUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(i); }}
                    style={{
                      width: i === currentMediaIndex ? 20 : 6, height: 6, borderRadius: 3,
                      background: i === currentMediaIndex ? 'white' : 'rgba(255,255,255,0.5)',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: 300, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '40px' }}>🖼️</span>
          </div>
        )}

        {/* Double-tap heart */}
        {heartAnim && (
          <div className="double-tap-heart">
            <Heart size={80} fill="#FF3366" color="#FF3366" style={{ animation: 'heartPop 0.6s ease', filter: 'drop-shadow(0 0 20px rgba(255,51,102,0.5))' }} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
          <button
            className={`like-btn btn-ghost${isLiked ? ' liked' : ''}`}
            style={{ padding: '8px' }}
            onClick={() => onLike(post.id, isLiked)}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={22} fill={isLiked ? '#FF3366' : 'none'} color={isLiked ? '#FF3366' : 'var(--text-primary)'} style={{ transition: 'all 0.2s' }} />
          </button>
          <button className="btn-ghost" style={{ padding: '8px' }} onClick={() => onOpenComments?.(post)} aria-label="Comment">
            <MessageCircle size={22} />
          </button>
          <button className="btn-ghost" style={{ padding: '8px' }} onClick={handleShare} aria-label="Share">
            <Send size={22} />
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn-ghost"
            style={{ padding: '8px' }}
            onClick={() => onSave(post.id, isSaved)}
            aria-label={isSaved ? 'Unsave' : 'Save'}
          >
            <Bookmark size={22} fill={isSaved ? 'var(--primary)' : 'none'} color={isSaved ? 'var(--primary)' : 'var(--text-primary)'} />
          </button>
        </div>

        {/* Likes */}
        {post.likesCount > 0 && (
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            {post.likesCount.toLocaleString()} {post.likesCount === 1 ? 'like' : 'likes'}
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: '4px' }}>
            <Link to={`/profile/${post.username}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
              {post.displayName}
            </Link>
            {' '}
            <span style={{ color: 'var(--text-secondary)' }}>{formatCaption(post.caption)}</span>
          </div>
        )}

        {/* View comments */}
        {post.commentsCount > 0 && (
          <button
            onClick={() => onOpenComments?.(post)}
            style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', display: 'block' }}
          >
            View all {post.commentsCount} comments
          </button>
        )}

        {/* Timestamp */}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '8px' }}>{timeAgo}</div>
      </div>
    </div>
  );
};

export default PostCard;
