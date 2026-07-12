import { useEffect, useState, useCallback } from 'react';
import { supabase, FuelLog, Vehicle } from '../lib/supabase';
import { PageHeader, Button, Input, Select, TextArea, EmptyState, Spinner } from '../components/ui';
import { Modal, ConfirmDialog } from '../components/Modal';
import { Fuel, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface FormState {
  vehicle_id: string;
  liters: string;
  cost_per_liter: string;
  odometer_reading: string;
  filled_at: string;
  notes: string;
}

const emptyForm: FormState = {
  vehicle_id: '', liters: '', cost_per_liter: '', odometer_reading: '', filled_at: '', notes: '',
};

export function FuelPage() {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FuelLog | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FuelLog | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [logsRes, vehiclesRes] = await Promise.all([
      supabase.from('fuel_logs').select('*, vehicle:vehicles(id,registration_number,name)').order('filled_at', { ascending: false }),
      supabase.from('vehicles').select('*').order('name'),
    ]);
    setLogs((logsRes.data ?? []) as FuelLog[]);
    setVehicles((vehiclesRes.data ?? []) as Vehicle[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      (l.vehicle?.registration_number ?? '').toLowerCase().includes(search.toLowerCase());
    const matchVehicle = !vehicleFilter || l.vehicle_id === vehicleFilter;
    return matchSearch && matchVehicle;
  });

  const totalCost = filtered.reduce((s, l) => s + l.total_cost, 0);
  const totalLiters = filtered.reduce((s, l) => s + l.liters, 0);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, filled_at: new Date().toISOString().slice(0, 16) });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (l: FuelLog) => {
    setEditing(l);
    setForm({
      vehicle_id: l.vehicle_id,
      liters: String(l.liters),
      cost_per_liter: String(l.cost_per_liter),
      odometer_reading: l.odometer_reading ? String(l.odometer_reading) : '',
      filled_at: format(parseISO(l.filled_at), "yyyy-MM-dd'T'HH:mm"),
      notes: l.notes ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vehicle_id) e.vehicle_id = 'Select a vehicle';
    if (!form.liters || Number(form.liters) <= 0) e.liters = 'Liters must be > 0';
    if (!form.cost_per_liter || Number(form.cost_per_liter) < 0) e.cost_per_liter = 'Enter a valid price';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      vehicle_id: form.vehicle_id,
      liters: Number(form.liters),
      cost_per_liter: Number(form.cost_per_liter),
      odometer_reading: form.odometer_reading ? Number(form.odometer_reading) : null,
      filled_at: form.filled_at ? new Date(form.filled_at).toISOString() : new Date().toISOString(),
      notes: form.notes.trim() || null,
      created_by: userData.user?.id ?? null,
    };
    if (editing) {
      await supabase.from('fuel_logs').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('fuel_logs').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('fuel_logs').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <div>
      <PageHeader
        title="Fuel Logs"
        subtitle={`${logs.length} entries`}
        action={<Button onClick={openAdd}><Plus size={18} /> Log Fuel</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Fuel Cost</p>
          <p className="text-2xl font-bold text-slate-800">${totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Liters</p>
          <p className="text-2xl font-bold text-slate-800">{totalLiters.toFixed(1)} L</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Avg Cost / Liter</p>
          <p className="text-2xl font-bold text-slate-800">
            ${totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vehicle reg #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
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
            icon={<Fuel size={28} />}
            title="No fuel logs"
            message={logs.length === 0 ? "Log your first fuel entry." : "Try adjusting your filters."}
            action={logs.length === 0 ? <Button onClick={openAdd}><Plus size={18} /> Log Fuel</Button> : undefined}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Liters</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost/L</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Odometer</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600">{format(parseISO(l.filled_at), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{l.vehicle?.registration_number ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{l.liters.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">${l.cost_per_liter.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">${l.total_cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{l.odometer_reading?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setDeleteTarget(l)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Fuel Log' : 'Log Fuel'}>
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
          <div className="grid grid-cols-2 gap-4">
            <Input label="Liters" type="number" value={form.liters} onChange={(v) => setForm(f => ({ ...f, liters: v }))} placeholder="0" min="0" step="0.01" required error={errors.liters} />
            <Input label="Cost per Liter ($)" type="number" value={form.cost_per_liter} onChange={(v) => setForm(f => ({ ...f, cost_per_liter: v }))} placeholder="0" min="0" step="0.01" required error={errors.cost_per_liter} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Odometer (km)" type="number" value={form.odometer_reading} onChange={(v) => setForm(f => ({ ...f, odometer_reading: v }))} placeholder="0" min="0" />
            <Input label="Date" type="datetime-local" value={form.filled_at} onChange={(v) => setForm(f => ({ ...f, filled_at: v }))} />
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
        title="Delete Fuel Log"
        message="Are you sure you want to delete this fuel log entry?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
