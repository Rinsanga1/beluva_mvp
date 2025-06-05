"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

type DashboardStats = {
  userCount: number;
  sessionCount: number;
  furnitureCount: number;
  designCount: number;
  recentActivity: Array<{
    id: string;
    type: 'signup' | 'design' | 'upload';
    user: {
      id: string;
      name: string;
    };
    timestamp: string;
  }>;
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch admin stats');
        }
        
        const data = await response.json();
        setStats(data.data);
      } catch (error: any) {
        console.error('Error fetching admin stats:', error);
        setError(error.message || 'An error occurred while fetching admin statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Activity type labels and icons
  const activityConfig = {
    signup: {
      label: 'New User',
      icon: (
        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    design: {
      label: 'New Design',
      icon: (
        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    upload: {
      label: 'New Upload',
      icon: (
        <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="h-6 bg-slate-200 rounded w-1/4 mt-8"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If there's no error and it's not loading, but we still don't have stats
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p>No data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-medium mb-6">Dashboard Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Users</p>
                <p className="text-3xl font-bold mt-1">{stats.userCount}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-2">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-800 mt-3 inline-block">
              View all users →
            </Link>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Sessions</p>
                <p className="text-3xl font-bold mt-1">{stats.sessionCount}</p>
              </div>
              <div className="bg-green-100 rounded-full p-2">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <Link href="/admin/analytics" className="text-sm text-green-600 hover:text-green-800 mt-3 inline-block">
              View analytics →
            </Link>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-purple-600 font-medium">Furniture Items</p>
                <p className="text-3xl font-bold mt-1">{stats.furnitureCount}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-2">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <Link href="/admin/furniture" className="text-sm text-purple-600 hover:text-purple-800 mt-3 inline-block">
              Manage furniture →
            </Link>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-amber-600 font-medium">Room Designs</p>
                <p className="text-3xl font-bold mt-1">{stats.designCount}</p>
              </div>
              <div className="bg-amber-100 rounded-full p-2">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <Link href="/admin/analytics?view=designs" className="text-sm text-amber-600 hover:text-amber-800 mt-3 inline-block">
              View designs →
            </Link>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-medium mb-6">Recent Activity</h2>
        
        {stats.recentActivity.length > 0 ? (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {stats.recentActivity.map((activity) => {
                const config = activityConfig[activity.type];
                
                return (
                  <li key={activity.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {config.label}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {activity.user.name}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No recent activity to display</p>
          </div>
        )}
      </div>
    </div>
  );
}