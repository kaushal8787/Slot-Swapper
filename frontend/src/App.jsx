import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Send, CheckCircle, XCircle, RefreshCw, LogOut, Plus } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// API Helper
const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Something went wrong');
    }

    return response.json();
  },

  auth: {
    signup: (data) => api.request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  },

  events: {
    getAll: () => api.request('/events'),
    create: (data) => api.request('/events', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => api.request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => api.request(`/events/${id}`, { method: 'DELETE' }),
  },

  swaps: {
    getSwappableSlots: () => api.request('/swappable-slots'),
    createRequest: (data) => api.request('/swap-request', { method: 'POST', body: JSON.stringify(data) }),
    getIncoming: () => api.request('/swap-requests/incoming'),
    getOutgoing: () => api.request('/swap-requests/outgoing'),
    respond: (requestId, accepted) => api.request(`/swap-response/${requestId}`, {
      method: 'POST',
      body: JSON.stringify({ accepted }),
    }),
  },
};

// Auth Context
const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Login/Signup Component
function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = isLogin
        ? await api.auth.login({ email: formData.email, password: formData.password })
        : await api.auth.signup(formData);

      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Calendar className="w-10 h-10 text-indigo-600 mr-2" />
          <h1 className="text-3xl font-bold text-gray-800">SlotSwapper</h1>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-6">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-600 hover:underline font-medium"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}

// Calendar/Dashboard View
function MyCalendar({ onRefresh }) {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', startTime: '', endTime: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await api.events.getAll();
      setEvents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.events.create(formData);
      setShowModal(false);
      setFormData({ title: '', startTime: '', endTime: '' });
      loadEvents();
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (eventId, newStatus) => {
    try {
      await api.events.update(eventId, { status: newStatus });
      loadEvents();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (eventId) => {
    const shouldDelete = window.confirm('Delete this event?'); // Using window.confirm instead of global confirm
    if (!shouldDelete) return;
    try {
      await api.events.delete(eventId);
      loadEvents();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'BUSY': return 'bg-gray-100 text-gray-700';
      case 'SWAPPABLE': return 'bg-green-100 text-green-700';
      case 'SWAP_PENDING': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Calendar</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5" />
          New Event
        </button>
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No events yet. Create your first event!</p>
        ) : (
          events.map((event) => (
            <div key={event._id} className={`p-4 rounded-lg border ${getStatusColor(event.status)}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
                  </div>
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded">
                    {event.status}
                  </span>
                </div>

                <div className="flex gap-2">
                  {event.status === 'BUSY' && (
                    <button
                      onClick={() => handleStatusChange(event._id, 'SWAPPABLE')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Make Swappable
                    </button>
                  )}
                  {event.status === 'SWAPPABLE' && (
                    <button
                      onClick={() => handleStatusChange(event._id, 'BUSY')}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Make Busy
                    </button>
                  )}
                  {event.status !== 'SWAP_PENDING' && (
                    <button
                      onClick={() => handleDelete(event._id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Event</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Marketplace View
function Marketplace({ onRefresh }) {
  const [slots, setSlots] = useState([]);
  const [mySwappableSlots, setMySwappableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSlots();
    loadMySwappableSlots();
  }, []);

  const loadSlots = async () => {
    try {
      const data = await api.swaps.getSwappableSlots();
      setSlots(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMySwappableSlots = async () => {
    try {
      const allEvents = await api.events.getAll();
      setMySwappableSlots(allEvents.filter(e => e.status === 'SWAPPABLE'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestSwap = async (mySlotId) => {
    setLoading(true);
    try {
      await api.swaps.createRequest({ mySlotId, theirSlotId: selectedSlot._id });
      alert('Swap request sent!');
      setSelectedSlot(null);
      loadSlots();
      loadMySwappableSlots();
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Slots</h2>

      <div className="space-y-3">
        {slots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No swappable slots available right now.</p>
        ) : (
          slots.map((slot) => (
            <div key={slot._id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{slot.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Users className="w-4 h-4" />
                    {slot.userId.name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(slot.startTime)} - {formatDateTime(slot.endTime)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSlot(slot)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Request Swap
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Select Your Slot to Offer</h3>
            
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-600">You're requesting:</p>
              <p className="font-semibold">{selectedSlot.title}</p>
              <p className="text-sm text-gray-600">{formatDateTime(selectedSlot.startTime)}</p>
            </div>

            {mySwappableSlots.length === 0 ? (
              <p className="text-gray-500 mb-4">You don't have any swappable slots. Mark a slot as swappable first!</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {mySwappableSlots.map((slot) => (
                  <button
                    key={slot._id}
                    onClick={() => handleRequestSwap(slot._id)}
                    disabled={loading}
                    className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <p className="font-medium">{slot.title}</p>
                    <p className="text-sm text-gray-600">{formatDateTime(slot.startTime)}</p>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedSlot(null)}
              className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Requests View
function Requests({ onRefresh }) {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const [incomingData, outgoingData] = await Promise.all([
        api.swaps.getIncoming(),
        api.swaps.getOutgoing(),
      ]);
      setIncoming(incomingData);
      setOutgoing(outgoingData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResponse = async (requestId, accepted) => {
    setLoading(true);
    try {
      await api.swaps.respond(requestId, accepted);
      alert(accepted ? 'Swap accepted!' : 'Swap rejected.');
      loadRequests();
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Swap Requests</h2>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Incoming Requests
        </h3>
        <div className="space-y-3">
          {incoming.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No incoming requests.</p>
          ) : (
            incoming.map((request) => (
              <div key={request._id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="mb-3">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{request.requesterId.name}</span> wants to swap:
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">They offer:</p>
                    <p className="font-semibold">{request.requesterSlotId.title}</p>
                    <p className="text-sm text-gray-600">{formatDateTime(request.requesterSlotId.startTime)}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">For your:</p>
                    <p className="font-semibold">{request.ownerSlotId.title}</p>
                    <p className="text-sm text-gray-600">{formatDateTime(request.ownerSlotId.startTime)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleResponse(request._id, true)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleResponse(request._id, false)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Outgoing Requests
        </h3>
        <div className="space-y-3">
          {outgoing.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No outgoing requests.</p>
          ) : (
            outgoing.map((request) => (
              <div key={request._id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="mb-3">
                  <p className="text-sm text-gray-600">
                    Waiting for <span className="font-medium">{request.ownerId.name}</span> to respond...
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">You offered:</p>
                    <p className="font-semibold">{request.requesterSlotId.title}</p>
                    <p className="text-sm text-gray-600">{formatDateTime(request.requesterSlotId.startTime)}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-xs text-gray-600 mb-1">For their:</p>
                    <p className="font-semibold">{request.ownerSlotId.title}</p>
                    <p className="text-sm text-gray-600">{formatDateTime(request.ownerSlotId.startTime)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Main App
function App() {
  const { user, login, logout, loading } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('calendar');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-8 h-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-800">SlotSwapper</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {user.name}!</span>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        <div className="flex border-b bg-white">
          {[
            { id: 'calendar', label: 'My Calendar', icon: Calendar },
            { id: 'marketplace', label: 'Marketplace', icon: Users },
            { id: 'requests', label: 'Requests', icon: Send },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === id
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

        <div key={refreshKey}>
          {activeTab === 'calendar' && <MyCalendar onRefresh={handleRefresh} />}
          {activeTab === 'marketplace' && <Marketplace onRefresh={handleRefresh} />}
          {activeTab === 'requests' && <Requests onRefresh={handleRefresh} />}
        </div>
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}