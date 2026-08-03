import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { UserProfile, OfficeLocation, AttendanceRecord } from '../types';
import { OfficeManager } from './OfficeManager';
import { EmployeeManager } from './EmployeeManager';
import { AttendanceCard } from './AttendanceCard';
import { BACKEND_API_URL } from '../lib/supabase';

interface AdminDashboardProps {
  user: UserProfile;
  offices: OfficeLocation[];
  history: AttendanceRecord[];
  onOfficeAdded: (newOffice: OfficeLocation) => void;
  onOfficeUpdated: (updatedOffice: OfficeLocation) => void;
  onOfficeDeleted: (officeId: string) => void;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  offices,
  history,
  onOfficeAdded,
  onOfficeUpdated,
  onOfficeDeleted,
  onRefreshData,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'out_of_range'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<UserProfile[]>([]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/employees`);
      const data = await res.json();
      if (res.ok && data.employees) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.warn('Failed to fetch employees list:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleEmployeeAdded = (newEmp: UserProfile) => {
    setEmployees((prev) => [newEmp, ...prev]);
  };

  const handleEmployeeUpdated = (updatedEmp: UserProfile) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
  };

  const handleEmployeeDeleted = (empId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== empId));
  };

  const totalCount = history.length;
  const validCount = history.filter((h) => h.status === 'valid').length;
  const outOfRangeCount = history.filter((h) => h.status === 'out_of_range').length;
  const validPercentage = totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 100;

  const filteredHistory = history.filter((record) => {
    const matchesStatus =
      statusFilter === 'all' ? true : record.status === statusFilter;
    const nameMatch = record.profiles?.full_name || record.user_name || '';
    const matchesSearch = nameMatch
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Compact Admin Console Header */}
      <div className="glass-panel px-4 py-3 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">Admin Operations Console</h1>
          <span className="text-[11px] text-slate-500 hidden md:inline ml-2 border-l border-slate-200 pl-3">
            Company-wide geofence compliance & selfie audit logs
          </span>
        </div>
        <button
          onClick={() => {
            onRefreshData();
            fetchEmployees();
          }}
          className="px-3 py-1 bg-panel-inset hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Compact KPI Overview Metrics (Tight Height & High Density) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="panel-inset px-3.5 py-2.5 rounded-xl">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Total Punches</span>
          <span className="text-xl font-extrabold text-slate-900 leading-tight block mt-0.5">{totalCount}</span>
        </div>

        {/* Metric 2 */}
        <div className="panel-inset px-3.5 py-2.5 rounded-xl">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Compliance Rate</span>
          <span className="text-xl font-extrabold text-emerald-600 leading-tight block mt-0.5">{validPercentage}%</span>
        </div>

        {/* Metric 3 */}
        <div className="panel-inset px-3.5 py-2.5 rounded-xl">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Out of Range</span>
          <span className="text-xl font-extrabold text-rose-600 leading-tight block mt-0.5">{outOfRangeCount}</span>
        </div>

        {/* Metric 4 (Amber Accent Highlight) */}
        <div className="panel-inset px-3.5 py-2.5 rounded-xl bg-gradient-to-b from-amber-50 to-transparent border-amber-200 border">
          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">Total Staff</span>
          <span className="text-xl font-extrabold text-amber-600 leading-tight block mt-0.5">{employees.length}</span>
        </div>
      </div>

      {/* Side-by-Side 2-Column Grid for Roster & Office Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Employee Directory Manager */}
        <EmployeeManager
          employees={employees}
          onEmployeeAdded={handleEmployeeAdded}
          onEmployeeUpdated={handleEmployeeUpdated}
          onEmployeeDeleted={handleEmployeeDeleted}
        />

        {/* Office Locations Manager */}
        <OfficeManager
          offices={offices}
          onOfficeAdded={onOfficeAdded}
          onOfficeUpdated={onOfficeUpdated}
          onOfficeDeleted={onOfficeDeleted}
        />
      </div>

      {/* Compact Attendance Audit Log Section */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Employee Attendance Audit Logs</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-36 sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-0.5 bg-panel-inset p-0.5 rounded-lg">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  statusFilter === 'all'
                    ? 'bg-amber-400 text-slate-900 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('valid')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  statusFilter === 'valid'
                    ? 'bg-emerald-500 text-white font-medium'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Valid
              </button>
              <button
                onClick={() => setStatusFilter('out_of_range')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  statusFilter === 'out_of_range'
                    ? 'bg-rose-500 text-white font-medium'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Out of Range
              </button>
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs italic">
            No attendance records matching filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredHistory.map((record) => (
              <AttendanceCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
