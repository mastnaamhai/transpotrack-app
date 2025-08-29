// backend/server.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5001;

// --- CORS CONFIGURATION SECTION ---
// This is where you will add your Netlify URL

const allowedOrigins = [
  'http://localhost:5173', // For your local development
  
  // PASTE YOUR LIVE NETLIFY URL HERE inside the quotes.
  // Example: 'https://transpotrack-app.netlify.app'
  'https://transcendent-stardust-3f8063.netlify.app/' 
];

const corsOptions = {
  origin: function (origin, callback) {
    // The `!origin` part allows server-to-server requests or tools like Postman.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

// Middleware
app.use(cors(corsOptions)); // Use the configured options
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    // Start the server only after successful DB connection
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });