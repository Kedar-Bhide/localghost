import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  created_at: string;
  related_user_name?: string;
  related_user_avatar?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/notifications/?limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/v1/notifications/mark-read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ notification_ids: notificationIds }),
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notificationIds.includes(notif.id)
              ? { ...notif, is_read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/v1/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }

    // Navigate if action URL exists
    if (notification.action_url) {
      router.push(notification.action_url);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;

    return date.toLocaleDateString();
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '🚨';
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '📢';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-xl">×</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <span className="text-4xl mb-2">🔔</span>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {notification.related_user_avatar ? (
                          <img
                            src={notification.related_user_avatar}
                            alt={notification.related_user_name}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm">
                              {getPriorityIcon(notification.priority)}
                            </span>
                          </div>
                        )}
                        {!notification.is_read && (
                          <div className="absolute -mt-2 -ml-1 h-3 w-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDate(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.action_label && (
                          <span className="inline-flex items-center text-xs text-indigo-600 mt-2">
                            {notification.action_label} →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <button
              onClick={() => {
                router.push('/notifications');
                onClose();
              }}
              className="w-full text-center text-sm text-indigo-600 hover:text-indigo-500"
            >
              View all notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}