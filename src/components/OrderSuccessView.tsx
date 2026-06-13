import { useEffect, useState } from 'react';
import { Order } from '../types';
import { ShieldCheck, Truck, Package, Check, ChevronRight } from 'lucide-react';

interface OrderSuccessViewProps {
  order: Order | null;
  onNavigateHome: () => void;
  onNavigateTrack: () => void;
}

export default function OrderSuccessView({ order, onNavigateHome, onNavigateTrack }: OrderSuccessViewProps) {
  const [liveOrder, setLiveOrder] = useState<Order | null>(order);

  useEffect(() => {
    setLiveOrder(order);
  }, [order]);

  // Progressive real-time updates from Supabase subscription
  useEffect(() => {
    const handleOrdersRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<Order[]>;
      if (customEvent.detail && order) {
        const freshList = customEvent.detail;
        const fresh = freshList.find(o => o.id === order.id);
        if (fresh) {
          setLiveOrder(fresh);
        }
      }
    };
    window.addEventListener('supabaseOrdersUpdate', handleOrdersRefreshed);
    return () => {
      window.removeEventListener('supabaseOrdersUpdate', handleOrdersRefreshed);
    };
  }, [order]);

  if (!order || !liveOrder) {
    return (
      <div className="py-24 text-center">
        <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">NO ACTIVE DISPATCH LEDGER RECORD DETECTED.</p>
        <button onClick={onNavigateHome} className="mt-6 px-6 py-3 bg-neutral-950 text-white text-xs font-bold tracking-widest uppercase">
          RETURN TO HOME
        </button>
      </div>
    );
  }

  // Map order status code to index step
  const getStatusStepIndex = (status: string): number => {
    const s = status.toLowerCase();
    if (s === 'pending' || s === 'ordered') return 0;
    if (s === 'confirmed' || s === 'auditing' || s === 'processing') return 1;
    if (s === 'shipped' || s === 'dispatched') return 2;
    if (s === 'delivered' || s === 'completed') return 3;
    return 0;
  };

  const currentStep = getStatusStepIndex(liveOrder.order_status || liveOrder.status || 'pending');

  const trackingSteps = [
    { title: 'ORDER RECEIVED', desc: 'COD transaction logged and authorized', icon: Package },
    { title: 'PREPARING FOR CARRIER', desc: 'Assigned to nearest priority express hub', icon: ShieldCheck },
    { title: 'IN TRANSIT', desc: 'Dispatched with direct tracking signature', icon: Truck },
    { title: 'DELIVERED', desc: 'Arrived at the destination address', icon: Check }
  ];

  return (
    <div id="order-success-workspace" className="py-12 max-w-4xl mx-auto animate-fadeIn">
      
      {/* Header Congratulation text */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-neutral-50 text-neutral-950 rounded-full mb-6 border border-neutral-200">
          <Check className="w-6 h-6 stroke-[2]" />
        </div>
        <span className="text-[10px] font-sans tracking-[0.25em] text-neutral-400 uppercase font-black block mb-2">THANK YOU FOR YOUR PURCHASE</span>
        <h1 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 uppercase leading-none mb-4">
          ORDER CONFIRMED.
        </h1>
        <p className="text-xs uppercase tracking-wider text-neutral-400 max-w-sm mx-auto leading-relaxed">
          Your order has successfully registered in our local dispatch queues. We will contact you via phone or SMS with dispatch coordinates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
        
        {/* Left column: tracking progress list */}
        <div className="md:col-span-7 border border-neutral-200 p-6 sm:p-8 bg-white/50">
          <h2 className="font-sans font-black text-xs text-neutral-950 uppercase tracking-widest mb-8 pb-3 border-b border-neutral-150 flex items-center justify-between">
            <span>PACK TRANSIT TRACKING</span>
            <span className="text-[9px] tracking-widest text-neutral-400 font-bold uppercase">LIVE FEED</span>
          </h2>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-neutral-200">
            {trackingSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isMatched = idx <= currentStep;
              const isOngoing = idx === currentStep;

              return (
                <div key={idx} className="relative flex items-start space-x-4">
                  {/* Circle milestone */}
                  <div 
                    className={`absolute -left-7 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-500 bg-white ${
                      isMatched 
                        ? 'border-neutral-950 text-neutral-950' 
                        : 'border-neutral-200 text-transparent'
                    }`}
                  >
                    {isMatched && <div className="w-1.5 h-1.5 bg-neutral-950" />}
                  </div>

                  {/* Icon wrap */}
                  <div className={`p-2 border transition-all ${
                    isOngoing 
                      ? 'bg-neutral-50 border-neutral-950 text-neutral-950' 
                      : isMatched 
                        ? 'bg-white border-neutral-200 text-neutral-800' 
                        : 'bg-white border-transparent text-neutral-300'
                  }`}>
                    <StepIcon className="w-3.5 h-3.5" />
                  </div>

                  <div>
                    <h3 className={`text-xs font-black tracking-wider uppercase ${isMatched ? 'text-neutral-950' : 'text-neutral-300'}`}>
                      {step.title}
                    </h3>
                    <p className={`text-[10px] mt-1 font-bold uppercase tracking-wider ${isMatched ? 'text-neutral-400' : 'text-neutral-300'}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: simple summary receipt parameters card */}
        <div className="md:col-span-5 space-y-6">
          <div className="border border-neutral-200 p-6 bg-neutral-50/50">
            <h3 className="font-sans font-black text-xs text-neutral-950 uppercase tracking-widest mb-5 pb-2 border-b border-neutral-200">
              RECEIPT SUMMARY
            </h3>

            <div className="space-y-4 text-xs font-bold uppercase tracking-wider text-neutral-500">
              <div className="flex justify-between">
                <span>ORDER CODE:</span>
                <span className="font-sans font-extrabold text-neutral-950 select-all">{liveOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span>COMMIT TIME:</span>
                <span className="font-sans text-neutral-950">JUST NOW</span>
              </div>
              <div className="flex justify-between">
                <span>METHOD:</span>
                <span className="text-neutral-950">📦 CASH ON DELIVERY</span>
              </div>
              
              <div className="h-px bg-neutral-200" />
              
              <div className="space-y-1">
                <span className="text-[10px] tracking-widest font-black text-neutral-400 block mb-1">CONSIGNED COORDINATES:</span>
                <p className="font-extrabold text-neutral-950">{liveOrder.shipping.fullName}</p>
                <p className="text-neutral-400 leading-relaxed font-semibold text-[10px]">
                  {liveOrder.shipping.address}<br />
                  {liveOrder.shipping.city}, {liveOrder.shipping.postalCode}<br />
                  {liveOrder.shipping.country}
                </p>
              </div>
              
              <div className="h-px bg-neutral-200" />
              
              <div className="space-y-2 pb-1 text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span className="text-neutral-950 font-extrabold">BDT {liveOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>DELIVERY FEE:</span>
                  <span className="text-neutral-950 font-extrabold">BDT {(liveOrder.deliveryFee ?? liveOrder.tax ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="h-px bg-neutral-200" />
              
              <div className="flex justify-between font-sans text-sm text-neutral-950 pt-2 font-black uppercase tracking-wider">
                <span>CASH DUE ON DELIVERY:</span>
                <span className="font-extrabold">BDT {liveOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onNavigateTrack}
              className="w-full bg-neutral-950 hover:bg-neutral-850 text-white font-sans text-xs font-bold tracking-[0.2em] py-4 flex items-center justify-center space-x-1.5 uppercase transition-colors cursor-pointer"
            >
              <span>TRACK "TO RECIEVE" ORDERS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full bg-white hover:bg-neutral-50 text-neutral-950 border border-neutral-300 font-sans text-xs font-bold tracking-[0.2em] py-3.5 flex items-center justify-center space-x-1.5 uppercase transition-colors cursor-pointer"
            >
              <span>CONTINUE SHOPPING</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
