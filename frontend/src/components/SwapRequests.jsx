import React from 'react';
import { Send, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

function SwapRequests({ incomingRequests, outgoingRequests, onRespond }) {
  const formatSlotTime = (timeString) => {
    const date = new Date(timeString);
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  return (
    <div className="space-y-6">
      {/* Incoming Requests */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Incoming Swap Requests
        </h3>
        {incomingRequests.length === 0 ? (
          <p className="text-gray-500">No incoming swap requests</p>
        ) : (
          <div className="space-y-3">
            {incomingRequests.map((request) => (
              <div
                key={request._id}
                className="border rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{request.requesterName} wants to swap:</p>
                    <p className="text-sm text-gray-600">
                      Their slot: {formatSlotTime(request.requesterSlot.startTime)}
                    </p>
                    <p className="text-sm text-gray-600">
                      For your slot: {formatSlotTime(request.ownerSlot.startTime)}
                    </p>
                  </div>
                  {request.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onRespond(request._id, true)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onRespond(request._id, false)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <span className={`text-sm px-2 py-1 rounded ${
                    request.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : request.status === 'ACCEPTED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Requests */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Send className="w-5 h-5 transform rotate-180" />
          Outgoing Swap Requests
        </h3>
        {outgoingRequests.length === 0 ? (
          <p className="text-gray-500">No outgoing swap requests</p>
        ) : (
          <div className="space-y-3">
            {outgoingRequests.map((request) => (
              <div
                key={request._id}
                className="border rounded-lg p-4 bg-white shadow-sm"
              >
                <p className="font-medium">Request to {request.ownerName}:</p>
                <p className="text-sm text-gray-600">
                  Your slot: {formatSlotTime(request.requesterSlot.startTime)}
                </p>
                <p className="text-sm text-gray-600">
                  Their slot: {formatSlotTime(request.ownerSlot.startTime)}
                </p>
                <div className="mt-2">
                  <span className={`text-sm px-2 py-1 rounded ${
                    request.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : request.status === 'ACCEPTED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SwapRequests;