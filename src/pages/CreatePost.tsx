import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image, Video, X, MapPin, Tag, ChevronRight, Loader } from 'lucide-react';
import { addDoc, collection, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

interface MediaItem {
  file: File;
  preview: string;
  type: 'image' | 'video';
  aspectRatio?: number;
}

const CreatePost: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'media' | 'details'>('media');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const extractHashtags = (text: string) => {
    const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
    return matches.map(h => h.slice(1).toLowerCase());
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: MediaItem[] = [];
    let processed = 0;

    files.slice(0, 10).forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const preview = URL.createObjectURL(file);
      const item: MediaItem = {
        file,
        preview,
        type: isVideo ? 'video' : 'image',
      };

      if (!isVideo) {
        const img = new window.Image();
        img.onload = () => {
          item.aspectRatio = img.naturalHeight / img.naturalWidth;
          processed++;
          if (processed === files.slice(0, 10).length) {
            setMediaItems(prev => [...prev, ...newItems]);
          }
        };
        img.src = preview;
      } else {
        processed++;
        if (processed === files.slice(0, 10).length) {
          setMediaItems(prev => [...prev, ...newItems]);
        }
      }

      newItems.push(item);
    });

    if (files.length > 10) toast.error('Maximum 10 files allowed');
  };

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new window.Image();
      img.onload = () => {
        const maxW = 1080;
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handlePublish = async () => {
    if (!currentUser || !userProfile) return;
    if (mediaItems.length === 0 && !caption.trim()) {
      toast.error('Add a photo, video, or caption');
      return;
    }

    setLoading(true);
    try {
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      const total = mediaItems.length;

      for (let i = 0; i < total; i++) {
        const item = mediaItems[i];
        const ext = item.type === 'video' ? 'mp4' : 'jpg';
        const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${i}.${ext}`);

        let uploadFile: File | Blob = item.file;
        if (item.type === 'image') {
          uploadFile = await compressImage(item.file);
        }

        await uploadBytes(storageRef, uploadFile);
        const url = await getDownloadURL(storageRef);
        mediaUrls.push(url);
        mediaTypes.push(item.type);
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      const hashtags = extractHashtags(caption);

      const postData = {
        userId: currentUser.uid,
        username: userProfile.username,
        displayName: userProfile.displayName,
        userPhoto: userProfile.photoURL || '',
        caption: caption.trim(),
        hashtags,
        mediaUrls,
        mediaTypes,
        location: location.trim() || null,
        likedBy: [],
        savedBy: [],
        commentsCount: 0,
        likesCount: 0,
        sharesCount: 0,
        allowComments,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'posts'), postData);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        postsCount: increment(1),
      });

      toast.success('Post published! 🎉');
      navigate('/home');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to publish post. Try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 500, margin: '0 auto', minHeight: '100vh', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="top-bar">
          <button onClick={() => step === 'details' ? setStep('media') : navigate(-1)} className="btn-ghost" style={{ padding: '8px' }}>
            <ArrowLeft size={22} />
          </button>
          <h1 style={{ fontWeight: 700, fontSize: '16px' }}>
            {step === 'media' ? 'New Post' : 'Post Details'}
          </h1>
          {step === 'media' ? (
            <button
              onClick={() => mediaItems.length > 0 ? setStep('details') : null}
              style={{
                background: mediaItems.length > 0 ? 'linear-gradient(135deg, #6C63FF, #FF6584)' : 'var(--border)',
                color: mediaItems.length > 0 ? 'white' : 'var(--text-muted)',
                border: 'none', borderRadius: '8px', padding: '6px 16px',
                fontSize: '14px', fontWeight: 600, cursor: mediaItems.length > 0 ? 'pointer' : 'default',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
                color: 'white', border: 'none', borderRadius: '8px',
                padding: '6px 16px', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {loading ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} />Sharing...</> : 'Share'}
            </button>
          )}
        </div>

        {/* Upload progress */}
        {loading && (
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(135deg, #6C63FF, #FF6584)', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Step 1: Media selection */}
        {step === 'media' && (
          <div className="create-step">
            {/* Upload area */}
            {mediaItems.length === 0 ? (
              <div
                style={{
                  margin: '24px 16px',
                  border: '2px dashed var(--border)',
                  borderRadius: '20px',
                  padding: '60px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'var(--bg-card)',
                }}
                onClick={() => fileRef.current?.click()}
              >
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '16px', background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image size={28} color="var(--primary)" />
                  </div>
                  <div style={{ width: 60, height: 60, borderRadius: '16px', background: 'rgba(255,101,132,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Video size={28} color="var(--secondary)" />
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Choose Photos or Videos</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tap to select up to 10 files</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>Supports portrait, landscape, square & video</p>
                </div>
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 32px' }}>
                  Select Media
                </button>
              </div>
            ) : (
              <div>
                {/* Preview grid */}
                <div style={{ display: 'grid', gridTemplateColumns: mediaItems.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: '4px', margin: '4px' }}>
                  {mediaItems.map((item, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: mediaItems.length === 1 ? 'auto' : '1', overflow: 'hidden', borderRadius: '12px', background: '#000' }}>
                      {item.type === 'video' ? (
                        <video src={item.preview} style={{ width: '100%', height: '100%', objectFit: mediaItems.length === 1 ? 'contain' : 'cover' }} muted />
                      ) : (
                        <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: mediaItems.length === 1 ? 'contain' : 'cover' }} />
                      )}
                      <button
                        onClick={() => removeMedia(i)}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.7)', border: 'none',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={14} color="white" />
                      </button>
                      <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px', color: 'white' }}>
                        {item.type === 'video' ? '🎬' : '📷'} {i + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add more */}
                {mediaItems.length < 10 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      margin: '12px 16px', width: 'calc(100% - 32px)',
                      background: 'var(--bg-input)', border: '2px dashed var(--border)',
                      borderRadius: '12px', padding: '14px', cursor: 'pointer',
                      color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '8px', fontSize: '14px',
                    }}
                  >
                    <Image size={18} /> Add more ({10 - mediaItems.length} left)
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && (
          <div className="create-step" style={{ padding: '16px' }}>
            {/* Preview thumbnail */}
            {mediaItems.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: 80, height: 80, borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                  {mediaItems[0].type === 'video' ? (
                    <video src={mediaItems[0].preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={mediaItems[0].preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{userProfile?.displayName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{userProfile?.username}</div>
                  {mediaItems.length > 1 && <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px' }}>+{mediaItems.length - 1} more</div>}
                </div>
              </div>
            )}

            {/* Caption */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Caption</label>
              <textarea
                className="input-field"
                style={{ resize: 'none', minHeight: '120px', borderRadius: '16px', lineHeight: 1.6 }}
                placeholder="Write a caption... Use #hashtags and @mentions"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={2200}
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {caption.length}/2200
              </div>
            </div>

            {/* Location */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MapPin size={18} color="var(--primary)" />
                  <input
                    type="text"
                    placeholder="Add location..."
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '14px', width: '100%' }}
                  />
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </div>

            {/* Tag users */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Tag size={18} color="var(--primary)" />
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Tag people</span>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </div>

            {/* Settings */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Allow Comments</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Let others comment on this post</div>
                </div>
                <button
                  onClick={() => setAllowComments(!allowComments)}
                  style={{
                    width: 44, height: 26, borderRadius: 13,
                    background: allowComments ? 'linear-gradient(135deg, #6C63FF, #FF6584)' : 'var(--border)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.3s',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3, transition: 'left 0.3s',
                    left: allowComments ? 21 : 3,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>
            </div>

            {/* Hashtag suggestions */}
            {caption.includes('#') && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Detected hashtags:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {extractHashtags(caption).map((tag, i) => (
                    <span key={i} style={{ background: 'rgba(108,99,255,0.12)', color: 'var(--primary)', borderRadius: '8px', padding: '4px 10px', fontSize: '13px', fontWeight: 500 }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CreatePost;
