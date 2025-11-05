import React from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

function Calendar({ events, onSlotClick }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const weekStart = startOfWeek(currentDate);
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const timeSlots = [...Array(24)].map((_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const getEventForSlot = (day, time) => {
    return events.find(event => {
      const eventDate = new Date(event.startTime);
      return format(eventDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') &&
             format(eventDate, 'HH:00') === time;
    });
  };

  const renderSlot = (day, time) => {
    const event = getEventForSlot(day, time);
    if (!event) return null;

    const statusColors = {
      BUSY: 'bg-red-200',
      SWAPPABLE: 'bg-green-200',
      SWAP_PENDING: 'bg-yellow-200'
    };

    return (
      <div
        className={`p-2 rounded ${statusColors[event.status]} cursor-pointer`}
        onClick={() => onSlotClick(event)}
      >
        {event.title}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6" />
          Calendar
        </h2>
        {/* Add navigation buttons here if needed */}
      </div>
      
      <div className="relative">
        <div className="grid grid-cols-8 gap-2">
          {/* Time column */}
          <div className="sticky left-0 bg-white">
            <div className="h-10"></div> {/* Header spacer */}
            {timeSlots.map(time => (
              <div key={time} className="h-20 flex items-center justify-center text-sm text-gray-500">
                {time}
              </div>
            ))}
          </div>
          
          {/* Days columns */}
          {weekDays.map(day => (
            <div key={day.toString()} className="flex-1">
              <div className="h-10 flex items-center justify-center font-semibold">
                {format(day, 'EEE dd/MM')}
              </div>
              {timeSlots.map(time => (
                <div key={`${day}-${time}`} className="h-20 border border-gray-100 p-1">
                  {renderSlot(day, time)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Calendar;