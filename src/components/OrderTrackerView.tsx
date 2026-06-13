import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { Order } from '../types';
import { Search, Package, CheckCircle, Clock, Truck, Check, HelpCircle, ArrowRight } from 'lucide-react';

interface OrderTrackerViewProps {
  onBack: () => void;
}

export default function OrderTrackerView({ onBack }: OrderTrackerViewProps) {
  const [searchId, setSearchId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [searchError, setSearchError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'to_receive' | 'completed'>('to_receive');

  // Input states for browser clearing guest order recovery
  const [recoveryQuery, setRecoveryQuery] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Load order IDs from localStorage or user authentication session and fetch their live states
  const loadOrderHistory = async () => {
    try {
      const storedIds: string[] = JSON.parse(
        localStorage.getItem('readersonic_customer_orders') || '[]'
      );

      const allOrders = await db.getOrders();
      let matched = allOrders.filter(o => storedIds.includes(o.id));

      // Attempt dynamic authenticated user restore fallback if local storage is cleared
      const user = await db.getUser();
      if (user) {
        const userEmail = user.email?.toLowerCase();
        const userOrders = allOrders.filter(o => {
          const matchesUserId = o.user_id === user.id;
          const matchesEmail = o.shipping?.email?.toLowerCase() === userEmail;
          return matchesUserId || matchesEmail;
        });

        // Write missing user orders back to local storage so they are restored permanently
        let updatedLocal = [...storedIds];
        let changed = false;
        userOrders.forEach(o => {
          if (!updatedLocal.includes(o.id)) {
            updatedLocal.push(o.id);
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('readersonic_customer_orders', JSON.stringify(updatedLocal));
        }

        // Merge user-session recovered orders into active listings view
        userOrders.forEach(o => {
          if (!matched.some(m => m.id === o.id)) {
            matched.push(o);
          }
        });
      }

      setOrderHistory(matched);
      if (matched.length > 0) {
        // If there's no tracked order yet, default track the first one
        setTrackedOrder(current => current || matched[0]);
        setSearchId(current => current || matched[0].id);
      }
    } catch (err) {
      console.warn('Failed to resolve local order history list:', err);
    }
  };

  const handleRecoverOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = recoveryQuery.trim().toLowerCase();
    if (!query) return;

    setRecoveryLoading(true);
    setRecoveryMessage(null);

    try {
      const allOrders = await db.getOrders();
      const recovered = allOrders.filter(o => {
        const normalizedPhone = (o.shipping?.phone || '').replace(/[\s\-()]/g, '');
        const normalizedQuery = query.replace(/[\s\-()]/g, '');
        return normalizedPhone.length > 3 && normalizedPhone === normalizedQuery;
      });

      if (recovered.length > 0) {
        const storedIds: string[] = JSON.parse(
          localStorage.getItem('readersonic_customer_orders') || '[]'
        );
        let updatedLocal = [...storedIds];
        let newlyAdded = 0;

        recovered.forEach(o => {
          if (!updatedLocal.includes(o.id)) {
            updatedLocal.push(o.id);
            newlyAdded++;
          }
        });

        localStorage.setItem('readersonic_customer_orders', JSON.stringify(updatedLocal));

        // Reload the view
        await loadOrderHistory();

        // Focus and track the latest recovered order
        setTrackedOrder(recovered[0]);
        setSearchId(recovered[0].id);

        setRecoveryMessage({
          text: `SUCCESS! RECOVERED ${recovered.length} ORDER(S) ASSOCIATED WITH "${query.toUpperCase()}". YOUR HISTORY LIST HAS BEEN RESTORED.`,
          isError: false
        });
        setRecoveryQuery('');
      } else {
        setRecoveryMessage({
          text: `NO CURRENT ORDERS IN THE SYSTEM MATCHED THE PHONE NUMBER "${query.toUpperCase()}".`,
          isError: true
        });
      }
    } catch (err) {
      setRecoveryMessage({
        text: 'AN ERROR OCCURRED WHILE CONNECTING TO THE SERVER. PLEASE TRY AGAIN.',
        isError: true
      });
    } finally {
      setRecoveryLoading(false);
    }
  };

  useEffect(() => {
    loadOrderHistory();

    // Setup listener for real-time order status updates matching items in list/track
    const handleOrdersRefreshed = () => {
      loadOrderHistory();
    };

    window.addEventListener('supabaseOrdersUpdate', handleOrdersRefreshed);
    return () => {
      window.removeEventListener('supabaseOrdersUpdate', handleOrdersRefreshed);
    };
  }, []);

  const handleSearch = async (targetId: string) => {
    const formattedId = targetId.trim().toUpperCase();
    if (!formattedId) return;

    setTrackingLoading(true);
    setSearchError('');
    try {
      const allOrders = await db.getOrders();
      const match = allOrders.find(o => o.id === formattedId);
      if (match) {
        setTrackedOrder(match);
        // Persist order in local history too if not already present
        const storedIds: string[] = JSON.parse(
          localStorage.getItem('readersonic_customer_orders') || '[]'
        );
        if (!storedIds.includes(formattedId)) {
          storedIds.push(formattedId);
          localStorage.setItem('readersonic_customer_orders', JSON.stringify(storedIds));
          const updatedHistory = allOrders.filter(o => storedIds.includes(o.id));
          setOrderHistory(updatedHistory);
        }
      } else {
        setSearchError(`No order records matched the identifier "${formattedId}".`);
        setTrackedOrder(null);
      }
    } catch (err) {
      setSearchError('An error occurred while tracking the order. Please try again.');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Maps order status code to an integer index
  const getStatusStepIndex = (status: string): number => {
    const s = status.toLowerCase();
    if (s === 'pending' || s === 'ordered') return 0;
    if (s === 'confirmed' || s === 'auditing' || s === 'processing') return 1;
    if (s === 'shipped' || s === 'dispatched') return 2;
    if (s === 'delivered' || s === 'completed') return 3;
    return 0;
  };

  const statusIndex = trackedOrder ? getStatusStepIndex(trackedOrder.order_status || trackedOrder.status) : 0;

  const trackingSteps = [
    { title: 'ORDER PLACED', desc: 'Received and registered', icon: Clock },
    { title: 'CONFIRMED', desc: 'Acknowledged & preparing checkout', icon: Package },
    { title: 'DISPATCHED', desc: 'In hand of priority carrier hub', icon: Truck },
    { title: 'DELIVERED', desc: 'Arrived at destination address', icon: CheckCircle }
  ];

  return (
    <div id="order-tracker-workspace" className="max-w-4xl mx-auto py-10 animate-fadeIn">
      {/* Back button link */}
      <button
        onClick={onBack}
        className="group inline-flex items-center space-x-2 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-neutral-400 hover:text-black transition-colors mb-12 cursor-pointer"
      >
        <span>← RETURN TO SHOP</span>
      </button>

      <div className="text-center max-w-lg mx-auto mb-16">
        <h1 className="font-sans text-3xl font-extrabold tracking-tight text-neutral-950 uppercase leading-none mb-4">
          TRACK YOUR DISPATCH
        </h1>
        <p className="text-xs uppercase tracking-wider text-neutral-400 leading-relaxed font-sans">
          Enter your order identifier code or select a transaction from your browser checkout log history.
        </p>

        {/* Tracker ID search input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(searchId);
          }}
          className="mt-8 flex gap-2 border border-neutral-200 bg-[#f4f4f4] p-1.5 focus-within:border-black transition-colors"
        >
          <div className="flex-1 flex items-center pl-2.5">
            <Search className="w-4.5 h-4.5 text-neutral-400 mr-2.5" />
            <input
              type="text"
              placeholder="e.g. RS-534215"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-sans tracking-widest text-[#121212] focus:outline-none placeholder-neutral-400 uppercase font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={trackingLoading || !searchId.trim()}
            className="bg-black hover:bg-neutral-900 px-5 py-3 text-[10px] font-sans tracking-widest font-black text-white uppercase transition-all disabled:opacity-50 cursor-pointer"
          >
            {trackingLoading ? 'SEARCHING...' : 'TRACK ORDER'}
          </button>
        </form>

        {searchError && (
          <p className="mt-3.5 text-[10px] font-sans tracking-wider text-red-500 uppercase font-bold">
            {searchError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
        
        {/* Active Tracked Order Details */}
        <div className="md:col-span-8">
          {trackedOrder ? (
            <div className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-8">
              
              {/* Order mini summary header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-150">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase font-bold">ORDER ID:</span>
                  <h3 className="text-lg font-black tracking-widest text-neutral-950 font-sans">{trackedOrder.id}</h3>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase mt-0.5 font-sans">
                    Placed On: {new Date(trackedOrder.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                </div>
                <div className="bg-black text-white text-[10px] font-mono font-black tracking-widest px-3 py-1.5 uppercase select-none rounded-none">
                  LIVE STATUS: {trackedOrder.order_status || trackedOrder.status || 'PENDING'}
                </div>
              </div>

              {/* Status Visual progress timeline */}
              <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-neutral-100">
                {trackingSteps.map((step, idx) => {
                  const StepIcon = step.icon;
                  const isMatched = idx <= statusIndex;
                  const isOngoing = idx === statusIndex;

                  return (
                    <div key={idx} className="relative flex items-start space-x-4">
                      {/* Circle dot marker */}
                      <div 
                        className={`absolute -left-[27.5px] w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-500 bg-white ${
                          isMatched 
                            ? 'border-black text-black' 
                            : 'border-neutral-200 text-transparent'
                        }`}
                      >
                        {isMatched && <div className="w-1.5 h-1.5 bg-black" />}
                      </div>

                      {/* Icon container */}
                      <div className={`p-2 border transition-all ${
                        isOngoing 
                          ? 'bg-neutral-50 border-black text-neutral-950' 
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

              {/* Delivery Consignment details */}
              <div className="border-t border-neutral-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-neutral-500 font-bold uppercase tracking-wide">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-neutral-400 block mb-1">CONSIGNED RECIPIENT:</span>
                  <p className="font-extrabold text-neutral-950">{trackedOrder.shipping.fullName}</p>
                  <p className="text-neutral-400 leading-relaxed font-mono text-[10px] uppercase font-bold">
                    PHONE: {trackedOrder.shipping.phone}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-neutral-400 block mb-1">DELIVERY DESTINATION:</span>
                  <p className="font-extrabold text-[#121212]">{trackedOrder.shipping.address}</p>
                  <p className="text-neutral-400 leading-relaxed font-semibold text-[10px]">
                    {trackedOrder.shipping.city}, Bangladesh ({ (trackedOrder.shipping.city || '').trim().toLowerCase().includes('dhaka') ? 'Inside Dhaka' : 'Outside Dhaka' })
                  </p>
                </div>
              </div>

              {/* Items Summary list */}
              <div className="border-t border-neutral-100 pt-6">
                <span className="text-[10px] font-black text-neutral-400 block mb-3 tracking-widest uppercase">CONSIGNED ITEMS SKU</span>
                <div className="divide-y divide-neutral-100">
                  {trackedOrder.items.map((item, index) => (
                    <div key={index} className="flex py-3 justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-neutral-900 uppercase">{item.product?.name || 'Vanguard SKU'}</span>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">
                          {item.selectedColor ? `Color: ${item.selectedColor}` : 'Default Color'} | Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-neutral-900 text-right">
                        BDT {(item.product?.price || 0) * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-neutral-50 p-4 border border-neutral-200 mt-4 space-y-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                  <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span className="text-neutral-950 font-extrabold">BDT {trackedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DELIVERY FEE:</span>
                    <span className="text-neutral-950 font-extrabold">BDT {(trackedOrder.deliveryFee ?? trackedOrder.tax ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-neutral-200" />
                  <div className="flex justify-between font-sans text-sm text-neutral-950 font-black pt-1">
                    <span>GRAND TOTAL DUE COD:</span>
                    <span className="font-extrabold">BDT {trackedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="border border-neutral-200 bg-neutral-50/50 p-12 text-center flex flex-col items-center justify-center space-y-4">
              <HelpCircle className="w-10 h-10 text-neutral-300" />
              <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold leading-relaxed max-w-sm">
                No active tracking sheet loaded. Input your RS identification code above or select an order from your history on the right to track status updates.
              </p>
            </div>
          )}
        </div>

        {/* Local device Checkout logs & order history */}
        <div className="md:col-span-4 space-y-6">
          <div className="border border-neutral-200 p-6 bg-neutral-50/50">
            <h3 className="font-sans font-black text-xs text-neutral-950 uppercase tracking-widest mb-4 pb-2 border-b border-neutral-200 flex items-center justify-between">
              <span>MY ORDER HISTORY</span>
              <span className="text-[8px] bg-black text-white px-1.5 py-0.5 tracking-widest font-mono font-bold uppercase">
                {orderHistory.length} PLACED
              </span>
            </h3>

            {orderHistory.length > 0 && (
              <div className="flex border-b border-neutral-200 mb-4 text-[9px] font-sans font-black tracking-widest uppercase">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 pb-2 border-b-2 text-center cursor-pointer transition-all ${
                    activeTab === 'all' ? 'border-neutral-950 text-neutral-950 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-900 font-bold'
                  }`}
                >
                  ALL ({orderHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('to_receive')}
                  className={`flex-1 pb-2 border-b-2 text-center cursor-pointer transition-all ${
                    activeTab === 'to_receive' ? 'border-neutral-950 text-neutral-950 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-900 font-bold'
                  }`}
                >
                  TO RECIEVE ({orderHistory.filter(o => {
                    const s = (o.order_status || o.status || 'pending').toLowerCase();
                    return s !== 'delivered' && s !== 'completed';
                  }).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 pb-2 border-b-2 text-center cursor-pointer transition-all ${
                    activeTab === 'completed' ? 'border-neutral-950 text-neutral-950 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-900 font-bold'
                  }`}
                >
                  DELIVERED ({orderHistory.filter(o => {
                    const s = (o.order_status || o.status || 'pending').toLowerCase();
                    return s === 'delivered' || s === 'completed';
                  }).length})
                </button>
              </div>
            )}

            {orderHistory.length > 0 ? (
              (() => {
                const filteredHistory = orderHistory.filter((historyOrder) => {
                  const s = (historyOrder.order_status || historyOrder.status || 'pending').toLowerCase();
                  if (activeTab === 'all') return true;
                  if (activeTab === 'to_receive') return s !== 'delivered' && s !== 'completed';
                  if (activeTab === 'completed') return s === 'delivered' || s === 'completed';
                  return true;
                });

                if (filteredHistory.length === 0) {
                  return (
                    <div className="text-center py-10 border border-neutral-100 rounded bg-white/40">
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400 leading-relaxed font-bold font-sans">
                        No orders listed in this filter.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto">
                    {filteredHistory.map((historyOrder) => {
                      const isTracked = trackedOrder?.id === historyOrder.id;
                      return (
                        <button
                          key={historyOrder.id}
                          onClick={() => {
                            setTrackedOrder(historyOrder);
                            setSearchId(historyOrder.id);
                            setSearchError('');
                          }}
                          className={`w-full text-left p-3.5 border transition-all duration-200 group flex justify-between items-center cursor-pointer ${
                            isTracked 
                              ? 'bg-black border-black text-white' 
                              : 'bg-white border-neutral-200 text-neutral-800 hover:border-black'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono tracking-widest font-black block">
                              {historyOrder.id}
                            </span>
                            <p className={`text-[9px] font-bold uppercase mt-1 ${isTracked ? 'text-neutral-400' : 'text-neutral-400'}`}>
                              {new Date(historyOrder.createdAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                            </p>
                            <span className={`inline-block text-[8px] font-mono tracking-widest px-1.5 py-0.5 uppercase mt-2 font-bold ${
                              isTracked ? 'bg-[#262626] text-white' : 'bg-neutral-100 text-neutral-800'
                            }`}>
                              {historyOrder.order_status || historyOrder.status || 'PENDING'}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-[10px] font-sans font-black ${isTracked ? 'text-white' : 'text-neutral-950'}`}>
                              BDT {historyOrder.total}
                            </p>
                            <ArrowRight className={`w-3.5 h-3.5 mt-2 ml-auto transition-transform duration-200 ${
                              isTracked ? 'text-neutral-300 translate-x-1' : 'text-neutral-300 group-hover:translate-x-1 group-hover:text-black'
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-10">
                <p className="text-[9px] uppercase tracking-widest text-neutral-400 leading-relaxed font-bold">
                  No checkout logs found on this device browser.
                </p>
              </div>
            )}
          </div>

          {/* Recovery Form Option */}
          <div className="border border-neutral-200 p-6 bg-white space-y-4">
            <h4 className="font-sans font-black text-xs text-neutral-950 uppercase tracking-widest pb-2 border-b border-neutral-200">
              RECOVER LOST LOGS
            </h4>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold leading-normal font-sans">
              Cleared your browser storage or cookies? Search using your delivery phone number to restore your order history list.
            </p>
            <form onSubmit={handleRecoverOrders} className="space-y-2">
              <input
                type="text"
                placeholder="PHONE NO."
                value={recoveryQuery}
                onChange={(e) => setRecoveryQuery(e.target.value)}
                className="w-full bg-[#f4f4f4] border border-neutral-200 p-2.5 text-[10px] font-sans tracking-widest text-[#121212] focus:outline-none focus:border-black uppercase font-bold placeholder-neutral-400"
                required
              />
              <button
                type="submit"
                disabled={recoveryLoading || !recoveryQuery.trim()}
                className="w-full bg-black hover:bg-neutral-900 text-white font-sans text-[10px] font-black tracking-widest py-3 uppercase transition-all disabled:opacity-50 cursor-pointer"
              >
                {recoveryLoading ? 'STORING LOGS...' : 'RESTORE MY ORDERS'}
              </button>
            </form>

            {recoveryMessage && (
              <p className={`text-[9px] font-sans tracking-wider uppercase font-bold leading-relaxed ${
                recoveryMessage.isError ? 'text-red-500' : 'text-neutral-900 bg-neutral-50 border border-neutral-200 p-2.5'
              }`}>
                {recoveryMessage.text}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
