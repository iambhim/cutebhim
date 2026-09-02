import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Demo posts to show when Firebase is not configured or feed is empty
const DEMO_POSTS = [
  {
    id: 'demo1',
    userId: 'demo_user1',
    username: 'cutebhim_official',
    displayName: 'CuteBhim Official ✨',
    userPhoto: '',
    caption: '🎉 Welcome to CuteBhim! The next-gen social platform where creativity meets community. Share your world, connect with amazing people! #CuteBhim #SocialMedia #NewApp',
    hashtags: ['CuteBhim', 'SocialMedia', 'NewApp'],
    mediaUrls: [],
    mediaTypes: ['image' as const],
    likedBy: ['u1', 'u2', 'u3'],
    savedBy: [],
    likesCount: 1247,
    commentsCount: 89,
    sharesCount: 34,
    allowComments: true,
    createdAt: null,
    gradient: 'linear-gradient(135deg, #6C63FF 0%, #FF6584 100%)',
    emoji: '🦋',
  },
  {
    id: 'demo2',
    userId: 'demo_user2',
    username: 'nature_lover',
    displayName: 'Nature Lover 🌿',
    userPhoto: '',
    caption: '🌅 Golden hour magic at the mountains. There is something truly special about the peace you find in nature. #Sunset #Mountains #Photography #Nature',
    hashtags: ['Sunset', 'Mountains', 'Photography', 'Nature'],
    mediaUrls: [],
    mediaTypes: ['image' as const],
    likedBy: [],
    savedBy: [],
    likesCount: 4521,
    commentsCount: 142,
    sharesCount: 67,
    allowComments: true,
    createdAt: null,
    gradient: 'linear-gradient(135deg, #FF6584 0%, #FFD700 100%)',
    emoji: '🌄',
  },
  {
    id: 'demo3',
    userId: 'demo_user3',
    username: 'foodie_vibes',
    displayName: 'Foodie Vibes 🍕',
    userPhoto: '',
    caption: '🍕 Made this homemade margherita pizza from scratch! The secret is in the dough - 72 hour cold ferment makes it perfect. Recipe in bio! #Foodie #Pizza #Cooking #HomeCooking',
    hashtags: ['Foodie', 'Pizza', 'Cooking'],
    mediaUrls: [],
    mediaTypes: ['image' as const],
    likedBy: [],
    savedBy: [],
    likesCount: 2893,
    commentsCount: 203,
    sharesCount: 88,
    allowComments: true,
    createdAt: null,
    gradient: 'linear-gradient(135deg, #FF8C00 0%, #FF3366 100%)',
    emoji: '🍕',
  },
];

interface DemoPostCardProps {
  post: typeof DEMO_POSTS[0];
}

const DemoPostCard: React.FC<DemoPostCardProps> = ({ post }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(post.likesCount);
  const handleLike = () => {
    setLiked(!liked);
    setLikes(l => liked ? l - 1 : l + 1);
  };

  const formatCaption = (caption: string) => {
    return caption.split(/(\s+)/).map((part, i) => {
      if (part.startsWith('#')) return <span key={i} style={{ color: 'var(--primary)', fontWeight: 500 }}>{part}</span>;
      return part;
    });
  };

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '10px' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: post.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '18px' }}>{post.emoji}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{post.displayName}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{post.username}</div>
        </div>
        <button style={{ background: 'linear-gradient(135deg, #6C63FF, #FF6584)', color: 'white', border: 'none', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          Follow
        </button>
      </div>

      {/* Media placeholder */}
      <div style={{ width: '100%', height: 320, background: post.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ fontSize: '80px', filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.3))' }}>{post.emoji}</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
        <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>📸 Connect Firebase to see real posts</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
          <button
            onClick={handleLike}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
          >
            <Heart size={22} fill={liked ? '#FF3366' : 'none'} color={liked ? '#FF3366' : 'var(--text-primary)'} style={{ transition: 'all 0.2s' }} />
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <MessageCircle size={22} color="var(--text-primary)" />
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <Send size={22} color="var(--text-primary)" />
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setSaved(!saved)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <Bookmark size={22} fill={saved ? 'var(--primary)' : 'none'} color={saved ? 'var(--primary)' : 'var(--text-primary)'} />
          </button>
        </div>

        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{likes.toLocaleString()} likes</div>
        <div style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: '4px' }}>
          <span style={{ fontWeight: 600 }}>{post.displayName}</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{formatCaption(post.caption)}</span>
        </div>
        {post.commentsCount > 0 && (
          <button style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
            View all {post.commentsCount} comments
          </button>
        )}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '8px' }}>Just now</div>
      </div>
    </div>
  );
};

interface DemoFeedProps {
  showWelcome?: boolean;
}

const DemoFeed: React.FC<DemoFeedProps> = ({ showWelcome }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  return (
    <div>
      {/* Welcome card */}
      {showWelcome && (
        <div style={{ margin: '12px 16px', background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(255,101,132,0.12))', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🦋</div>
          <h2 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>
            Welcome to CuteBhim, {userProfile?.displayName?.split(' ')[0] || 'friend'}! 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
            Your feed is empty. Start by creating your first post or following some amazing creators!
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px', fontSize: '14px' }} onClick={() => navigate('/create')}>
              📸 Create Post
            </button>
            <button className="btn-secondary" style={{ width: 'auto', padding: '10px 24px', fontSize: '14px' }} onClick={() => navigate('/explore')}>
              🌟 Explore
            </button>
          </div>
        </div>
      )}

      {/* Firebase setup notice */}
      <div style={{ margin: '12px 16px', background: 'rgba(67,207,207,0.08)', border: '1px solid rgba(67,207,207,0.2)', borderRadius: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ fontSize: '20px', flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#43CFCF', marginBottom: '4px' }}>Connect Firebase to activate all features</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Create a .env file with your Firebase credentials to enable authentication, real posts, stories, messages and more. See the setup guide below.
            </div>
            <button
              onClick={() => {
                const guide = document.getElementById('setup-guide');
                guide?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#43CFCF', fontSize: '12px', fontWeight: 600, padding: 0 }}
            >
              View Setup Guide →
            </button>
          </div>
        </div>
      </div>

      {/* Demo posts */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          ✨ Demo Posts — Connect Firebase for real content
        </div>
        {DEMO_POSTS.map(post => (
          <DemoPostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Setup guide */}
      <div id="setup-guide" style={{ margin: '24px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px' }}>
        <h3 style={{ fontWeight: 800, fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔥 Firebase Setup Guide
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { step: '1', title: 'Create Firebase Project', desc: 'Go to console.firebase.google.com and create a new project called "cutebhim"' },
            { step: '2', title: 'Enable Authentication', desc: 'Build → Authentication → Sign-in methods → Enable Email/Password and Google' },
            { step: '3', title: 'Create Firestore Database', desc: 'Build → Firestore Database → Create database in production mode' },
            { step: '4', title: 'Enable Storage', desc: 'Build → Storage → Get started' },
            { step: '5', title: 'Get Config', desc: 'Project Settings → General → Your apps → Add Web App → Copy the config' },
            { step: '6', title: 'Create .env file', desc: 'Copy .env.example to .env and fill in your Firebase credentials' },
            { step: '7', title: 'Deploy Rules', desc: 'Copy the firestore.rules and storage.rules from the public folder to Firebase console' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', color: 'white', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.step}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DemoFeed;
