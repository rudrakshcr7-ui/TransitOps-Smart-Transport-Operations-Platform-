import { useEffect, useState, useCallback } from 'react';
import { supabase, MaintenanceLog, Vehicle, MaintenanceStatus } from '../lib/supabase';
import { PageHeader, Button, Badge, Input, Select, TextArea, EmptyState, Spinner } from '../components/ui';
import { Modal, ConfirmDialog } from '../components/Modal';
import { Wrench, Plus, Search, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusConfig: Record<MaintenanceStatus, { label: string; color: 'amber' | 'green' }> = {
  active: { label: 'Active', color: 'amber' },
  closed: { label: 'Closed', color: 'green' },
};

interface FormState {
  vehicle_id: string;
  maintenance_type: string;
  description: string;
  cost: string;
  odometer_at_service: string;
  notes: string;
}

const emptyForm: FormState = {
  vehicle_id: '', maintenance_type: '', description: '', cost: '', odometer_at_service: '', notes: '',
};

export function MaintenancePage() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceLog | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceLog | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [logsRes, vehiclesRes] = await Promise.all([
      supabase.from('maintenance_logs').select('*, vehicle:vehicles(id,registration_number,name)').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*').order('name'),
    ]);
    setLogs((logsRes.data ?? []) as MaintenanceLog[]);
    setVehicles((vehiclesRes.data ?? []) as Vehicle[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = logs.filter(m => {
    const matchSearch = !search ||
      m.maintenance_type.toLowerCase().includes(search.toLowerCase()) ||
      (m.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || m.status === statusFilter;
    const matchVehicle = !vehicleFilter || m.vehicle_id === vehicleFilter;
    return matchSearch && matchStatus && matchVehicle;
  });

  const inShopVehicles = vehicles.filter(v => v.status === 'in_shop');

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (m: MaintenanceLog) => {
    setEditing(m);
    setForm({
      vehicle_id: m.vehicle_id,
      maintenance_type: m.maintenance_type,
      description: m.description ?? '',
      cost: String(m.cost),
      odometer_at_service: m.odometer_at_service ? String(m.odometer_at_service) : '',
      notes: m.notes ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vehicle_id) e.vehicle_id = 'Select a vehicle';
    if (!form.maintenance_type.trim()) e.maintenance_type = 'Type is required';
    if (!form.cost || Number(form.cost) < 0) e.cost = 'Enter a valid cost';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      vehicle_id: form.vehicle_id,
      maintenance_type: form.maintenance_type.trim(),
      description: form.description.trim() || null,
      cost: Number(form.cost),
      odometer_at_service: form.odometer_at_service ? Number(form.odometer_at_service) : null,
      notes: form.notes.trim() || null,
      created_by: userData.user?.id ?? null,
    };
    if (editing) {
      await supabase.from('maintenance_logs').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('maintenance_logs').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleClose = async (m: MaintenanceLog) => {
    await supabase.from('maintenance_logs').update({ status: 'closed' }).eq('id', m.id);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('maintenance_logs').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle={`${logs.length} records`}
        action={<Button onClick={openAdd}><Plus size={18} /> Log Maintenance</Button>}
      />

      {/* In Shop banner */}
      {inShopVehicles.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={18} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Vehicles Currently In Shop ({inShopVehicles.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {inShopVehicles.map(v => (
              <span key={v.id} className="text-xs bg-white border border-amber-200 rounded-lg px-3 py-1 text-amber-700">
                {v.registration_number} — {v.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by type or description…"
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
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.registration_number}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={<Wrench size={28} />}
            title="No maintenance records"
            message={logs.length === 0 ? "Log your first maintenance record." : "Try adjusting your filters."}
            action={logs.length === 0 ? <Button onClick={openAdd}><Plus size={18} /> Log Maintenance</Button> : undefined}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{m.maintenance_type}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.vehicle?.registration_number ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{m.description ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">${m.cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{format(parseISO(m.started_at), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3"><Badge color={statusConfig[m.status].color}>{statusConfig[m.status].label}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {m.status === 'active' && (
                          <button onClick={() => handleClose(m)} title="Close" className="p-1.5 rounded-lg text-slate-500 hover:bg-green-50 hover:text-green-600 transition-colors">
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Maintenance Record' : 'Log Maintenance'}>
        <div className="space-y-4">
          <Select
            label="Vehicle"
            value={form.vehicle_id}
            onChange={(v) => setForm(f => ({ ...f, vehicle_id: v }))}
            options={vehicles.map(v => ({ value: v.id, label: `${v.registration_number} (${v.name})` }))}
            placeholder="Select vehicle"
            required
            error={errors.vehicle_id}
          />
          <Input label="Maintenance Type" value={form.maintenance_type} onChange={(v) => setForm(f => ({ ...f, maintenance_type: v }))} placeholder="Oil change, brake repair…" required error={errors.maintenance_type} />
          <TextArea label="Description" value={form.description} onChange={(v) => setForm(f => ({ ...f, description: v }))} placeholder="What was done…" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost ($)" type="number" value={form.cost} onChange={(v) => setForm(f => ({ ...f, cost: v }))} placeholder="0" min="0" required error={errors.cost} />
            <Input label="Odometer at Service (km)" type="number" value={form.odometer_at_service} onChange={(v) => setForm(f => ({ ...f, odometer_at_service: v }))} placeholder="0" min="0" />
          </div>
          <TextArea label="Notes" value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} placeholder="Additional notes…" />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Maintenance Record"
        message="Are you sure you want to delete this maintenance record? This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
