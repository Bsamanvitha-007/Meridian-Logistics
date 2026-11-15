import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Cpu,
  Bot,
  Plane,
  Activity,
  ShieldCheck,
  User,
  LogIn,
  KeyRound,
  LogOut,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { AuthUser, MissionContextState, WorkspaceView } from '../types';
import { AuthTab } from './AuthModal';

interface SidebarProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  mission: MissionContextState;
  currentUser: AuthUser | null;
  onOpenAuth: (tab: AuthTab) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const MeridianBrandMark: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
  <svg
    viewBox="0 0 36 36"
    className={size === 'md' ? 'w-9 h-9 shrink-0' : 'w-7 h-7 shrink-0'}
    aria-hidden="true"
  >
    <rect x="1" y="1" width="34" height="34" rx="9" fill="#0F172A" stroke="#38BDF8" strokeOpacity="0.45" strokeWidth="1.2" />
    <path
      d="M8 24.5L13.5 11.5L18 19.5L22.5 11.5L28 24.5"
      fill="none"
      stroke="#38BDF8"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="13.5" cy="11.5" r="1.8" fill="#F8FAFC" />
    <circle cx="22.5" cy="11.5" r="1.8" fill="#F8FAFC" />
    <circle cx="18" cy="19.5" r="1.8" fill="#10B981" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  mission,
  currentUser,
  onOpenAuth,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const clearedStagesCount = [
    mission.capitalCleared,
    mission.pcbCertified === true,
    mission.fleetCleared,
    mission.cargoCleared,
  ].filter(Boolean).length;

  const navItems: {
    id: WorkspaceView;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    status?: 'cleared' | 'hold' | 'pending';
  }[] = [
    {
      id: 'mission-control',
      label: 'Mission Control',
      sublabel: 'Live 4-Stage Walkthrough',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'capital',
      label: '1. Capital & Cargo',
      sublabel: `₹${mission.capitalInvested}L / ₹${mission.capitalBudget}L Funded`,
      icon: <Briefcase className="w-4 h-4" />,
      status: mission.capitalCleared ? 'cleared' : 'pending',
    },
    {
      id: 'pcb',
      label: '2. Avionics QA',
      sublabel:
        mission.pcbCertified === true
          ? 'Loop Certified'
          : mission.pcbCertified === false
          ? 'Circuit Fault'
          : 'Awaiting QA Check',
      icon: <Cpu className="w-4 h-4" />,
      status:
        mission.pcbCertified === true
          ? 'cleared'
          : mission.pcbCertified === false
          ? 'hold'
          : 'pending',
    },
    {
      id: 'fleet',
      label: '3. Depot Robotics',
      sublabel: `${mission.fleetPlacedCount}/8 Robots Staged`,
      icon: <Bot className="w-4 h-4" />,
      status: mission.fleetConflicts > 0 ? 'hold' : mission.fleetCleared ? 'cleared' : 'pending',
    },
    {
      id: 'cargo',
      label: '4. Air Dispatch',
      sublabel:
        mission.cargoOptimalCost !== null
          ? `${mission.cargoOptimalCost} Units · 5 Hubs`
          : 'Route Pending',
      icon: <Plane className="w-4 h-4" />,
      status: mission.cargoCleared ? 'cleared' : 'pending',
    },
  ];

  const renderStatusIcon = (status?: 'cleared' | 'hold' | 'pending') => {
    if (!status) return null;
    if (status === 'cleared') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (status === 'hold') {
      return <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    }
    return <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0C1017] border-r border-white/[0.08] text-slate-200">
      {/* Prominent Company Brand Header */}
      <div className="h-16 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <button
          onClick={() => {
            onSelectView('mission-control');
            onCloseMobile();
          }}
          className="flex items-center gap-3 text-left group"
        >
          <MeridianBrandMark size="md" />
          <div className="min-w-0">
            <div className="font-display text-base font-bold tracking-tight text-white leading-tight group-hover:text-sky-300 transition-colors">
              Meridian Logistics
            </div>
            <div className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
              Autonomous Freight Cloud
            </div>
          </div>
        </button>

        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active Mission Release Card */}
      <div className="p-3.5 border-b border-white/[0.06]">
        <div className="p-3 rounded-lg bg-[#111622] border border-white/[0.07]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-slate-400">{mission.missionCode}</span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                clearedStagesCount === 4 ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {clearedStagesCount}/4 Ready
            </span>
          </div>
          <div className="mt-1 text-xs font-semibold text-white truncate">
            {mission.missionTitle}
          </div>
          <div className="mt-2.5 w-full h-1.5 rounded-full bg-[#090C10] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                clearedStagesCount === 4 ? 'bg-emerald-500' : 'bg-sky-400'
              }`}
              style={{ width: `${(clearedStagesCount / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-2.5 pb-1.5 text-[11px] font-medium text-slate-500">
          Operations Console
        </div>

        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              className={`w-full px-3 py-2.5 rounded-lg text-left transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-sky-500/12 text-white border border-sky-400/35'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{item.label}</div>
                  <div className="text-[11px] text-slate-400 truncate font-mono tabular-nums">
                    {item.sublabel}
                  </div>
                </div>
              </div>
              {renderStatusIcon(item.status)}
            </button>
          );
        })}

        {/* Admin-Only Diagnostics Navigation */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-medium text-emerald-400">
              Administrator System
            </div>
            <button
              onClick={() => {
                onSelectView('engine-diagnostics');
                onCloseMobile();
              }}
              className={`w-full px-3 py-2.5 rounded-lg text-left transition-colors flex items-center gap-2.5 ${
                activeView === 'engine-diagnostics'
                  ? 'bg-emerald-500/12 text-emerald-300 border border-emerald-500/35'
                  : 'text-slate-300 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Engine Diagnostics</div>
                <div className="text-[11px] text-slate-400 truncate">
                  Solver Telemetry &amp; Bounds
                </div>
              </div>
            </button>
          </div>
        )}
      </nav>

      {/* Account & Security Footer */}
      <div className="p-3.5 border-t border-white/[0.08] bg-[#090C10]">
        {currentUser ? (
          <div className="p-2.5 rounded-lg bg-[#111622] border border-white/[0.07] space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  isAdmin
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-sky-500/15 text-sky-400'
                }`}
              >
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {isAdmin ? 'System Administrator' : currentUser.department}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onOpenAuth('reset')}
                className="px-2 py-1.5 rounded bg-[#181F2E] hover:bg-[#1E2738] text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1 transition-colors"
              >
                <KeyRound className="w-3 h-3 text-amber-400" />
                <span>Reset Key</span>
              </button>
              <button
                onClick={onLogout}
                className="px-2 py-1.5 rounded bg-[#181F2E] hover:bg-[#1E2738] text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1 transition-colors"
              >
                <LogOut className="w-3 h-3 text-slate-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <button
              onClick={() => onOpenAuth('operator')}
              className="w-full py-2 px-3 rounded-lg bg-[#161D2B] hover:bg-[#1D2638] border border-white/[0.08] text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-400" />
              <span>Employee Sign In</span>
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onOpenAuth('admin')}
                className="py-1.5 px-2 rounded-lg bg-[#111622] hover:bg-[#181F2E] border border-white/[0.06] text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1 transition-colors"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Admin</span>
              </button>
              <button
                onClick={() => onOpenAuth('reset')}
                className="py-1.5 px-2 rounded-lg bg-[#111622] hover:bg-[#181F2E] border border-white/[0.06] text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1 transition-colors"
              >
                <KeyRound className="w-3 h-3 text-amber-400" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
