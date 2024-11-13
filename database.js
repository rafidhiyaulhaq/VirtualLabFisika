import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    updateDoc, 
    increment,
    getDocs 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from './auth.js';

// Initialize Firestore
const db = getFirestore(app);
const auth = getAuth(app);

// Get user data
export const getUserData = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
};

// Save simulation result
export const saveSimulationResult = async (simulationData) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const resultRef = await addDoc(collection(db, 'simulation_results'), {
            userId: user.uid,
            ...simulationData,
            createdAt: new Date()
        });
        
        // Update user progress
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            'progress.completedSimulations': increment(1),
            'progress.lastAccessed': new Date()
        });
        
        return resultRef.id;
    } catch (error) {
        console.error('Error saving simulation:', error);
        throw error;
    }
};

// Track user's progress in simulation
export const trackSimulationProgress = async (simulationType, progress) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
  
      const userRef = doc(db, 'users', user.uid);
      const userData = await getDoc(userRef);
  
      if (!userData.exists()) throw new Error('User data not found');
  
      const currentProgress = userData.data().progress || {};
      const simulationProgress = currentProgress[simulationType] || {};
  
      await updateDoc(userRef, {
        [`progress.${simulationType}`]: {
          ...simulationProgress,
          lastScore: progress.score || 0,
          bestScore: Math.max(simulationProgress.bestScore || 0, progress.score || 0),
          attemptsCount: (simulationProgress.attemptsCount || 0) + 1,
          lastAttempt: new Date(),
        },
        'progress.totalAttempts': increment(1),
        'progress.lastActivity': new Date()
      });
  
      return true;
    } catch (error) {
      console.error('Error tracking progress:', error);
      throw error;
    }
  };
  
  // Get user's progress summary
  export const getProgressSummary = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
  
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) throw new Error('User data not found');
  
      const userData = userDoc.data();
      return userData.progress || {};
    } catch (error) {
      console.error('Error getting progress:', error);
      throw error;
    }
  };

// Get user's simulation history
export const getSimulationHistory = async () => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const q = query(
            collection(db, 'simulation_results'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting simulation history:', error);
        throw error;
    }
};