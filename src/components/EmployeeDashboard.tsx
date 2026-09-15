import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Compass,
  LogIn,
  LogOut,
  Camera,
  CheckCircle2,
  AlertTriangle,
  History,
  Navigation,
  Sliders,
  Image as ImageIcon,
  X,
  Clock,
  Briefcase,
  Send,
} from 'lucide-react';
import { UserProfile, OfficeLocation, AttendanceRecord, GeoCoordinates } from '../types';
import { CameraCapture } from './CameraCapture';
import { uploadSelfiePhoto, BACKEND_API_URL } from '../lib/api';

interface EmployeeDashboardProps {
  user: UserProfile;
  offices: OfficeLocation[];
  history: AttendanceRecord[];
  onAttendanceUpdated: () => void;
}

interface EmployeeSessionRow {
  key: string;
  checkIn: AttendanceRecord | null;
  checkOut: AttendanceRecord | null;
  dateStr: string;
  durationText: string;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  user,
  offices,
  history,
  onAttendanceUpdated,
}) => {
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(offices[0]?.id || '');
  const [geoCoords, setGeoCoords] = useState<GeoCoordinates | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [isSimulatingGps, setIsSimulatingGps] = useState<boolean>(false);
  const [simLat, setSimLat] = useState<string>('');
  const [simLng, setSimLng] = useState<string>('');

  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  const [onDutyRemarks, setOnDutyRemarks] = useState<string>('');
  const [showOnDutyMode, setShowOnDutyMode] = useState<boolean>(false);

  useEffect(() => {
    if (offices.length > 0 && !selectedOfficeId) {
      setSelectedOfficeId(offices[0].id);
    }
  }, [offices]);

  const activeOffice = offices.find((o) => o.id === selectedOfficeId) || offices[0];

  const todayISTStr = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    .toISOString()
    .split('T')[0];

  const todaysPunches = history.filter(
    (h) => h.created_at.startsWith(todayISTStr) && h.user_id === user.id
  );
  const lastPunch = todaysPunches[0];

  const isCheckedIn = lastPunch?.check_type === 'in' || lastPunch?.check_type === 'on_duty_in';
  const canPunchIn = !isCheckedIn;
  const canPunchOut = isCheckedIn;

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    let watchId: number | null = null;

    setGpsError(null);
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setGeoCoords(coords);
        if (!simLat) setSimLat(coords.lat.toString());
        if (!simLng) setSimLng(coords.lng.toString());
      },
      (err) => {
        console.warn('GPS watch error:', err);
        setGpsError(`Unable to fetch real-time location (${err.message}).`);
        if (activeOffice) {
          setGeoCoords({ lat: activeOffice.lat, lng: activeOffice.lng, accuracy: 10 });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [selectedOfficeId]);

  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
    accuracy: number = 0
  ) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const rawDistance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const effectiveDistance = Math.max(0, rawDistance - accuracy * 0.5);
    return Math.round(effectiveDistance * 10) / 10;
  };

  const currentLat = isSimulatingGps && simLat ? Number(simLat) : geoCoords?.lat || activeOffice?.lat || 0;
  const currentLng = isSimulatingGps && simLng ? Number(simLng) : geoCoords?.lng || activeOffice?.lng || 0;
  const currentAccuracy = geoCoords?.accuracy ? Math.round(geoCoords.accuracy) : 10;

  const currentDistance = activeOffice
    ? calculateDistance(currentLat, currentLng, activeOffice.lat, activeOffice.lng, currentAccuracy)
    : 0;

  const isInRange = activeOffice ? currentDistance <= activeOffice.radius_meters : true;

  const handlePhotoCaptured = (blob: Blob, dataUrl: string) => {
    setCapturedBlob(blob);
    setCapturedDataUrl(dataUrl);
    setShowCamera(false);
  };

  const handlePunchAttendance = async (checkType: 'in' | 'out') => {
    if (!activeOffice) {
      alert('Please select an office location');
      return;
    }

    if (!capturedBlob && !capturedDataUrl) {
      setShowCamera(true);
      return;
    }

    setLoadingAction(true);
    setFeedbackMsg(null);

    try {
      let photoUrl = capturedDataUrl;
      if (capturedBlob) {
        photoUrl = await uploadSelfiePhoto(user.id, capturedBlob);
      }

      const response = await fetch(`${BACKEND_API_URL}/api/attendance/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          office_id: activeOffice.id,
          check_type: checkType,
          lat: currentLat,
          lng: currentLng,
          accuracy_meters: currentAccuracy,
          photo_url: photoUrl,
          user_name: user.full_name,
        }),
      });

      const data = await response.json();

      if (response.ok && data.attendance) {
        if (data.status === 'valid') {
          setFeedbackMsg({
            type: 'success',
            text: `Check-${checkType === 'in' ? 'In' : 'Out'} verified! Distance: ${data.distance_meters}m from ${activeOffice.name}.`,
          });
        } else {
          setFeedbackMsg({
            type: 'warning',
            text: `Recorded as OUT OF RANGE. Distance (${data.distance_meters}m) exceeds radius (${activeOffice.radius_meters}m).`,
          });
        }

        setCapturedBlob(null);
        setCapturedDataUrl(null);
        onAttendanceUpdated();
      } else {
        setFeedbackMsg({
          type: 'error',
          text: data.error || 'Check-in validation failed.',
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Server communication error: ${err.message}`,
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRequestOnDuty = async (checkType: 'in' | 'out') => {
    if (!capturedBlob && !capturedDataUrl) {
      setShowCamera(true);
      return;
    }

    if (!onDutyRemarks.trim()) {
      alert('Please enter your On Duty purpose / client name / reason.');
      return;
    }

    setLoadingAction(true);
    setFeedbackMsg(null);

    try {
      let photoUrl = capturedDataUrl;
      if (capturedBlob) {
        photoUrl = await uploadSelfiePhoto(user.id, capturedBlob);
      }

      const response = await fetch(`${BACKEND_API_URL}/api/attendance/on-duty-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          office_id: activeOffice?.id,
          check_type: checkType === 'out' ? 'on_duty_out' : 'on_duty_in',
          lat: currentLat,
          lng: currentLng,
          accuracy_meters: currentAccuracy,
          photo_url: photoUrl,
          user_name: user.full_name,
          remarks: onDutyRemarks.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.attendance) {
        setFeedbackMsg({
          type: 'success',
          text: `On Duty request submitted successfully! Awaiting Admin verification. (${data.distance_meters}m from ${activeOffice?.name || 'Office'})`,
        });
        setCapturedBlob(null);
        setCapturedDataUrl(null);
        setOnDutyRemarks('');
        onAttendanceUpdated();
      } else {
        setFeedbackMsg({
          type: 'error',
          text: data.error || 'Failed to submit On Duty request.',
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Server communication error: ${err.message}`,
      });
    } finally {
      setLoadingAction(false);
    }
  };

  // ── Pair employee records into structured session rows ────────────────────
  const sessionRows = useMemo<EmployeeSessionRow[]>(() => {
    const userRecs = history.filter((r) => r.user_id === user.id);
    const sorted = [...userRecs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const rows: EmployeeSessionRow[] = [];
    let i = 0;
    while (i < sorted.length) {
      const cur = sorted[i];
      const next = sorted[i + 1];

      const isCurIn = cur.check_type === 'in' || cur.check_type === 'on_duty_in';
      const isNextOut = next?.check_type === 'out' || next?.check_type === 'on_duty_out';

      let durationText = 'Active Session';
      if (isCurIn && isNextOut) {
        const diffMs = new Date(next.created_at).getTime() - new Date(cur.created_at).getTime();
        const mins = Math.floor(diffMs / (1000 * 60));
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        durationText = hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins} mins`;
      }

      const dateObj = new Date(cur.created_at);
      const dateStr = dateObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      if (isCurIn) {
        const out = isNextOut ? next : null;
        rows.push({
          key: cur.id,
          checkIn: cur,
          checkOut: out,
          dateStr,
          durationText,
        });
        i += out ? 2 : 1;
      } else {
        rows.push({
          key: cur.id,
          checkIn: null,
          checkOut: cur,
          dateStr,
          durationText: 'Single Punch Out',
        });
        i++;
      }
    }

    return rows.sort((a, b) => {
      const aT = new Date((a.checkIn || a.checkOut)!.created_at).getTime();
      const bT = new Date((b.checkIn || b.checkOut)!.created_at).getTime();
      return bT - aT;
    });
  }, [history, user.id]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

  return (
    <div className="space-y-6">
      {/* ── Visual Biometric Geofence Radar Card ── */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl relative overflow-hidden">
        {/* Top Header & Office Pill Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Geofence Radar</h2>
              <p className="text-xs text-slate-500">
                Satellite validation for <span className="font-semibold text-slate-700">{activeOffice?.name || 'Office'}</span>
              </p>
            </div>
          </div>

          {/* Floating Pill Office Selector */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-2xl shadow-inner transition-all">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
              <select
                value={selectedOfficeId}
                onChange={(e) => setSelectedOfficeId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2"
              >
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name} ({office.radius_meters}m)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Circular Interactive Geofence Radar Beacon */}
        <div className="relative my-6 flex flex-col items-center justify-center">
          {/* Outer Ripple Rings */}
          <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
            {/* Outer Animated Pulse Ring */}
            <div
              className={`absolute inset-0 rounded-full border-2 animate-radar ${
                isInRange
                  ? 'border-emerald-400/40 bg-emerald-500/5'
                  : 'border-amber-400/40 bg-amber-500/5'
              }`}
            />
            {/* Middle Static Ring */}
            <div
              className={`absolute inset-5 rounded-full border border-dashed ${
                isInRange ? 'border-emerald-300/60' : 'border-amber-300/60'
              }`}
            />
            {/* Inner Ring */}
            <div
              className={`absolute inset-10 rounded-full border ${
                isInRange ? 'border-emerald-200/80' : 'border-amber-200/80'
              }`}
            />

            {/* Central Glowing Radar Core */}
            <div
              className={`relative z-10 w-36 h-36 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center p-3 shadow-xl backdrop-blur-md transition-all duration-500 ${
                isInRange
                  ? 'bg-gradient-to-br from-emerald-500/15 via-white to-emerald-500/20 border-2 border-emerald-400/80 shadow-emerald-500/10'
                  : 'bg-gradient-to-br from-amber-500/15 via-white to-orange-500/20 border-2 border-amber-400/80 shadow-amber-500/10'
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Navigation className={`w-3.5 h-3.5 ${isInRange ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span>Distance</span>
              </div>
              <div className="my-0.5">
                <span
                  className={`text-3xl sm:text-4xl font-black tracking-tight ${
                    isInRange ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {currentDistance}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1">m</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Max: {activeOffice?.radius_meters}m
              </span>
            </div>
          </div>

          {/* Organic Status Pill */}
          <div className="mt-4">
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all ${
                isInRange
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300/80'
                  : 'bg-rose-50 text-rose-700 border border-rose-300/80'
              }`}
            >
              {isInRange ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Within Perimeter ({activeOffice?.name})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Outside Geofence Perimeter</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* GPS Telemetry Pill Bar */}
        <div className="mt-4 pt-4 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/90 border border-slate-200/80 text-[11px] font-mono text-slate-700">
              <span className="text-amber-600 font-bold">GPS:</span>
              <span>{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-800 font-semibold">
              <span>±{currentAccuracy}m accuracy</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
            <span
              className={`w-2 h-2 rounded-full ${
                isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>{isCheckedIn ? 'Currently Checked In' : 'Currently Checked Out'}</span>
          </div>
        </div>

        {/* GPS Dev Simulation Toggle */}
        {import.meta.env.DEV && (
          <div className="mt-3 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsSimulatingGps(!isSimulatingGps)}
              className="text-slate-400 hover:text-amber-600 flex items-center gap-1.5 transition-colors text-[11px]"
            >
              <Sliders className="w-3 h-3 text-amber-500" />
              <span>{isSimulatingGps ? 'Hide Developer GPS Controls' : 'Developer GPS Controls'}</span>
            </button>

            {isSimulatingGps && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (activeOffice) {
                      setSimLat(activeOffice.lat.toString());
                      setSimLng(activeOffice.lng.toString());
                    }
                  }}
                  className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-semibold hover:bg-emerald-100 transition-colors"
                >
                  Set Inside (0m)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeOffice) {
                      setSimLat((activeOffice.lat + 0.005).toString());
                      setSimLng((activeOffice.lng + 0.005).toString());
                    }
                  }}
                  className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-semibold hover:bg-rose-100 transition-colors"
                >
                  Set Out of Range (&gt;500m)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Selfie Biometric Verification & Punch Actions ── */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Biometric Selfie Verification</h3>
              <p className="text-xs text-slate-500">Live facial snapshot required before recording punch</p>
            </div>
          </div>
          {capturedDataUrl && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Photo Ready
            </span>
          )}
        </div>

        {showCamera ? (
          <CameraCapture
            onCapture={handlePhotoCaptured}
            onCancel={() => setShowCamera(false)}
          />
        ) : capturedDataUrl ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 mb-5">
            <img
              src={capturedDataUrl}
              alt="Verification preview"
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900">Selfie Photo Captured</h4>
              <p className="text-[11px] text-slate-500 truncate">Ready to attach to your attendance log.</p>
            </div>
            <button
              onClick={() => setShowCamera(true)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              Retake
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCamera(true)}
            className="w-full py-4 mb-5 rounded-2xl border-2 border-dashed border-amber-300/80 hover:border-amber-400 bg-amber-50/30 hover:bg-amber-50/70 text-slate-700 text-xs font-bold flex items-center justify-center gap-2.5 transition-all group shadow-sm"
          >
            <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
            <span>Take Selfie Photo (Required to Punch)</span>
          </button>
        )}

        {/* Feedback Messages */}
        {feedbackMsg && (
          <div
            className={`mb-5 p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 shadow-sm ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedbackMsg.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            )}
            <span className="font-semibold">{feedbackMsg.text}</span>
          </div>
        )}

        {/* On Duty (OD) Request Panel */}
        {(!isInRange || showOnDutyMode) && (
          <div className="mb-5 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border-2 border-amber-400/80 shadow-lg shadow-amber-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-sm">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    Outside Range? Send On Duty (OD) Request
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80">
                      Admin Verified
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    On a client visit, site inspection, or remote project? Submit your live selfie photo and location for instant admin verification.
                  </p>
                </div>
              </div>
            </div>

            {/* Duty Purpose / Remarks Input */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                On Duty Purpose / Client Name / Remarks <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Client meeting at Baner, Site survey, Customer demo..."
                value={onDutyRemarks}
                onChange={(e) => setOnDutyRemarks(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-sm"
              />
            </div>

            {/* Dedicated On Duty Action Button */}
            <button
              disabled={loadingAction || (!canPunchIn && !canPunchOut)}
              onClick={() => handleRequestOnDuty(canPunchIn ? 'in' : 'out')}
              className="w-full py-3.5 px-5 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              {loadingAction ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {canPunchIn
                      ? 'SUBMIT ON DUTY CHECK-IN REQUEST'
                      : 'SUBMIT ON DUTY CHECK-OUT REQUEST'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tactile Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            disabled={loadingAction || !canPunchIn}
            onClick={() => handlePunchAttendance('in')}
            className={`py-4 px-6 font-extrabold rounded-2xl flex items-center justify-center gap-2.5 text-sm transition-all ${
              canPunchIn
                ? 'btn-tactile bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed'
            }`}
          >
            {loadingAction ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>{isCheckedIn ? 'ALREADY CHECKED IN' : 'PUNCH IN'}</span>
              </>
            )}
          </button>

          <button
            disabled={loadingAction || !canPunchOut}
            onClick={() => handlePunchAttendance('out')}
            className={`py-4 px-6 font-extrabold rounded-2xl flex items-center justify-center gap-2.5 text-sm transition-all ${
              canPunchOut
                ? 'btn-tactile bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white cursor-pointer shadow-rose-500/20'
                : 'bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed'
            }`}
          >
            {loadingAction ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                <span>{canPunchOut ? 'PUNCH OUT' : 'REQUIRES CHECK-IN'}</span>
              </>
            )}
          </button>
        </div>

        {/* Optional Manual Toggle for On Duty Mode */}
        {isInRange && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setShowOnDutyMode(!showOnDutyMode)}
              className="text-xs text-amber-700 font-bold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{showOnDutyMode ? 'Switch to Standard Office Mode' : 'Heading for Field Duty? Open On Duty Request Form'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Employee Attendance Sessions (Responsive Glass Cards) ── */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Attendance Log</h3>
              <p className="text-xs text-slate-500">Structured daily sessions and punch records</p>
            </div>
          </div>
          <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {sessionRows.length} Sessions Logged
          </span>
        </div>

        {sessionRows.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs italic">
            No attendance sessions logged yet. Take a selfie and punch in above to begin.
          </div>
        ) : (
          <div className="space-y-3">
            {sessionRows.map((row) => (
              <div
                key={row.key}
                className="glass-panel-interactive p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Session Header / Date & Duration */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-extrabold text-sm">
                    {row.dateStr.split(' ')[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{row.dateStr}</h4>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>{row.durationText}</span>
                    </div>
                  </div>
                </div>

                {/* Check-In Pod */}
                <div className="flex-1 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                      <LogIn className="w-3 h-3" /> Check-In
                    </span>
                    {row.checkIn && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {(row.checkIn as any).office_name || 'Office'} • {row.checkIn.distance_meters}m
                      </span>
                    )}
                  </div>
                  {row.checkIn ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-slate-900">
                          {formatTime(row.checkIn.created_at)}
                        </span>
                        {row.checkIn.photo_url && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: row.checkIn!.photo_url!,
                                  title: `Check-In Photo (${row.dateStr})`,
                                })
                              }
                              className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-1"
                            >
                              <ImageIcon className="w-3 h-3" /> View
                            </button>
                            <img
                              src={row.checkIn.photo_url}
                              alt="Check-in selfie"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: row.checkIn!.photo_url!,
                                  title: `Check-In Photo (${row.dateStr})`,
                                })
                              }
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          </div>
                        )}
                      </div>

                      {/* Status Badge & Remarks */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {row.checkIn.status === 'valid' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {row.checkIn.is_on_duty || row.checkIn.check_type.startsWith('on_duty') ? 'OD Approved' : 'Verified'}
                          </span>
                        ) : row.checkIn.status === 'pending_approval' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5 animate-spin" />
                            OD Pending Approval
                          </span>
                        ) : row.checkIn.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            OD Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Out of Range
                          </span>
                        )}
                      </div>

                      {row.checkIn.remarks && (
                        <div className="mt-1.5 text-[10px] text-amber-900 bg-amber-50/70 border border-amber-200/60 rounded-lg p-1.5">
                          <span className="font-bold">OD Reason:</span> {row.checkIn.remarks}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">—</span>
                  )}
                </div>

                {/* Check-Out Pod */}
                <div className="flex-1 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                      <LogOut className="w-3 h-3" /> Check-Out
                    </span>
                    {row.checkOut && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {(row.checkOut as any).office_name || 'Office'} • {row.checkOut.distance_meters}m
                      </span>
                    )}
                  </div>
                  {row.checkOut ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-slate-900">
                          {formatTime(row.checkOut.created_at)}
                        </span>
                        {row.checkOut.photo_url && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: row.checkOut!.photo_url!,
                                  title: `Check-Out Photo (${row.dateStr})`,
                                })
                              }
                              className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-1"
                            >
                              <ImageIcon className="w-3 h-3" /> View
                            </button>
                            <img
                              src={row.checkOut.photo_url}
                              alt="Check-out selfie"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: row.checkOut!.photo_url!,
                                  title: `Check-Out Photo (${row.dateStr})`,
                                })
                              }
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          </div>
                        )}
                      </div>

                      {/* Status Badge & Remarks */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {row.checkOut.status === 'valid' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {row.checkOut.is_on_duty || row.checkOut.check_type.startsWith('on_duty') ? 'OD Approved' : 'Verified'}
                          </span>
                        ) : row.checkOut.status === 'pending_approval' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5 animate-spin" />
                            OD Pending Approval
                          </span>
                        ) : row.checkOut.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            OD Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Out of Range
                          </span>
                        )}
                      </div>

                      {row.checkOut.remarks && (
                        <div className="mt-1.5 text-[10px] text-amber-900 bg-amber-50/70 border border-amber-200/60 rounded-lg p-1.5">
                          <span className="font-bold">OD Reason:</span> {row.checkOut.remarks}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-amber-700 font-semibold text-[11px]">
                      Session in progress
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selfie Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="relative max-w-md w-full glass-panel p-5 rounded-3xl text-center shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold text-slate-900">{previewPhoto.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewPhoto.url}
              alt="Verification selfie"
              className="w-full h-80 object-cover rounded-2xl border border-slate-200/80 shadow-md"
            />
          </div>
        </div>
      )}
    </div>
  );
};
