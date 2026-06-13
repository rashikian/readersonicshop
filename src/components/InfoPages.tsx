import { ArrowLeft } from 'lucide-react';

interface InfoPagesProps {
  pageType: 'faq' | 'privacy' | 'terms';
  onBack: () => void;
}

export default function InfoPages({ pageType, onBack }: InfoPagesProps) {
  const renderContent = () => {
    switch (pageType) {
      case 'faq':
        return (
          <div className="space-y-8">
            <header className="border-b border-neutral-200 pb-6 mb-8 text-left">
              <h1 className="text-xl sm:text-2xl font-black tracking-[0.25em] text-neutral-950 uppercase">
                FREQUENTLY ASKED QUESTIONS
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-neutral-400 tracking-widest mt-2 uppercase">
                ReaderSonic Logistics &amp; COD Support
              </p>
            </header>

            <div className="divide-y divide-neutral-200 text-left">
              <div className="py-5 first:pt-0">
                <span className="text-[10px] font-mono text-[#9A9180] tracking-widest block mb-2">Q01</span>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-neutral-900 uppercase">
                  How do I place an order?
                </h3>
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed uppercase tracking-[0.05em] font-medium max-w-2xl">
                  Select a product, fill in your delivery details, and confirm the order. You will pay when the product is physically delivered to your address.
                </p>
              </div>

              <div className="py-5">
                <span className="text-[10px] font-mono text-[#9A9180] tracking-widest block mb-2">Q02</span>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-neutral-900 uppercase">
                  What is Cash on Delivery?
                </h3>
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed uppercase tracking-[0.05em] font-medium max-w-2xl">
                  You pay the courier company in cash at the moment the product arrives at your doorstep. No digital pre-payment is required.
                </p>
              </div>

              <div className="py-5">
                <span className="text-[10px] font-mono text-[#9A9180] tracking-widest block mb-2">Q03</span>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-neutral-900 uppercase">
                  Do I need an account to purchase?
                </h3>
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed uppercase tracking-[0.05em] font-medium max-w-2xl">
                  No, client accounts are not mandatory. You can place your order directly through our instantaneous guest checkout form.
                </p>
              </div>

              <div className="py-5">
                <span className="text-[10px] font-mono text-[#9A9180] tracking-widest block mb-2">Q04</span>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-neutral-900 uppercase">
                  How do I confirm my order?
                </h3>
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed uppercase tracking-[0.05em] font-medium max-w-2xl">
                  After placing the order, our helpdesk team will call or message your provided phone number to confirm the purchase details prior to logistics dispatch.
                </p>
              </div>

              <div className="py-5">
                <span className="text-[10px] font-mono text-[#9A9180] tracking-widest block mb-2">Q05</span>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-neutral-900 uppercase">
                  How long does delivery take?
                </h3>
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed uppercase tracking-[0.05em] font-medium max-w-2xl">
                  Typical delivery takes between 2 to 5 business days, varying based on your geographic location inside or outside Dhaka.
                </p>
              </div>

              <div className="py-5">
                <span className="text-[10px] font-mono text-[#9A9180] tracking-widest block mb-2">Q06</span>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-neutral-900 uppercase">
                  Can I cancel my active order?
                </h3>
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed uppercase tracking-[0.05em] font-medium max-w-2xl">
                  Yes, cancellations are permitted at any time prior to the order being handed over to our shipping courier partners.
                </p>
              </div>

              <div className="py-5">
                <span className="text-[10px] font-mono text-[#9A9180] tracking-widest block mb-2">Q07</span>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-neutral-900 uppercase">
                  What if I receive a wrong or damaged product?
                </h3>
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed uppercase tracking-[0.05em] font-medium max-w-2xl">
                  Contact our support lines immediately at delivery time. We will initiate a swift replacement process within 24–72 hours.
                </p>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-8">
            <header className="border-b border-neutral-200 pb-6 mb-8 text-left">
              <h1 className="text-xl sm:text-2xl font-black tracking-[0.25em] text-neutral-950 uppercase">
                PRIVACY POLICY
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-neutral-400 tracking-widest mt-2 uppercase">
                Last updated June 2026 • shop.readersonic.com
              </p>
            </header>

            <div className="space-y-8 text-left text-xs text-neutral-500 uppercase tracking-[0.05em] font-medium max-w-3xl leading-relaxed">
              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">1. INFORMATION WE COLLECT</h3>
                <p className="mb-2">We collect only necessary operational customer details to fulfill delivery:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-neutral-600">
                  <li>NAME</li>
                  <li>PHONE NUMBER</li>
                  <li>PHYSICAL ADDRESS</li>
                  <li>ORDER INFORMATION</li>
                  <li>DELIVERY STATUS TRACKS</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">2. HOW WE USE DATA</h3>
                <p className="mb-2">We utilize your collected personal data exclusively to:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-neutral-600">
                  <li>PROCESS AND SAFELY DELIVER INVENTORY ITEMS</li>
                  <li>CONFIRM CASH-ON-DELIVERY DETAILS VIA PHONE CONVERSATIONS</li>
                  <li>PROVIDE DEDICATED CUSTOMER HELPDESK SUPPORT</li>
                </ul>
                <p className="mt-3 text-neutral-950 font-bold">WE NEVER SELL, RENT, OR SHARE YOUR INFORMATION FOR EXTERNAL MARKETING CAMPAIGNS.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">3. DATA SHARING</h3>
                <p>We share delivery metrics exclusively with essential operational entities:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-neutral-600">
                  <li>AUTHORIZED COURIER &amp; DISTRIBUTION PARTNERS</li>
                  <li>OUR INTERNAL SALES AND LOGISTICS VERIFICATION STAFF</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">4. PAYMENT INFORMATION SECURITY</h3>
                <p>Since we maintain a strict focus on Cash on Delivery (COD) services, we do not require, collect, prompt, or store any digital credit card data or payment telemetry.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">5. DATA SECURITY</h3>
                <p>We enforce strict technical and physical safeguards to prevent unauthorized modifications, leakages, or accesses to guest order information.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">6. COOKIES</h3>
                <p>We use essential cookies to maintain cart memory, basic checkout state, and rudimentary site statistics.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">7. DATA RETENTION</h3>
                <p>Order metrics are archived only as long as business operations dictate to provide support and log transactions.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">8. POLICY UPDATES</h3>
                <p>We reserve right to update this policy at any time. Any changes are active instantly on posting.</p>
              </div>
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="space-y-8">
            <header className="border-b border-neutral-200 pb-6 mb-8 text-left">
              <h1 className="text-xl sm:text-2xl font-black tracking-[0.25em] text-neutral-950 uppercase">
                TERMS &amp; CONDITIONS
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-neutral-400 tracking-widest mt-2 uppercase">
                Effective June 2026 • shop.readersonic.com
              </p>
            </header>

            <div className="space-y-8 text-left text-xs text-neutral-500 uppercase tracking-[0.05em] font-medium max-w-3xl leading-relaxed">
              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">1. AGREEMENT</h3>
                <p>By browsing or purchasing from shop.readersonic.com, you unconditionally agree to fulfill these detailed Terms. If you disagree, please stop using the website layout immediately.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">2. CASH ON DELIVERY (COD)</h3>
                <p>We operate exclusively under Cash on Delivery rules:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-neutral-600">
                  <li>PAYMENT IN FULL MUST BE GIVEN TO COURIER AT HANDOFF</li>
                  <li>WE RETAIN THE RIGHT TO REFUSE ORDERS IF PHONE CONTACT ATTEMPTS FAIL</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">3. ORDER CONFIRMATION</h3>
                <p>All catalog bookings require verbal or text dispatch confirmations. Unverified entries will be cancelled or suspended indefinitely.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">4. PRICING</h3>
                <p>Catalog prices may alter without prior notice. The specific checkout rate visible at placement represents the binding cost.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">5. DELIVERY</h3>
                <p>Timeline calculations are non-guaranteed estimations (typically 2 to 5 business days). ReaderSonic holds no liability for courier-related shipping hold-ups.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">6. CANCELLATIONS</h3>
                <p>Users can alter or cancel their order free of charge at any moment before the logistics dispatch stage. Once shipped, cancellations cannot be processed.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">7. RETURNS &amp; REFUNDS</h3>
                <p>We process exchange services strictly under the following scenarios:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1 text-neutral-600">
                  <li>WRONG PRODUCTS SHIPPED</li>
                  <li>PRODUCT DAMAGED AT ARRIVAL TIME</li>
                </ul>
                <p className="mt-2 text-neutral-950 font-bold">CLIENTS MUST CONFIRM ANY DISCREPANCIES WITHIN 24–72 HOURS OF THE INITIAL DELIVERED HANDOVER.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">8. LIABILITY</h3>
                <p>We hold zero liability for indirect, incidental, or subsequent damages stemming from shipping delays or product misapplication.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">9. USER INFORMATION</h3>
                <p>Customers must provide accurate contact and address records. Inaccuracies will lead directly to automated dispatch cancellations.</p>
              </div>

              <div>
                <h3 className="text-xs font-extrabold tracking-widest text-[#9A9180] mb-2 font-mono">10. UPDATES TO TERMS</h3>
                <p>We reserve full authority to amend these legal guidelines. Continual usage represents acceptance of the latest framework versions.</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-2" id={`info-page-${pageType}`}>
      {/* Upper Back Button */}
      <div className="flex justify-start mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-xs font-bold tracking-[0.2em] text-[#9A9180] hover:text-black uppercase transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
          BACK TO STORE
        </button>
      </div>

      {/* Main Content card */}
      <div className="bg-white border border-neutral-200 p-6 sm:p-12">
        {renderContent()}
      </div>

      {/* Lower scroll top banner */}
      <div className="mt-12 flex justify-center">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-[9px] font-mono font-bold tracking-widest uppercase text-neutral-400 hover:text-neutral-950 transition-colors"
        >
          ⌃ BACK TO TOP OF SECTION
        </button>
      </div>
    </div>
  );
}
