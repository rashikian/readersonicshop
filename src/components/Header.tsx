import { useState, useEffect } from 'react';
import { Menu, X, Search, ShoppingBag, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  cartCount: number;
  currentView: string;
  onNavigate: (view: string, productId?: string) => void;
  isDbLive: boolean;
  onSearchChange: (search: string) => void;
  searchValue: string;
}

export default function Header({
  cartCount,
  currentView,
  onNavigate,
  isDbLive,
  onSearchChange,
  searchValue,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleOpenSearch = () => {
      setIsSearchOpen(true);
    };
    window.addEventListener('openSearchEvent', handleOpenSearch);
    return () => {
      window.removeEventListener('openSearchEvent', handleOpenSearch);
    };
  }, []);

  return (
    <header 
      id="app-header" 
      className="sticky top-0 z-50 bg-black border-b border-neutral-900 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 3-Column layout perfectly centering the logo brand on desktop & mobile */}
        <div className="grid grid-cols-3 items-center h-20 w-full">
          
          {/* Column 1: Left Menu Trigger Hamburger */}
          <div className="flex justify-start items-center">
            <button
               id="menu-trigger-btn"
              onClick={() => setIsMenuOpen(true)}
              className="p-2 text-white hover:text-neutral-400 transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle Menu"
            >
              <Menu className="w-6 h-6 stroke-[1.5]" />
            </button>
          </div>

          {/* Column 2: Centered Logo Brand with White Stopwatch Icon */}
          <div className="flex justify-center items-center">
            <div 
              id="logo-brand" 
              className="flex items-center cursor-pointer select-none"
              onClick={() => {
                onNavigate('listing');
              }}
            >
              {/* Brand logo exactly matches user's stopwatch/clock attachment */}
              <svg 
                viewBox="0 0 100 100" 
                className="w-9 h-9 sm:w-11 sm:h-11 text-white fill-none stroke-current shrink-0 hover:scale-105 transition-transform duration-200" 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Outer stopwatch ring body */}
                <circle cx="50" cy="57" r="26" />
                {/* Clock indicator hand slanted towards 2 o'clock */}
                <line x1="50" y1="57" x2="63" y2="44" strokeWidth="7.5" />
                {/* Flat top stopwatch button/pusher */}
                <rect x="39" y="16" width="22" height="7" rx="3.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
          </div>

          {/* Column 3: Right Search and Bag */}
          <div className="flex justify-end items-center space-x-1 sm:space-x-3">
            
            {/* Search overlay toggle */}
            <button
              id="search-overlay-trigger"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-white hover:text-neutral-400 transition-colors focus:outline-none cursor-pointer"
              aria-label="Search items"
            >
              <Search className="w-5 h-5 stroke-[1.5]" />
            </button>

            {/* Shopping Bag Trigger with amber status highlights */}
            <button
              id="cart-trigger-btn"
              onClick={() => onNavigate('cart')}
              className="p-2 text-white hover:text-neutral-400 transition-colors focus:outline-none relative cursor-pointer"
              aria-label="Shopping Bags"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-white text-black text-[9px] font-sans font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* --- Search Panel Slide-down Overlay (Gorgeously Black) --- */}
      {isSearchOpen && (
        <div className="absolute top-full left-0 w-full bg-neutral-950 border-b border-neutral-900 shadow-xl py-4 px-4 sm:px-6 lg:px-8 z-40 transition-all duration-300">
          <div className="max-w-3xl mx-auto flex items-center space-x-3">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="SEARCH PRODUCTS..."
              value={searchValue}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentView !== 'listing') onNavigate('listing');
              }}
              autoFocus
              className="w-full text-base md:text-xs font-sans tracking-widest bg-transparent border-none outline-none py-2 text-white placeholder-neutral-500 uppercase"
            />
            <button
              onClick={() => {
                setIsSearchOpen(false);
                onSearchChange('');
              }}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- Left Sliding SpaceX Drawer Navigation (Matching Premium Black Theme) --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs cursor-pointer" 
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Sliding panel content: Pure slide-right with NO opacity fade */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-xs sm:max-w-sm bg-neutral-950 border-r border-neutral-900 h-full shadow-2xl flex flex-col justify-between py-6 px-6 sm:px-8 overflow-y-auto z-10 text-white"
            >
              <div>
                {/* Drawer header */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-900">
                  <span className="font-sans text-xs font-black tracking-[0.2em] text-neutral-400">MENU NAVIGATION</span>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1 text-white hover:text-neutral-400 transition-colors focus:outline-none cursor-pointer"
                  >
                    <X className="w-5 h-5 stroke-[1.5]" />
                  </button>
                </div>

                {/* Drawer Links layout */}
                <nav className="flex flex-col space-y-6">
                  <button
                    onClick={() => {
                      onSearchChange('');
                      onNavigate('listing');
                      setIsMenuOpen(false);
                    }}
                    className="text-left py-2 font-sans text-sm font-bold tracking-[0.15em] text-neutral-200 hover:text-white transition-colors cursor-pointer border-b border-neutral-900 uppercase"
                  >
                    SHOP PRODUCTS
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('track-order');
                      setIsMenuOpen(false);
                    }}
                    className="text-left py-2 font-sans text-sm font-bold tracking-[0.15em] text-neutral-200 hover:text-white transition-colors cursor-pointer border-b border-neutral-900 uppercase"
                  >
                    TRACK MY ORDER
                  </button>

                   {/* Sub-options matching SpaceX styles: Admin */}
                  <div className="pt-4 border-t border-neutral-900 flex flex-col space-y-4">
                    <button
                      onClick={() => {
                        onNavigate('admin');
                        setIsMenuOpen(false);
                      }}
                      className="text-left font-sans text-xs tracking-wider text-neutral-400 hover:text-white uppercase cursor-pointer flex items-center space-x-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                      <span>ADMIN DASHBOARD</span>
                    </button>
                  </div>
                </nav>
              </div>

              {/* Bottom Brand Stamp */}
              <div className="pt-8 border-t border-neutral-950 text-[10px] font-sans tracking-widest text-neutral-500 uppercase text-center">
                READER<span className="font-normal font-sans">SONIC</span> EST. 2026
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
