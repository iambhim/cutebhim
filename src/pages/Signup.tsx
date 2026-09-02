import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, AtSign, Mail, Lock, Calendar, Camera, CheckCircle, XCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Signup: React.FC = () => {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dob, setDob] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const checkUsername = async (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setUsername(cleaned);
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

  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { strength: score, label: 'Weak', color: '#FF3366' };
    if (score === 2) return { strength: score, label: 'Fair', color: '#FF8C00' };
    if (score === 3) return { strength: score, label: 'Good', color: '#43CFCF' };
    return { strength: score, label: 'Strong', color: '#00C48C' };
  };

  const handleProfilePic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePic(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!displayName.trim()) { setError('Please enter your full name.'); return; }
      if (!username || username.length < 3) { setError('Username must be at least 3 characters.'); return; }
      if (usernameStatus === 'taken') { setError('This username is already taken.'); return; }
      if (usernameStatus === 'checking') { setError('Please wait for username check.'); return; }
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!dob) { setError('Please enter your date of birth.'); return; }
    if (!agreed) { setError('Please accept the terms and conditions.'); return; }

    setLoading(true);
    try {
      await signup(email.trim(), password, username, displayName.trim(), dob);
      toast.success('Account created! Welcome to CuteBhim 🎉');
      navigate('/home', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const ps = getPasswordStrength();

  return (
    <div className="auth-container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 className="font-brand" style={{ fontSize: '28px', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            CuteBhim
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '14px' }}>Create your account</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? 'linear-gradient(135deg, #6C63FF, #FF6584)' : 'var(--border)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <div className="auth-card">
          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(255,101,132,0.12)', border: '1px solid rgba(255,101,132,0.3)',
              borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center',
              gap: '8px', color: '#FF6584', fontSize: '13px', marginBottom: '16px',
            }}>
              <XCircle size={14} />{error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="create-step" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Profile pic */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: profilePic ? 'none' : 'var(--bg-input)',
                    border: '2px dashed var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {profilePic
                      ? <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Camera size={24} color="var(--text-muted)" />
                    }
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Camera size={12} color="white" />
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleProfilePic} style={{ display: 'none' }} />
                </div>
              </div>

              {/* Full name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" className="input-field" style={{ paddingLeft: '42px' }} placeholder="Your full name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                </div>
              </div>

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <AtSign size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '42px', paddingRight: '42px' }}
                    placeholder="yourname"
                    value={username}
                    onChange={e => checkUsername(e.target.value)}
                  />
                  {username.length >= 3 && (
                    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                      {usernameStatus === 'checking' && <div style={{ width: 16, height: 16, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                      {usernameStatus === 'available' && <CheckCircle size={16} color="#00C48C" />}
                      {usernameStatus === 'taken' && <XCircle size={16} color="#FF6584" />}
                    </div>
                  )}
                </div>
                {usernameStatus === 'available' && <p style={{ fontSize: '11px', color: '#00C48C', marginTop: '4px' }}>✓ @{username} is available</p>}
                {usernameStatus === 'taken' && <p style={{ fontSize: '11px', color: '#FF6584', marginTop: '4px' }}>✗ @{username} is taken</p>}
              </div>

              <button type="button" className="btn-primary" onClick={handleNext}>Continue →</button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="create-step" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" className="input-field" style={{ paddingLeft: '42px' }} placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} className="input-field" style={{ paddingLeft: '42px', paddingRight: '44px' }} placeholder="Create password" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= ps.strength ? ps.color : 'var(--border)', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: ps.color, fontWeight: 600 }}>{ps.label} password</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type={showConfirm ? 'text' : 'password'} className="input-field" style={{ paddingLeft: '42px', paddingRight: '44px' }} placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p style={{ fontSize: '11px', color: '#FF6584', marginTop: '4px' }}>Passwords don't match</p>
                )}
              </div>

              {/* Date of birth */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Date of Birth</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="date" className="input-field" style={{ paddingLeft: '42px' }} value={dob} onChange={e => setDob(e.target.value)} max={new Date(Date.now() - 13 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0]} />
                </div>
              </div>

              {/* Terms */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: '2px', accentColor: 'var(--primary)', width: 16, height: 16 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  I agree to CuteBhim's <span style={{ color: 'var(--primary)' }}>Terms of Service</span> and <span style={{ color: 'var(--primary)' }}>Privacy Policy</span>
                </span>
              </label>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" style={{ width: 'auto', paddingLeft: '16px', paddingRight: '16px' }} onClick={() => { setStep(1); setError(''); }}>← Back</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Creating...</>
                  ) : 'Create Account 🎉'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
