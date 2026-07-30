import React, { useState } from 'react';
import { Building2, Plus, MapPin, Compass, CheckCircle2, Edit2, Trash2, X, Save } from 'lucide-react';
import { OfficeLocation } from '../types';
import { BACKEND_API_URL } from '../lib/supabase';

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
      const res = await fetch(`${BACKEND_API_URL}/api/offices`, {
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
      const res = await fetch(`${BACKEND_API_URL}/api/offices/${id}`, {
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
      const res = await fetch(`${BACKEND_API_URL}/api/offices/${office.id}`, {
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
    <div className="glass-panel p-4 rounded-2xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Geofenced Office Locations</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancel' : 'Add Office'}</span>
          </button>
        </div>

        {statusMsg && (
          <div className="mb-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Add Office Form */}
        {showAddForm && (
          <form onSubmit={handleAddOffice} className="panel-inset p-3 rounded-xl mb-3 space-y-2 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Office Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HQ Downtown"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="12.971598"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="77.594562"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 items-end">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Radius (Meters)</label>
                <input
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  placeholder="150"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => handleUseCurrentLocation(false)}
                className="py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors border border-slate-200 shadow-sm"
              >
                <Compass className="w-3 h-3 text-amber-500" />
                <span>Use Current GPS</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all"
            >
              {loading ? 'Saving...' : 'Save Office Location'}
            </button>
          </form>
        )}

        {/* Office Locations List */}
        {offices.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            No office locations added yet. Click "+ Add Office" above.
          </div>
        ) : (
          <div className="space-y-2">
            {offices.map((office) => (
              <div key={office.id} className="panel-inset p-3 rounded-xl">
                {editingOfficeId === office.id ? (
                  /* Inline Edit Form */
                  <div className="space-y-2 text-xs">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                      placeholder="Office Name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        value={editLat}
                        onChange={(e) => setEditLat(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                        placeholder="Latitude"
                      />
                      <input
                        type="number"
                        step="any"
                        value={editLng}
                        onChange={(e) => setEditLng(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                        placeholder="Longitude"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={editRadiusMeters}
                          onChange={(e) => setEditRadiusMeters(e.target.value)}
                          className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                          placeholder="Radius (m)"
                        />
                        <button
                          type="button"
                          onClick={() => handleUseCurrentLocation(true)}
                          className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[10px] rounded-lg border border-slate-200"
                        >
                          GPS
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateOffice(office.id)}
                          className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                        <button
                          onClick={() => setEditingOfficeId(null)}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-1 text-[11px]"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Card View */
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        {office.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Lat: {Number(office.lat).toFixed(4)}, Lng: {Number(office.lng).toFixed(4)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold">
                        {office.radius_meters}m Radius
                      </span>
                      <button
                        onClick={() => startEdit(office)}
                        title="Edit Office"
                        className="p-1 text-slate-400 hover:text-amber-600 rounded-md transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOffice(office)}
                        title="Delete Office"
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
