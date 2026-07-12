import { useState, ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Truck, LayoutDashboard, Users, Wrench, Fuel, BarChart3,
  LogOut, Menu, X, ClipboardList, Receipt, UserCircle,
} from 'lucide-react';
import { UserRole } from '../lib/supabase';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/vehicles', label: 'Vehicles', icon: <Truck size={20} /> },
  { to: '/drivers', label: 'Drivers', icon: <Users size={20} /> },
  { to: '/trips', label: 'Trips', icon: <ClipboardList size={20} /> },
  { to: '/maintenance', label: 'Maintenance', icon: <Wrench size={20} /> },
  { to: '/fuel', label: 'Fuel Logs', icon: <Fuel size={20} /> },
  { to: '/expenses', label: 'Expenses', icon: <Receipt size={20} /> },
  { to: '/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
];

const roleLabels: Record<UserRole, string> = {
  fleet_manager: 'Fleet Manager',
  driver: 'Driver',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

const roleBadgeColors: Record<UserRole, string> = {
  fleet_manager: 'bg-blue-100 text-blue-700',
  driver: 'bg-green-100 text-green-700',
  safety_officer: 'bg-amber-100 text-amber-700',
  financial_analyst: 'bg-purple-100 text-purple-700',
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNav = navItems.filter(item => !item.roles || (profile && item.roles.includes(profile.role)));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-800 text-slate-300 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-700/50">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Truck size={20} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">TransitOps</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
              <UserCircle size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${profile ? roleBadgeColors[profile.role] : ''}`}>
                {profile ? roleLabels[profile.role] : ''}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Truck size={18} />
            </div>
            <span className="font-bold text-slate-800">TransitOps</span>
          </div>
          <div className="w-10" />
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile close button when sidebar open */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 right-4 z-50 lg:hidden p-2 rounded-lg bg-slate-700 text-white"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}
