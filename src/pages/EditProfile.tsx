import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, AtSign, FileText, Globe, CheckCircle, XCircle } from 'lucide-react';
import { updateDoc, doc, query, collection, where, getDocs, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { db, storage, auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const EditProfile: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState(userProfile?.username || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [website, setWebsite] = useState(userProfile?.website || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(userProfile?.photoURL || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'same'>('same');

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const checkUsername = async (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setUsername(cleaned);

    if (cleaned === userProfile?.username) { setUsernameStatus('same'); return; }
    if (cleaned.length < 3) { setUsernameStatus('idle'); return; }

    setUsernameStatus('checking');
    try {
      const q = query(collection(db, 'usernames'), where('username', '==', cleaned));
      const snap = await getDocs(q);
      setUsernameStatus(snap.empty ? 'available' : 'taken');
    } catch {
      setUsernameStatus('idle');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;

    if (!displayName.trim()) { toast.error('Display name is required'); return; }
    if (username.length < 3) { toast.error('Username must be at least 3 characters'); return; }
    if (usernameStatus === 'taken') { toast.error('Username already taken'); return; }

    setLoading(true);
    try {
      let photoURL = userProfile.photoURL || '';

      // Upload photo if changed
      if (photoFile) {
        const storageRef = ref(storage, `profiles/${currentUser.uid}/avatar_${Date.now()}`);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: displayName.trim(),
        username: username.toLowerCase(),
        bio: bio.trim(),
        website: website.trim(),
        photoURL,
        updatedAt: new Date(),
      });

      // Update username doc if changed
      if (usernameStatus === 'available') {
        // Remove old username
        try {
          const oldRef = doc(db, 'usernames', userProfile.username);
          await updateDoc(oldRef, { username: username.toLowerCase(), uid: currentUser.uid });
        } catch {
          await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: currentUser.uid, username: username.toLowerCase() });
        }
      }

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser!, { displayName: displayName.trim(), photoURL });

      await refreshProfile();
      toast.success('Profile updated! ✨');
      navigate(`/profile/${username.toLowerCase()}`);
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) return null;

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="top-bar">
          <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '8px' }}>← Back</button>
          <h1 style={{ fontWeight: 700, fontSize: '16px' }}>Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #6C63FF, #FF6584)', color: 'white',
              border: 'none', borderRadius: '8px', padding: '6px 16px', fontSize: '14px',
              fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div style={{ padding: '24px 16px' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', padding: '3px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-primary)', padding: '2px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <span style={{ color: 'white', fontWeight: 800, fontSize: '30px', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {userProfile.displayName?.[0]?.toUpperCase()}
                      </span>
                  }
                </div>
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
                <Camera size={14} color="white" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          </div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              Change Profile Photo
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Display name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="input-field" style={{ paddingLeft: '42px' }} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" />
              </div>
            </div>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <AtSign size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="input-field" style={{ paddingLeft: '42px', paddingRight: '42px' }} value={username} onChange={e => checkUsername(e.target.value)} placeholder="username" />
                {usernameStatus !== 'idle' && usernameStatus !== 'same' && (
                  <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                    {usernameStatus === 'checking' && <div style={{ width: 16, height: 16, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                    {usernameStatus === 'available' && <CheckCircle size={16} color="#00C48C" />}
                    {usernameStatus === 'taken' && <XCircle size={16} color="#FF6584" />}
                  </div>
                )}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>cutebhim.com/profile/{username}</p>
            </div>

            {/* Bio */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Bio</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} style={{ position: 'absolute', left: 14, top: '14px', color: 'var(--text-muted)' }} />
                <textarea
                  className="input-field"
                  style={{ paddingLeft: '42px', minHeight: '80px', resize: 'none' }}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell people about yourself..."
                  maxLength={150}
                />
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{bio.length}/150</div>
            </div>

            {/* Website */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Website</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="url" className="input-field" style={{ paddingLeft: '42px' }} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" />
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditProfile;
