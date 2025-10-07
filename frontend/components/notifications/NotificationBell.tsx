import { useState, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCenter, setShowCenter] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch notification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    setShowCenter(!showCenter);
  };

  return (
    <>
      <button
        onClick={handleBellClick}
        className={`relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full ${className}`}
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.25rem] h-5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Loading indicator */}
        {loading && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        )}
      </button>

      <NotificationCenter
        isOpen={showCenter}
        onClose={() => setShowCenter(false)}
      />
    </>
  );
}