import * as React from 'react';
import { useState } from 'react';
import { Mail, Lock, X, Loader2, KeyRound } from 'lucide-react';
import { db } from '../lib/supabase';

interface SupabaseAuthPortalProps {
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
  currentUser: any;
  onSignOut: () => void;
}

export default function SupabaseAuthPortal({
  onClose,
  onAuthSuccess,
  currentUser,
  onSignOut,
}: SupabaseAuthPortalProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-fill test credentials helper
  const handleLoadMockCredentials = () => {
    setEmail('customer@readersonic.tech');
    setPassword('space123');
    setErrorMsg(null);
    setSuccessMsg('Test credentials entered. Click login below.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('PLEASE DEFINE BOTH AN EMAIL AND A PASSWORD.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('PASSWORD MUST SECURELY SPAN AT LEAST 6 CHARACTERS.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (activeTab === 'signin') {
        const user = await db.signIn(email, password);
        onAuthSuccess(user);
        setSuccessMsg(`Welcome back. Logged in as: ${user.email}`);
        setTimeout(() => onClose(), 1000);
      } else {
        const user = await db.signUp(email, password);
        setSuccessMsg(`ACCOUNT CREATD FOR ${user.email}. PLEASE LOGIN BELOW.`);
        setActiveTab('signin');
      }
    } catch (err: any) {
      setErrorMsg(err.message?.toUpperCase() || 'AN ERROR OCCURRED DURING SIGN-IN/SIGN-UP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-portal-overlay" className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        id="auth-portal-card" 
        className="bg-white w-full max-w-md border border-neutral-200 p-8 sm:p-10 relative flex flex-col"
      >
        {/* Close trigger button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 p-1 text-neutral-400 hover:text-neutral-950 transition-colors focus:outline-none cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[1.5]" />
        </button>

        {/* Brand Stamp */}
        <div className="text-center mb-8">
          <span className="font-sans text-xs tracking-[0.3em] font-sans font-black text-neutral-950 uppercase block mb-1">
            READER<span className="text-neutral-400 font-normal">SONIC</span>
          </span>
          <span className="text-[10px] font-sans tracking-widest text-[#9A9180] uppercase font-bold">
            CUSTOMER PLATFORM PORTAL
          </span>
        </div>

        {currentUser ? (
          /* Profile representation when logged in */
          <div className="space-y-6 text-center py-4">
            <div className="bg-neutral-50 px-4 py-5 border border-neutral-100 text-left font-sans space-y-4">
              <span className="text-[9px] font-sans font-bold tracking-widest text-neutral-400 uppercase block">LOGGED PROFILE:</span>
              
              <div>
                <span className="text-neutral-400 font-sans text-[9px] font-bold block uppercase">EMAIL ADDRESS:</span>
                <span className="text-xs text-neutral-950 font-bold block">{currentUser.email}</span>
              </div>

              <div>
                <span className="text-neutral-400 font-sans text-[9px] font-bold block uppercase font-bold">UNIQUE ID:</span>
                <span className="text-[10px] text-neutral-600 font-mono break-all font-bold select-all">{currentUser.id}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={() => {
                  onSignOut();
                  setSuccessMsg('SIGN OUT COMPLETED.');
                }}
                className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer"
              >
                SIGN OUT OF ACCOUNT
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-3 border border-neutral-200 text-neutral-500 hover:text-neutral-950 text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer"
              >
                RETURN TO PRODUCTS
              </button>
            </div>
          </div>
        ) : (
          /* Sign-In / Create-Account forms */
          <div>
            {/* Tab switchers */}
            <div className="flex border-b border-neutral-200 mb-8">
              <button
                onClick={() => { setActiveTab('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 pb-3 text-xs font-bold tracking-widest uppercase relative transition-colors ${
                  activeTab === 'signin' ? 'text-neutral-950 font-black' : 'text-neutral-400 hover:text-neutral-950'
                }`}
              >
                <span>LOGIN</span>
                {activeTab === 'signin' && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-neutral-950" />
                )}
              </button>
              <button
                onClick={() => { setActiveTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 pb-3 text-xs font-bold tracking-widest uppercase relative transition-colors ${
                  activeTab === 'signup' ? 'text-neutral-950 font-black' : 'text-neutral-400 hover:text-neutral-950'
                }`}
              >
                <span>CREATE ACCOUNT</span>
                {activeTab === 'signup' && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-neutral-950" />
                )}
              </button>
            </div>

            {/* Error & Success indicators */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-neutral-100 border border-neutral-300 text-[10px] font-bold tracking-wider text-neutral-900 uppercase">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                {successMsg}
              </div>
            )}

            {/* Credential entries */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-sans text-neutral-400 uppercase font-bold tracking-widest mb-2">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-300" />
                  <input
                    type="email"
                    placeholder="YOU@DOMAIN.COM"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-base md:text-xs pl-11 pr-4 py-3 bg-white border border-neutral-250 text-neutral-950 focus:outline-none focus:border-neutral-950 rounded-none uppercase transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-sans text-neutral-400 uppercase font-bold tracking-widest mb-2">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-300" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-base md:text-xs pl-11 pr-4 py-3 bg-white border border-neutral-250 text-neutral-950 focus:outline-none focus:border-neutral-950 rounded-none transition-all"
                  />
                </div>
              </div>

              {/* SpaceX bold block button CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-neutral-950 hover:bg-neutral-850 text-white font-sans text-xs font-bold tracking-[0.2em] uppercase transition-colors cursor-pointer flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                ) : activeTab === 'signin' ? (
                  <span>LOGIN</span>
                ) : (
                  <span>CREATE MY ACCOUNT</span>
                )}
              </button>
            </form>

            {/* Sleek inline link to load test credentials */}
            {activeTab === 'signin' && (
              <div className="mt-8 pt-4 border-t border-neutral-100 text-center">
                <button
                  type="button"
                  onClick={handleLoadMockCredentials}
                  className="inline-flex items-center space-x-1.5 text-[10px] font-sans font-bold tracking-widest text-[#9A9180] hover:text-neutral-950 uppercase cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span>Seeded developer demo login (Click to insert)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
