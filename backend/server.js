const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin initialization
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'virtual-physics-lab',
  databaseURL: `https://virtual-physics-lab.firebaseio.com`
});

// Firestore reference
const db = admin.firestore();

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// User registration/login
app.post('/api/auth', async (req, res) => {
  try {
    const { token } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user exists in Firestore
    const userRef = db.collection('users').doc(decodedToken.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create new user document
      await userRef.set({
        email: decodedToken.email,
        displayName: decodedToken.name || '',
        progress: {
          completedSimulations: 0,
          lastAccessed: admin.firestore.FieldValue.serverTimestamp()
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { uid: decodedToken.uid },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save simulation result
app.post('/api/simulation/result', verifyToken, async (req, res) => {
  try {
    const { parameters, results, score } = req.body;
    
    // Add simulation result to Firestore
    const simulationRef = await db.collection('simulation_results').add({
      userId: req.user.uid,
      type: 'parabola',
      parameters,
      results,
      score,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user progress
    const userRef = db.collection('users').doc(req.user.uid);
    await userRef.update({
      'progress.completedSimulations': admin.firestore.FieldValue.increment(1),
      'progress.lastAccessed': admin.firestore.FieldValue.serverTimestamp()
    });

    // Get the created simulation document
    const simulationDoc = await simulationRef.get();
    res.json({ id: simulationRef.id, ...simulationDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's simulation history
app.get('/api/simulation/history', verifyToken, async (req, res) => {
  try {
    const simulationsRef = db.collection('simulation_results')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(10);
    
    const snapshot = await simulationsRef.get();
    const simulations = [];
    
    snapshot.forEach(doc => {
      simulations.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(simulations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user progress
app.get('/api/user/progress', verifyToken, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(userDoc.data().progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});