import React, { useState } from 'react';
import { UserPlus, Users, Shield, CheckCircle2, Edit2, Trash2, X, Save, Lock } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { BACKEND_API_URL } from '../lib/supabase';

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

  // Edit State
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('employee');

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || (!phone && !email)) {
      alert('Please fill in full name and at least a phone number or email address');
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/employees`, {
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
      const res = await fetch(`${BACKEND_API_URL}/api/employees/${id}`, {
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
      const res = await fetch(`${BACKEND_API_URL}/api/employees/${emp.id}`, {
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
    <div className="glass-panel p-4 rounded-2xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">User Roster & Access Control</h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{showForm ? 'Cancel' : 'Add User'}</span>
          </button>
        </div>

        {statusMsg && (
          <div className="mb-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Add User Form */}
        {showForm && (
          <form onSubmit={handleAddEmployee} className="panel-inset p-3 rounded-xl mb-3 space-y-2 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. David Miller"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Mobile Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Login Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Initial Password (e.g. 123456)"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                >
                  <option value="employee">Employee View</option>
                  <option value="admin">Admin Console</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all"
            >
              {loading ? 'Saving...' : 'Save User Profile'}
            </button>
          </form>
        )}

        {/* Employee List */}
        {employees.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            No users registered yet. Click "+ Add User" above.
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <div key={emp.id} className="panel-inset p-2.5 rounded-xl">
                {editingEmpId === emp.id ? (
                  /* Inline Edit View */
                  <div className="space-y-2 text-xs">
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                      placeholder="Full Name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                        placeholder="Mobile Phone"
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                        placeholder="Email Address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                        placeholder="New Password (optional)"
                      />
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold"
                      >
                        <option value="employee">Employee View</option>
                        <option value="admin">Admin Console</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end gap-1 pt-1">
                      <button
                        onClick={() => handleUpdateEmployee(emp.id)}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={() => setEditingEmpId(null)}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-1 text-[11px]"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Card View */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">
                        {emp.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                          {emp.full_name}
                          {emp.role === 'admin' && (
                            <span title="Admin User">
                              <Shield className="w-3 h-3 text-amber-500" />
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {emp.phone || emp.email || 'No contact specified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          emp.role === 'admin'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {emp.role === 'admin' ? 'Admin' : 'Employee'}
                      </span>
                      <button
                        onClick={() => startEdit(emp)}
                        title="Edit User"
                        className="p-1 text-slate-400 hover:text-amber-600 rounded-md transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp)}
                        title="Delete User"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
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
