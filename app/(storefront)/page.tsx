import * as React from 'react';

export default function StorefrontHomePage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] font-sans text-[#1C1917]">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center space-y-8">
            <div className="inline-flex items-center space-x-2 bg-[#FAF1E6] border border-[#E9DFD0] px-3 py-1.5 rounded-full text-xs font-mono font-bold text-amber-700 tracking-wide uppercase">
              ✨ Premium Reading Solutions
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-stone-900">
              Reading Gadgets all over <span className="text-amber-600">Bangladesh</span>
            </h1>
            
            <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl mx-auto">
              Engineered for absolute immersion. Enhance your literary lifestyle with premium sound-resonance tablets, bone-conduction audio headsets, and glare-free electronic ink devices.
            </p>
            
            <div className="flex items-center justify-center space-x-4 pt-4">
              <a
                href="/products"
                className="px-8 py-4 bg-stone-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
              >
                Browse Premium Devices
              </a>
              <a
                href="/admin/dashboard"
                className="px-6 py-4 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm font-bold rounded-xl transition-all"
              >
                Admin Control Room
              </a>
            </div>
          </div>
        </div>
        
        {/* Abstract background decorative blobs */}
        <div className="absolute top-1/2 left-1/2 -z-10 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100/30 blur-3xl" />
      </section>

      {/* Feature Highlight Grid */}
      <section className="bg-white border-t border-stone-100 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
              <span className="text-2xl">⚡</span>
              <h3 className="font-bold text-stone-900 text-base">Audiophile Syncing</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Connect ambient literary auditory loops generated on-the-fly depending on text emotion.
              </p>
            </div>
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
              <span className="text-2xl">🎧</span>
              <h3 className="font-bold text-stone-900 text-base">Bone Conduction</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Friction-locked dual transducers delivering pristine high fidelity without fatigating.
              </p>
            </div>
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
              <span className="text-2xl">🇧🇩</span>
              <h3 className="font-bold text-stone-900 text-base">Express Delivery</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Pristine, secure fulfillment loops operating continuously all over Bangladesh.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
