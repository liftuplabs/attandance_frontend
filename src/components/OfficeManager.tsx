import React, { useState } from 'react';
import { Building2, Plus, MapPin, Compass, CheckCircle2, Edit2, Trash2, X, Save } from 'lucide-react';
import { OfficeLocation } from '../types';
import { BACKEND_API_URL } from '../lib/api';

interface OfficeManagerProps {
  offices: OfficeLocation[];
  onOfficeAdded: (newOffice: OfficeLocation) => void;
  onOfficeUpdated: (updatedOffice: OfficeLocation) => void;
  onOfficeDeleted: (officeId: string) => void;
}

export const OfficeManager: React.FC<OfficeManagerProps> = ({
  offices,
  onOfficeAdded,
  onOfficeUpdated,
  onOfficeDeleted,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('150');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Edit State
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editRadiusMeters, setEditRadiusMeters] = useState('150');

  const handleUseCurrentLocation = (isEdit: boolean = false) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isEdit) {
          setEditLat(pos.coords.latitude.toFixed(6));
          setEditLng(pos.coords.longitude.toFixed(6));
        } else {
          setLat(pos.coords.latitude.toFixed(6));
          setLng(pos.coords.longitude.toFixed(6));
        }
      },
      (err) => {
        alert(`Failed to get location: ${err.message}`);
      }
    );
  };

  const handleAddOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !lat || !lng) {
      alert('Please fill in office name, latitude, and longitude');
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/offices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          lat: Number(lat),
          lng: Number(lng),
          radius_meters: Number(radiusMeters) || 150,
        }),
      });

      const data = await res.json();
      if (res.ok && data.office) {
        onOfficeAdded(data.office);
        setName('');
        setLat('');
        setLng('');
        setShowAddForm(false);
        setStatusMsg('Office added successfully!');
      } else {
        alert(data.error || 'Failed to add office');
      }
    } catch (err: any) {
      alert(`Error creating office: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (office: OfficeLocation) => {
    setEditingOfficeId(office.id);
    setEditName(office.name);
    setEditLat(String(office.lat));
    setEditLng(String(office.lng));
    setEditRadiusMeters(String(office.radius_meters));
  };

  const handleUpdateOffice = async (id: string) => {
    if (!editName || !editLat || !editLng) {
      alert('Office name, latitude, and longitude are required');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/offices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          lat: Number(editLat),
          lng: Number(editLng),
          radius_meters: Number(editRadiusMeters) || 150,
        }),
      });

      const data = await res.json();
      if (res.ok && data.office) {
        onOfficeUpdated(data.office);
        setEditingOfficeId(null);
        setStatusMsg(`Office "${data.office.name}" updated successfully!`);
      } else {
        alert(data.error || 'Failed to update office');
      }
    } catch (err: any) {
      alert(`Error updating office: ${err.message}`);
    }
  };

  const handleDeleteOffice = async (office: OfficeLocation) => {
    if (!window.confirm(`Are you sure you want to delete office location "${office.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/attendance/offices/${office.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        onOfficeDeleted(office.id);
        setStatusMsg(`Office "${office.name}" deleted successfully!`);
      } else {
        alert(data.error || 'Failed to delete office');
      }
    } catch (err: any) {
      alert(`Error deleting office: ${err.message}`);
    }
  };

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-3xl h-full flex flex-col justify-between">
      <div>
        {/* Header & Add Button */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Geofenced Locations</h2>
              <p className="text-xs text-slate-500">Perimeter radius management</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-tactile px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-slate-950 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Cancel' : 'Add Office'}</span>
          </button>
        </div>

        {statusMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{statusMsg}</span>
          </div>
        )}

        {/* Add Office Form */}
        {showAddForm && (
          <form onSubmit={handleAddOffice} className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 mb-4 space-y-3 text-xs shadow-sm">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Office Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Liftup Headquarters"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="12.971598"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="77.594562"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  placeholder="150"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => handleUseCurrentLocation(false)}
                className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-200 shadow-sm"
              >
                <Compass className="w-3.5 h-3.5 text-amber-500" />
                <span>Use Current GPS</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-tactile w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm transition-all mt-1"
            >
              {loading ? 'Saving...' : 'Save Office Location'}
            </button>
          </form>
        )}

        {/* Office Locations List */}
        {offices.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            No office locations added yet. Click "+ Add Office" above.
          </div>
        ) : (
          <div className="space-y-3">
            {offices.map((office) => (
              <div key={office.id} className="glass-panel-interactive p-4 rounded-2xl border border-slate-200/80">
                {editingOfficeId === office.id ? (
                  /* Inline Edit Form */
                  <div className="space-y-2.5 text-xs">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                      placeholder="Office Name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        value={editLat}
                        onChange={(e) => setEditLat(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                        placeholder="Latitude"
                      />
                      <input
                        type="number"
                        step="any"
                        value={editLng}
                        onChange={(e) => setEditLng(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                        placeholder="Longitude"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editRadiusMeters}
                          onChange={(e) => setEditRadiusMeters(e.target.value)}
                          className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-bold"
                          placeholder="Radius"
                        />
                        <button
                          type="button"
                          onClick={() => handleUseCurrentLocation(true)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-xl border border-slate-200"
                        >
                          GPS
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateOffice(office.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1 text-xs font-bold shadow-sm"
                        >
                          <Save className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          onClick={() => setEditingOfficeId(null)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl flex items-center gap-1 text-xs font-semibold"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Card View */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">
                          {office.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500 font-mono">
                            {Number(office.lat).toFixed(4)}, {Number(office.lng).toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-extrabold">
                        {office.radius_meters}m Radius
                      </span>
                      <button
                        onClick={() => startEdit(office)}
                        title="Edit Office"
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOffice(office)}
                        title="Delete Office"
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
