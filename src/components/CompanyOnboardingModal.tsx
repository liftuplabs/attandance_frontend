import React, { useState } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Compass,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  Globe,
  Users,
  Clock,
} from 'lucide-react';
import { BACKEND_API_URL } from '../lib/api';

interface CompanyOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyOnboardingModal: React.FC<CompanyOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Technology & Software');
  const [companySize, setCompanySize] = useState('1-50');
  const [website, setWebsite] = useState('');

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [officeName, setOfficeName] = useState('Main Headquarters');
  const [officeLat, setOfficeLat] = useState('18.5204');
  const [officeLng, setOfficeLng] = useState('73.8567');
  const [officeRadius, setOfficeRadius] = useState('200');
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsDetected, setGpsDetected] = useState(false);

  const [autoLogoutTime, setAutoLogoutTime] = useState('23:59');
  const [enableAutoLogout, setEnableAutoLogout] = useState(true);

  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOfficeLat(pos.coords.latitude.toFixed(6));
        setOfficeLng(pos.coords.longitude.toFixed(6));
        setDetectingGps(false);
        setGpsDetected(true);
      },
      (err) => {
        console.warn('GPS detection error:', err);
        setDetectingGps(false);
        alert(`Could not detect location: ${err.message}. Please input manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError('Company Name is required.');
      return;
    }
    if (!adminName.trim()) {
      setError('Admin Full Name is required.');
      return;
    }
    if (!adminEmail.trim() && !adminPhone.trim()) {
      setError('Please provide at least a business email or mobile number.');
      return;
    }
    if (!adminPassword || adminPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/onboarding/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          industry,
          company_size: companySize,
          website: website.trim(),
          admin_name: adminName.trim(),
          admin_email: adminEmail.trim(),
          admin_phone: adminPhone.trim(),
          admin_password: adminPassword,
          office_name: officeName.trim() || 'Headquarters',
          office_lat: Number(officeLat),
          office_lng: Number(officeLng),
          office_radius: Number(officeRadius),
          auto_logout_time: autoLogoutTime,
          enable_auto_logout: enableAutoLogout,
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit registration request. Please try again.');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}. Please verify the server connection.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="relative max-w-5xl xl:max-w-6xl w-full my-6 glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl border-2 border-orange-500/30 bg-white/95 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          /* ── Success Confirmation Screen ── */
          <div className="text-center py-6 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Registration Request Submitted!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
              Thank you for choosing LiftUp Labs. Your company registration request for{' '}
              <span className="font-extrabold text-orange-600">{companyName}</span> has been
              received.
            </p>

            <div className="my-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-left text-xs space-y-2 text-slate-800">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>What happens next?</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                1. Our platform administrator will review your organization details.
                <br />
                2. Once approved, your admin account will be activated with login credentials:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {adminEmail || adminPhone}
                </span>
                .<br />
                3. Your primary office <span className="font-bold">"{officeName}"</span> will be
                pre-configured with its GPS geofence.
              </p>
            </div>

            <button
              onClick={onClose}
              className="btn-tactile w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ── Registration Request Form ── */
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-extrabold shadow-md shadow-orange-500/20 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Company Onboarding & Admin Registration
                  </h2>
                  <p className="text-xs text-slate-500">
                    Register your organization to provision a dedicated admin account, primary office geofence & cutoff rules
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* ── 2-Column Responsive Grid Layout ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* ── LEFT COLUMN: Org Profile & Admin Credentials ── */}
                <div className="space-y-4">
                  {/* ── Section 1: Company Profile ── */}
                  <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      1. Organization Profile
                    </span>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Company / Organization Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Acme Tech Solutions"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Industry
                        </label>
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        >
                          <option>Technology & Software</option>
                          <option>Manufacturing & Industrial</option>
                          <option>Healthcare & Pharma</option>
                          <option>Retail & E-commerce</option>
                          <option>Construction & Real Estate</option>
                          <option>Education & Training</option>
                          <option>Other Services</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Company Size
                        </label>
                        <select
                          value={companySize}
                          onChange={(e) => setCompanySize(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        >
                          <option>1-15 employees</option>
                          <option>16-50 employees</option>
                          <option>51-200 employees</option>
                          <option>200+ employees</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Website (Optional)
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://yourcompany.com"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Section 2: Administrator Credentials ── */}
                  <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      2. Company Admin Credentials
                    </span>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Admin Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Business Email <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                          <input
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            placeholder="admin@company.com"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                          <input
                            type="tel"
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value)}
                            placeholder="9876543210"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Desired Admin Password (min 6 chars) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT COLUMN: Office Geofence & Shift Cutoff ── */}
                <div className="space-y-4">
                  {/* ── Section 3: Primary Office Geofence ── */}
                  <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        3. Primary Office Setup
                      </span>
                      <button
                        type="button"
                        onClick={handleDetectGps}
                        disabled={detectingGps}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Compass className={`w-3 h-3 ${detectingGps ? 'animate-spin' : ''}`} />
                        <span>{detectingGps ? 'Detecting GPS...' : gpsDetected ? '✓ GPS Captured' : 'Detect My Location'}</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Office / Branch Name
                      </label>
                      <input
                        type="text"
                        value={officeName}
                        onChange={(e) => setOfficeName(e.target.value)}
                        placeholder="e.g. Pune Tech Park HQ"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={officeLat}
                          onChange={(e) => setOfficeLat(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={officeLng}
                          onChange={(e) => setOfficeLng(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Radius (m)
                        </label>
                        <input
                          type="number"
                          value={officeRadius}
                          onChange={(e) => setOfficeRadius(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Section 4: Daily Shift Cutoff & Auto-Logout ── */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                          4. Daily Shift Cutoff & Auto-Logout
                        </span>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={enableAutoLogout}
                          onChange={(e) => setEnableAutoLogout(e.target.checked)}
                          className="rounded text-orange-600 focus:ring-orange-500"
                        />
                        <span>Enabled</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Auto Check-Out Cutoff Time
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={autoLogoutTime}
                          onChange={(e) => setAutoLogoutTime(e.target.value)}
                          disabled={!enableAutoLogout}
                          className="px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50"
                        />
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: '11:59 PM (Midnight)', val: '23:59' },
                            { label: '10:00 PM', val: '22:00' },
                            { label: '08:00 PM', val: '20:00' },
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              disabled={!enableAutoLogout}
                              onClick={() => setAutoLogoutTime(preset.val)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                                autoLogoutTime === preset.val
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white hover:bg-amber-100/70 text-slate-700 border-amber-200'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-800/80 mt-1.5 leading-relaxed">
                        💡 If an employee forgets to check out before this time, the system will automatically log them out and mark their punch-out at the cutoff time. If they check out earlier, their exact logout time is preserved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bottom Section: Remarks & Submit (Full Width) ── */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Additional Remarks / Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Requesting multi-shift attendance setup, 50+ staff onboarding..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-tactile w-full py-3.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>SUBMIT COMPANY REGISTRATION REQUEST</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
