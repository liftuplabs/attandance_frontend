import React, { useState, useEffect } from 'react';
import { Shield, User, LogOut, Compass } from 'lucide-react';
import { UserProfile, OfficeLocation, AttendanceRecord } from './types';
import { AuthModal } from './components/AuthModal';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { BACKEND_API_URL } from './lib/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');
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
      setActiveTab(currentUser.role === 'admin' ? 'admin' : 'employee');
      fetchAttendanceHistory();
    }
  }, [currentUser]);

  const handleLoginSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setHistory([]);
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
    <div className="min-h-screen flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-orange-200 shadow-sm bg-header-wave">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          {/* Logo Branding */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/Liftup-Logo.png"
              alt="LiftupLabs Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* User Profile & Navigation Controls */}
          {currentUser && (
            <div className="flex items-center gap-3">
              {/* Admin Badge for Admin Users */}
              {currentUser.role === 'admin' && (
                <div className="flex items-center px-2 py-1 text-slate-900 text-xs font-extrabold gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-orange-600" />
                  <span>Admin Console</span>
                </div>
              )}

              {/* User Avatar Badge (No container background or border) */}
              <div className="hidden md:flex items-center gap-2.5 px-1 py-1">
                <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {currentUser.full_name}
                  </span>
                  <span className="text-[10px] text-slate-800 capitalize font-bold">
                    {currentUser.role} • {currentUser.phone || currentUser.email}
                  </span>
                </div>
              </div>

              {/* Logout Exit Button (Transparent background) */}
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-slate-800 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
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
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LiftupLabs Attendance Platform • Built with React, TS, Hono & Supabase</span>
          <span className="text-[11px] text-orange-500 font-mono">Server Haversine Validation Active</span>
        </div>
      </footer>
    </div>
  );
}
