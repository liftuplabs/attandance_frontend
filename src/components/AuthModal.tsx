import React, { useState } from 'react';
import { Mail, Phone, KeyRound, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, RotateCcw, Lock } from 'lucide-react';
import { BACKEND_API_URL } from '../lib/api';
import { UserProfile } from '../types';

type Step =
  | 'identifier'   // enter email / phone
  | 'password'     // has password → enter it
  | 'otp'          // no password → OTP verification
  | 'setPassword'  // first-time password setup after OTP
  | 'forgotOtp'    // forgot-password: enter OTP
  | 'forgotSet';   // forgot-password: set new password

interface AuthModalProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

const BASE = BACKEND_API_URL + '/api/attendance/auth';

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [step, setStep]           = useState<Step>('identifier');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]   = useState('');
  const [newPass, setNewPass]     = useState('');
  const [newPass2, setNewPass2]   = useState('');
  const [otpToken, setOtpToken]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [info, setInfo]           = useState<string | null>(null);

  const formattedId = authMethod === 'email'
    ? identifier.trim().toLowerCase()
    : identifier.startsWith('+') ? identifier.trim() : `+91${identifier.trim()}`;

  const post = async (path: string, body: object) => {
    const res = await fetch(`${BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  };

  const reset = () => {
    setStep('identifier'); setError(null); setInfo(null);
    setPassword(''); setNewPass(''); setNewPass2(''); setOtpToken(''); setSetupToken('');
  };

  // ─── Step 1: check auth method ────────────────────────────────────────────
  const handleCheckMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) { setError('Please enter your email or phone'); return; }
    setLoading(true); setError(null); setInfo(null);
    try {
      const { ok, data } = await post('check-method', { identifier: formattedId });
      if (!ok) { setError(data.error || 'Failed to check account'); return; }
      if (!data.found) { setError('Account not found. Please contact your Admin.'); return; }
      if (data.hasPassword) {
        setStep('password');
      } else {
        // First time — send OTP
        const { ok: ok2, data: d2 } = await post('send-otp', { identifier: formattedId });
        if (!ok2) { setError(d2.error || 'Failed to send OTP'); return; }
        setInfo(d2.message);
        setStep('otp');
      }
    } catch { setError('Network error. Check your connection.'); }
    finally { setLoading(false); }
  };

  // ─── Step 2a: password login ───────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { ok, data } = await post('login', { identifier: formattedId, password });
      if (!ok) { setError(data.error); return; }
      onLoginSuccess(data.user);
    } catch { setError('Network error. Check your connection.'); }
    finally { setLoading(false); }
  };

  // ─── Step 2b: verify OTP (first-time setup) ───────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { ok, data } = await post('verify-otp', { identifier: formattedId, otpToken });
      if (!ok) { setError(data.error); return; }
      if (data.setupRequired && data.setupToken) {
        setSetupToken(data.setupToken);
        setInfo('OTP verified! Please set your password for future logins.');
        setStep('setPassword');
      } else {
        onLoginSuccess(data.user);
      }
    } catch { setError('Network error. Check your connection.'); }
    finally { setLoading(false); }
  };

  // ─── Step 3: set password (first time) ────────────────────────────────────
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== newPass2) { setError('Passwords do not match'); return; }
    if (newPass.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError(null);
    try {
      const { ok, data } = await post('set-password', { setupToken, newPassword: newPass });
      if (!ok) { setError(data.error); return; }
      onLoginSuccess(data.user);
    } catch { setError('Network error. Check your connection.'); }
    finally { setLoading(false); }
  };

  // ─── Forgot password: send OTP ────────────────────────────────────────────
  const handleForgotSend = async () => {
    if (!identifier.trim()) { setError('Enter your email/phone first'); return; }
    setLoading(true); setError(null);
    try {
      const { ok, data } = await post('forgot-password', { identifier: formattedId });
      if (!ok) { setError(data.error); return; }
      setInfo(data.message);
      setStep('forgotOtp');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  // ─── Forgot password: verify OTP ──────────────────────────────────────────
  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { ok, data } = await post('forgot-verify-otp', { identifier: formattedId, otpToken });
      if (!ok) { setError(data.error); return; }
      setSetupToken(data.setupToken);
      setInfo('OTP verified! Set your new password below.');
      setStep('forgotSet');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  // ─── Forgot password: set new password ────────────────────────────────────
  const handleForgotSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== newPass2) { setError('Passwords do not match'); return; }
    if (newPass.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError(null);
    try {
      const { ok, data } = await post('set-password', { setupToken, newPassword: newPass });
      if (!ok) { setError(data.error); return; }
      setInfo('Password reset! Please login with your new password.');
      reset();
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  const stepTitle: Record<Step, string> = {
    identifier:  'Sign In to Attendance',
    password:    'Enter Your Password',
    otp:         'Verify OTP Code',
    setPassword: 'Create Your Password',
    forgotOtp:   'Enter Reset OTP',
    forgotSet:   'Set New Password',
  };

  const stepSubtitle: Record<Step, string> = {
    identifier:  'Enter your registered email or phone',
    password:    'Use your account password to sign in',
    otp:         'A 6-digit code was sent to your email',
    setPassword: 'Set a strong password for future logins',
    forgotOtp:   'Enter the OTP sent to your email',
    forgotSet:   'Choose a new strong password',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100/90 backdrop-blur-md">
      <div className="w-full max-w-md p-6 sm:p-8 glass-panel rounded-3xl relative overflow-hidden">

        {/* Header */}
        <div className="text-center mb-6">
          <img src="/assets/Liftup-Logo.png" alt="LiftupLabs" className="h-14 w-auto mx-auto object-contain mb-3" />
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{stepTitle[step]}</h1>
          <p className="text-xs text-slate-500 mt-1">{stepSubtitle[step]}</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
          </div>
        )}
        {info && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600" /><span>{info}</span>
          </div>
        )}

        {/* ── STEP: identifier ── */}
        {step === 'identifier' && (
          <form onSubmit={handleCheckMethod} className="space-y-4">
            {/* Email / Phone toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              {(['email', 'phone'] as const).map((m) => (
                <button key={m} type="button"
                  onClick={() => { setAuthMethod(m); setError(null); setIdentifier(''); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${authMethod === m ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {m === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                  {m === 'email' ? 'Email' : 'Phone'}
                </button>
              ))}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {authMethod === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </div>
              <input type={authMethod === 'email' ? 'email' : 'tel'} value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder={authMethod === 'email' ? 'name@company.com' : '+91 98765 43210'}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* ── STEP: password ── */}
        {step === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <p className="text-xs text-slate-500 truncate">Signing in as <span className="font-semibold text-slate-800">{formattedId}</span></p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Your password"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" required />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /><span>Sign In</span></>}
            </button>
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-800 underline">← Back</button>
              <button type="button" disabled={loading} onClick={handleForgotSend}
                className="text-xs text-amber-600 hover:text-amber-800 font-semibold underline">
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {/* ── STEP: otp (first-time) ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs text-slate-500">OTP sent to <span className="font-semibold text-slate-800">{formattedId}</span></p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><KeyRound className="w-4 h-4" /></div>
              <input type="text" maxLength={6} value={otpToken}
                onChange={e => setOtpToken(e.target.value)} placeholder="123456"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center font-mono text-lg tracking-widest" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /><span>Verify OTP</span></>}
            </button>
            <button type="button" onClick={reset} className="w-full text-xs text-slate-500 hover:text-slate-800 underline">← Back to login</button>
          </form>
        )}

        {/* ── STEP: setPassword (first-time) ── */}
        {(step === 'setPassword' || step === 'forgotSet') && (
          <form onSubmit={step === 'setPassword' ? handleSetPassword : handleForgotSet} className="space-y-3">
            {['New Password', 'Confirm Password'].map((label, i) => (
              <div key={i} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Lock className="w-4 h-4" /></div>
                <input type={showPw ? 'text' : 'password'}
                  value={i === 0 ? newPass : newPass2}
                  onChange={e => i === 0 ? setNewPass(e.target.value) : setNewPass2(e.target.value)}
                  placeholder={label} minLength={6}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" required />
                {i === 1 && (
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            ))}
            <p className="text-[11px] text-slate-400">Password must be at least 6 characters.</p>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /><span>Set Password & Sign In</span></>}
            </button>
          </form>
        )}

        {/* ── STEP: forgotOtp ── */}
        {step === 'forgotOtp' && (
          <form onSubmit={handleForgotVerify} className="space-y-4">
            <p className="text-xs text-slate-500">Password reset OTP sent to <span className="font-semibold text-slate-800">{formattedId}</span></p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><KeyRound className="w-4 h-4" /></div>
              <input type="text" maxLength={6} value={otpToken}
                onChange={e => setOtpToken(e.target.value)} placeholder="123456"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center font-mono text-lg tracking-widest" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /><span>Verify Reset OTP</span></>}
            </button>
            <button type="button" onClick={reset} className="w-full text-xs text-slate-500 hover:text-slate-800 underline">← Back to login</button>
          </form>
        )}

        {/* Back link for non-identifier steps (except handled above) */}
        {step === 'otp' || step === 'setPassword' ? null : null}

        {/* Resend OTP link */}
        {(step === 'otp' || step === 'forgotOtp') && (
          <div className="mt-4 text-center">
            <button type="button" disabled={loading}
              onClick={() => step === 'otp' ? post('send-otp', { identifier: formattedId }) : handleForgotSend()}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 transition-colors">
              <RotateCcw className="w-3 h-3" /> Resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
