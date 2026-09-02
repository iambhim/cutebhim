import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Grid3X3, Film, Tag, Settings, Share2, MessageCircle, MoreHorizontal, Link as LinkIcon } from 'lucide-react';
import { doc, collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, increment, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Post } from '../hooks/usePosts';
import PostCard from '../components/PostCard';
import CommentsModal from '../components/CommentsModal';
import toast from 'react-hot-toast';

type TabType = 'posts' | 'reels' | 'tagged';

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { currentUser, userProfile: myProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [gridView, setGridView] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const isOwnProfile = currentUser && profile?.uid === currentUser.uid;

  useEffect(() => {
    if (!username) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        // Find by username
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setProfile(snap.docs[0].data() as UserProfile);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  // Check follow status
  useEffect(() => {
    if (!currentUser || !profile) return;
    const checkFollow = async () => {
      const q = query(
        collection(db, 'followers'),
        where('followerId', '==', currentUser.uid),
        where('followingId', '==', profile.uid)
      );
      const snap = await getDocs(q);
      setIsFollowing(!snap.empty);
    };
    checkFollow();
  }, [currentUser, profile]);

  // Fetch posts
  useEffect(() => {
    if (!profile) return;
    setPostsLoading(true);
    const q = query(
      collection(db, 'posts'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Post[]);
      setPostsLoading(false);
    });
    return unsub;
  }, [profile]);

  const handleFollow = async () => {
    if (!currentUser || !myProfile || !profile) return;
    if (isOwnProfile) return;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const q = query(
          collection(db, 'followers'),
          where('followerId', '==', currentUser.uid),
          where('followingId', '==', profile.uid)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) await deleteDoc(d.ref);

        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(-1) });
        await updateDoc(doc(db, 'users', profile.uid), { followersCount: increment(-1) });
        setIsFollowing(false);
        setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount - 1 } : null);
        toast('Unfollowed');
      } else {
        // Follow
        await addDoc(collection(db, 'followers'), {
          followerId: currentUser.uid,
          followerUsername: myProfile.username,
          followingId: profile.uid,
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(1) });
        await updateDoc(doc(db, 'users', profile.uid), { followersCount: increment(1) });

        // Notification
        await addDoc(collection(db, 'notifications'), {
          type: 'follow',
          fromUserId: currentUser.uid,
          fromUsername: myProfile.username,
          fromDisplayName: myProfile.displayName,
          fromUserPhoto: myProfile.photoURL || '',
          toUserId: profile.uid,
          isRead: false,
          createdAt: serverTimestamp(),
        });

        setIsFollowing(true);
        setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
        toast.success(`Following @${profile.username}`);
      }
    } catch {
      toast.error('Action failed. Try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile?.displayName} on CuteBhim`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Profile link copied!');
      }
    } catch {
      toast.error('Failed to share');
    }
  };

  const handleToggleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    await updateDoc(postRef, {
      likedBy: isLiked
        ? posts.find(p => p.id === postId)?.likedBy.filter(id => id !== currentUser.uid) || []
        : [...(post?.likedBy || []), currentUser.uid],
      likesCount: isLiked ? (post?.likesCount ?? 1) - 1 : (post?.likesCount ?? 0) + 1,
    });
  };

  const handleToggleSave = async (postId: string, isSaved: boolean) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    await updateDoc(postRef, {
      savedBy: isSaved
        ? post?.savedBy.filter(id => id !== currentUser.uid) || []
        : [...(post?.savedBy || []), currentUser.uid],
    });
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="splash-loader" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>User not found</h3>
          <p style={{ color: 'var(--text-muted)' }}>@{username} doesn't exist</p>
        </div>
      </Layout>
    );
  }

  const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
    { id: 'posts', icon: <Grid3X3 size={20} />, label: 'Posts' },
    { id: 'reels', icon: <Film size={20} />, label: 'Reels' },
    { id: 'tagged', icon: <Tag size={20} />, label: 'Tagged' },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="top-bar">
          <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '8px', visibility: isOwnProfile ? 'hidden' : 'visible' }}>
            ←
          </button>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>@{profile.username}</span>
          <div style={{ position: 'relative' }}>
            {isOwnProfile ? (
              <button onClick={() => navigate('/settings')} className="btn-ghost" style={{ padding: '8px' }}>
                <Settings size={22} />
              </button>
            ) : (
              <button onClick={() => setShowMenu(!showMenu)} className="btn-ghost" style={{ padding: '8px' }}>
                <MoreHorizontal size={22} />
              </button>
            )}
            {showMenu && !isOwnProfile && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowMenu(false)} />
                <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', minWidth: '160px', zIndex: 20, boxShadow: 'var(--shadow)' }}>
                  <button onClick={() => { handleShare(); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px' }}>
                    <Share2 size={16} /> Share Profile
                  </button>
                  <button onClick={() => { navigate(`/messages?user=${profile.username}`); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px' }}>
                    <MessageCircle size={16} /> Message
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profile info */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
            {/* Avatar */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 86, height: 86, borderRadius: '50%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', padding: '3px', cursor: isOwnProfile ? 'pointer' : 'default' }}
                onClick={() => isOwnProfile && navigate('/edit-profile')}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-primary)', padding: '2px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {profile.photoURL
                    ? <img src={profile.photoURL} alt={profile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: '28px' }}>{profile.displayName?.[0]?.toUpperCase()}</span>
                      </div>
                  }
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '0', flex: 1 }}>
              {[
                { label: 'Posts', value: posts.length || profile.postsCount },
                { label: 'Followers', value: profile.followersCount },
                { label: 'Following', value: profile.followingCount },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', cursor: label !== 'Posts' ? 'pointer' : 'default' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>{(value || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Name & bio */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>{profile.displayName}</span>
              {profile.isAdmin && <span className="admin-badge">Admin</span>}
            </div>
            {profile.bio && <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '4px' }}>{profile.bio}</p>}
            {profile.website && (
              <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>
                <LinkIcon size={12} />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {isOwnProfile ? (
              <>
                <button className="btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={() => navigate('/edit-profile')}>
                  Edit Profile
                </button>
                <button className="btn-secondary" style={{ fontSize: '13px', padding: '8px 16px', width: 'auto' }} onClick={handleShare}>
                  <Share2 size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`follow-btn ${isFollowing ? 'following' : 'not-following'}`}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px' }}
                >
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '13px', padding: '8px 16px', flex: 1 }}
                  onClick={() => navigate(`/messages?user=${profile.username}`)}
                >
                  Message
                </button>
                <button className="btn-secondary" style={{ fontSize: '13px', padding: '8px 12px', width: 'auto' }} onClick={handleShare}>
                  <Share2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderTop: '1px solid var(--border)', display: 'flex', position: 'relative' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '14px 0', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'all 0.2s', fontSize: '13px', fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              {tab.icon}
              <span className="desktop-only">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'posts' && (
          <div>
            {postsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="splash-loader" />
              </div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ fontSize: '50px', marginBottom: '12px' }}>📸</div>
                <h3 style={{ fontWeight: 700, marginBottom: '6px' }}>{isOwnProfile ? 'Share your first post' : 'No posts yet'}</h3>
                {isOwnProfile && (
                  <button className="btn-primary" style={{ width: 'auto', marginTop: '16px', padding: '10px 24px' }} onClick={() => navigate('/create')}>
                    Create Post
                  </button>
                )}
              </div>
            ) : (
              <div className="profile-grid">
                {posts.map(post => (
                  <div key={post.id} className="profile-grid-item" onClick={() => { setSelectedPost(post); setGridView(false); }}>
                    {post.mediaTypes?.[0] === 'video' ? (
                      <video src={post.mediaUrls?.[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                    ) : post.mediaUrls?.[0] ? (
                      <img src={post.mediaUrls[0]} alt="" loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '24px' }}>📝</span>
                      </div>
                    )}
                    {post.mediaUrls && post.mediaUrls.length > 1 && (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', color: 'white' }}>
                        ⊞
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reels' && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>🎬</div>
            <p style={{ color: 'var(--text-muted)' }}>No reels yet</p>
          </div>
        )}

        {activeTab === 'tagged' && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>🏷️</div>
            <p style={{ color: 'var(--text-muted)' }}>No tagged posts</p>
          </div>
        )}
      </div>

      {/* Post detail modal */}
      {selectedPost && !gridView && (
        <div className="modal-overlay center" onClick={() => { setSelectedPost(null); setGridView(true); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', margin: '16px' }}>
            <PostCard
              post={selectedPost}
              onLike={handleToggleLike}
              onSave={handleToggleSave}
              onOpenComments={setSelectedPost}
            />
          </div>
        </div>
      )}

      {selectedPost && gridView === false && selectedPost && (
        <CommentsModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </Layout>
  );
};

export default Profile;
