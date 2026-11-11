'use client';

import { useState, useEffect, useRef } from 'react';
import { format, subDays } from 'date-fns';

const presetsList = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last7days' },
  { label: 'Last 30 days', value: 'last30days' },
  { label: 'Custom Range', value: 'custom' },
];

const DateRangePicker = ({ onDateChange, defaultDays = 30 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('custom'); // Set default to 'custom'
  const pickerRef = useRef(null);

  const selectPreset = (preset) => {
    const today = new Date();
    let start, end;

    if (preset === 'custom') {
      setSelectedPreset('custom');
      return;
    }

    setSelectedPreset(preset);

    switch (preset) {
      case 'today':
        start = end = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        start = end = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'last7days':
        start = format(subDays(today, 6), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'last30days':
        start = format(subDays(today, 29), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(end);
    setIsOpen(false);

    if (onDateChange) {
      onDateChange({ startDate: start, endDate: end });
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set default dates when component mounts
  useEffect(() => {
    if (!startDate && !endDate) {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, defaultDays - 1);
      setStartDate(format(thirtyDaysAgo, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  }, []);

  return (
    <div className="relative w-full max-w-md" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border rounded-md text-sm text-gray-700 bg-white shadow"
      >
        {startDate && endDate ? `${startDate} - ${endDate}` : 'Select date range'}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 bg-white shadow-lg rounded-lg p-4 w-full">
          <div className="space-y-3">
            {presetsList.map((preset) => (
              <button
                key={preset.value}
                onClick={() => selectPreset(preset.value)}
                className={`w-full text-left py-1 px-2 text-sm hover:bg-[#d72828] hover:text-white rounded ${
                  selectedPreset === preset.value ? 'bg-red-100' : ''
                }`}
              >
                {preset.label}
              </button>
            ))}

            {/* Always show custom date inputs, not just when 'custom' is selected */}
            <div className="mt-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm w-24">Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedPreset('custom');
                    if (onDateChange) onDateChange({ startDate: e.target.value, endDate });
                  }}
                  className="border px-2 py-1 rounded w-full text-sm"
                />
              </div>

              <div className="flex items-center space-x-2 mt-2">
                <label className="text-sm w-24">End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedPreset('custom');
                    if (onDateChange) onDateChange({ startDate, endDate: e.target.value });
                  }}
                  className="border px-2 py-1 rounded w-full text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;