import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Splash: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (currentUser) {
          navigate('/home', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, currentUser, navigate]);

  return (
    <div className="splash">
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '22px',
          background: 'linear-gradient(135deg, #6C63FF 0%, #FF6584 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(108,99,255,0.5)',
          marginBottom: '8px',
        }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            {/* Butterfly/flower logo */}
            <path d="M22 22 C16 16 8 14 8 20 C8 26 16 26 22 22Z" fill="rgba(255,255,255,0.9)" />
            <path d="M22 22 C28 16 36 14 36 20 C36 26 28 26 22 22Z" fill="rgba(255,255,255,0.9)" />
            <path d="M22 22 C16 28 14 36 20 36 C26 36 26 28 22 22Z" fill="rgba(255,255,255,0.7)" />
            <path d="M22 22 C28 28 30 36 24 36 C18 36 18 28 22 22Z" fill="rgba(255,255,255,0.7)" />
            <circle cx="22" cy="22" r="4" fill="white" />
          </svg>
        </div>
        <div className="splash-logo">CuteBhim</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>
          Share your world ✨
        </p>
      </div>

      {/* Loader */}
      <div style={{ position: 'absolute', bottom: '60px' }}>
        <div className="splash-loader" />
      </div>
    </div>
  );
};

export default Splash;
