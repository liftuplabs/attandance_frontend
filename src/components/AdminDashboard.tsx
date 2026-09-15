import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Image as ImageIcon,
  X,
  Users,
  Activity,
  RotateCw,
  Briefcase,
  Check,
  MapPin,
  ExternalLink,
  Clock,
  Building2,
} from 'lucide-react';
import { UserProfile, OfficeLocation, AttendanceRecord } from '../types';
import { OfficeManager } from './OfficeManager';
import { EmployeeManager } from './EmployeeManager';
import { BACKEND_API_URL } from '../lib/api';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'pending_approval' | 'out_of_range'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [companyRequests, setCompanyRequests] = useState<any[]>([]);
  const [reviewingCompanyId, setReviewingCompanyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/employees`);
      const data = await res.json();
      if (res.ok && data.employees) setEmployees(data.employees);
    } catch {}
  };

  const fetchCompanyRequests = async () => {
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/onboarding/requests`);
      const data = await res.json();
      if (res.ok && data.requests) setCompanyRequests(data.requests);
    } catch {}
  };

  React.useEffect(() => {
    fetchEmployees();
    fetchCompanyRequests();
  }, []);

  // ── Pending On Duty Requests ──────────────────────────────────────────────
  const pendingOdRequests = useMemo(() => {
    return history.filter((h) => h.status === 'pending_approval');
  }, [history]);

  const handleApproveReject = async (id: string, action: 'approve' | 'reject') => {
    setReviewingId(id);
    setActionMessage(null);
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/approve-od`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: action === 'approve' ? 'On Duty request approved successfully!' : 'On Duty request rejected.',
        });
        onRefreshData();
      } else {
        setActionMessage({
          type: 'error',
          text: data.error || 'Failed to update request.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Network error: ${err.message}`,
      });
    } finally {
      setReviewingId(null);
    }
  };

  const handleReviewCompany = async (requestId: string, action: 'approve' | 'reject') => {
    setReviewingCompanyId(requestId);
    setActionMessage(null);
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/onboarding/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: data.message || `Company request ${action}d successfully!`,
        });
        fetchCompanyRequests();
        fetchEmployees();
        onRefreshData();
      } else {
        setActionMessage({
          type: 'error',
          text: data.error || 'Failed to review request.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Network error: ${err.message}`,
      });
    } finally {
      setReviewingCompanyId(null);
    }
  };

  const pendingCompanyCount = useMemo(() => {
    return companyRequests.filter((r) => r.status === 'pending').length;
  }, [companyRequests]);

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
        const isCurIn = cur.check_type === 'in' || cur.check_type === 'on_duty_in';
        const isNextOut = next?.check_type === 'out' || next?.check_type === 'on_duty_out';

        if (isCurIn) {
          const out = isNextOut ? next : null;
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

  const StatusBadge = ({ rec }: { rec: AttendanceRecord }) => {
    if (rec.status === 'valid') {
      const isOd = rec.is_on_duty || rec.check_type.startsWith('on_duty');
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          {isOd ? 'OD Approved' : 'Valid'}
        </span>
      );
    }
    if (rec.status === 'pending_approval') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded-full animate-pulse">
          <Clock className="w-3 h-3 text-amber-600" />
          Pending OD
        </span>
      );
    }
    if (rec.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          OD Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Out of Range
      </span>
    );
  };

  const SessionCell = ({
    rec,
    type,
    empName,
  }: {
    rec: AttendanceRecord | null;
    type: 'in' | 'out';
    empName: string;
  }) => {
    if (!rec) return <td className="px-3 py-3 text-slate-300 text-xs italic">—</td>;
    const office = (rec as any).office_name || 'Office';
    return (
      <td className="px-3 py-3">
        <div className="flex items-start gap-2">
          {type === 'in' ? (
            <LogIn className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <LogOut className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900">{fmt(rec.created_at)}</p>
            <p className="text-[10px] text-slate-500">
              {office} • {rec.distance_meters}m
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge rec={rec} />
              {rec.photo_url && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewPhoto({
                      url: rec.photo_url!,
                      title: `${empName} - Check-${type === 'in' ? 'In' : 'Out'} Selfie`,
                    })
                  }
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full transition-colors"
                >
                  <ImageIcon className="w-3 h-3 text-amber-600" />
                  View Photo
                </button>
              )}
            </div>
            {rec.remarks && (
              <div className="mt-1.5 text-[10px] text-amber-900 bg-amber-50/80 border border-amber-200/60 rounded px-1.5 py-0.5">
                <span className="font-bold">OD Reason:</span> {rec.remarks}
              </div>
            )}
          </div>
          {rec.photo_url && (
            <img
              src={rec.photo_url}
              alt="Selfie"
              onClick={() =>
                setPreviewPhoto({
                  url: rec.photo_url!,
                  title: `${empName} - Check-${type === 'in' ? 'In' : 'Out'} Selfie`,
                })
              }
              className="w-10 h-10 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            />
          )}
        </div>
      </td>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="glass-panel px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Admin Operations Hub
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                Live Audits
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Geofence compliance, real-time rosters & selfie audit trails
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            onRefreshData();
            fetchEmployees();
            fetchCompanyRequests();
          }}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5 text-orange-500" />
          <span>Sync Data</span>
        </button>
      </div>

      {/* KPI Stats Cards - Organic Elevated Pods */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Punches',
            value: totalCount,
            subtitle: 'Logged entries today',
            icon: Activity,
            iconBg: 'bg-orange-100 text-orange-600',
            badgeBg: 'bg-orange-50 text-orange-700 border-orange-200/60',
          },
          {
            label: 'Compliance Rate',
            value: `${validPct}%`,
            subtitle: 'Within office radius',
            icon: CheckCircle2,
            iconBg: 'bg-emerald-100 text-emerald-600',
            badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
          },
          {
            label: 'Pending OD Requests',
            value: pendingOdRequests.length,
            subtitle: pendingOdRequests.length > 0 ? 'Requires action' : 'All clear',
            icon: Briefcase,
            iconBg:
              pendingOdRequests.length > 0
                ? 'bg-amber-400 text-slate-950 animate-bounce'
                : 'bg-amber-100 text-amber-700',
            badgeBg:
              pendingOdRequests.length > 0
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-600 border-slate-200',
          },
          {
            label: 'Active Staff',
            value: employees.length,
            subtitle: 'Registered profiles',
            icon: Users,
            iconBg: 'bg-indigo-100 text-indigo-700',
            badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200/60',
          },
        ].map(({ label, value, subtitle, icon: Icon, iconBg, badgeBg }) => (
          <div
            key={label}
            className="glass-panel p-5 relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeBg}`}>
                Active
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {value}
            </p>
            <p className="text-xs font-bold text-slate-800 mt-1">{label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        ))}
      </div>

      {/* ── On Duty (OD) Verification Queue ── */}
      <div className="glass-panel p-6 border-2 border-amber-400/50 relative overflow-hidden shadow-lg shadow-amber-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-md shadow-amber-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                On Duty (OD) Verification Queue
                {pendingOdRequests.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950 animate-pulse">
                    {pendingOdRequests.length} Pending
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                    0 Pending
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Review field attendance requests with verified selfie photos, GPS telemetry & duty remarks
              </p>
            </div>
          </div>
        </div>

        {actionMessage && (
          <div
            className={`mb-4 p-3 rounded-2xl text-xs flex items-center gap-2 shadow-sm ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{actionMessage.text}</span>
          </div>
        )}

        {pendingOdRequests.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
            ✨ No pending On Duty requests at this moment. All field punch requests have been verified.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOdRequests.map((req) => {
              const empName = (req as any).user_name || req.profiles?.full_name || 'Employee';
              const empPhone = (req as any).phone || req.profiles?.phone || '';
              const officeName = (req as any).office_name || req.offices?.name || 'Assigned Office';
              const isCheckingIn = req.check_type === 'on_duty_in' || req.check_type === 'in';

              return (
                <div
                  key={req.id}
                  className="glass-panel-interactive p-4 sm:p-5 rounded-2xl border border-amber-300/80 bg-white/80 shadow-md flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Selfie Preview */}
                    {req.photo_url ? (
                      <div className="relative group shrink-0">
                        <img
                          src={req.photo_url}
                          alt="Selfie verification"
                          onClick={() =>
                            setPreviewPhoto({
                              url: req.photo_url!,
                              title: `${empName} - On Duty Request Selfie`,
                            })
                          }
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 cursor-pointer shadow-sm group-hover:opacity-90 transition-opacity"
                        />
                        <span className="absolute bottom-1 right-1 bg-slate-950/75 text-white p-1 rounded-lg text-[9px] pointer-events-none">
                          <ImageIcon className="w-3 h-3" />
                        </span>
                      </div>
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs shrink-0">
                        No Photo
                      </div>
                    )}

                    {/* Employee & Telemetry Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-900 truncate">{empName}</h4>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isCheckingIn
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isCheckingIn ? 'Check-In' : 'Check-Out'}
                        </span>
                      </div>

                      {empPhone && <p className="text-[10px] text-slate-500">{empPhone}</p>}
                      <p className="text-[10px] text-slate-400 mt-0.5">{fmt(req.created_at)}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                          {officeName} • {req.distance_meters}m away
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${req.lat},${req.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 transition-colors"
                        >
                          <MapPin className="w-2.5 h-2.5 text-amber-600" />
                          <span>Google Maps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Remarks / Stated Purpose */}
                  {req.remarks && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-950">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                        On Duty Purpose:
                      </span>
                      <p className="font-medium">{req.remarks}</p>
                    </div>
                  )}

                  {/* Approve / Reject Controls */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      disabled={reviewingId === req.id}
                      onClick={() => handleApproveReject(req.id, 'approve')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      {reviewingId === req.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Attendance</span>
                        </>
                      )}
                    </button>
                    <button
                      disabled={reviewingId === req.id}
                      onClick={() => handleApproveReject(req.id, 'reject')}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Company Onboarding Requests Review Queue ── */}
      <div className="glass-panel p-6 border-2 border-orange-400/40 relative overflow-hidden shadow-lg shadow-orange-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-extrabold shadow-md shadow-orange-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                Company Onboarding Requests
                {pendingCompanyCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500 text-white animate-pulse">
                    {pendingCompanyCount} Pending
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                    0 Pending
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Review and approve organizations requesting their own dedicated company admin accounts
              </p>
            </div>
          </div>
        </div>

        {companyRequests.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
            🏢 No company registration requests received yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyRequests.map((req) => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const isRejected = req.status === 'rejected';

              return (
                <div
                  key={req.id}
                  className={`glass-panel-interactive p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                    isApproved
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isRejected
                      ? 'border-rose-200 bg-rose-50/20 opacity-75'
                      : 'border-orange-300/80 bg-white/90 shadow-md'
                  }`}
                >
                  <div>
                    {/* Header: Company Name + Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {req.company_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 leading-tight">
                            {req.company_name}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {req.industry} • {req.company_size}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                        }`}
                      >
                        {isApproved ? '✓ Approved' : isRejected ? '✕ Rejected' : '⏳ Pending Approval'}
                      </span>
                    </div>

                    {/* Admin Contact Details */}
                    <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-700 font-bold">
                        <span>Admin: {req.admin_name}</span>
                        {req.admin_phone && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            📞 {req.admin_phone}
                          </span>
                        )}
                      </div>
                      {req.admin_email && (
                        <p className="text-[11px] text-orange-600 font-medium">
                          ✉️ {req.admin_email}
                        </p>
                      )}
                    </div>

                    {/* Primary Office Geofence */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span>Office: {req.office_name} ({req.office_radius}m radius)</span>
                        <a
                          href={`https://www.google.com/maps?q=${req.office_lat},${req.office_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-orange-600 font-bold hover:underline"
                        >
                          <MapPin className="w-2.5 h-2.5 text-orange-600" />
                          <span>Google Maps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        GPS: {req.office_lat}, {req.office_lng}
                      </p>
                    </div>

                    {req.remarks && (
                      <p className="mt-2 text-[11px] text-slate-600 italic bg-amber-50/50 p-2 rounded-lg border border-amber-200/40">
                        "{req.remarks}"
                      </p>
                    )}
                  </div>

                  {/* Actions for Pending Requests */}
                  {isPending && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        disabled={reviewingCompanyId === req.id}
                        onClick={() => handleReviewCompany(req.id, 'approve')}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        {reviewingCompanyId === req.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Provision Admin</span>
                          </>
                        )}
                      </button>
                      <button
                        disabled={reviewingCompanyId === req.id}
                        onClick={() => handleReviewCompany(req.id, 'reject')}
                        className="py-2 px-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Managers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Attendance Audit Logs</h2>
              <p className="text-[11px] text-slate-500">Pairing Check-In & Check-Out records</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[180px] sm:w-52">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search staff by name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white/90 border border-slate-200 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
            {/* Segmented Pill Filter */}
            <div className="flex items-center p-1 bg-slate-100/90 rounded-full border border-slate-200/80">
              {(['all', 'valid', 'pending_approval', 'out_of_range'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all ${
                    statusFilter === f
                      ? f === 'all'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : f === 'valid'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : f === 'pending_approval'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f === 'all'
                    ? 'All Logs'
                    : f === 'valid'
                    ? 'Valid'
                    : f === 'pending_approval'
                    ? `Pending OD (${pendingOdRequests.length})`
                    : 'Flagged'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs italic">
            No attendance records matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white/60 backdrop-blur-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] w-1/3">
                    Employee Details
                  </th>
                  <th className="px-4 py-3 font-bold text-emerald-700 uppercase tracking-wider text-[10px] w-1/3">
                    <span className="flex items-center gap-1.5">
                      <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                      Check-In Session
                    </span>
                  </th>
                  <th className="px-4 py-3 font-bold text-rose-600 uppercase tracking-wider text-[10px] w-1/3">
                    <span className="flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      Check-Out Session
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.key} className="hover:bg-orange-50/30 transition-colors">
                    {/* Column 1: Employee details */}
                    <td className="px-4 py-3.5 align-top">
                      <p className="font-extrabold text-slate-900 text-xs">{row.employeeName}</p>
                      {row.employeePhone && (
                        <p className="text-[11px] text-slate-600 font-mono mt-0.5">📞 {row.employeePhone}</p>
                      )}
                      {(row.employeeEmail || (row.checkIn as any)?.email) && (
                        <p className="text-[11px] text-orange-600 font-medium truncate mt-0.5">
                          ✉️ {row.employeeEmail || (row.checkIn as any)?.email}
                        </p>
                      )}
                    </td>
                    {/* Column 2: Check-in */}
                    <SessionCell rec={row.checkIn} type="in" empName={row.employeeName} />
                    {/* Column 3: Check-out */}
                    <SessionCell rec={row.checkOut} type="out" empName={row.employeeName} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="relative max-w-md w-full glass-panel p-4 rounded-3xl text-center">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900">{previewPhoto.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewPhoto.url}
              alt="Verification selfie"
              className="w-full h-80 object-cover rounded-2xl border border-slate-200 shadow-md"
            />
          </div>
        </div>
      )}
    </div>
  );
};
