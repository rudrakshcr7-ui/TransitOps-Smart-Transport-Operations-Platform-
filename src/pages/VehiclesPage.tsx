import { useEffect, useState, useCallback } from 'react';
import { supabase, Vehicle, VehicleType, VehicleStatus } from '../lib/supabase';
import { PageHeader, Button, Badge, Input, Select, TextArea, EmptyState, Spinner } from '../components/ui';
import { Modal, ConfirmDialog } from '../components/Modal';
import { Truck, Plus, Search, Pencil, Trash2, AlertCircle } from 'lucide-react';

const typeLabels: Record<VehicleType, string> = {
  truck: 'Truck', van: 'Van', bus: 'Bus', motorcycle: 'Motorcycle', car: 'Car', other: 'Other',
};

const statusConfig: Record<VehicleStatus, { label: string; color: 'green' | 'blue' | 'amber' | 'gray' }> = {
  available: { label: 'Available', color: 'green' },
  on_trip: { label: 'On Trip', color: 'blue' },
  in_shop: { label: 'In Shop', color: 'amber' },
  retired: { label: 'Retired', color: 'gray' },
};

interface FormState {
  registration_number: string;
  name: string;
  type: VehicleType;
  max_load_capacity: string;
  odometer: string;
  acquisition_cost: string;
  status: VehicleStatus;
  region: string;
  notes: string;
}

const emptyForm: FormState = {
  registration_number: '', name: '', type: 'truck', max_load_capacity: '', odometer: '',
  acquisition_cost: '', status: 'available', region: '', notes: '',
};

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    setVehicles((data ?? []) as Vehicle[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const filtered = vehicles.filter(v => {
    const matchSearch = !search ||
      v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || v.status === statusFilter;
    const matchType = !typeFilter || v.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      registration_number: v.registration_number,
      name: v.name,
      type: v.type,
      max_load_capacity: String(v.max_load_capacity),
      odometer: String(v.odometer),
      acquisition_cost: String(v.acquisition_cost),
      status: v.status,
      region: v.region ?? '',
      notes: v.notes ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.registration_number.trim()) e.registration_number = 'Registration number is required';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.max_load_capacity || Number(form.max_load_capacity) < 0) e.max_load_capacity = 'Enter a valid capacity';
    if (Number(form.odometer) < 0) e.odometer = 'Enter a valid odometer';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      registration_number: form.registration_number.trim(),
      name: form.name.trim(),
      type: form.type,
      max_load_capacity: Number(form.max_load_capacity),
      odometer: Number(form.odometer),
      acquisition_cost: Number(form.acquisition_cost),
      status: form.status,
      region: form.region.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      await supabase.from('vehicles').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('vehicles').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchVehicles();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.status === 'on_trip') {
      setDeleteError('Cannot delete a vehicle that is currently On Trip.');
      return;
    }
    await supabase.from('vehicles').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setDeleteError(null);
    fetchVehicles();
  };

  return (
    <div>
      <PageHeader
        title="Vehicle Registry"
        subtitle={`${vehicles.length} vehicles in fleet`}
        action={<Button onClick={openAdd}><Plus size={18} /> Add Vehicle</Button>}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reg # or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Statuses</option>
            {(Object.keys(statusConfig) as VehicleStatus[]).map(s => (
              <option key={s} value={s}>{statusConfig[s].label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Types</option>
            {(Object.keys(typeLabels) as VehicleType[]).map(t => (
              <option key={t} value={t}>{typeLabels[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={<Truck size={28} />}
            title="No vehicles found"
            message={vehicles.length === 0 ? "Get started by adding your first vehicle." : "Try adjusting your filters."}
            action={vehicles.length === 0 ? <Button onClick={openAdd}><Plus size={18} /> Add Vehicle</Button> : undefined}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reg #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Max Load (kg)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Odometer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Region</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{v.registration_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{v.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{typeLabels[v.type]}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{v.max_load_capacity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{v.odometer.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge color={statusConfig[v.status].color}>{statusConfig[v.status].label}</Badge></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{v.region ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => { setDeleteError(null); setDeleteTarget(v); }} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Vehicle' : 'Add Vehicle'}>
        <div className="space-y-4">
          <Input label="Registration Number" value={form.registration_number} onChange={(v) => setForm(f => ({ ...f, registration_number: v }))} placeholder="ABC-1234" required error={errors.registration_number} />
          <Input label="Name" value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} placeholder="Freightliner Cascadia" required error={errors.name} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={(v) => setForm(f => ({ ...f, type: v as VehicleType }))} options={(Object.keys(typeLabels) as VehicleType[]).map(t => ({ value: t, label: typeLabels[t] }))} />
            <Select label="Status" value={form.status} onChange={(v) => setForm(f => ({ ...f, status: v as VehicleStatus }))} options={(Object.keys(statusConfig) as VehicleStatus[]).map(s => ({ value: s, label: statusConfig[s].label }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Load Capacity (kg)" type="number" value={form.max_load_capacity} onChange={(v) => setForm(f => ({ ...f, max_load_capacity: v }))} placeholder="20000" required error={errors.max_load_capacity} min="0" />
            <Input label="Odometer (km)" type="number" value={form.odometer} onChange={(v) => setForm(f => ({ ...f, odometer: v }))} placeholder="0" min="0" error={errors.odometer} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Acquisition Cost ($)" type="number" value={form.acquisition_cost} onChange={(v) => setForm(f => ({ ...f, acquisition_cost: v }))} placeholder="0" min="0" />
            <Input label="Region" value={form.region} onChange={(v) => setForm(f => ({ ...f, region: v }))} placeholder="North" />
          </div>
          <TextArea label="Notes" value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} placeholder="Additional vehicle details…" />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Delete Vehicle"
        message={deleteError ?? `Are you sure you want to delete vehicle "${deleteTarget?.registration_number}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
      {deleteError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2 shadow-lg z-50">
          <AlertCircle size={18} />
          {deleteError}
        </div>
      )}
    </div>
  );
}
