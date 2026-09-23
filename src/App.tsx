import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { UserProfile, OfficeLocation, AttendanceRecord } from './types';
import { AuthModal } from './components/AuthModal';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { BACKEND_API_URL } from './lib/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('attendance_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch initial office list from Backend
  const fetchOffices = async () => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/offices`);
      const data = await res.json();
      if (res.ok && data.offices) {
        setOffices(data.offices);
      }
    } catch (err) {
      console.warn('Failed to fetch offices from backend:', err);
    }
  };

  // Fetch attendance logs
  const fetchAttendanceHistory = async () => {
    if (!currentUser) return;
    try {
      const url = `${BACKEND_API_URL}/api/attendance/history?user_id=${currentUser.id}&role=${currentUser.role}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.attendance) {
        setHistory(data.attendance);
      }
    } catch (err) {
      console.warn('Failed to fetch attendance history:', err);
    }
  };

  useEffect(() => {
    fetchOffices().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAttendanceHistory();

      // Auto-sync every 60s to check for midnight/cutoff auto-logout
      const interval = setInterval(() => {
        fetchAttendanceHistory();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleLoginSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    try {
      localStorage.setItem('attendance_user', JSON.stringify(profile));
    } catch (err) {
      console.warn('Failed to save session to localStorage:', err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setHistory([]);
    try {
      localStorage.removeItem('attendance_user');
    } catch (err) {
      console.warn('Failed to remove session from localStorage:', err);
    }
  };

  const handleOfficeAdded = (newOffice: OfficeLocation) => {
    setOffices((prev) => [...prev, newOffice]);
  };

  const handleOfficeUpdated = (updatedOffice: OfficeLocation) => {
    setOffices((prev) => prev.map((o) => (o.id === updatedOffice.id ? updatedOffice : o)));
  };

  const handleOfficeDeleted = (officeId: string) => {
    setOffices((prev) => prev.filter((o) => o.id !== officeId));
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-orange-500 selection:text-white py-3">
      {/* Floating Pill Navigation Bar */}
      <header className="sticky top-3 z-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="floating-nav px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo Branding */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/Liftup-Logo.png"
              alt="LiftupLabs Logo"
              className="h-9 sm:h-10 w-auto object-contain hover:scale-105 transition-transform"
            />
          </div>

          {/* User Profile & Navigation Controls */}
          {currentUser && (
            <div className="flex items-center gap-2 sm:gap-4">
              {/* User Avatar Badge */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200/80 shadow-sm">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div className="text-left hidden md:block">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {currentUser.full_name}
                  </span>
                  <span className="text-[10px] text-orange-600 capitalize font-bold">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="ml-1 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {!currentUser ? (
          <AuthModal onLoginSuccess={handleLoginSuccess} />
        ) : currentUser.role === 'admin' ? (
          <AdminDashboard
            user={currentUser}
            offices={offices}
            history={history}
            onOfficeAdded={handleOfficeAdded}
            onOfficeUpdated={handleOfficeUpdated}
            onOfficeDeleted={handleOfficeDeleted}
            onRefreshData={fetchAttendanceHistory}
          />
        ) : (
          <EmployeeDashboard
            user={currentUser}
            offices={offices}
            history={history}
            onAttendanceUpdated={fetchAttendanceHistory}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 max-w-7xl mx-auto px-4 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 rounded-full bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm">
          <span className="font-medium text-slate-600">LiftUp Labs Attendance Platform</span>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[11px] font-mono text-orange-600 font-semibold">Haversine GPS Engine Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
