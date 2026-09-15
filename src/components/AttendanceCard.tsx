import React, { useState } from 'react';
import { LogIn, LogOut, CheckCircle2, AlertTriangle, Eye, User, Clock } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { getSignedPhotoUrl } from '../lib/api';

interface AttendanceCardProps {
  record: AttendanceRecord;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({ record }) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  const isCheckIn = record.check_type === 'in';
  const isValid = record.status === 'valid';

  const recordDate = new Date(record.created_at);
  const formattedDate = recordDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const todayISTStr = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    .toISOString()
    .split('T')[0];
  const recordDateISTStr = new Date(recordDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    .toISOString()
    .split('T')[0];

  const isPastDate = recordDateISTStr < todayISTStr;
  const isIncompleteSession = isCheckIn && isPastDate;

  const handleOpenLightbox = async () => {
    if (!record.photo_url) return;
    setShowLightbox(true);
    if (!signedPhotoUrl) {
      setLoadingPhoto(true);
      const url = await getSignedPhotoUrl(record.photo_url);
      setSignedPhotoUrl(url);
      setLoadingPhoto(false);
    }
  };

  return (
    <>
      <div className="glass-panel-interactive p-5 rounded-3xl border border-slate-200/80 relative overflow-hidden flex flex-col justify-between">
        {/* Top Status & Type Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold shadow-sm ${
                isCheckIn
                  ? 'bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isCheckIn ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Check {isCheckIn ? 'In' : 'Out'}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">{formattedDate}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex flex-col items-end gap-1">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                record.status === 'valid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300/80'
                  : record.status === 'pending_approval'
                  ? 'bg-amber-50 text-amber-800 border-amber-300/80'
                  : record.status === 'rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-300/80'
                  : 'bg-rose-50 text-rose-700 border-rose-300/80'
              }`}
            >
              {record.status === 'valid' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{record.is_on_duty || record.check_type.startsWith('on_duty') ? 'OD Approved' : 'Verified'}</span>
                </>
              ) : record.status === 'pending_approval' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>OD Pending</span>
                </>
              ) : record.status === 'rejected' ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>OD Rejected</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Out of Range</span>
                </>
              )}
            </div>

            {isIncompleteSession && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-amber-600" /> Missing Punch Out
              </span>
            )}
          </div>
        </div>

        {/* User Info */}
        {record.profiles?.full_name && (
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
            <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-slate-800">{record.profiles.full_name}</span>
            <span className="text-[11px] text-slate-400">({record.profiles.phone || 'No Phone'})</span>
          </div>
        )}

        {/* Details Row */}
        <div className="grid grid-cols-2 gap-2.5 my-1 text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-50/90 border border-slate-200/70">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Office</span>
            <span className="text-slate-900 font-extrabold truncate block text-xs">
              {record.offices?.name || record.office_name || 'Main Office'}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50/90 border border-slate-200/70">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Distance</span>
            <span
              className={`font-black text-xs ${
                isValid ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {record.distance_meters} m
            </span>
          </div>
        </div>

        {/* On Duty Remarks */}
        {record.remarks && (
          <div className="my-2 p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-900 text-xs">
            <span className="font-bold text-[10px] text-amber-700 uppercase tracking-wider block mb-0.5">On Duty Purpose</span>
            <span className="font-medium text-xs text-slate-800">{record.remarks}</span>
          </div>
        )}

        {/* Selfie Photo Button */}
        {record.photo_url ? (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleOpenLightbox}>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center font-black text-[9px]">
                FACE
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Verification Selfie</span>
            </div>
            <button
              onClick={handleOpenLightbox}
              className="px-3 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span>View Photo</span>
            </button>
          </div>
        ) : (
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-400 italic">
            No verification photo attached
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="max-w-lg w-full glass-panel p-5 rounded-3xl relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-900">Verification Selfie</h3>
              <button
                onClick={() => setShowLightbox(false)}
                className="text-slate-600 hover:text-slate-900 text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
              >
                Close
              </button>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center">
              {loadingPhoto ? (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  Loading Verification Image...
                </div>
              ) : signedPhotoUrl ? (
                <img
                  src={signedPhotoUrl}
                  alt="Signed verification photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs text-slate-400">Failed to load photo</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
