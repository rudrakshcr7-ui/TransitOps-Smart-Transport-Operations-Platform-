import { useEffect, useState, useCallback } from 'react';
import { supabase, Driver, DriverStatus } from '../lib/supabase';
import { PageHeader, Button, Badge, Input, Select, TextArea, EmptyState, Spinner } from '../components/ui';
import { Modal, ConfirmDialog } from '../components/Modal';
import { Users, Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { parseISO, isAfter, format } from 'date-fns';

const statusConfig: Record<DriverStatus, { label: string; color: 'green' | 'blue' | 'gray' | 'red' }> = {
  available: { label: 'Available', color: 'green' },
  on_trip: { label: 'On Trip', color: 'blue' },
  off_duty: { label: 'Off Duty', color: 'gray' },
  suspended: { label: 'Suspended', color: 'red' },
};

interface FormState {
  full_name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  contact_number: string;
  safety_score: string;
  status: DriverStatus;
  notes: string;
}

const emptyForm: FormState = {
  full_name: '', license_number: '', license_category: '', license_expiry_date: '',
  contact_number: '', safety_score: '100', status: 'available', notes: '',
};

export function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('drivers').select('*').order('created_at', { ascending: false });
    setDrivers((data ?? []) as Driver[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const filtered = drivers.filter(d => {
    const matchSearch = !search ||
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.license_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({
      full_name: d.full_name,
      license_number: d.license_number,
      license_category: d.license_category,
      license_expiry_date: d.license_expiry_date,
      contact_number: d.contact_number ?? '',
      safety_score: String(d.safety_score),
      status: d.status,
      notes: d.notes ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.license_number.trim()) e.license_number = 'License number is required';
    if (!form.license_category.trim()) e.license_category = 'License category is required';
    if (!form.license_expiry_date) e.license_expiry_date = 'Expiry date is required';
    const score = Number(form.safety_score);
    if (isNaN(score) || score < 0 || score > 100) e.safety_score = 'Safety score must be 0–100';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      license_number: form.license_number.trim(),
      license_category: form.license_category.trim(),
      license_expiry_date: form.license_expiry_date,
      contact_number: form.contact_number.trim() || null,
      safety_score: Number(form.safety_score),
      status: form.status,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      await supabase.from('drivers').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('drivers').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchDrivers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('drivers').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchDrivers();
  };

  const isExpired = (date: string) => isAfter(new Date(), parseISO(date));
  const isExpiringSoon = (date: string) => {
    const exp = parseISO(date);
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    return isAfter(exp, new Date()) && isAfter(thirtyDays, exp);
  };

  return (
    <div>
      <PageHeader
        title="Driver Management"
        subtitle={`${drivers.length} drivers`}
        action={<Button onClick={openAdd}><Plus size={18} /> Add Driver</Button>}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or license #…"
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
            {(Object.keys(statusConfig) as DriverStatus[]).map(s => (
              <option key={s} value={s}>{statusConfig[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={<Users size={28} />}
            title="No drivers found"
            message={drivers.length === 0 ? "Add your first driver to get started." : "Try adjusting your filters."}
            action={drivers.length === 0 ? <Button onClick={openAdd}><Plus size={18} /> Add Driver</Button> : undefined}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">License #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">License Expiry</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Safety Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(d => {
                  const expired = isExpired(d.license_expiry_date);
                  const expiringSoon = isExpiringSoon(d.license_expiry_date);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{d.full_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{d.license_number}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{d.license_category}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-slate-600">{format(parseISO(d.license_expiry_date), 'MMM d, yyyy')}</span>
                          {expired && <AlertTriangle size={14} className="text-red-500" />}
                          {expiringSoon && !expired && <AlertTriangle size={14} className="text-amber-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`font-medium ${d.safety_score >= 80 ? 'text-green-600' : d.safety_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {d.safety_score}
                        </span>
                      </td>
                      <td className="px-4 py-3"><Badge color={statusConfig[d.status].color}>{statusConfig[d.status].label}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => setDeleteTarget(d)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Driver' : 'Add Driver'}>
        <div className="space-y-4">
          <Input label="Full Name" value={form.full_name} onChange={(v) => setForm(f => ({ ...f, full_name: v }))} placeholder="John Smith" required error={errors.full_name} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="License Number" value={form.license_number} onChange={(v) => setForm(f => ({ ...f, license_number: v }))} placeholder="DL-1234567" required error={errors.license_number} />
            <Input label="License Category" value={form.license_category} onChange={(v) => setForm(f => ({ ...f, license_category: v }))} placeholder="Class A" required error={errors.license_category} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="License Expiry Date" type="date" value={form.license_expiry_date} onChange={(v) => setForm(f => ({ ...f, license_expiry_date: v }))} required error={errors.license_expiry_date} />
            <Input label="Contact Number" value={form.contact_number} onChange={(v) => setForm(f => ({ ...f, contact_number: v }))} placeholder="+1 555-0100" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Safety Score (0–100)" type="number" value={form.safety_score} onChange={(v) => setForm(f => ({ ...f, safety_score: v }))} min="0" max="100" error={errors.safety_score} />
            <Select label="Status" value={form.status} onChange={(v) => setForm(f => ({ ...f, status: v as DriverStatus }))} options={(Object.keys(statusConfig) as DriverStatus[]).map(s => ({ value: s, label: statusConfig[s].label }))} />
          </div>
          <TextArea label="Notes" value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} placeholder="Additional driver details…" />
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
        title="Delete Driver"
        message={`Are you sure you want to delete driver "${deleteTarget?.full_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
