import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { UserProfile, OfficeLocation, AttendanceRecord, GeoCoordinates } from '../types';
import { CameraCapture } from './CameraCapture';
import { AttendanceCard } from './AttendanceCard';
import { uploadSelfiePhoto, BACKEND_API_URL } from '../lib/supabase';

interface EmployeeDashboardProps {
  user: UserProfile;
  offices: OfficeLocation[];
  history: AttendanceRecord[];
  onAttendanceUpdated: () => void;
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

  const isCheckedIn = lastPunch?.check_type === 'in';
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

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number, accuracy: number = 0) => {
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

  return (
    <div className="space-y-4">
      {/* Compact Geofence Radar Card */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Geofence Proximity Radar</h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Real-time GPS proximity validation with accuracy tolerance.
            </p>
          </div>

          <div className="min-w-[200px]">
            <select
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name} ({office.radius_meters}m)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Compact GPS Display Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Box 1 */}
          <div className="panel-inset p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Your GPS Position</span>
              <Navigation className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="font-mono text-xs text-slate-900">
              <div>Lat: <span className="text-amber-600 font-semibold">{currentLat.toFixed(6)}</span></div>
              <div>Lng: <span className="text-amber-600 font-semibold">{currentLng.toFixed(6)}</span></div>
              <div className="mt-0.5 text-[10px] text-slate-500 font-sans">
                Accuracy: <span className="text-emerald-600 font-medium">±{currentAccuracy}m</span>
              </div>
            </div>
          </div>

          {/* Box 2 */}
          <div className="panel-inset p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Distance to Office</span>
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div>
              <span className={`text-xl font-extrabold ${isInRange ? 'text-emerald-600' : 'text-rose-600'}`}>
                {currentDistance} <span className="text-xs text-slate-500 font-normal">meters</span>
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Allowed Radius: {activeOffice?.radius_meters}m
              </p>
            </div>
          </div>

          {/* Box 3 */}
          <div
            className={`p-3 rounded-xl border flex flex-col justify-between ${
              isInRange
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Geofence Status</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                {isCheckedIn ? 'CHECKED IN' : 'CHECKED OUT'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 my-1">
              {isInRange ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-emerald-700">IN RANGE</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <span className="text-xs font-bold text-rose-700">OUT OF RANGE</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* GPS Testing Controls GATED STRICTLY TO DEV MODE */}
        {import.meta.env.DEV && (
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsSimulatingGps(!isSimulatingGps)}
              className="text-slate-500 hover:text-amber-600 flex items-center gap-1 transition-colors text-[11px]"
            >
              <Sliders className="w-3 h-3 text-amber-500" />
              <span>{isSimulatingGps ? 'Close Dev GPS Panel' : 'Dev GPS Controls'}</span>
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
                  className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-medium"
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
                  className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded text-[10px] font-medium"
                >
                  Set Out of Range (&gt;500m)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selfie Verification Step & Action Controls */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Punch Verification Snapshot</h3>
          </div>
          {capturedDataUrl && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Photo Attached
            </span>
          )}
        </div>

        {showCamera ? (
          <CameraCapture
            onCapture={handlePhotoCaptured}
            onCancel={() => setShowCamera(false)}
          />
        ) : capturedDataUrl ? (
          <div className="flex items-center gap-3 panel-inset p-2.5 rounded-xl mb-4">
            <img
              src={capturedDataUrl}
              alt="Verification preview"
              className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
            />
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-slate-900">Selfie Photo Captured</h4>
              <p className="text-[10px] text-slate-500">Ready for submission to attendance log.</p>
            </div>
            <button
              onClick={() => setShowCamera(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg transition-colors shadow-sm"
            >
              Retake
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCamera(true)}
            className="w-full py-3 mb-4 panel-inset hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all group"
          >
            <Camera className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>Take Selfie Photo (Required for Punching)</span>
          </button>
        )}

        {/* Feedback Messages */}
        {feedbackMsg && (
          <div
            className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedbackMsg.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={loadingAction || !canPunchIn}
            onClick={() => handlePunchAttendance('in')}
            className={`py-3 px-3 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all text-xs ${
              canPunchIn
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {loadingAction ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{isCheckedIn ? 'ALREADY CHECKED IN' : 'PUNCH IN'}</span>
              </>
            )}
          </button>

          <button
            disabled={loadingAction || !canPunchOut}
            onClick={() => handlePunchAttendance('out')}
            className={`py-3 px-3 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all text-xs ${
              canPunchOut
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {loadingAction ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>{canPunchOut ? 'PUNCH OUT' : 'REQUIRES CHECK-IN'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Attendance Log History Section */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Your Recent Attendance Logs</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{history.length} Total Records</span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            No attendance records logged yet. Use the Punch In button above.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {history.map((record) => (
              <AttendanceCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
