import React from 'react';
import {
  Menu,
  RefreshCw,
  MapPin,
  ShieldCheck,
  LogIn,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { Airport, AuthUser, MissionContextState, WorkspaceView } from '../types';
import { AuthTab } from './AuthModal';
import { MeridianBrandMark } from './Sidebar';

interface TopBarProps {
  activeView: WorkspaceView;
  mission: MissionContextState;
  airports: Airport[];
  onOriginChange: (index: number) => void;
  onSyncMission: () => void;
  currentUser: AuthUser | null;
  onOpenAuth: (tab: AuthTab) => void;
  onOpenMobileMenu: () => void;
}

const VIEW_LABELS: Record<WorkspaceView, string> = {
  'mission-control': 'Mission Control',
  capital: 'Stage 1 · Capital & Cargo',
  pcb: 'Stage 2 · Avionics QA',
  fleet: 'Stage 3 · Depot Robotics',
  cargo: 'Stage 4 · Air Dispatch',
  'engine-diagnostics': 'Engine Diagnostics',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  mission,
  airports,
  onOriginChange,
  onSyncMission,
  currentUser,
  onOpenAuth,
  onOpenMobileMenu,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="h-16 sticky top-0 z-30 bg-[#090C10]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Trigger + Unmistakable Company Wordmark & View Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <span className="lg:hidden">
            <MeridianBrandMark size="sm" />
          </span>
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
            Meridian Logistics
          </span>
          <ChevronRight className="hidden sm:inline w-4 h-4 text-slate-600 shrink-0" />
          <span className="hidden sm:inline text-xs sm:text-sm font-medium text-sky-400 truncate">
            {VIEW_LABELS[activeView]}
          </span>
        </div>
      </div>

      {/* Right: Synced Origin Hub Selector, Sync Mission CTA, and Sign In */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs">
          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-slate-400">Base Hub:</span>
          <select
            value={mission.originAirportIndex}
            onChange={(e) => onOriginChange(Number(e.target.value))}
            className="bg-transparent text-white font-mono font-semibold focus:outline-none cursor-pointer"
            aria-label="Global Origin Hub"
          >
            {airports.map((a, idx) => (
              <option key={a.id} value={idx} className="bg-[#111622] text-slate-100">
                {a.code} ({a.name.replace(' Airport', '')})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onSyncMission}
          className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          title="Synchronize all 4 operational stages"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sync All Stages</span>
          <span className="sm:hidden">Sync</span>
        </button>

        {isAdmin ? (
          <button
            onClick={() => onOpenAuth('admin')}
            className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        ) : currentUser ? (
          <button
            onClick={() => onOpenAuth('admin')}
            className="px-3 py-2 rounded-lg bg-[#111622] hover:bg-[#181F2E] border border-white/[0.08] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Admin Access</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenAuth('operator')}
            className="px-3 py-2 rounded-lg bg-[#161D2B] hover:bg-[#1E2738] border border-white/[0.08] text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <LogIn className="w-3.5 h-3.5 text-sky-400" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
