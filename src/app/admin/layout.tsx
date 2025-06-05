"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { apiLogger } from '@/lib/logger';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Check if the user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated || !user) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();
        
        setIsAdmin(data.isAdmin);
      } catch (error) {
        apiLogger.error('Error checking admin status', { error });
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, user]);

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (!isLoading && !isCheckingAdmin) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (isAdmin === false) {
        router.push('/dashboard');
      }
    }
  }, [isLoading, isCheckingAdmin, isAuthenticated, isAdmin, router]);

  // Show loading state
  if (isLoading || isCheckingAdmin || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Navigation items
  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/furniture', label: 'Furniture' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/analytics', label: 'Analytics' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-serif font-bold text-gray-900">
              Beluva Interiors <span className="text-primary-600">Admin</span>
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user?.name}</span>
              </div>
              <Link href="/dashboard" className="btn btn-outline text-sm">
                Exit Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="bg-white shadow rounded-lg overflow-hidden">
              <ul>
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-4 py-3 hover:bg-slate-50 ${
                        pathname === item.href
                          ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                          : 'text-gray-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}