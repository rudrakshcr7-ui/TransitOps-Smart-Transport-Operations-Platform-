import { useEffect, useState } from 'react';
import { supabase, Vehicle, Driver, Trip, MaintenanceLog } from '../lib/supabase';
import { PageHeader, Spinner, EmptyState } from '../components/ui';
import { Truck, Users, Wrench, ClipboardList, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import { format, subDays, isAfter, parseISO } from 'date-fns';

interface DashboardData {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  maintenance: MaintenanceLog[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [vehicles, drivers, trips, maintenance] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('drivers').select('*'),
        supabase.from('trips').select('*, vehicle:vehicles(id,registration_number,name,type), driver:drivers(id,full_name)'),
        supabase.from('maintenance_logs').select('*, vehicle:vehicles(id,registration_number,name)'),
      ]);
      setData({
        vehicles: vehicles.data ?? [],
        drivers: drivers.data ?? [],
        trips: trips.data ?? [],
        maintenance: maintenance.data ?? [],
      });
      setLoading(false);
    })();
  }, []);

  if (loading || !data) {
    return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  }

  const { vehicles, drivers, trips, maintenance } = data;

  const activeVehicles = vehicles.filter(v => v.status === 'on_trip').length;
  const availableVehicles = vehicles.filter(v => v.status === 'available').length;
  const inShopVehicles = vehicles.filter(v => v.status === 'in_shop').length;
  const activeTrips = trips.filter(t => t.status === 'dispatched').length;
  const pendingTrips = trips.filter(t => t.status === 'draft').length;
  const driversOnDuty = drivers.filter(d => d.status === 'on_trip').length;
  const fleetUtilization = vehicles.length > 0
    ? Math.round((activeVehicles / vehicles.length) * 100)
    : 0;

  const kpis = [
    { label: 'Active Vehicles', value: activeVehicles, icon: <Truck size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Available Vehicles', value: availableVehicles, icon: <Truck size={20} />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'In Maintenance', value: inShopVehicles, icon: <Wrench size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Active Trips', value: activeTrips, icon: <ClipboardList size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Trips', value: pendingTrips, icon: <ClipboardList size={20} />, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Drivers On Duty', value: driversOnDuty, icon: <Users size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Fleet Utilization', value: `${fleetUtilization}%`, icon: <TrendingUp size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Vehicles', value: vehicles.length, icon: <Truck size={20} />, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  // Fleet status distribution
  const statusData = [
    { name: 'Available', value: availableVehicles, color: '#22c55e' },
    { name: 'On Trip', value: activeVehicles, color: '#3b82f6' },
    { name: 'In Shop', value: inShopVehicles, color: '#f59e0b' },
    { name: 'Retired', value: vehicles.filter(v => v.status === 'retired').length, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  // Trip activity over last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStr = format(date, 'yyyy-MM-dd');
    const count = trips.filter(t => {
      if (!t.created_at) return false;
      return format(parseISO(t.created_at), 'yyyy-MM-dd') === dayStr;
    }).length;
    return { date: format(date, 'EEE'), trips: count };
  });

  // Top expenses by vehicle (maintenance + fuel)
  const vehicleCosts = vehicles.map(v => {
    const maintCost = maintenance.filter(m => m.vehicle_id === v.id).reduce((s, m) => s + m.cost, 0);
    return { name: v.registration_number, cost: maintCost };
  }).filter(v => v.cost > 0).sort((a, b) => b.cost - a.cost).slice(0, 5);

  // Recent activity
  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentMaintenance = [...maintenance]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  // Expiring licenses
  const soonDate = subDays(new Date(), -30);
  const expiringLicenses = drivers.filter(d => {
    const exp = parseISO(d.license_expiry_date);
    return isAfter(exp, new Date()) && isAfter(soonDate, exp);
  });
  const expiredLicenses = drivers.filter(d => isAfter(new Date(), parseISO(d.license_expiry_date)));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Fleet operations overview" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                {kpi.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(expiringLicenses.length > 0 || expiredLicenses.length > 0) && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">License Alerts</h3>
          </div>
          <div className="space-y-1">
            {expiredLicenses.map(d => (
              <p key={d.id} className="text-sm text-red-700">
                <span className="font-medium">{d.full_name}</span> — license expired on {format(parseISO(d.license_expiry_date), 'MMM d, yyyy')}
              </p>
            ))}
            {expiringLicenses.map(d => (
              <p key={d.id} className="text-sm text-amber-700">
                <span className="font-medium">{d.full_name}</span> — license expiring on {format(parseISO(d.license_expiry_date), 'MMM d, yyyy')}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Fleet status pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Fleet Status Distribution</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<Truck size={28} />} title="No vehicles" message="Add vehicles to see status distribution." />
          )}
        </div>

        {/* Trip activity line chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Trip Activity (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="trips" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top maintenance costs */}
      {vehicleCosts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Top Maintenance Costs by Vehicle</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={vehicleCosts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}`} />
              <Bar dataKey="cost" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-blue-600" />
            <h3 className="text-base font-semibold text-slate-800">Recent Trips</h3>
          </div>
          {recentTrips.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No trips yet.</p>
          ) : (
            <div className="space-y-3">
              {recentTrips.map(trip => (
                <div key={trip.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{trip.trip_number}</p>
                    <p className="text-xs text-slate-500">{trip.origin} → {trip.destination}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{format(parseISO(trip.created_at), 'MMM d')}</p>
                    <span className={`text-xs font-medium capitalize ${trip.status === 'completed' ? 'text-green-600' : trip.status === 'dispatched' ? 'text-blue-600' : trip.status === 'cancelled' ? 'text-red-500' : 'text-slate-500'}`}>
                      {trip.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={18} className="text-amber-600" />
            <h3 className="text-base font-semibold text-slate-800">Recent Maintenance</h3>
          </div>
          {recentMaintenance.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No maintenance records.</p>
          ) : (
            <div className="space-y-3">
              {recentMaintenance.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{m.maintenance_type}</p>
                    <p className="text-xs text-slate-500">{m.vehicle?.registration_number ?? '—'} · ${m.cost.toFixed(2)}</p>
                  </div>
                  <span className={`text-xs font-medium ${m.status === 'active' ? 'text-amber-600' : 'text-green-600'}`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
