import React, { useState, useMemo } from 'react';
import { Shield, Search, FileSpreadsheet, CheckCircle2, AlertTriangle, LogIn, LogOut } from 'lucide-react';
import { UserProfile, OfficeLocation, AttendanceRecord } from '../types';
import { OfficeManager } from './OfficeManager';
import { EmployeeManager } from './EmployeeManager';
import { BACKEND_API_URL } from '../lib/supabase';

interface AdminDashboardProps {
  user: UserProfile;
  offices: OfficeLocation[];
  history: AttendanceRecord[];
  onOfficeAdded: (o: OfficeLocation) => void;
  onOfficeUpdated: (o: OfficeLocation) => void;
  onOfficeDeleted: (id: string) => void;
  onRefreshData: () => void;
}

interface PairedRow {
  key: string;
  checkIn: AttendanceRecord | null;
  checkOut: AttendanceRecord | null;
  employeeName: string;
  employeePhone: string;
  employeeEmail?: string;
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
      if (res.ok && data.employees) setEmployees(data.employees);
    } catch {}
  };

  React.useEffect(() => {
    fetchEmployees();
  }, []);

  // ── KPI Metrics ────────────────────────────────────────────────────────────
  const totalCount = history.length;
  const validCount = history.filter((h) => h.status === 'valid').length;
  const outOfRangeCount = history.filter((h) => h.status === 'out_of_range').length;
  const validPct = totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 100;

  // ── Pair check-in + check-out records per user session ────────────────────
  const pairedRows = useMemo<PairedRow[]>(() => {
    const byUser: Record<string, AttendanceRecord[]> = {};
    history.forEach((r) => {
      if (!byUser[r.user_id]) byUser[r.user_id] = [];
      byUser[r.user_id].push(r);
    });

    const rows: PairedRow[] = [];
    Object.values(byUser).forEach((recs) => {
      const sorted = [...recs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      let i = 0;
      while (i < sorted.length) {
        const cur = sorted[i];
        const next = sorted[i + 1];
        const name = (cur as any).full_name || (cur as any).user_name || 'Unknown';
        const phone = (cur as any).phone || '';
        const email = (cur as any).email || '';
        if (cur.check_type === 'in') {
          const out = next?.check_type === 'out' ? next : null;
          rows.push({
            key: cur.id,
            checkIn: cur,
            checkOut: out,
            employeeName: name,
            employeePhone: phone,
            employeeEmail: email,
          });
          i += out ? 2 : 1;
        } else {
          rows.push({
            key: cur.id,
            checkIn: null,
            checkOut: cur,
            employeeName: name,
            employeePhone: phone,
            employeeEmail: email,
          });
          i++;
        }
      }
    });
    return rows.sort((a, b) => {
      const aT = new Date((a.checkIn || a.checkOut)!.created_at).getTime();
      const bT = new Date((b.checkIn || b.checkOut)!.created_at).getTime();
      return bT - aT;
    });
  }, [history]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = pairedRows.filter((row) => {
    const nameMatch =
      row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.employeePhone.includes(searchTerm) ||
      (row.employeeEmail && row.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!nameMatch) return false;
    if (statusFilter === 'all') return true;
    return row.checkIn?.status === statusFilter || row.checkOut?.status === statusFilter;
  });

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

  const StatusBadge = ({ status }: { status: string }) =>
    status === 'valid' ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Valid
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Out of Range
      </span>
    );

  const SessionCell = ({ rec, type }: { rec: AttendanceRecord | null; type: 'in' | 'out' }) => {
    if (!rec) return <td className="px-3 py-3 text-slate-300 text-xs italic">—</td>;
    const office = (rec as any).office_name || 'Office';
    return (
      <td className="px-3 py-3">
        <div className="flex items-start gap-1.5">
          {type === 'in' ? (
            <LogIn className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <LogOut className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="text-xs font-semibold text-slate-900">{fmt(rec.created_at)}</p>
            <p className="text-[10px] text-slate-500">
              {office} • {rec.distance_meters}m
            </p>
            <StatusBadge status={rec.status} />
          </div>
        </div>
      </td>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel px-4 py-3 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">Admin Operations Console</h1>
          <span className="text-[11px] text-slate-500 hidden md:inline ml-2 border-l border-slate-200 pl-3">
            Geofence compliance & selfie audit logs
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

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Punches', value: totalCount, color: 'text-slate-900' },
          { label: 'Compliance Rate', value: `${validPct}%`, color: 'text-emerald-600' },
          { label: 'Out of Range', value: outOfRangeCount, color: 'text-rose-600' },
          { label: 'Total Staff', value: employees.length, color: 'text-amber-600', amber: true },
        ].map(({ label, value, color, amber }) => (
          <div
            key={label}
            className={`panel-inset px-3.5 py-2.5 rounded-xl ${
              amber ? 'bg-gradient-to-b from-amber-50 to-transparent border border-amber-200' : ''
            }`}
          >
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider block ${
                amber ? 'text-amber-600' : 'text-slate-500'
              }`}
            >
              {label}
            </span>
            <span className={`text-xl font-extrabold leading-tight block mt-0.5 ${color}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Managers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmployeeManager
          employees={employees}
          onEmployeeAdded={(e) => setEmployees((p) => [e, ...p])}
          onEmployeeUpdated={(e) => setEmployees((p) => p.map((x) => (x.id === e.id ? e : x)))}
          onEmployeeDeleted={(id) => setEmployees((p) => p.filter((x) => x.id !== id))}
        />
        <OfficeManager
          offices={offices}
          onOfficeAdded={onOfficeAdded}
          onOfficeUpdated={onOfficeUpdated}
          onOfficeDeleted={onOfficeDeleted}
        />
      </div>

      {/* ── Audit Log Table ── */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Employee Attendance Audit Logs</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative w-36 sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employee…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {/* Filter */}
            <div className="flex items-center gap-0.5 bg-panel-inset p-0.5 rounded-lg">
              {(['all', 'valid', 'out_of_range'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    statusFilter === f
                      ? f === 'all'
                        ? 'bg-amber-400 text-slate-900 font-bold'
                        : f === 'valid'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'valid' ? 'Valid' : 'Out of Range'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            No attendance records matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px] w-1/3">
                    Employee Info (Name, Contact, Email)
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-emerald-600 uppercase tracking-wider text-[10px] w-1/3">
                    <span className="flex items-center gap-1">
                      <LogIn className="w-3 h-3" />
                      Check-In Session
                    </span>
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-rose-500 uppercase tracking-wider text-[10px] w-1/3">
                    <span className="flex items-center gap-1">
                      <LogOut className="w-3 h-3" />
                      Check-Out Session
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                    {/* Column 1: Employee details */}
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-900 text-xs">{row.employeeName}</p>
                      {row.employeePhone && (
                        <p className="text-[10px] text-slate-600 mt-0.5">{row.employeePhone}</p>
                      )}
                      {(row.employeeEmail || (row.checkIn as any)?.email) && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {row.employeeEmail || (row.checkIn as any)?.email}
                        </p>
                      )}
                    </td>
                    {/* Column 2: Check-in */}
                    <SessionCell rec={row.checkIn} type="in" />
                    {/* Column 3: Check-out */}
                    <SessionCell rec={row.checkOut} type="out" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
