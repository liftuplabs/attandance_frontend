import React, { useState } from 'react';
import { UserPlus, Users, CheckCircle2, Edit2, Trash2, X, Save, Lock, Eye, EyeOff, KeyRound, Copy, Check } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { BACKEND_API_URL } from '../lib/api';

interface EmployeeManagerProps {
  employees: UserProfile[];
  onEmployeeAdded: (newEmp: UserProfile) => void;
  onEmployeeUpdated: (updatedEmp: UserProfile) => void;
  onEmployeeDeleted: (empId: string) => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  onEmployeeAdded,
  onEmployeeUpdated,
  onEmployeeDeleted,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<UserRole>('employee');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Password visibility & copy state for admin inspection
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddPw, setShowAddPw] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);

  // Edit State
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('employee');

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyPassword = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || (!phone && !email)) {
      alert('Please fill in full name and at least a phone number or email address');
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          email,
          password: password || '123456',
          role,
        }),
      });

      const data = await res.json();
      if (res.ok && data.employee) {
        onEmployeeAdded(data.employee);
        setFullName('');
        setPhone('');
        setEmail('');
        setPassword('123456');
        setShowForm(false);
        setStatusMsg(`User profile ${data.employee.full_name} (${data.employee.role}) added successfully!`);
      } else {
        alert(data.error || 'Failed to add employee');
      }
    } catch (err: any) {
      alert(`Error adding employee: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (emp: UserProfile) => {
    setEditingEmpId(emp.id);
    setEditFullName(emp.full_name);
    setEditPhone(emp.phone || '');
    setEditEmail(emp.email || '');
    setEditPassword(emp.password || '');
    setEditRole(emp.role);
  };

  const handleUpdateEmployee = async (id: string) => {
    if (!editFullName || (!editPhone && !editEmail)) {
      alert('Full name and at least phone or email are required');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editFullName,
          phone: editPhone,
          email: editEmail,
          password: editPassword,
          role: editRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.employee) {
        onEmployeeUpdated(data.employee);
        setEditingEmpId(null);
        setStatusMsg(`Profile ${data.employee.full_name} updated successfully!`);
      } else {
        alert(data.error || 'Failed to update employee');
      }
    } catch (err: any) {
      alert(`Error updating employee: ${err.message}`);
    }
  };

  const handleDeleteEmployee = async (emp: UserProfile) => {
    if (!window.confirm(`Are you sure you want to delete ${emp.full_name}?`)) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/employees/${emp.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        onEmployeeDeleted(emp.id);
        setStatusMsg(`User ${emp.full_name} deleted successfully!`);
      } else {
        alert(data.error || 'Failed to delete employee');
      }
    } catch (err: any) {
      alert(`Error deleting employee: ${err.message}`);
    }
  };

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-3xl h-full flex flex-col justify-between">
      <div>
        {/* Header & Add Button */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Staff Directory</h2>
              <p className="text-xs text-slate-500">Access control & staff credentials</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-tactile px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-slate-950 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>{showForm ? 'Cancel' : 'Add User'}</span>
          </button>
        </div>

        {statusMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{statusMsg}</span>
          </div>
        )}

        {/* Add User Form */}
        {showForm && (
          <form onSubmit={handleAddEmployee} className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 mb-4 space-y-3 text-xs shadow-sm">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. David Miller"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Login Password</label>
                <div className="relative">
                  <input
                    type={showAddPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Initial Password (e.g. 123456)"
                    className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPw(!showAddPw)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showAddPw ? 'Hide password' : 'View password'}
                  >
                    {showAddPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                >
                  <option value="employee">Employee View</option>
                  <option value="admin">Admin Console</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-tactile w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm transition-all mt-1"
            >
              {loading ? 'Saving...' : 'Save User Profile'}
            </button>
          </form>
        )}

        {/* Employee List */}
        {employees.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            No users registered yet. Click "+ Add User" above.
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((emp) => (
              <div key={emp.id} className="glass-panel-interactive p-4 rounded-2xl border border-slate-200/80">
                {editingEmpId === emp.id ? (
                  /* Inline Edit View */
                  <div className="space-y-2.5 text-xs">
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-bold"
                      placeholder="Full Name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                        placeholder="Mobile Phone"
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                        placeholder="Email Address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type={showEditPw ? 'text' : 'password'}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                          placeholder="Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPw(!showEditPw)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          title={showEditPw ? 'Hide password' : 'View password'}
                        >
                          {showEditPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-bold"
                      >
                        <option value="employee">Employee View</option>
                        <option value="admin">Admin Console</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => handleUpdateEmployee(emp.id)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1 text-xs font-bold shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        onClick={() => setEditingEmpId(null)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl flex items-center gap-1 text-xs font-semibold"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Card View */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-sm shadow-amber-500/20 shrink-0 mt-0.5">
                        {emp.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-900 truncate">
                          {emp.full_name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {emp.phone || emp.email || 'No contact specified'}
                        </p>

                        {/* Admin Password Inspection Pill */}
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-[11px] font-mono shadow-xs">
                            <KeyRound className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">PW:</span>
                            <span className="text-slate-800 font-bold tracking-wider px-1">
                              {visiblePasswords[emp.id]
                                ? (emp.password || '123456')
                                : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(emp.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-white transition-all cursor-pointer"
                              title={visiblePasswords[emp.id] ? "Hide Password" : "View Password"}
                            >
                              {visiblePasswords[emp.id] ? (
                                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(emp.id, emp.password || '123456')}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-all cursor-pointer"
                              title="Copy Password"
                            >
                              {copiedId === emp.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                          emp.role === 'admin'
                            ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                            : 'bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}
                      >
                        {emp.role === 'admin' ? 'Admin' : 'Employee'}
                      </span>
                      <button
                        onClick={() => startEdit(emp)}
                        title="Edit User"
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp)}
                        title="Delete User"
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
