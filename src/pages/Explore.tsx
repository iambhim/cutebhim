import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, TrendingUp, Hash } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post } from '../hooks/usePosts';
import Layout from '../components/Layout';

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tagFilter = searchParams.get('tag');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: '🌟 All' },
    { id: 'trending', label: '🔥 Trending' },
    { id: 'photo', label: '📷 Photos' },
    { id: 'video', label: '🎬 Videos' },
    { id: 'art', label: '🎨 Art' },
    { id: 'travel', label: '✈️ Travel' },
  ];

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        let q;
        if (tagFilter) {
          q = query(
            collection(db, 'posts'),
            where('hashtags', 'array-contains', tagFilter.toLowerCase()),
            orderBy('createdAt', 'desc'),
            limit(30)
          );
        } else {
          q = query(
            collection(db, 'posts'),
            orderBy('likesCount', 'desc'),
            limit(30)
          );
        }
        const snap = await getDocs(q);
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Post[]);
      } catch (err) {
        console.error('Explore error:', err);
        // Fallback: regular posts
        try {
          const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30));
          const snap = await getDocs(q);
          setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Post[]);
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [tagFilter, activeCategory]);

  // Create a mosaic grid layout
  const renderGrid = () => {
    if (posts.length === 0) return null;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
        {posts.map((post, i) => {
          const isTall = i % 5 === 0; // Every 5th post is tall
          return (
            <div
              key={post.id}
              onClick={() => navigate(`/post/${post.id}`)}
              style={{
                gridRow: isTall ? 'span 2' : 'span 1',
                aspectRatio: isTall ? 'auto' : '1',
                height: isTall ? 'auto' : undefined,
                minHeight: isTall ? '200px' : '120px',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                background: '#111',
              }}
            >
              {post.mediaUrls?.[0] ? (
                post.mediaTypes?.[0] === 'video' ? (
                  <video
                    src={post.mediaUrls[0]}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={post.mediaUrls[0]}
                    alt=""
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                  />
                )
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
                  <span style={{ fontSize: '24px' }}>📝</span>
                </div>
              )}

              {/* Overlay on hover */}
              <div
                className="explore-hover-overlay"
                style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '16px', transition: 'background 0.2s',
                }}
              >
                <div style={{ color: 'white', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ❤️ {post.likesCount}
                </div>
              </div>

              {/* Video indicator */}
              {post.mediaTypes?.[0] === 'video' && (
                <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: 'white' }}>
                  ▶
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="top-bar">
          <h1 style={{ fontWeight: 700, fontSize: '18px' }}>
            {tagFilter ? `#${tagFilter}` : 'Explore'}
          </h1>
          <button onClick={() => navigate('/search')} className="btn-ghost" style={{ padding: '8px' }}>
            <SearchIcon size={22} />
          </button>
        </div>

        {/* Tag filter banner */}
        {tagFilter && (
          <div style={{ padding: '12px 16px', background: 'rgba(108,99,255,0.1)', borderBottom: '1px solid rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hash size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>#{tagFilter}</span>
            <button onClick={() => navigate('/explore')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}>
              Clear ✕
            </button>
          </div>
        )}

        {/* Categories */}
        {!tagFilter && (
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', padding: '12px 16px', overflowX: 'auto' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                   padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                   background: activeCategory === cat.id ? 'linear-gradient(135deg, #6C63FF, #FF6584)' : 'var(--bg-card)',
                   color: activeCategory === cat.id ? 'white' : 'var(--text-secondary)',
                   fontWeight: activeCategory === cat.id ? 600 : 400,
                   fontSize: '13px', whiteSpace: 'nowrap',
                   border: activeCategory === cat.id ? 'none' : '1px solid var(--border)',
                   transition: 'all 0.2s',
                 }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Trending tags */}
        {!tagFilter && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <TrendingUp size={16} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Trending Hashtags</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['photography', 'nature', 'art', 'music', 'food', 'travel', 'fashion', 'cute'].map(tag => (
                <button
                  key={tag}
                  onClick={() => navigate(`/explore?tag=${tag}`)}
                  style={{
                    background: 'rgba(108,99,255,0.1)', color: 'var(--primary)',
                    border: '1px solid rgba(108,99,255,0.2)', borderRadius: '16px',
                    padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Post grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '1' }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>🌟</div>
            <p style={{ color: 'var(--text-muted)' }}>
              {tagFilter ? `No posts with #${tagFilter}` : 'Nothing to explore yet'}
            </p>
          </div>
        ) : (
          renderGrid()
        )}
      </div>
    </Layout>
  );
};

export default Explore;
