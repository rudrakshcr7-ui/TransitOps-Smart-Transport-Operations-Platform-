import { useEffect, useState, useCallback } from 'react';
import { supabase, Expense, Vehicle, ExpenseCategory } from '../lib/supabase';
import { PageHeader, Button, Badge, Input, Select, TextArea, EmptyState, Spinner } from '../components/ui';
import { Modal, ConfirmDialog } from '../components/Modal';
import { Receipt, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const categoryLabels: Record<ExpenseCategory, string> = {
  toll: 'Toll', repair: 'Repair', insurance: 'Insurance', permit: 'Permit', tire: 'Tire', other: 'Other',
};

const categoryColors: Record<ExpenseCategory, 'blue' | 'amber' | 'green' | 'purple' | 'gray' | 'red'> = {
  toll: 'blue', repair: 'amber', insurance: 'green', permit: 'purple', tire: 'red', other: 'gray',
};

interface FormState {
  vehicle_id: string;
  category: ExpenseCategory;
  amount: string;
  description: string;
  expense_date: string;
  notes: string;
}

const emptyForm: FormState = {
  vehicle_id: '', category: 'other', amount: '', description: '', expense_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
};

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [expRes, vehRes] = await Promise.all([
      supabase.from('expenses').select('*, vehicle:vehicles(id,registration_number,name)').order('expense_date', { ascending: false }),
      supabase.from('vehicles').select('*').order('name'),
    ]);
    setExpenses((expRes.data ?? []) as Expense[]);
    setVehicles((vehRes.data ?? []) as Vehicle[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = expenses.filter(e => {
    const matchSearch = !search ||
      (e.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.vehicle?.registration_number ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || e.category === categoryFilter;
    const matchVehicle = !vehicleFilter || e.vehicle_id === vehicleFilter;
    return matchSearch && matchCategory && matchVehicle;
  });

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  // Per-vehicle cost breakdown
  const vehicleCostBreakdown = vehicles.map(v => {
    const expCost = expenses.filter(e => e.vehicle_id === v.id).reduce((s, e) => s + e.amount, 0);
    return { vehicle: v, expenses: expCost, total: expCost };
  }).filter(v => v.total > 0).sort((a, b) => b.total - a.total);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, expense_date: format(new Date(), 'yyyy-MM-dd') });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      vehicle_id: e.vehicle_id ?? '',
      category: e.category,
      amount: String(e.amount),
      description: e.description ?? '',
      expense_date: e.expense_date,
      notes: e.notes ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.amount || Number(form.amount) < 0) e.amount = 'Enter a valid amount';
    if (!form.expense_date) e.expense_date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      vehicle_id: form.vehicle_id || null,
      category: form.category,
      amount: Number(form.amount),
      description: form.description.trim() || null,
      expense_date: form.expense_date,
      notes: form.notes.trim() || null,
      created_by: userData.user?.id ?? null,
    };
    if (editing) {
      await supabase.from('expenses').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('expenses').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('expenses').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} entries`}
        action={<Button onClick={openAdd}><Plus size={18} /> Add Expense</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-800">${totalAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Per-vehicle breakdown */}
      {vehicleCostBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Cost Breakdown by Vehicle</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expense Cost</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicleCostBreakdown.map(({ vehicle, expenses: expCost, total }) => (
                  <tr key={vehicle.id}>
                    <td className="py-2.5 text-sm font-medium text-slate-800">{vehicle.registration_number} — {vehicle.name}</td>
                    <td className="py-2.5 text-sm text-slate-600 text-right">${expCost.toFixed(2)}</td>
                    <td className="py-2.5 text-sm font-bold text-slate-800 text-right">${total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Categories</option>
            {(Object.keys(categoryLabels) as ExpenseCategory[]).map(c => (
              <option key={c} value={c}>{categoryLabels[c]}</option>
            ))}
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
            icon={<Receipt size={28} />}
            title="No expenses found"
            message={expenses.length === 0 ? "Add your first expense entry." : "Try adjusting your filters."}
            action={expenses.length === 0 ? <Button onClick={openAdd}><Plus size={18} /> Add Expense</Button> : undefined}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600">{format(parseISO(e.expense_date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3"><Badge color={categoryColors[e.category]}>{categoryLabels[e.category]}</Badge></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{e.vehicle?.registration_number ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{e.description ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">${e.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setDeleteTarget(e)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category}
              onChange={(v) => setForm(f => ({ ...f, category: v as ExpenseCategory }))}
              options={(Object.keys(categoryLabels) as ExpenseCategory[]).map(c => ({ value: c, label: categoryLabels[c] }))}
            />
            <Input label="Amount ($)" type="number" value={form.amount} onChange={(v) => setForm(f => ({ ...f, amount: v }))} placeholder="0" min="0" step="0.01" required error={errors.amount} />
          </div>
          <Select
            label="Vehicle (optional)"
            value={form.vehicle_id}
            onChange={(v) => setForm(f => ({ ...f, vehicle_id: v }))}
            options={vehicles.map(v => ({ value: v.id, label: `${v.registration_number} (${v.name})` }))}
            placeholder="No vehicle"
          />
          <Input label="Date" type="date" value={form.expense_date} onChange={(v) => setForm(f => ({ ...f, expense_date: v }))} required error={errors.expense_date} />
          <TextArea label="Description" value={form.description} onChange={(v) => setForm(f => ({ ...f, description: v }))} placeholder="What was this expense for…" />
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
        title="Delete Expense"
        message="Are you sure you want to delete this expense entry?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
