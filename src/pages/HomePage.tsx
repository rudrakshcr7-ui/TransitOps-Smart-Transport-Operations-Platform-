import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Truck, LayoutDashboard, Users, Wrench, Fuel, BarChart3,
  ClipboardList, Receipt, Shield, ArrowRight, CheckCircle2,
  TrendingUp, MapPin, Activity,
} from 'lucide-react';

export function HomePage() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Truck size={20} />
            </div>
            <span className="text-lg font-medium tracking-tight">TransitOps</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={session ? '/' : '/login'}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {session ? 'Dashboard' : 'Sign In'}
            </Link>
            {!session && (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                Get Started <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #000 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-normal mb-6">
            Smart Fleet Operations Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900 leading-[1.1] mb-6">
            Manage your entire fleet<br />
            <span className="text-blue-600">in one place.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-8">
            Track vehicles, drivers, trips, maintenance, fuel, and expenses — all with
            real-time status updates, automated workflows, and powerful analytics.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              {session ? 'Go to Dashboard' : 'Start for Free'} <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Explore Features
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-16">
            {[
              { value: '8', label: 'Modules' },
              { value: '4', label: 'User Roles' },
              { value: '100%', label: 'Real-Time' },
              { value: 'CSV', label: 'Export' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-medium text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-medium text-slate-900 mb-3">Everything you need to run your fleet</h2>
            <p className="text-slate-500 max-w-xl mx-auto">From vehicle registration to trip dispatch, maintenance scheduling, and cost analysis — TransitOps covers the full operational lifecycle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <LayoutDashboard size={22} />, title: 'Dashboard & KPIs', desc: 'Real-time fleet status, utilization rates, active trips, and driver availability at a glance.', color: 'bg-blue-50 text-blue-600' },
              { icon: <Truck size={22} />, title: 'Vehicle Registry', desc: 'Track every vehicle with registration, type, load capacity, odometer, and acquisition cost.', color: 'bg-green-50 text-green-600' },
              { icon: <Users size={22} />, title: 'Driver Management', desc: 'License tracking with expiry alerts, safety scores, and availability status management.', color: 'bg-purple-50 text-purple-600' },
              { icon: <ClipboardList size={22} />, title: 'Trip Lifecycle', desc: 'Create, dispatch, complete, or cancel trips with automatic vehicle and driver status updates.', color: 'bg-blue-50 text-blue-600' },
              { icon: <Wrench size={22} />, title: 'Maintenance Logs', desc: 'Schedule and track maintenance with automatic vehicle status changes to In Shop.', color: 'bg-amber-50 text-amber-600' },
              { icon: <Fuel size={22} />, title: 'Fuel Tracking', desc: 'Log fill-ups with liters, cost per liter, and odometer readings for efficiency analysis.', color: 'bg-red-50 text-red-600' },
              { icon: <Receipt size={22} />, title: 'Expense Management', desc: 'Categorize tolls, repairs, insurance, permits, and more with per-vehicle cost breakdowns.', color: 'bg-slate-100 text-slate-600' },
              { icon: <BarChart3 size={22} />, title: 'Reports & Analytics', desc: 'Fuel efficiency, fleet utilization, operational costs, and ROI with CSV export.', color: 'bg-blue-50 text-blue-600' },
            ].map((f) => (
              <div key={f.title} className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-slate-300 transition-all">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-medium text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-medium text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500">Three steps from signup to full fleet visibility.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: <Shield size={24} />, title: 'Create your account', desc: 'Sign up with your email, choose your role, and get instant access to the platform.' },
              { step: '02', icon: <Truck size={24} />, title: 'Add your fleet', desc: 'Register vehicles and drivers with all the details — capacity, license, safety score.' },
              { step: '03', icon: <Activity size={24} />, title: 'Start operating', desc: 'Dispatch trips, log maintenance and fuel, and watch your dashboard update in real time.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    {s.icon}
                  </div>
                  <span className="text-sm font-medium text-slate-300">{s.step}</span>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights Band */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-medium text-slate-900 mb-4">Automated workflows that save time</h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              When you dispatch a trip, the vehicle and driver statuses update automatically.
              When you log maintenance, the vehicle goes to In Shop. When you close the record,
              it's back to Available. No manual status changes needed.
            </p>
            <div className="space-y-3">
              {[
                'Automatic vehicle & driver status on trip dispatch, completion, and cancellation',
                'Maintenance records automatically switch vehicles to In Shop',
                'Cargo weight validated against vehicle max load capacity',
                'License expiry alerts for drivers approaching deadlines',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 rounded-2xl p-8 text-slate-300 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-slate-500">Fleet Overview</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Active', value: '12', icon: <Truck size={14} />, color: 'text-blue-400' },
                { label: 'Available', value: '8', icon: <Truck size={14} />, color: 'text-green-400' },
                { label: 'In Shop', value: '3', icon: <Wrench size={14} />, color: 'text-amber-400' },
                { label: 'On Duty', value: '15', icon: <Users size={14} />, color: 'text-purple-400' },
              ].map((k) => (
                <div key={k.label} className="bg-slate-800 rounded-lg p-3">
                  <div className={`flex items-center gap-1.5 text-xs mb-1 ${k.color}`}>{k.icon} {k.label}</div>
                  <p className="text-2xl font-medium text-white">{k.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { trip: 'TRP-A3F9B2C1', route: 'Warehouse A → Dist. Center B', status: 'Dispatched', color: 'text-blue-400' },
                { trip: 'TRP-D7E1F4A9', route: 'Depot C → Port Terminal', status: 'Completed', color: 'text-green-400' },
                { trip: 'TRP-B2C8E5F3', route: 'Hub D → Retail Hub E', status: 'Draft', color: 'text-slate-400' },
              ].map((t) => (
                <div key={t.trip} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-white">{t.trip}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} /> {t.route}</p>
                  </div>
                  <span className={`text-xs font-medium ${t.color}`}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <TrendingUp size={40} className="text-blue-400 mx-auto mb-4" />
          <h2 className="text-3xl font-medium text-white mb-4">Ready to transform your fleet operations?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Get started today with TransitOps and bring your transport operations into one unified platform.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
          >
            {session ? 'Go to Dashboard' : 'Create Free Account'} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Truck size={18} />
            </div>
            <span className="font-medium text-white">TransitOps</span>
          </div>
          <p className="text-xs">© 2025 TransitOps. Smart Transport Operations Platform.</p>
        </div>
      </footer>
    </div>
  );
}
