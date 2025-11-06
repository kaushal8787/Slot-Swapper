const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'https://frontend-7texima5t-kaushal8787s-projects.vercel.app', 
    'http://localhost:3000',
    /\.vercel\.app$/,  // Allow all Vercel subdomains
    process.env.FRONTEND_URL // Allow configured frontend URL
  ].filter(Boolean), // Remove any undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Track connection status
let isConnected = false;

// MongoDB Connection setup
mongoose.set('strictQuery', false);

// Create MongoDB client with custom settings
const connectToMongoDB = async () => {
  try {
    // Check existing connection
    if (isConnected && mongoose.connection.readyState === 1) {
      console.log('Using existing database connection');
      return mongoose.connection;
    }

    // Reset connection state
    isConnected = false;

    // Validate MongoDB URI
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set!');
    }

    // Parse and validate MongoDB URI
    let uri = process.env.MONGODB_URI;
    
    // Debug log (without sensitive info)
    console.log('Environment check:', {
      hasUri: !!uri,
      environment: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL
    });

    // Basic format validation
    if (!uri) {
      throw new Error('MONGODB_URI is undefined or empty');
    }

    // Clean the URI - remove any whitespace or quotes
    uri = uri.trim().replace(/^["']|["']$/g, '');

    // Validate basic URI structure
    if (!uri.includes('@') || !uri.includes('://')) {
      throw new Error('MongoDB URI missing required components (protocol or credentials)');
    }

    try {
      // Split URI into parts for safer handling
      const [protocol, rest] = uri.split('://');
      if (!protocol || !rest) {
        throw new Error('Invalid URI format - cannot parse protocol');
      }

      // Validate protocol
      if (protocol !== 'mongodb+srv' && protocol !== 'mongodb') {
        throw new Error('Invalid protocol - must be mongodb+srv:// or mongodb://');
      }

      // Split credentials and host
      const [credentials, hostPart] = rest.split('@');
      if (!credentials || !hostPart) {
        throw new Error('Invalid URI format - missing credentials or host');
      }

      // Split username and password
      const [username, password] = credentials.split(':');
      if (!username || !password) {
        throw new Error('Invalid URI format - missing username or password');
      }

      // Rebuild URI with proper encoding
      uri = `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostPart}`;

      // Validate the final URI
      new URL(uri);
      
      // Log successful URI parsing (without credentials)
      const maskedUri = uri.replace(
        /\/\/(.*?):(.*?)@/,
        '//***:***@'
      );
      console.log('Valid MongoDB URI format:', maskedUri);
      
    } catch (e) {
      console.error('MongoDB URI validation error:', e.message);
      throw new Error('MongoDB URI validation failed: ' + e.message);
    }

    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    console.log('Attempting new MongoDB connection...');
    
    // Connect with optimized serverless settings
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 1,
      minPoolSize: 0,
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000,
      autoCreate: false,
      bufferCommands: false,
      readPreference: 'primary',
      family: 4, // Force IPv4
      dnsSrvMaxRetries: 5 // Increase DNS retry attempts
    });

    isConnected = true;
    console.log('MongoDB connected successfully');
    return mongoose.connection;

  } catch (error) {
    console.error('MongoDB connection error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
};

// Database connection middleware for serverless environment
app.use(async (req, res, next) => {
  try {
    console.log('Connection middleware - Start');
    console.log('Current connection state:', mongoose.connection.readyState);

    if (mongoose.connection.readyState !== 1) {
      console.log('No active connection, attempting to connect...');
      await connectToMongoDB();
      console.log('Connection established successfully');
    } else {
      console.log('Using existing connection');
    }

    next();
  } catch (error) {
    console.error('Database connection error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      mongoState: mongoose.connection.readyState
    });

    res.status(500).json({ 
      error: 'Database connection error',
      details: error.message,
      state: mongoose.connection.readyState
    });
  }
});

// Test MongoDB URI format
const testMongoDBUri = (uri) => {
  if (!uri) return { isValid: false, error: 'URI is empty' };
  
  try {
    // Clean the URI
    uri = uri.trim().replace(/^["']|["']$/g, '');
    
    // Check protocol
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      return { isValid: false, error: 'Invalid protocol' };
    }
    
    // Parse URL
    const url = new URL(uri);
    
    // Check required components
    if (!url.username || !url.password) {
      return { isValid: false, error: 'Missing credentials' };
    }
    
    if (!url.hostname) {
      return { isValid: false, error: 'Missing hostname' };
    }
    
    return { isValid: true, uri: uri.replace(/\/\/(.*?):(.*?)@/, '//***:***@') };
  } catch (e) {
    return { isValid: false, error: e.message };
  }
};

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    let pingResult = null;
    
    // Test MongoDB URI format
    const uriTest = testMongoDBUri(process.env.MONGODB_URI);
    
    if (dbState === 1) {
      try {
        pingResult = await mongoose.connection.db.admin().ping();
      } catch (err) {
        console.error('Ping failed:', err);
      }
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        state: dbState,
        connected: dbState === 1,
        ping: pingResult ? 'success' : 'failed',
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      vercel: !!process.env.VERCEL,
      mongoUri: {
        exists: !!process.env.MONGODB_URI,
        validFormat: uriTest.isValid,
        formatError: uriTest.isValid ? null : uriTest.error
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      mongoUri: {
        exists: !!process.env.MONGODB_URI,
        validFormat: false,
        formatError: error.message
      }
    });
  }
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Your existing routes and schemas here...

// Initialize database and start server
const startServer = async () => {
  try {
    await connectToMongoDB();
    
    if (!process.env.VERCEL) {
      // Local development - start the server
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log('Environment:', process.env.NODE_ENV || 'development');
        console.log('Database Status:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');
      });
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start server for local development
if (!process.env.VERCEL) {
  startServer();
}

// Export the app for Vercel
module.exports = app;