// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin initialization
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: String,
  progress: {
    completedSimulations: { type: Number, default: 0 },
    lastAccessed: Date
  }
});

// Simulation Result Schema
const simulationResultSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true, default: 'parabola' },
  parameters: {
    initialVelocity: Number,
    angle: Number,
    gravity: Number
  },
  results: {
    maxHeight: Number,
    maxDistance: Number,
    timeOfFlight: Number
  },
  score: Number,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const SimulationResult = mongoose.model('SimulationResult', simulationResultSchema);

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
    
    let user = await User.findOne({ uid: decodedToken.uid });
    
    if (!user) {
      user = await User.create({
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || '',
        progress: {
          completedSimulations: 0,
          lastAccessed: new Date()
        }
      });
    }

    const jwtToken = jwt.sign(
      { uid: user.uid },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        progress: user.progress
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
    
    const simulationResult = await SimulationResult.create({
      userId: req.user.uid,
      parameters,
      results,
      score
    });

    // Update user progress
    await User.findOneAndUpdate(
      { uid: req.user.uid },
      { 
        $inc: { 'progress.completedSimulations': 1 },
        $set: { 'progress.lastAccessed': new Date() }
      }
    );

    res.json(simulationResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's simulation history
app.get('/api/simulation/history', verifyToken, async (req, res) => {
  try {
    const simulations = await SimulationResult.find({ userId: req.user.uid })
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(simulations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user progress
app.get('/api/user/progress', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    res.json(user.progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});