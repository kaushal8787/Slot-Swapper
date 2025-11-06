const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'SlotSwapper API is running',
    status: 'online',
    version: '1.0.0'
  });
});

// MongoDB Connection
console.log('Attempting to connect to MongoDB...');

const MONGODB_URI = 'mongodb+srv://sachinkaushal526:27698@cluster0.zyznqct.mongodb.net/slotswapper?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  dbName: 'slotswapper',
}).then(() => {
  console.log('✅ Connected to MongoDB Atlas successfully');
  console.log('Database Name:', mongoose.connection.name);
  console.log('Database Host:', mongoose.connection.host);
  console.log('Connection State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');
  
  // Add connection status route
  app.get('/api/status', async (req, res) => {
    try {
      const connectionState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      const currentState = connectionState[mongoose.connection.readyState] || 'unknown';
      
      res.json({
        database: {
          status: currentState,
          name: mongoose.connection.name || 'Not available',
          host: mongoose.connection.host || 'Not available',
          readyState: mongoose.connection.readyState,
          uri: process.env.MONGODB_URI ? 'URI is set' : 'URI is not set'
        },
        server: {
          status: 'online',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      });
    } catch (error) {
      res.status(500).json({
        database: {
          status: 'error',
          error: error.message,
          readyState: mongoose.connection.readyState,
          uri: process.env.MONGODB_URI ? 'URI is set' : 'URI is not set'
        },
        server: {
          status: 'online',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      });
    }
  });
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Event Schema
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['BUSY', 'SWAPPABLE', 'SWAP_PENDING'], 
    default: 'BUSY' 
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

// SwapRequest Schema
const swapRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'], 
    default: 'PENDING' 
  },
  createdAt: { type: Date, default: Date.now }
});

const SwapRequest = mongoose.model('SwapRequest', swapRequestSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token.' });
  }
};

// ==================== AUTH ROUTES ====================

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// Log In
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ==================== EVENT ROUTES ====================

// Get user's own events
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const events = await Event.find({ userId: req.userId }).sort({ startTime: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching events.' });
  }
});

// Create new event
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const { title, startTime, endTime, status } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, startTime, and endTime are required.' });
    }

    const event = new Event({
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: status || 'BUSY',
      userId: req.userId
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Error creating event.' });
  }
});

// Update event
app.put('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, startTime, endTime, status } = req.body;

    const event = await Event.findOne({ _id: id, userId: req.userId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Prevent updating if swap is pending
    if (event.status === 'SWAP_PENDING' && status !== 'SWAP_PENDING') {
      return res.status(400).json({ error: 'Cannot update event with pending swap.' });
    }

    if (title) event.title = title;
    if (startTime) event.startTime = new Date(startTime);
    if (endTime) event.endTime = new Date(endTime);
    if (status) event.status = status;

    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Error updating event.' });
  }
});

// Delete event
app.delete('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findOne({ _id: id, userId: req.userId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Prevent deletion if swap is pending
    if (event.status === 'SWAP_PENDING') {
      return res.status(400).json({ error: 'Cannot delete event with pending swap.' });
    }

    await Event.deleteOne({ _id: id });
    res.json({ message: 'Event deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting event.' });
  }
});

// ==================== SWAP ROUTES ====================

// Get all swappable slots from other users
app.get('/api/swappable-slots', authenticateToken, async (req, res) => {
  try {
    const slots = await Event.find({
      userId: { $ne: req.userId },
      status: 'SWAPPABLE'
    })
    .populate('userId', 'name email')
    .sort({ startTime: 1 });

    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching swappable slots.' });
  }
});

