import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Bell, Shield, LogOut, Moon, Sun, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { currentUser, userProfile, logout, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [section, setSection] = useState<'main' | 'password' | 'privacy' | 'notifications' | 'account'>('main');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    likes: true,
    comments: true,
    followers: true,
    messages: true,
  });
  const [privacy, setPrivacy] = useState({
    isPrivate: userProfile?.isPrivate || false,
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentPassword) { toast.error('Enter your current password'); return; }
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      // Reauthenticate first
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast.success('Password updated successfully!');
      setSection('main');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/wrong-password') toast.error('Incorrect current password');
      else toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyUpdate = async (isPrivate: boolean) => {
    if (!currentUser) return;
    setPrivacy({ isPrivate });
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { isPrivate });
      await refreshProfile();
      toast.success(isPrivate ? 'Account set to Private' : 'Account set to Public');
    } catch {
      toast.error('Failed to update privacy setting');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    const confirmed = confirm('⚠️ This will permanently delete your account and all data. This cannot be undone. Are you sure?');
    if (!confirmed) return;

    const pw = prompt('Enter your password to confirm deletion:');
    if (!pw) return;

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email!, pw);
      await reauthenticateWithCredential(currentUser, credential);
      await deleteDoc(doc(db, 'users', currentUser.uid));
      await deleteUser(currentUser);
      navigate('/login', { replace: true });
      toast.success('Account deleted');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/wrong-password') toast.error('Incorrect password');
      else toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const SettingItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onClick?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }> = ({ icon, label, sublabel, onClick, rightElement, danger }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0',
        borderBottom: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default',
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
        background: danger ? 'rgba(255,51,102,0.12)' : 'rgba(108,99,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: danger ? '#FF3366' : 'var(--primary)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: danger ? '#FF3366' : 'var(--text-primary)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{sublabel}</div>}
      </div>
      {rightElement || (onClick && <ChevronRight size={16} color="var(--text-muted)" />)}
    </div>
  );

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: checked ? 'linear-gradient(135deg, #6C63FF, #FF6584)' : 'var(--border)',
        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  );

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="top-bar">
          {section !== 'main' ? (
            <button onClick={() => setSection('main')} className="btn-ghost" style={{ padding: '8px' }}>
              ← Back
            </button>
          ) : <div />}
          <h1 style={{ fontWeight: 700, fontSize: '18px' }}>
            {section === 'main' ? 'Settings' :
             section === 'password' ? 'Change Password' :
             section === 'privacy' ? 'Privacy' :
             section === 'notifications' ? 'Notifications' : 'Account'}
          </h1>
          <div />
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* Main settings */}
          {section === 'main' && (
            <div className="animate-fade-in">
              {/* Profile card */}
              {userProfile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 0 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${userProfile.username}`)}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {userProfile.photoURL
                      ? <img src={userProfile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'white', fontWeight: 700, fontSize: '22px' }}>{userProfile.displayName?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{userProfile.displayName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>@{userProfile.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '2px' }}>View profile →</div>
                  </div>
                </div>
              )}

              {/* Account section */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px' }}>Account</div>
                <SettingItem icon={<User size={18} />} label="Edit Profile" sublabel="Update your info" onClick={() => navigate('/edit-profile')} />
                <SettingItem icon={<Lock size={18} />} label="Change Password" sublabel="Update your password" onClick={() => setSection('password')} />
              </div>

              {/* Privacy */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px' }}>Privacy</div>
                <SettingItem icon={<Shield size={18} />} label="Privacy Settings" sublabel="Control who sees your content" onClick={() => setSection('privacy')} />
              </div>

              {/* Notifications */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px' }}>Notifications</div>
                <SettingItem icon={<Bell size={18} />} label="Notification Settings" sublabel="Manage your alerts" onClick={() => setSection('notifications')} />
              </div>

              {/* Appearance */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px' }}>Appearance</div>
                <SettingItem
                  icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                  label={theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  sublabel="Toggle appearance"
                  rightElement={<Toggle checked={theme === 'dark'} onChange={toggleTheme} />}
                />
              </div>

              {/* Security */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px' }}>Security</div>
                <SettingItem icon={<LogOut size={18} />} label="Logout" sublabel="Sign out of your account" onClick={handleLogout} />
              </div>

              {/* Admin */}
              {userProfile?.isAdmin && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px' }}>Admin</div>
                  <SettingItem icon={<Shield size={18} />} label="Admin Panel" sublabel="Manage the platform" onClick={() => navigate('/admin')} />
                </div>
              )}

              {/* Danger zone */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#FF3366', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 0 4px' }}>Danger Zone</div>
                <SettingItem icon={<Trash2 size={18} />} label="Delete Account" sublabel="Permanently delete your account" onClick={handleDeleteAccount} danger />
              </div>

              {/* Version */}
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                CuteBhim v1.0.0 • Made with ❤️
              </div>
            </div>
          )}

          {/* Password section */}
          {section === 'password' && (
            <form onSubmit={handleChangePassword} className="animate-fade-in" style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} className="input-field" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" style={{ paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>New Password</label>
                <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Confirm New Password</label>
                <input type="password" className="input-field" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {/* Privacy section */}
          {section === 'privacy' && (
            <div className="animate-fade-in" style={{ paddingTop: '16px' }}>
              <SettingItem
                icon={<Eye size={18} />}
                label="Private Account"
                sublabel="Only approved followers can see your posts"
                rightElement={<Toggle checked={privacy.isPrivate} onChange={handlePrivacyUpdate} />}
              />
              <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Comment Controls</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Everyone can comment on your posts</div>
              </div>
              <div style={{ padding: '16px 0' }}>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Blocked Users</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage users you've blocked</div>
              </div>
            </div>
          )}

          {/* Notifications section */}
          {section === 'notifications' && (
            <div className="animate-fade-in" style={{ paddingTop: '16px' }}>
              {[
                { key: 'likes' as const, label: 'Likes', sublabel: 'When someone likes your post' },
                { key: 'comments' as const, label: 'Comments', sublabel: 'When someone comments on your post' },
                { key: 'followers' as const, label: 'New Followers', sublabel: 'When someone follows you' },
                { key: 'messages' as const, label: 'Messages', sublabel: 'When you receive a message' },
              ].map(item => (
                <SettingItem
                  key={item.key}
                  icon={<Bell size={18} />}
                  label={item.label}
                  sublabel={item.sublabel}
                  rightElement={
                    <Toggle
                      checked={notifSettings[item.key]}
                      onChange={v => setNotifSettings(prev => ({ ...prev, [item.key]: v }))}
                    />
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
