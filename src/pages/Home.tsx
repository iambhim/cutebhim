import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, MessageCircle, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import StoriesBar from '../components/StoriesBar';
import PostCard from '../components/PostCard';
import CommentsModal from '../components/CommentsModal';
import { usePosts, Post } from '../hooks/usePosts';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';

const PostSkeleton = () => (
  <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div className="skeleton" style={{ width: '40%', height: 12 }} />
        <div className="skeleton" style={{ width: '25%', height: 10 }} />
      </div>
    </div>
    <div className="skeleton" style={{ width: '100%', height: 300, borderRadius: '12px', marginBottom: '12px' }} />
    <div className="skeleton" style={{ width: '60%', height: 12, marginBottom: '6px' }} />
    <div className="skeleton" style={{ width: '40%', height: 10 }} />
  </div>
);

const Home: React.FC = () => {
  const { posts, loading, loadingMore, hasMore, fetchMore, toggleLike, toggleSave, fetchPosts } = usePosts();
  const { unreadCount } = useNotifications();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchMore();
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, fetchMore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  const handlePostDeleted = (postId: string) => {
    // handled by real-time listener
    console.log('Post deleted:', postId);
  };

  return (
    <Layout>
      <div className="feed-container">
        {/* Top bar */}
        <div className="top-bar">
          <span className="font-brand" style={{
            fontSize: '24px',
            background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>CuteBhim</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={handleRefresh}
              className="btn-ghost"
              style={{ padding: '8px' }}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw size={20} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => navigate('/search')} className="btn-ghost" style={{ padding: '8px' }} aria-label="Search">
              <Search size={22} />
            </button>
            <button onClick={() => navigate('/messages')} className="btn-ghost" style={{ padding: '8px', position: 'relative' }} aria-label="Messages">
              <MessageCircle size={22} />
            </button>
            <button onClick={() => navigate('/notifications')} className="btn-ghost" style={{ padding: '8px', position: 'relative' }} aria-label="Notifications">
              <Bell size={22} />
              {unreadCount > 0 && (
                <div className="badge">{unreadCount > 9 ? '9+' : unreadCount}</div>
              )}
            </button>
          </div>
        </div>

        {/* Stories */}
        <StoriesBar onStoryClick={(userId) => navigate(`/stories/${userId}`)} />

        {/* Posts */}
        {loading ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>✨</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Your feed is empty</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Follow people to see their posts here, or create your first post!
            </p>
            <button className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => navigate('/explore')}>
              Explore ✨
            </button>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={toggleLike}
                onSave={toggleSave}
                onDeleted={handlePostDeleted}
                onOpenComments={setSelectedPost}
              />
            ))}

            {/* Load more trigger */}
            <div ref={loadMoreRef} style={{ height: 20 }} />

            {loadingMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <div className="splash-loader" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
                You've seen all posts!
              </div>
            )}
          </>
        )}

        {/* Welcome message for new user */}
        {!loading && posts.length === 0 && userProfile && (
          <div />
        )}
      </div>

      {/* Comments modal */}
      {selectedPost && (
        <CommentsModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </Layout>
  );
};

export default Home;
