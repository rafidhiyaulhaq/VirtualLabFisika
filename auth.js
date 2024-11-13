import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut,
    updateProfile 
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Error handler function
const handleAuthError = (error) => {
    let message = '';
    switch (error.code) {
      case 'auth/wrong-password':
        message = 'Password salah. Silakan coba lagi.';
        break;
      case 'auth/user-not-found':
        message = 'Email tidak terdaftar.';
        break;
      case 'auth/email-already-in-use':
        message = 'Email sudah terdaftar.';
        break;
      case 'auth/weak-password':
        message = 'Password terlalu lemah. Minimal 6 karakter.';
        break;
      case 'auth/invalid-email':
        message = 'Format email tidak valid.';
        break;
      case 'auth/network-request-failed':
        message = 'Koneksi gagal. Periksa internet Anda.';
        break;
      default:
        message = error.message;
    }
    throw new Error(message);
  };

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

// Configure Google Provider
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

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

// Modify the existing login function
export const loginWithEmail = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
      return { user, token };
    } catch (error) {
      throw handleAuthError(error);
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
        const token = await user.getIdToken();
        return { user, token };
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
        const token = await user.getIdToken();
        return { user, token };
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