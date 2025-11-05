import React from 'react';
import { Plus, LogOut } from 'lucide-react';

function Header({ user, onLogout, onCreateEvent }) {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">SlotSwapper</h1>
            {user && (
              <span className="ml-4 text-gray-500">
                Welcome, {user.name}
              </span>
            )}
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <button
                onClick={onCreateEvent}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Create Event
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;