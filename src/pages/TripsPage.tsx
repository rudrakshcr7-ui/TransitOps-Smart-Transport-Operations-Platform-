import { useEffect, useState, useCallback } from 'react';
import { supabase, Trip, Vehicle, Driver, TripStatus } from '../lib/supabase';
import { PageHeader, Button, Badge, Input, Select, TextArea, EmptyState, Spinner } from '../components/ui';
import { Modal, ConfirmDialog } from '../components/Modal';
import { ClipboardList, Plus, Search, MapPin, Truck, Users, CheckCircle, XCircle, Play, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusConfig: Record<TripStatus, { label: string; color: 'gray' | 'blue' | 'green' | 'red' }> = {
  draft: { label: 'Draft', color: 'gray' },
  dispatched: { label: 'Dispatched', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};

interface FormState {
  vehicle_id: string;
  driver_id: string;
  origin: string;
  destination: string;
  cargo_weight: string;
  planned_distance: string;
  scheduled_at: string;
  revenue: string;
  notes: string;
}

const emptyForm: FormState = {
  vehicle_id: '', driver_id: '', origin: '', destination: '', cargo_weight: '',
  planned_distance: '', scheduled_at: '', revenue: '', notes: '',
};

export function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionTrip, setActionTrip] = useState<Trip | null>(null);
  const [actionType, setActionType] = useState<'complete' | 'cancel' | null>(null);
  const [completeForm, setCompleteForm] = useState({ end_odometer: '', fuel_consumed: '', actual_distance: '' });
  const [toast, setToast] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tripsRes, vehiclesRes, driversRes] = await Promise.all([
      supabase.from('trips').select('*, vehicle:vehicles(id,registration_number,name,type), driver:drivers(id,full_name)').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*'),
      supabase.from('drivers').select('*'),
    ]);
    setTrips((tripsRes.data ?? []) as Trip[]);
    setVehicles((vehiclesRes.data ?? []) as Vehicle[]);
    setDrivers((driversRes.data ?? []) as Driver[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const availableVehicles = vehicles.filter(v => v.status === 'available');
  const eligibleDrivers = drivers.filter(d => d.status === 'available');

  const filtered = trips.filter(t => {
    const matchSearch = !search ||
      t.trip_number.toLowerCase().includes(search.toLowerCase()) ||
      t.origin.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vehicle_id) e.vehicle_id = 'Select a vehicle';
    if (!form.driver_id) e.driver_id = 'Select a driver';
    if (!form.origin.trim()) e.origin = 'Origin is required';
    if (!form.destination.trim()) e.destination = 'Destination is required';
    const cargo = Number(form.cargo_weight);
    if (form.cargo_weight && cargo < 0) e.cargo_weight = 'Enter a valid weight';
    const vehicle = vehicles.find(v => v.id === form.vehicle_id);
    if (vehicle && cargo > vehicle.max_load_capacity) {
      e.cargo_weight = `Cargo (${cargo} kg) exceeds vehicle max load (${vehicle.max_load_capacity} kg)`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      cargo_weight: Number(form.cargo_weight) || 0,
      planned_distance: Number(form.planned_distance) || 0,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      revenue: Number(form.revenue) || 0,
      notes: form.notes.trim() || null,
      status: 'draft' as TripStatus,
      created_by: userData.user?.id ?? null,
    };
    await supabase.from('trips').insert(payload);
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const dispatchTrip = async (trip: Trip) => {
    const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
    const driver = drivers.find(d => d.id === trip.driver_id);
    if (vehicle && vehicle.status !== 'available') {
      setToast(`Vehicle ${vehicle.registration_number} is not available (status: ${vehicle.status})`);
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (driver && driver.status !== 'available') {
      setToast(`Driver ${driver.full_name} is not available (status: ${driver.status})`);
      setTimeout(() => setToast(null), 4000);
      return;
    }
    const startOdo = vehicle?.odometer ?? 0;
    await supabase.from('trips').update({
      status: 'dispatched',
      start_odometer: startOdo,
    }).eq('id', trip.id);
    fetchAll();
  };

  const openComplete = (trip: Trip) => {
    setActionTrip(trip);
    setActionType('complete');
    setCompleteForm({ end_odometer: String(trip.start_odometer ?? ''), fuel_consumed: '', actual_distance: '' });
  };

  const openCancel = (trip: Trip) => {
    setActionTrip(trip);
    setActionType('cancel');
  };

  const handleComplete = async () => {
    if (!actionTrip) return;
    await supabase.from('trips').update({
      status: 'completed',
      end_odometer: Number(completeForm.end_odometer) || null,
      fuel_consumed: Number(completeForm.fuel_consumed) || null,
      actual_distance: Number(completeForm.actual_distance) || null,
    }).eq('id', actionTrip.id);
    setActionTrip(null);
    setActionType(null);
    fetchAll();
  };

  const handleCancel = async () => {
    if (!actionTrip) return;
    await supabase.from('trips').update({ status: 'cancelled' }).eq('id', actionTrip.id);
    setActionTrip(null);
    setActionType(null);
    fetchAll();
  };

  return (
    <div>
      <PageHeader
        title="Trip Management"
        subtitle={`${trips.length} trips`}
        action={<Button onClick={openAdd}><Plus size={18} /> New Trip</Button>}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by trip #, origin, destination…"
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
            {(Object.keys(statusConfig) as TripStatus[]).map(s => (
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
            icon={<ClipboardList size={28} />}
            title="No trips found"
            message={trips.length === 0 ? "Create your first trip to get started." : "Try adjusting your filters."}
            action={trips.length === 0 ? <Button onClick={openAdd}><Plus size={18} /> New Trip</Button> : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(trip => (
            <div key={trip.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-800">{trip.trip_number}</span>
                <Badge color={statusConfig[trip.status].color}>{statusConfig[trip.status].label}</Badge>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={15} className="text-green-500" />
                  <span className="font-medium">{trip.origin}</span>
                  <span className="text-slate-300">→</span>
                  <MapPin size={15} className="text-red-500" />
                  <span className="font-medium">{trip.destination}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Truck size={13} /> {trip.vehicle?.registration_number ?? '—'}</span>
                  <span className="flex items-center gap-1"><Users size={13} /> {trip.driver?.full_name ?? '—'}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Cargo: {trip.cargo_weight} kg</span>
                  <span>Distance: {trip.planned_distance} km</span>
                  {trip.revenue > 0 && <span>Revenue: ${trip.revenue}</span>}
                </div>
                <p className="text-xs text-slate-400">Created {format(parseISO(trip.created_at), 'MMM d, yyyy')}</p>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                {trip.status === 'draft' && (
                  <>
                    <Button size="sm" onClick={() => dispatchTrip(trip)}><Play size={14} /> Dispatch</Button>
                    <Button size="sm" variant="danger" onClick={() => openCancel(trip)}><XCircle size={14} /> Cancel</Button>
                  </>
                )}
                {trip.status === 'dispatched' && (
                  <>
                    <Button size="sm" onClick={() => openComplete(trip)}><CheckCircle size={14} /> Complete</Button>
                    <Button size="sm" variant="danger" onClick={() => openCancel(trip)}><XCircle size={14} /> Cancel</Button>
                  </>
                )}
                {trip.status === 'completed' && (
                  <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Trip completed</span>
                )}
                {trip.status === 'cancelled' && (
                  <span className="text-xs text-red-500 flex items-center gap-1"><XCircle size={14} /> Trip cancelled</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Trip Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Trip" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Vehicle"
              value={form.vehicle_id}
              onChange={(v) => setForm(f => ({ ...f, vehicle_id: v }))}
              options={availableVehicles.map(v => ({ value: v.id, label: `${v.registration_number} (${v.name})` }))}
              placeholder={availableVehicles.length === 0 ? 'No available vehicles' : 'Select vehicle'}
              required
              error={errors.vehicle_id}
            />
            <Select
              label="Driver"
              value={form.driver_id}
              onChange={(v) => setForm(f => ({ ...f, driver_id: v }))}
              options={eligibleDrivers.map(d => ({ value: d.id, label: d.full_name }))}
              placeholder={eligibleDrivers.length === 0 ? 'No eligible drivers' : 'Select driver'}
              required
              error={errors.driver_id}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Origin" value={form.origin} onChange={(v) => setForm(f => ({ ...f, origin: v }))} placeholder="Warehouse A" required error={errors.origin} />
            <Input label="Destination" value={form.destination} onChange={(v) => setForm(f => ({ ...f, destination: v }))} placeholder="Distribution Center B" required error={errors.destination} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cargo Weight (kg)" type="number" value={form.cargo_weight} onChange={(v) => setForm(f => ({ ...f, cargo_weight: v }))} placeholder="0" min="0" error={errors.cargo_weight} />
            <Input label="Planned Distance (km)" type="number" value={form.planned_distance} onChange={(v) => setForm(f => ({ ...f, planned_distance: v }))} placeholder="0" min="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Scheduled Date" type="datetime-local" value={form.scheduled_at} onChange={(v) => setForm(f => ({ ...f, scheduled_at: v }))} />
            <Input label="Revenue ($)" type="number" value={form.revenue} onChange={(v) => setForm(f => ({ ...f, revenue: v }))} placeholder="0" min="0" />
          </div>
          <TextArea label="Notes" value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} placeholder="Trip notes…" />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Creating…' : 'Create Trip'}</Button>
        </div>
      </Modal>

      {/* Complete Trip Modal */}
      <Modal open={actionType === 'complete'} onClose={() => { setActionType(null); setActionTrip(null); }} title="Complete Trip" maxWidth="max-w-md">
        <div className="space-y-4">
          <Input label="End Odometer (km)" type="number" value={completeForm.end_odometer} onChange={(v) => setCompleteForm(f => ({ ...f, end_odometer: v }))} min="0" />
          <Input label="Fuel Consumed (L)" type="number" value={completeForm.fuel_consumed} onChange={(v) => setCompleteForm(f => ({ ...f, fuel_consumed: v }))} min="0" />
          <Input label="Actual Distance (km)" type="number" value={completeForm.actual_distance} onChange={(v) => setCompleteForm(f => ({ ...f, actual_distance: v }))} min="0" />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => { setActionType(null); setActionTrip(null); }}>Cancel</Button>
          <Button onClick={handleComplete}><CheckCircle size={16} /> Complete Trip</Button>
        </div>
      </Modal>

      {/* Cancel Trip Confirmation */}
      <ConfirmDialog
        open={actionType === 'cancel'}
        onClose={() => { setActionType(null); setActionTrip(null); }}
        onConfirm={handleCancel}
        title="Cancel Trip"
        message={`Are you sure you want to cancel trip "${actionTrip?.trip_number}"?`}
        confirmLabel="Cancel Trip"
        danger
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-center gap-2 shadow-lg z-50">
          <AlertCircle size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
