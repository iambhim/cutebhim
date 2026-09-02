import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import CommentsModal from '../components/CommentsModal';
import { Post } from '../hooks/usePosts';

const PostDetail: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (!postId) return;
    const fetchPost = async () => {
      try {
        const d = await getDoc(doc(db, 'posts', postId));
        if (d.exists()) {
          setPost({ id: d.id, ...d.data() } as Post);
        }
      } catch (err) {
        console.error('Post fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUser || !post) return;
    const ref = doc(db, 'posts', postId);
    await updateDoc(ref, {
      likedBy: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1,
    });
    setPost(prev => prev ? {
      ...prev,
      likedBy: isLiked ? prev.likedBy.filter(id => id !== currentUser.uid) : [...prev.likedBy, currentUser.uid],
      likesCount: isLiked ? prev.likesCount - 1 : prev.likesCount + 1,
    } : null);
  };

  const handleSave = async (postId: string, isSaved: boolean) => {
    if (!currentUser || !post) return;
    const ref = doc(db, 'posts', postId);
    await updateDoc(ref, {
      savedBy: isSaved ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
    });
    setPost(prev => prev ? {
      ...prev,
      savedBy: isSaved ? prev.savedBy.filter(id => id !== currentUser.uid) : [...prev.savedBy, currentUser.uid],
    } : null);
  };

  return (
    <Layout>
      <div style={{ maxWidth: 500, margin: '0 auto', paddingBottom: '80px' }}>
        <div className="top-bar">
          <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '8px' }}>← Back</button>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>Post</span>
          <div />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div className="splash-loader" />
          </div>
        ) : !post ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>🔍</div>
            <p style={{ color: 'var(--text-muted)' }}>Post not found</p>
          </div>
        ) : (
          <>
            <PostCard
              post={post}
              onLike={handleLike}
              onSave={handleSave}
              onOpenComments={() => setShowComments(true)}
            />
            {showComments && <CommentsModal post={post} onClose={() => setShowComments(false)} />}
          </>
        )}
      </div>
    </Layout>
  );
};

export default PostDetail;
