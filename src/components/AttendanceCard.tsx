import React, { useState } from 'react';
import { LogIn, LogOut, CheckCircle2, AlertTriangle, Eye, User, Clock } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { getSignedPhotoUrl } from '../lib/supabase';

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
      <div className="glass-panel-interactive p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
        {/* Top Status & Type Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                isCheckIn
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isCheckIn ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Check {isCheckIn ? 'In' : 'Out'}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">{formattedDate}</p>
            </div>
          </div>

          {/* Status Badge (Green for Verified status, Red for Out of Range) */}
          <div className="flex flex-col items-end gap-1">
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isValid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isValid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Out of Range</span>
                </>
              )}
            </div>

            {isIncompleteSession && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> Missing Punch Out
              </span>
            )}
          </div>
        </div>

        {/* User Info (if available) */}
        {record.profiles?.full_name && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
            <User className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-slate-800">{record.profiles.full_name}</span>
            <span className="text-[11px] text-slate-500">({record.profiles.phone || 'No Phone'})</span>
          </div>
        )}

        {/* Inset Details Row */}
        <div className="grid grid-cols-2 gap-2 my-2 text-xs">
          <div className="panel-inset p-2 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Office</span>
            <span className="text-slate-900 font-medium truncate block">
              {record.offices?.name || record.office_name || 'Main Office'}
            </span>
          </div>
          <div className="panel-inset p-2 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Distance</span>
            <span
              className={`font-semibold ${
                isValid ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {record.distance_meters} m
            </span>
          </div>
        </div>

        {/* Selfie Photo Button */}
        {record.photo_url ? (
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleOpenLightbox}>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold text-[10px]">
                SELFIE
              </div>
              <span className="text-[11px] text-slate-500">Private Verification Selfie</span>
            </div>
            <button
              onClick={handleOpenLightbox}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-1 transition-colors border border-slate-200"
            >
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span>View Photo</span>
            </button>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-400 italic">
            No verification photo attached
          </div>
        )}
      </div>

      {/* Lightbox Modal with On-demand Signed URL */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-200/90 backdrop-blur-md"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="max-w-lg w-full glass-panel p-4 rounded-3xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Private Verification Selfie</h3>
              <button
                onClick={() => setShowLightbox(false)}
                className="text-slate-500 hover:text-slate-900 text-xs px-2.5 py-1 bg-slate-100 rounded-lg"
              >
                Close
              </button>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center">
              {loadingPhoto ? (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  Generating 5-Min Signed URL...
                </div>
              ) : signedPhotoUrl ? (
                <img
                  src={signedPhotoUrl}
                  alt="Signed verification photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-rose-600">Failed to load photo</span>
              )}
            </div>
            <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
              <span>IST Time: {formattedDate}</span>
              <span className="text-amber-600 font-medium">Distance: {record.distance_meters}m</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
