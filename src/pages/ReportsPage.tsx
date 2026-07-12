import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, Vehicle, Trip, MaintenanceLog, FuelLog, Expense } from '../lib/supabase';
import { PageHeader, Button, Spinner, EmptyState } from '../components/ui';
import { Download, TrendingUp, DollarSign, Fuel as FuelIcon, Truck } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { format, parseISO, subDays, isAfter, isBefore } from 'date-fns';

interface ReportData {
  vehicles: Vehicle[];
  trips: Trip[];
  maintenance: MaintenanceLog[];
  fuel: FuelLog[];
  expenses: Expense[];
}

export function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [vehicles, trips, maintenance, fuel, expenses] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('trips').select('*, vehicle:vehicles(id,registration_number,name,type), driver:drivers(id,full_name)'),
      supabase.from('maintenance_logs').select('*, vehicle:vehicles(id,registration_number,name)'),
      supabase.from('fuel_logs').select('*, vehicle:vehicles(id,registration_number,name)'),
      supabase.from('expenses').select('*, vehicle:vehicles(id,registration_number,name)'),
    ]);
    setData({
      vehicles: vehicles.data ?? [],
      trips: trips.data ?? [],
      maintenance: maintenance.data ?? [],
      fuel: fuel.data ?? [],
      expenses: expenses.data ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const inRange = (dateStr: string) => {
    const d = parseISO(dateStr);
    return isAfter(d, parseISO(startDate + 'T00:00:00')) && isBefore(d, parseISO(endDate + 'T23:59:59'));
  };

  const reportRows = useMemo(() => {
    if (!data) return [];
    return data.vehicles.map(v => {
      const vTrips = data.trips.filter(t => t.vehicle_id === v.id && t.status === 'completed' && t.completed_at && inRange(t.completed_at));
      const vFuel = data.fuel.filter(f => f.vehicle_id === v.id && inRange(f.filled_at));
      const vMaint = data.maintenance.filter(m => m.vehicle_id === v.id && inRange(m.started_at));
      const vExpenses = data.expenses.filter(e => e.vehicle_id === v.id && inRange(e.expense_date));

      const distance = vTrips.reduce((s, t) => s + (t.actual_distance ?? 0), 0);
      const fuelLiters = vFuel.reduce((s, f) => s + f.liters, 0);
      const fuelCost = vFuel.reduce((s, f) => s + f.total_cost, 0);
      const maintCost = vMaint.reduce((s, m) => s + m.cost, 0);
      const expCost = vExpenses.reduce((s, e) => s + e.amount, 0);
      const totalCost = fuelCost + maintCost + expCost;
      const revenue = vTrips.reduce((s, t) => s + (t.revenue ?? 0), 0);
      const fuelEfficiency = fuelLiters > 0 ? distance / fuelLiters : 0;
      const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0;

      return {
        vehicle: v,
        trips: vTrips.length,
        distance,
        fuelLiters,
        fuelCost,
        maintCost,
        expCost,
        totalCost,
        revenue,
        fuelEfficiency,
        roi,
      };
    });
  }, [data, startDate, endDate]);

  const fleetUtilization = useMemo(() => {
    if (!data) return 0;
    const inRangeTrips = data.trips.filter(t => t.status === 'dispatched' || (t.completed_at && inRange(t.completed_at)));
    if (data.vehicles.length === 0) return 0;
    return Math.round((inRangeTrips.length / data.vehicles.length) * 100);
  }, [data, startDate, endDate]);

  const costTrend = useMemo(() => {
    if (!data) return [];
    const days: { date: string; fuel: number; maintenance: number; expenses: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStr = format(date, 'yyyy-MM-dd');
      const fuelCost = data.fuel.filter(f => format(parseISO(f.filled_at), 'yyyy-MM-dd') === dayStr).reduce((s, f) => s + f.total_cost, 0);
      const maintCost = data.maintenance.filter(m => format(parseISO(m.started_at), 'yyyy-MM-dd') === dayStr).reduce((s, m) => s + m.cost, 0);
      const expCost = data.expenses.filter(e => e.expense_date === dayStr).reduce((s, e) => s + e.amount, 0);
      days.push({ date: format(date, 'EEE'), fuel: fuelCost, maintenance: maintCost, expenses: expCost });
    }
    return days;
  }, [data]);

  const exportCSV = () => {
    const headers = ['Registration', 'Name', 'Type', 'Trips', 'Distance (km)', 'Fuel (L)', 'Fuel Cost', 'Maintenance Cost', 'Expense Cost', 'Total Cost', 'Revenue', 'Fuel Efficiency (km/L)', 'ROI (%)'];
    const rows = reportRows.map(r => [
      r.vehicle.registration_number, r.vehicle.name, r.vehicle.type,
      r.trips, r.distance, r.fuelLiters.toFixed(1),
      r.fuelCost.toFixed(2), r.maintCost.toFixed(2), r.expCost.toFixed(2),
      r.totalCost.toFixed(2), r.revenue.toFixed(2),
      r.fuelEfficiency.toFixed(2), r.roi.toFixed(1),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transitops_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  }

  const totalFuelCost = reportRows.reduce((s, r) => s + r.fuelCost, 0);
  const totalMaintCost = reportRows.reduce((s, r) => s + r.maintCost, 0);
  const totalExpCost = reportRows.reduce((s, r) => s + r.expCost, 0);
  const grandTotal = totalFuelCost + totalMaintCost + totalExpCost;
  const totalRevenue = reportRows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Fleet performance and cost analysis"
        action={<Button onClick={exportCSV}><Download size={18} /> Export CSV</Button>}
      />

      {/* Date Range */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-3"><TrendingUp size={20} /></div>
          <p className="text-2xl font-bold text-slate-800">{fleetUtilization}%</p>
          <p className="text-xs text-slate-500 mt-1">Fleet Utilization</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-3"><DollarSign size={20} /></div>
          <p className="text-2xl font-bold text-slate-800">${totalRevenue.toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-1">Total Revenue</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 mb-3"><DollarSign size={20} /></div>
          <p className="text-2xl font-bold text-slate-800">${grandTotal.toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-1">Total Operational Cost</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mb-3"><FuelIcon size={20} /></div>
          <p className="text-2xl font-bold text-slate-800">${totalFuelCost.toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-1">Total Fuel Cost</p>
        </div>
      </div>

      {/* Cost Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Cost Trends (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={costTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="fuel" stroke="#3b82f6" strokeWidth={2} name="Fuel" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="maintenance" stroke="#f59e0b" strokeWidth={2} name="Maintenance" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Fuel Efficiency Chart */}
      {reportRows.some(r => r.fuelEfficiency > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Fuel Efficiency by Vehicle (km/L)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportRows.filter(r => r.fuelEfficiency > 0).map(r => ({ name: r.vehicle.registration_number, efficiency: r.fuelEfficiency }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} km/L`} />
              <Bar dataKey="efficiency" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-800">Per-Vehicle Report</h3>
        </div>
        {reportRows.length === 0 ? (
          <EmptyState icon={<Truck size={28} />} title="No vehicles" message="Add vehicles to generate reports." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trips</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Distance</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fuel Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Maint. Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Efficiency</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map(r => (
                  <tr key={r.vehicle.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{r.vehicle.registration_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{r.trips}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{r.distance.toFixed(0)} km</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">${r.fuelCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">${r.maintCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">${r.totalCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">${r.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{r.fuelEfficiency > 0 ? `${r.fuelEfficiency.toFixed(2)} km/L` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-medium ${r.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {r.roi > 0 ? '+' : ''}{r.roi.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
