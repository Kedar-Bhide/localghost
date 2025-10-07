import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ProtectedRoute from '../components/auth/ProtectedRoute';

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

function NotificationsPageContent({ user }: { user: any }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async (offset = 0) => {
    try {
      setLoading(offset === 0);
      const unreadParam = filter === 'unread' ? '&unread_only=true' : '';
      const response = await fetch(`/api/v1/notifications/?limit=20&offset=${offset}${unreadParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();

      if (offset === 0) {
        setNotifications(data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
      }

      setHasMore(data.has_more);
      setUnreadCount(data.unread_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
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

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
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

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Notifications - LocalGhost</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                <p className="mt-2 text-gray-600">
                  Stay updated with your latest activities
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Mark all as read ({unreadCount})
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === 'all'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              All notifications
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === 'unread'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <span className="text-6xl">🔔</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-gray-600">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : "You haven't received any notifications yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white border-l-4 rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow ${
                    getPriorityColor(notification.priority)
                  } ${!notification.is_read ? 'ring-2 ring-blue-200' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {notification.related_user_avatar ? (
                          <img
                            src={notification.related_user_avatar}
                            alt={notification.related_user_name}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-lg">
                              {getPriorityIcon(notification.priority)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>

                        <p className="text-gray-700 mb-3">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {formatDate(notification.created_at)}
                          </span>

                          {notification.action_label && (
                            <span className="inline-flex items-center text-sm font-medium text-indigo-600">
                              {notification.action_label} →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        aria-label="Delete notification"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-6">
                  <button
                    onClick={() => fetchNotifications(notifications.length)}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute redirectTo="/auth/login">
      {(user) => <NotificationsPageContent user={user} />}
    </ProtectedRoute>
  );
}

// Force server-side rendering to avoid static generation
export async function getServerSideProps() {
  return {
    props: {},
  };
}