import React, { useState } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  User,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Building2,
} from 'lucide-react';
import { AuthUser } from '../types';

export type AuthTab = 'operator' | 'admin' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: AuthTab;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLoginOperator: (name: string, email: string, department: string) => void;
  onLoginAdmin: (password: string) => { success: boolean; error?: string };
  onResetAdminPassword: (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => { success: boolean; error?: string };
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'operator',
  onClose,
  currentUser,
  onLoginOperator,
  onLoginAdmin,
  onResetAdminPassword,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  // Operator Login state
  const [opName, setOpName] = useState<string>('Aarav Sharma');
  const [opEmail, setOpEmail] = useState<string>('a.sharma@meridian.ops');
  const [opDept, setOpDept] = useState<string>('Fleet & Dispatch Operations');

  // Admin Login state
  const [adminPassInput, setAdminPassInput] = useState<string>('');
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string>('');

  // Reset Password state
  const [oldPass, setOldPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');
  const [showResetPasswords, setShowResetPasswords] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string>('');
  const [resetSuccess, setResetSuccess] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setAdminError('');
      setResetError('');
      setResetSuccess('');
      setAdminPassInput('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleOperatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opName.trim() || !opEmail.trim()) return;
    onLoginOperator(opName.trim(), opEmail.trim(), opDept);
    onClose();
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    const result = onLoginAdmin(adminPassInput);
    if (result.success) {
      setAdminPassInput('');
      onClose();
    } else {
      setAdminError(result.error || 'Incorrect administrator password.');
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    const result = onResetAdminPassword(oldPass, newPass, confirmPass);
    if (result.success) {
      setResetSuccess('Administrator password updated successfully.');
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setResetError(result.error || 'Failed to update password.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-sm font-bold text-white">
                Meridian Access Portal
              </h2>
              <p className="text-[11px] text-slate-400">
                Corporate Authentication & System Controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close authentication modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Session Banner if signed in */}
        {currentUser && (
          <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {currentUser.role === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <User className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <div>
                <span className="font-semibold text-slate-200">{currentUser.name}</span>
                <span className="text-slate-500 mx-1.5">·</span>
                <span
                  className={
                    currentUser.role === 'admin'
                      ? 'text-emerald-400 font-medium'
                      : 'text-cyan-400 font-medium'
                  }
                >
                  {currentUser.role === 'admin' ? 'System Administrator' : currentUser.department}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px] transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('operator');
                setAdminError('');
                setResetError('');
              }}
              className={`py-2 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'operator'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Employee</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setAdminError('');
                setResetError('');
              }}
              className={`py-2 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('reset');
                setResetError('');
                setResetSuccess('');
              }}
              className={`py-2 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'reset'
                  ? 'bg-slate-800 text-amber-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Reset Key</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {activeTab === 'operator' && (
            <form onSubmit={handleOperatorSubmit} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign in with your corporate credentials to manage warehouse robotics, avionics PCB boards, air cargo scheduling, and R&amp;D budgets.
              </p>

              <div>
                <label htmlFor="op-name" className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  id="op-name"
                  type="text"
                  required
                  value={opName}
                  onChange={(e) => setOpName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="op-email" className="block text-xs font-medium text-slate-300 mb-1">
                  Corporate Email
                </label>
                <input
                  id="op-email"
                  type="email"
                  required
                  value={opEmail}
                  onChange={(e) => setOpEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="name@meridian.ops"
                />
              </div>

              <div>
                <label htmlFor="op-dept" className="block text-xs font-medium text-slate-300 mb-1">
                  Operational Division
                </label>
                <select
                  id="op-dept"
                  value={opDept}
                  onChange={(e) => setOpDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Fleet & Dispatch Operations">Fleet &amp; Dispatch Operations</option>
                  <option value="Avionics Hardware Engineering">Avionics Hardware Engineering</option>
                  <option value="Air Cargo Logistics">Air Cargo Logistics</option>
                  <option value="Corporate Finance & Strategy">Corporate Finance &amp; Strategy</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold transition-colors"
              >
                Sign In to Workspace
              </button>
            </form>
          )}

          {activeTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-xs text-cyan-200 leading-relaxed">
                Administrator credentials unlock the live optimization engine telemetry, step-by-step solver diagnostics, decision-tree pruning logs, and complexity analytics.
              </div>

              <div>
                <label htmlFor="admin-user" className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator Account
                </label>
                <input
                  id="admin-user"
                  type="text"
                  readOnly
                  value="admin@meridian.ops (Root Engine Inspector)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showAdminPass ? 'text' : 'password'}
                    required
                    value={adminPassInput}
                    onChange={(e) => {
                      setAdminPassInput(e.target.value);
                      if (adminError) setAdminError('');
                    }}
                    placeholder="Enter admin password"
                    className="w-full pl-3 pr-10 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showAdminPass ? 'Hide password' : 'Show password'}
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {adminError && (
                <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/70 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{adminError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Unlock Admin Engine View</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('reset')}
                  className="text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  Need to change password? Reset using old password
                </button>
              </div>
            </form>
          )}

          {activeTab === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Verify your current administrator password to set a new security key. Changes take effect immediately across all sessions.
              </p>

              <div>
                <label htmlFor="old-password" className="block text-xs font-medium text-slate-300 mb-1">
                  Old Password
                </label>
                <input
                  id="old-password"
                  type={showResetPasswords ? 'text' : 'password'}
                  required
                  value={oldPass}
                  onChange={(e) => {
                    setOldPass(e.target.value);
                    setResetError('');
                    setResetSuccess('');
                  }}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-xs font-medium text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  id="new-password"
                  type={showResetPasswords ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={newPass}
                  onChange={(e) => {
                    setNewPass(e.target.value);
                    setResetError('');
                    setResetSuccess('');
                  }}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type={showResetPasswords ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={confirmPass}
                  onChange={(e) => {
                    setConfirmPass(e.target.value);
                    setResetError('');
                    setResetSuccess('');
                  }}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showResetPasswords}
                  onChange={(e) => setShowResetPasswords(e.target.checked)}
                  className="accent-amber-400 rounded"
                />
                <span>Show passwords</span>
              </label>

              {resetError && (
                <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/70 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/70 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Update Administrator Password</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
