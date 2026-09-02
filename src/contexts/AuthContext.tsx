import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  website: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isPrivate: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: unknown;
  updatedAt: unknown;
  dateOfBirth?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, username: string, displayName: string, dob: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user profile exists
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Create profile for new Google users
      const username = user.email?.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase() || `user${Date.now()}`;
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        username,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        bio: '',
        website: '',
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isPrivate: false,
        isAdmin: false,
        isBanned: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, profile);
    }
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    dob: string
  ) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Update Firebase Auth profile
    await updateProfile(user, { displayName });

    // Create Firestore user profile
    const profile: UserProfile = {
      uid: user.uid,
      email,
      username: username.toLowerCase(),
      displayName,
      photoURL: '',
      bio: '',
      website: '',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isPrivate: false,
      isAdmin: false,
      isBanned: false,
      dateOfBirth: dob,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', user.uid), profile);

    // Reserve username
    await setDoc(doc(db, 'usernames', username.toLowerCase()), {
      uid: user.uid,
      username: username.toLowerCase(),
    });
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Update last seen
  useEffect(() => {
    if (currentUser && userProfile) {
      const updateLastSeen = async () => {
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            lastSeen: serverTimestamp(),
            isOnline: true,
          });
        } catch (_e) {
          // Silently fail
        }
      };
      updateLastSeen();
    }
  }, [currentUser, userProfile]);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    resetPassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
