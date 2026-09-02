import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Flag, BarChart2, Trash2, Ban, Shield, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { UserProfile } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  type: 'post' | 'user' | 'comment';
  postId?: string;
  reportedUserId: string;
  reportedBy: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: { toDate(): Date } | null;
}

const Admin: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'posts' | 'reports'>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ users: 0, posts: 0, reports: 0, stories: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      navigate('/home', { replace: true });
      return;
    }
    fetchData();
  }, [userProfile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];
      setUsers(usersData);

      // Reports
      const reportsQ = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50));
      const reportsSnap = await getDocs(reportsQ);
      setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Report[]);

      // Posts count
      const postsSnap = await getDocs(collection(db, 'posts'));

      setStats({
        users: usersSnap.size,
        posts: postsSnap.size,
        reports: reportsSnap.docs.filter(d => d.data().status === 'pending').length,
        stories: 0,
      });
    } catch (err) {
      console.error('Admin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (uid: string, isBanned: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isBanned: !isBanned });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isBanned: !isBanned } : u));
      toast.success(isBanned ? 'User unbanned' : 'User banned');
    } catch {
      toast.error('Action failed');
    }
  };

  const handleMakeAdmin = async (uid: string, isAdmin: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isAdmin: !isAdmin });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isAdmin: !isAdmin } : u));
      toast.success(isAdmin ? 'Admin role removed' : 'Admin role granted');
    } catch {
      toast.error('Action failed');
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      toast.success('Report resolved');
    } catch {
      toast.error('Action failed');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  if (!userProfile?.isAdmin) return null;

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: <Users size={24} />, color: '#6C63FF' },
    { label: 'Total Posts', value: stats.posts, icon: <FileText size={24} />, color: '#FF6584' },
    { label: 'Pending Reports', value: stats.reports, icon: <Flag size={24} />, color: '#FF8C00' },
    { label: 'Stories', value: stats.stories, icon: <BarChart2 size={24} />, color: '#43CFCF' },
  ];

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'users', label: '👥 Users' },
    { id: 'reports', label: `🚩 Reports${stats.reports > 0 ? ` (${stats.reports})` : ''}` },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="top-bar">
          <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '8px' }}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '16px' }}>Admin Panel</span>
          </div>
          <button onClick={fetchData} className="btn-ghost" style={{ padding: '8px', fontSize: '13px' }}>↻ Refresh</button>
        </div>

        {/* Warning banner */}
        <div style={{ background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)', borderRadius: '12px', padding: '12px 16px', margin: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={16} color="#FF8C00" />
          <span style={{ fontSize: '13px', color: '#FF8C00', fontWeight: 500 }}>Admin area — actions here affect real user data. Proceed with caution.</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', gap: '4px', overflowX: 'auto' }} className="no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 400,
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px' }}>
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {statCards.map(card => (
                  <div key={card.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ color: card.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {card.icon}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800 }}>{loading ? '...' : card.value.toLocaleString()}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{card.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button onClick={() => setActiveTab('users')} className="btn-secondary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
                    <Users size={16} /> Manage Users
                  </button>
                  <button onClick={() => setActiveTab('reports')} className="btn-secondary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }}>
                    <Flag size={16} /> View Reports
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="animate-fade-in">
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>All Users ({users.length})</h3>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <div className="splash-loader" />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {users.map(user => (
                    <div key={user.uid} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {user.photoURL ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'white', fontWeight: 700 }}>{user.displayName?.[0]}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {user.displayName}
                          {user.isAdmin && <span className="admin-badge">Admin</span>}
                          {user.isBanned && <span style={{ background: '#FF3366', color: 'white', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>BANNED</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{user.username} • {user.followersCount || 0} followers</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => navigate(`/profile/${user.username}`)}
                          style={{ padding: '6px', background: 'var(--bg-input)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}
                          title="View profile"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleMakeAdmin(user.uid, user.isAdmin || false)}
                          style={{ padding: '6px', background: 'rgba(108,99,255,0.12)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'var(--primary)' }}
                          title={user.isAdmin ? 'Remove admin' : 'Make admin'}
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          onClick={() => handleBanUser(user.uid, user.isBanned || false)}
                          style={{ padding: '6px', background: user.isBanned ? 'rgba(0,196,140,0.12)' : 'rgba(255,51,102,0.12)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: user.isBanned ? '#00C48C' : '#FF3366' }}
                          title={user.isBanned ? 'Unban user' : 'Ban user'}
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reports */}
          {activeTab === 'reports' && (
            <div className="animate-fade-in">
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Reports ({reports.length})</h3>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <div className="splash-loader" />
                </div>
              ) : reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                  <p>No reports to review</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reports.map(report => (
                    <div key={report.id} style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px',
                      borderLeft: `4px solid ${report.status === 'pending' ? '#FF8C00' : report.status === 'resolved' ? '#00C48C' : 'var(--border)'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{report.type} report</span>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Reported user: <strong style={{ color: 'var(--text-primary)' }}>{report.reportedUserId.slice(0, 8)}...</strong>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                          background: report.status === 'pending' ? 'rgba(255,140,0,0.15)' : report.status === 'resolved' ? 'rgba(0,196,140,0.15)' : 'var(--bg-input)',
                          color: report.status === 'pending' ? '#FF8C00' : report.status === 'resolved' ? '#00C48C' : 'var(--text-muted)',
                        }}>
                          {report.status.toUpperCase()}
                        </span>
                      </div>
                      {report.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          {report.postId && (
                            <button onClick={() => handleDeletePost(report.postId!)} style={{ padding: '6px 12px', background: 'rgba(255,51,102,0.12)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#FF3366', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Trash2 size={12} /> Delete Post
                            </button>
                          )}
                          <button onClick={() => handleResolveReport(report.id)} style={{ padding: '6px 12px', background: 'rgba(0,196,140,0.12)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#00C48C', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={12} /> Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
