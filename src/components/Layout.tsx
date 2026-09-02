import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, PlusSquare, Film, User, Search, Bell, MessageCircle, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const navItems = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/explore', icon: Compass, label: 'Explore' },
    { to: '/create', icon: PlusSquare, label: 'Create' },
    { to: '/reels', icon: Film, label: 'Reels' },
    { to: `/profile/${userProfile?.username || ''}`, icon: User, label: 'Profile' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      <aside className="sidebar desktop-only">
        {/* Logo */}
        <div style={{ padding: '8px 12px 24px', cursor: 'pointer' }} onClick={() => navigate('/home')}>
          <span className="font-brand" style={{
            fontSize: '26px',
            background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>CuteBhim</span>
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 14px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
                transition: 'all 0.2s',
                fontSize: '15px',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {label}
                  {label === 'Create' && (
                    <div style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: '8px', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}

          <NavLink to="/search" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px',
            borderRadius: '12px', textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-primary)',
            fontWeight: isActive ? 600 : 400,
            background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
            transition: 'all 0.2s', fontSize: '15px',
          })}>
            {({ isActive }) => <><Search size={22} strokeWidth={isActive ? 2.5 : 1.8} />Search</>}
          </NavLink>

          <NavLink to="/notifications" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px',
            borderRadius: '12px', textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-primary)',
            fontWeight: isActive ? 600 : 400,
            background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
            transition: 'all 0.2s', fontSize: '15px',
          })}>
            {({ isActive }) => (
              <>
                <div style={{ position: 'relative' }}>
                  <Bell size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {unreadCount > 0 && (
                    <div className="badge" style={{ top: -6, right: -6, fontSize: '9px' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                Notifications
              </>
            )}
          </NavLink>

          <NavLink to="/messages" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px',
            borderRadius: '12px', textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-primary)',
            fontWeight: isActive ? 600 : 400,
            background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
            transition: 'all 0.2s', fontSize: '15px',
          })}>
            {({ isActive }) => <><MessageCircle size={22} strokeWidth={isActive ? 2.5 : 1.8} />Messages</>}
          </NavLink>

          <NavLink to="/settings" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px',
            borderRadius: '12px', textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-primary)',
            fontWeight: isActive ? 600 : 400,
            background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
            transition: 'all 0.2s', fontSize: '15px',
          })}>
            {({ isActive }) => <><Settings size={22} strokeWidth={isActive ? 2.5 : 1.8} />Settings</>}
          </NavLink>
        </nav>

        {/* Bottom: theme + logout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <button onClick={toggleTheme} className="btn-ghost" style={{ justifyContent: 'flex-start' }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={handleLogout} className="btn-ghost" style={{ justifyContent: 'flex-start', color: '#FF6584' }}>
            <LogOut size={20} />
            Logout
          </button>

          {/* Profile mini */}
          {userProfile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', marginTop: '8px', borderRadius: '12px', background: 'var(--bg-card)', cursor: 'pointer' }}
              onClick={() => navigate(`/profile/${userProfile.username}`)}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {userProfile.photoURL
                  ? <img src={userProfile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>{userProfile.displayName?.[0]?.toUpperCase()}</span>
                }
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile.displayName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{userProfile.username}</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content" style={{ minHeight: '100vh' }}>
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav mobile-only">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
          >
            {({ isActive }) => (
              <>
                {label === 'Create' ? (
                  <div style={{
                    width: 36, height: 36, borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} color="white" strokeWidth={2} />
                  </div>
                ) : label === 'Profile' && userProfile?.photoURL ? (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                    overflow: 'hidden',
                    transition: 'border 0.2s',
                  }}>
                    <img src={userProfile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
                    {label === 'Notifications' && unreadCount > 0 && (
                      <div className="badge">{unreadCount > 9 ? '9+' : unreadCount}</div>
                    )}
                  </div>
                )}
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
