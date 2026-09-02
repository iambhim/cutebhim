import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Story {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: { toDate(): Date } | null;
  expiresAt: Timestamp;
  viewedBy: string[];
}

interface StoryGroup {
  userId: string;
  username: string;
  displayName: string;
  userPhoto: string;
  stories: Story[];
  hasUnviewed: boolean;
}

const StoriesBar: React.FC<{ onStoryClick: (userId: string) => void }> = ({ onStoryClick }) => {
  const { currentUser, userProfile } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch stories from last 24 hours
    const now = Timestamp.now();

    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const stories = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Story[];

      // Group by user
      const groups: Record<string, StoryGroup> = {};
      stories.forEach(story => {
        if (!groups[story.userId]) {
          groups[story.userId] = {
            userId: story.userId,
            username: story.username,
            displayName: story.displayName,
            userPhoto: story.userPhoto,
            stories: [],
            hasUnviewed: false,
          };
        }
        groups[story.userId].stories.push(story);
        if (!story.viewedBy?.includes(currentUser?.uid || '')) {
          groups[story.userId].hasUnviewed = true;
        }
      });

      // Sort: own story first, then others
      const sorted = Object.values(groups).sort((a, b) => {
        if (a.userId === currentUser?.uid) return -1;
        if (b.userId === currentUser?.uid) return 1;
        return a.hasUnviewed ? -1 : 1;
      });

      setStoryGroups(sorted);
    }, () => {
      // Silently handle errors (often permission issues before auth)
    });

    return unsub;
  }, [currentUser?.uid]);

  const hasOwnStory = storyGroups.some(g => g.userId === currentUser?.uid);

  return (
    <div className="stories-container" style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Add story */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '64px', cursor: 'pointer' }}
        onClick={() => navigate('/create-story')}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: hasOwnStory ? 'linear-gradient(135deg, #6C63FF, #FF6584)' : 'var(--bg-input)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: hasOwnStory ? 'none' : '2px dashed var(--border-light)',
            overflow: 'hidden',
          }}>
            {userProfile?.photoURL && hasOwnStory ? (
              <div style={{ padding: '2.5px', width: '100%', height: '100%' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-primary)', padding: '2px', overflow: 'hidden' }}>
                  <img src={userProfile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                </div>
              </div>
            ) : userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '20px' }}>{userProfile?.displayName?.[0]}</span>
              </div>
            )}
          </div>
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 20, height: 20, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-primary)',
          }}>
            <Plus size={12} color="white" strokeWidth={3} />
          </div>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Your Story
        </span>
      </div>

      {/* Other stories */}
      {storyGroups.filter(g => g.userId !== currentUser?.uid).map(group => (
        <div
          key={group.userId}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '64px', cursor: 'pointer' }}
          onClick={() => onStoryClick(group.userId)}
        >
          <div className={group.hasUnviewed ? 'story-ring' : 'story-ring-viewed'}>
            <div style={{ width: 55, height: 55, borderRadius: '50%', background: 'var(--bg-primary)', padding: '2px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {group.userPhoto
                ? <img src={group.userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{group.displayName?.[0]}</span>
                  </div>
              }
            </div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.username}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StoriesBar;