// Create swap request
app.post('/api/swap-request', authenticateToken, async (req, res) => {
  try {
    const { mySlotId, theirSlotId } = req.body;

    if (!mySlotId || !theirSlotId) {
      return res.status(400).json({ error: 'Both slot IDs are required.' });
    }

    // Verify my slot
    const mySlot = await Event.findOne({ _id: mySlotId, userId: req.userId });
    if (!mySlot) {
      return res.status(404).json({ error: 'Your slot not found.' });
    }
    if (mySlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: 'Your slot must be swappable.' });
    }

    // Verify their slot
    const theirSlot = await Event.findById(theirSlotId);
    if (!theirSlot) {
      return res.status(404).json({ error: 'Requested slot not found.' });
    }
    if (theirSlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: 'Requested slot is not available.' });
    }
    if (theirSlot.userId.toString() === req.userId.toString()) {
      return res.status(400).json({ error: 'Cannot swap with your own slot.' });
    }

    // Create swap request
    const swapRequest = new SwapRequest({
      requesterId: req.userId,
      requesterSlotId: mySlotId,
      ownerId: theirSlot.userId,
      ownerSlotId: theirSlotId,
      status: 'PENDING'
    });

    await swapRequest.save();

    // Update both slots to SWAP_PENDING
    mySlot.status = 'SWAP_PENDING';
    theirSlot.status = 'SWAP_PENDING';
    await mySlot.save();
    await theirSlot.save();

    res.status(201).json({
      message: 'Swap request created successfully.',
      swapRequest
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating swap request.' });
  }
});

// Get incoming swap requests (requests to me)
app.get('/api/swap-requests/incoming', authenticateToken, async (req, res) => {
  try {
    const requests = await SwapRequest.find({
      ownerId: req.userId,
      status: 'PENDING'
    })
    .populate('requesterId', 'name email')
    .populate('requesterSlotId')
    .populate('ownerSlotId')
    .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching incoming requests.' });
  }
});

// Get outgoing swap requests (requests I made)
app.get('/api/swap-requests/outgoing', authenticateToken, async (req, res) => {
  try {
    const requests = await SwapRequest.find({
      requesterId: req.userId,
      status: 'PENDING'
    })
    .populate('ownerId', 'name email')
    .populate('requesterSlotId')
    .populate('ownerSlotId')
    .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching outgoing requests.' });
  }
});

// Respond to swap request
app.post('/api/swap-response/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { accepted } = req.body;

    if (typeof accepted !== 'boolean') {
      return res.status(400).json({ error: 'Accepted field (boolean) is required.' });
    }

    // Find swap request
    const swapRequest = await SwapRequest.findById(requestId);
    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found.' });
    }

    // Verify the user is the owner
    if (swapRequest.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'You are not authorized to respond to this request.' });
    }

    // Check if already responded
    if (swapRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'This request has already been responded to.' });
    }

    // Get both slots
    const requesterSlot = await Event.findById(swapRequest.requesterSlotId);
    const ownerSlot = await Event.findById(swapRequest.ownerSlotId);

    if (!requesterSlot || !ownerSlot) {
      return res.status(404).json({ error: 'One or both slots no longer exist.' });
    }

    if (accepted) {
      // ACCEPT: Swap the owners
      const tempUserId = requesterSlot.userId;
      requesterSlot.userId = ownerSlot.userId;
      ownerSlot.userId = tempUserId;

      // Set both slots back to BUSY
      requesterSlot.status = 'BUSY';
      ownerSlot.status = 'BUSY';

      await requesterSlot.save();
      await ownerSlot.save();

      swapRequest.status = 'ACCEPTED';
      await swapRequest.save();

      res.json({
        message: 'Swap accepted successfully.',
        swapRequest
      });
    } else {
      // REJECT: Set both slots back to SWAPPABLE
      requesterSlot.status = 'SWAPPABLE';
      ownerSlot.status = 'SWAPPABLE';

      await requesterSlot.save();
      await ownerSlot.save();

      swapRequest.status = 'REJECTED';
      await swapRequest.save();

      res.json({
        message: 'Swap rejected.',
        swapRequest
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error responding to swap request.' });
  }
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});