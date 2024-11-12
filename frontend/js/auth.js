import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD4CYi9sjsW79ZiLcerhhOmIFR-Ygd8Ueo",
  authDomain: "virtual-physics-lab.firebaseapp.com",
  projectId: "virtual-physics-lab",
  storageBucket: "virtual-physics-lab.firebasestorage.app",
  messagingSenderId: "892280026110",
  appId: "1:892280026110:web:9e7a605138121b324106af",
  measurementId: "G-R3KWNLMH9G"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();

// Create user document in Firestore
const createUserDocument = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    email: user.email,
    displayName: user.displayName || '',
    progress: {
      completedSimulations: 0,
      lastAccessed: new Date()
    },
    createdAt: new Date()
  }, { merge: true });
};

// Login with email/password
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Register with email/password
export const registerWithEmail = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile if displayName is provided
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    await createUserDocument(user);
    return user;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

// Login with Google
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    await createUserDocument(user);
    return user;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};

// Sign out
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Check auth state
export const onAuthStateChanged = (callback) => {
  return auth.onAuthStateChanged(callback);
};