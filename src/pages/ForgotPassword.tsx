import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ForgotPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email'); return; }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/user-not-found') toast.error('No account found with this email.');
      else if (code === 'auth/invalid-email') toast.error('Invalid email address.');
      else toast.error('Failed to send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 className="font-brand" style={{ fontSize: '28px', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            CuteBhim
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '14px' }}>Reset your password</p>
        </div>

        <div className="auth-card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '60px', marginBottom: '16px' }}>📧</div>
              <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Check your inbox!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                We sent a password reset link to <strong>{email}</strong>. Click the link to reset your password.
              </p>
              <Link to="/login" style={{ display: 'block', marginTop: '24px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                ← Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" className="input-field" style={{ paddingLeft: '42px' }} placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Sending...</>
                ) : 'Send Reset Link'}
              </button>

              <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
