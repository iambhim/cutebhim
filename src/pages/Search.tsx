import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, Clock, TrendingUp } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

interface SearchResult extends UserProfile {}

const Search: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TRENDING_TAGS = ['#photography', '#nature', '#art', '#music', '#food', '#travel', '#fashion', '#cute', '#love', '#sunset'];

  useEffect(() => {
    const saved = localStorage.getItem('cutebhim-recent-searches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  const saveSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('cutebhim-recent-searches', JSON.stringify(updated));
  };

  const removeRecent = (term: string) => {
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('cutebhim-recent-searches', JSON.stringify(updated));
  };

  const handleSearch = async (value: string) => {
    setSearchText(value);
    if (!value.trim()) { setResults([]); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const term = value.trim().toLowerCase();

        // Search by username
        const usernameQ = query(
          collection(db, 'users'),
          where('username', '>=', term),
          where('username', '<=', term + '\uf8ff'),
          limit(10)
        );

        // Search by displayName
        const nameQ = query(
          collection(db, 'users'),
          where('displayName', '>=', value.trim()),
          where('displayName', '<=', value.trim() + '\uf8ff'),
          limit(10)
        );

        const [usernameSnap, nameSnap] = await Promise.all([getDocs(usernameQ), getDocs(nameQ)]);

        const seen = new Set<string>();
        const combined: SearchResult[] = [];

        [...usernameSnap.docs, ...nameSnap.docs].forEach(d => {
          if (!seen.has(d.id) && d.id !== currentUser?.uid) {
            seen.add(d.id);
            combined.push({ uid: d.id, ...d.data() } as SearchResult);
          }
        });

        setResults(combined);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleUserClick = (user: SearchResult) => {
    saveSearch(user.username);
    navigate(`/profile/${user.username}`);
  };

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '80px' }}>
        {/* Header */}
        <div className="top-bar">
          <h1 style={{ fontWeight: 700, fontSize: '18px' }}>Search</h1>
        </div>

        {/* Search input */}
        <div style={{ padding: '12px 16px' }}>
          <div className="search-input-wrapper">
            <SearchIcon size={18} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '44px', paddingRight: searchText ? '40px' : '16px', borderRadius: '14px' }}
              placeholder="Search users, hashtags..."
              value={searchText}
              onChange={e => handleSearch(e.target.value)}
              autoFocus
            />
            {searchText && (
              <button
                onClick={() => { setSearchText(''); setResults([]); }}
                style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {!searchText ? (
          <div>
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div style={{ padding: '0 16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '15px' }}>Recent</h3>
                  <button onClick={() => { setRecentSearches([]); localStorage.removeItem('cutebhim-recent-searches'); }} style={{ fontSize: '13px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Clear all
                  </button>
                </div>
                {recentSearches.map(term => (
                  <div key={term} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <Clock size={16} color="var(--text-muted)" />
                    <button onClick={() => handleSearch(term)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '14px', color: 'var(--text-primary)' }}>
                      {term}
                    </button>
                    <button onClick={() => removeRecent(term)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Trending tags */}
            <div style={{ padding: '0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <TrendingUp size={18} color="var(--primary)" />
                <h3 style={{ fontWeight: 700, fontSize: '15px' }}>Trending</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {TRENDING_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => navigate(`/explore?tag=${tag.slice(1)}`)}
                    style={{
                      background: 'rgba(108,99,255,0.1)',
                      color: 'var(--primary)',
                      border: '1.5px solid rgba(108,99,255,0.2)',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="skeleton" style={{ width: '50%', height: 12 }} />
                  <div className="skeleton" style={{ width: '30%', height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>🔍</div>
            <p style={{ color: 'var(--text-muted)' }}>No results for "{searchText}"</p>
          </div>
        ) : (
          <div style={{ padding: '0 16px' }}>
            {results.map(user => (
              <div
                key={user.uid}
                onClick={() => handleUserClick(user)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #6C63FF, #FF6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {user.photoURL
                    ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{user.displayName?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.displayName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{user.username}</div>
                  {user.bio && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }} className="truncate-2">{user.bio}</div>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {user.followersCount?.toLocaleString() || 0} followers
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Search;
