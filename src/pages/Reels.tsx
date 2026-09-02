import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Play, UserPlus } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

interface Reel {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  userPhoto: string;
  videoUrl: string;
  caption: string;
  likedBy: string[];
  savedBy: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  music?: string;
  createdAt: { toDate(): Date } | null;
}

const ReelItem: React.FC<{
  reel: Reel;
  isActive: boolean;
  onLike: (id: string, isLiked: boolean) => void;
  onSave: (id: string, isSaved: boolean) => void;
}> = ({ reel, isActive, onLike, onSave }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const isLiked = currentUser ? reel.likedBy.includes(currentUser.uid) : false;
  const isSaved = currentUser ? reel.savedBy.includes(currentUser.uid) : false;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
      setPlaying(false);
    } else {
      video.play();
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setProgress((video.currentTime / video.duration) * 100 || 0);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/reel/${reel.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${reel.displayName}'s Reel on CuteBhim`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!');
      }
    } catch {
      toast.error('Could not share');
    }
  };

  return (
    <div className="reel-item" style={{ position: 'relative' }} onClick={togglePlay}>
      {/* Video */}
      {reel.videoUrl ? (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          loop
          muted={muted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>🎬</div>
            <p style={{ fontWeight: 700, fontSize: '18px' }}>Demo Reel</p>
            <p style={{ opacity: 0.7, fontSize: '14px', marginTop: '8px' }}>Upload real videos to see reels</p>
          </div>
        </div>
      )}

      {/* Play/pause overlay */}
      {!playing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <Play size={32} color="white" fill="white" />
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.2)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'white', transition: 'width 0.1s linear' }} />
      </div>

      {/* Right actions */}
      <div style={{
        position: 'absolute', right: 12, bottom: '100px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div
            style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid white', overflow: 'hidden', cursor: 'pointer', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => navigate(`/profile/${reel.username}`)}
          >
            {reel.userPhoto
              ? <img src={reel.userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontWeight: 700, fontSize: '16px' }}>{reel.displayName?.[0]}</span>
            }
          </div>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-12px', border: '2px solid black', cursor: 'pointer' }}>
            <UserPlus size={10} color="white" />
          </div>
        </div>

        {/* Like */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => onLike(reel.id, isLiked)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <Heart size={28} color={isLiked ? '#FF3366' : 'white'} fill={isLiked ? '#FF3366' : 'none'} />
          </button>
          <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>{(reel.likesCount || 0).toLocaleString()}</span>
        </div>

        {/* Comment */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <MessageCircle size={28} color="white" />
          </button>
          <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>{reel.commentsCount || 0}</span>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => onSave(reel.id, isSaved)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <Bookmark size={28} color={isSaved ? 'var(--primary)' : 'white'} fill={isSaved ? 'var(--primary)' : 'none'} />
          </button>
        </div>

        {/* Share */}
        <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <Share2 size={28} color="white" />
        </button>

        {/* Mute */}
        <button onClick={() => setMuted(!muted)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          {muted ? <VolumeX size={24} color="white" /> : <Volume2 size={24} color="white" />}
        </button>
      </div>

      {/* Bottom info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 60,
        padding: '60px 16px 20px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <div onClick={() => navigate(`/profile/${reel.username}`)} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', pointerEvents: 'all' }}>
          <span style={{ fontWeight: 700, color: 'white', fontSize: '15px' }}>@{reel.username}</span>
        </div>
        {reel.caption && (
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', lineHeight: 1.5, marginBottom: '8px' }}>
            {reel.caption}
          </p>
        )}
        {reel.music && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
            <span style={{ animation: 'spin 4s linear infinite', display: 'inline-block' }}>🎵</span>
            {reel.music}
          </div>
        )}
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '4px' }}>
          {(reel.viewsCount || 0).toLocaleString()} views
        </div>
      </div>
    </div>
  );
};

const Reels: React.FC = () => {
  const { currentUser } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchReels = async () => {
      setLoading(true);
      try {
        // First try reels collection
        const reelsQ = query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(20));
        const snap = await getDocs(reelsQ);
        let data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Reel[];

        // Also get video posts from posts collection
        if (data.length < 5) {
          const postsQ = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
          const postsSnap = await getDocs(postsQ);
          const videoPosts = postsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((p: Record<string, unknown>) => (p.mediaTypes as string[])?.[0] === 'video')
            .map((p: Record<string, unknown>) => ({
              id: p.id as string,
              userId: p.userId as string,
              username: p.username as string,
              displayName: p.displayName as string,
              userPhoto: p.userPhoto as string,
              videoUrl: (p.mediaUrls as string[])?.[0] || '',
              caption: p.caption as string,
              likedBy: (p.likedBy as string[]) || [],
              savedBy: (p.savedBy as string[]) || [],
              likesCount: (p.likesCount as number) || 0,
              commentsCount: (p.commentsCount as number) || 0,
              viewsCount: 0,
              createdAt: p.createdAt as { toDate(): Date } | null,
            })) as Reel[];
          data = [...data, ...videoPosts];
        }

        // Add demo reels if empty
        if (data.length === 0) {
          data = [{
            id: 'demo1',
            userId: 'demo',
            username: 'cutebhim_official',
            displayName: 'CuteBhim Official',
            userPhoto: '',
            videoUrl: '',
            caption: '🎬 Upload your first reel! Go to Create Post and select a video.',
            likedBy: [],
            savedBy: [],
            likesCount: 42,
            commentsCount: 8,
            viewsCount: 1234,
            music: '♪ Original Audio',
            createdAt: null,
          }];
        }

        setReels(data);
      } catch (err) {
        console.error('Reels error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReels();
  }, []);

  // Scroll detection for active reel
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = itemRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      { threshold: 0.6 }
    );

    itemRefs.current.forEach(ref => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, [reels]);

  const handleLike = async (reelId: string, isLiked: boolean) => {
    if (!currentUser) return;
    const ref = doc(db, 'reels', reelId);
    try {
      await updateDoc(ref, {
        likedBy: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        likesCount: isLiked
          ? (reels.find(r => r.id === reelId)?.likesCount ?? 1) - 1
          : (reels.find(r => r.id === reelId)?.likesCount ?? 0) + 1,
      });
    } catch {}
    setReels(prev => prev.map(r => {
      if (r.id !== reelId) return r;
      return {
        ...r,
        likedBy: isLiked ? r.likedBy.filter(id => id !== currentUser.uid) : [...r.likedBy, currentUser.uid],
        likesCount: isLiked ? r.likesCount - 1 : r.likesCount + 1,
      };
    }));
  };

  const handleSave = async (reelId: string, isSaved: boolean) => {
    if (!currentUser) return;
    const ref = doc(db, 'reels', reelId);
    try {
      await updateDoc(ref, {
        savedBy: isSaved ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      });
    } catch {}
    setReels(prev => prev.map(r => {
      if (r.id !== reelId) return r;
      return {
        ...r,
        savedBy: isSaved ? r.savedBy.filter(id => id !== currentUser.uid) : [...r.savedBy, currentUser.uid],
      };
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
          <div className="splash-loader" />
          <p style={{ color: 'var(--text-muted)' }}>Loading reels...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        ref={containerRef}
        style={{
          height: '100vh',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          background: '#000',
        }}
        className="no-scrollbar"
      >
        {reels.map((reel, i) => (
          <div
            key={reel.id}
            ref={el => { itemRefs.current[i] = el; }}
            style={{ height: '100vh', scrollSnapAlign: 'start', flexShrink: 0 }}
          >
            <ReelItem
              reel={reel}
              isActive={i === activeIndex}
              onLike={handleLike}
              onSave={handleSave}
            />
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Reels;
