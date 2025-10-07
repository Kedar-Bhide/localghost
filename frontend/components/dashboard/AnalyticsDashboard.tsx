import { useState, useEffect } from 'react';

interface OverviewStats {
  [key: string]: number;
}

interface MonthlyData {
  month: string;
  month_name: string;
  count: number;
}

interface AnalyticsData {
  user_type: 'traveler' | 'local' | 'general';
  overview: OverviewStats;
  monthly_activity?: MonthlyData[];
  recent_requests?: any[];
  recent_proposals?: any[];
  spending_analytics?: any;
  earnings_analytics?: any;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, trend }: {
    title: string;
    value: number | string;
    icon: string;
    trend?: string;
  }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
              <span className="text-white text-lg">{icon}</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {trend && (
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    {trend}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const SimpleChart = ({ data }: { data: MonthlyData[] }) => {
    const maxValue = Math.max(...data.map(d => d.count));

    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Monthly Activity
        </h3>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-20 text-sm text-gray-600 truncate">
                {item.month_name.split(' ')[0]}
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${maxValue > 0 ? (item.count / maxValue) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
              <div className="w-8 text-sm text-gray-900 text-right">
                {item.count}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const renderTravelerDashboard = () => (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={data.overview.total_requests}
          icon="📋"
        />
        <StatCard
          title="Active Requests"
          value={data.overview.active_requests}
          icon="🔄"
        />
        <StatCard
          title="Completed Trips"
          value={data.overview.completed_requests}
          icon="✅"
        />
        <StatCard
          title="Proposals Received"
          value={data.overview.proposals_received}
          icon="📨"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.monthly_activity && <SimpleChart data={data.monthly_activity} />}

        {data.spending_analytics && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Spending Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Spent</span>
                <span className="text-lg font-semibold text-gray-900">
                  ${data.spending_analytics.total_spent.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average per Trip</span>
                <span className="text-sm text-gray-900">
                  ${data.spending_analytics.average_per_trip.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed Trips</span>
                <span className="text-sm text-gray-900">
                  {data.spending_analytics.trips_count}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {data.recent_requests && data.recent_requests.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Requests
            </h3>
            <div className="space-y-3">
              {data.recent_requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{request.title}</p>
                    <p className="text-sm text-gray-500">{request.destination}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      request.status === 'completed' ? 'bg-green-100 text-green-800' :
                      request.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderLocalDashboard = () => (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Proposals"
          value={data.overview.total_proposals}
          icon="📝"
        />
        <StatCard
          title="Accepted Proposals"
          value={data.overview.accepted_proposals}
          icon="✅"
        />
        <StatCard
          title="Success Rate"
          value={`${data.overview.success_rate}%`}
          icon="📈"
        />
        <StatCard
          title="Average Rating"
          value={data.overview.average_rating}
          icon="⭐"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.monthly_activity && <SimpleChart data={data.monthly_activity} />}

        {data.earnings_analytics && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Earnings Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Earnings</span>
                <span className="text-lg font-semibold text-gray-900">
                  ${data.earnings_analytics.total_earnings.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average per Proposal</span>
                <span className="text-sm text-gray-900">
                  ${data.earnings_analytics.average_per_proposal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Accepted Proposals</span>
                <span className="text-sm text-gray-900">
                  {data.earnings_analytics.accepted_proposals}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {data.recent_proposals && data.recent_proposals.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Proposals
            </h3>
            <div className="space-y-3">
              {data.recent_proposals.map((proposal) => (
                <div key={proposal.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{proposal.title}</p>
                    <p className="text-sm text-gray-500">{proposal.request_title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">${proposal.total_price}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      proposal.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      proposal.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderGeneralDashboard = () => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Notifications"
        value={data.overview.total_notifications}
        icon="🔔"
      />
      <StatCard
        title="Unread Notifications"
        value={data.overview.unread_notifications}
        icon="📬"
      />
      <StatCard
        title="Account Age"
        value={`${Math.floor((new Date().getTime() - new Date(data.overview.account_created).getTime()) / (1000 * 60 * 60 * 24))} days`}
        icon="📅"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {data.user_type === 'traveler' && renderTravelerDashboard()}
      {data.user_type === 'local' && renderLocalDashboard()}
      {data.user_type === 'general' && renderGeneralDashboard()}
    </div>
  );
}