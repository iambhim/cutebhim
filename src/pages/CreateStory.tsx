import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image, Video, Type, MapPin, Loader } from 'lucide-react';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const CreateStory: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [textEnabled, setTextEnabled] = useState(false);
  const [textColor, setTextColor] = useState('#ffffff');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if (!currentUser || !userProfile) return;
    if (!mediaFile && !text.trim()) {
      toast.error('Add a photo, video, or text');
      return;
    }

    setLoading(true);
    try {
      let mediaUrl = '';

      if (mediaFile) {
        const ext = mediaType === 'video' ? 'mp4' : 'jpg';
        const storageRef = ref(storage, `stories/${currentUser.uid}/${Date.now()}.${ext}`);
        await uploadBytes(storageRef, mediaFile);
        mediaUrl = await getDownloadURL(storageRef);
      }

      // Stories expire after 24 hours
      const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

      await addDoc(collection(db, 'stories'), {
        userId: currentUser.uid,
        username: userProfile.username,
        displayName: userProfile.displayName,
        userPhoto: userProfile.photoURL || '',
        mediaUrl,
        mediaType,
        text: text.trim(),
        textColor,
        location: location.trim(),
        viewedBy: [],
        expiresAt,
        createdAt: serverTimestamp(),
      });

      toast.success('Story posted! 🌟');
      navigate('/home');
    } catch (err) {
      console.error('Story error:', err);
      toast.error('Failed to post story');
    } finally {
      setLoading(false);
    }
  };

  const colors = ['#ffffff', '#FF3366', '#6C63FF', '#FFD700', '#43CFCF', '#FF8C00'];

  return (
    <Layout>
      <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="top-bar">
          <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '8px' }}>
            <ArrowLeft size={22} />
          </button>
          <h1 style={{ fontWeight: 700, fontSize: '16px' }}>Create Story</h1>
          <button
            onClick={handlePublish}
            disabled={loading || (!mediaFile && !text.trim())}
            style={{
              background: !loading && (mediaFile || text.trim()) ? 'linear-gradient(135deg, #6C63FF, #FF6584)' : 'var(--border)',
              color: !loading && (mediaFile || text.trim()) ? 'white' : 'var(--text-muted)',
              border: 'none', borderRadius: '8px', padding: '6px 16px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {loading ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} />Posting...</> : 'Share'}
          </button>
        </div>

        {/* Preview */}
        {mediaPreview ? (
          <div style={{ position: 'relative', margin: '0', background: '#000', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mediaType === 'video' ? (
              <video src={mediaPreview} controls style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
            ) : (
              <img src={mediaPreview} alt="" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block' }} />
            )}

            {textEnabled && text && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                color: textColor, fontSize: '24px', fontWeight: 700, textAlign: 'center',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)', padding: '8px', maxWidth: '90%',
                wordBreak: 'break-word',
              }}>
                {text}
              </div>
            )}

            {location && (
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontSize: '13px' }}>
                <MapPin size={12} /> {location}
              </div>
            )}

            {/* Remove media */}
            <button
              onClick={() => { setMediaFile(null); setMediaPreview(null); }}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', border: 'none',
                cursor: 'pointer', color: 'white', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <div
            style={{
              margin: '24px 16px', border: '2px dashed var(--border)', borderRadius: '20px',
              padding: '60px 24px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px', cursor: 'pointer', background: 'var(--bg-card)',
            }}
            onClick={() => fileRef.current?.click()}
          >
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image size={26} color="var(--primary)" />
              </div>
              <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(255,101,132,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={26} color="var(--secondary)" />
              </div>
            </div>
            <p style={{ fontWeight: 600, textAlign: 'center' }}>Tap to add photo or video</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Stories disappear after 24 hours</p>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} />

        {/* Tools */}
        <div style={{ padding: '16px' }}>
          {/* Text overlay */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Type size={14} /> Text Overlay
              </label>
              <button
                onClick={() => setTextEnabled(!textEnabled)}
                style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: textEnabled ? 'linear-gradient(135deg, #6C63FF, #FF6584)' : 'var(--border)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: textEnabled ? 18 : 2, transition: 'left 0.3s' }} />
              </button>
            </div>
            {textEnabled && (
              <div>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Add text to your story..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  maxLength={200}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: color,
                        border: textColor === color ? '3px solid var(--primary)' : '2px solid var(--border)',
                        cursor: 'pointer', transition: 'border 0.2s',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> Location
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Add location..."
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          {/* Story info */}
          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(108,99,255,0.08)', borderRadius: '12px', border: '1px solid rgba(108,99,255,0.15)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              🕐 Stories are visible for <strong>24 hours</strong>. Followers can view and react to your story.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateStory;
