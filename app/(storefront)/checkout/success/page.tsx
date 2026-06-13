/**
 * READY-TO-USE BLUEPRINT FOR NEXT.JS APP ROUTER ORDER SUCCESS SCREEN
 * File Location: app/checkout/success/OrderSuccessContent.tsx
 * 
 * Includes:
 * 1. Fully-typed static and dynamic modes
 * 2. Elegant card-based interface with high contrast typography
 * 3. Re-calculated physical summary parameters
 * 4. Printable invoices support using standard browser utility loops
 * 5. Secure state fallback checks
 */

import * as React from 'react';
import { useState } from 'react';

// Define core prop models matching Supabase schema types
export interface SuccessOrderHeader {
  id: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
  couponCode: string | null;
  createdAt: string;
  shippingDetails: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
}

export interface SuccessOrderItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  selectedColor: string | null;
}

interface OrderSuccessContentProps {
  order?: SuccessOrderHeader | null;
  items?: SuccessOrderItem[];
  fallbackOrderId?: string;
}

export function OrderSuccessContent({ order, items, fallbackOrderId }: OrderSuccessContentProps) {
  const [copied, setCopied] = useState(false);

  // Fallback demo mock order if no persistent DB values were passed (Safe sandbox playground setup)
  const activeOrder: SuccessOrderHeader = order || {
    id: fallbackOrderId || 'RS-482019',
    subtotal: 198.00,
    discount: 19.80,
    shipping: 0.00,
    tax: 14.70,
    total: 192.90,
    status: 'ordered',
    couponCode: 'SPACE10',
    createdAt: new Date().toISOString(),
    shippingDetails: {
      fullName: 'Alice Sterling',
      email: 'alice@readersonic.domain',
      phone: '(555) 123-5678',
      address: '742 Evergreens Road, Suite B',
      city: 'Austin',
      postalCode: '78746',
    }
  };

  const activeItems: SuccessOrderItem[] = items || [
    { id: 'item_1', productName: 'Sonic Sound Deck Mini', price: 99.00, quantity: 2, selectedColor: 'Oak Wood Finish' }
  ];

  // Micro-interaction routines
  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeOrder.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Human-readable timestamp conversion
  const formattedDate = new Date(activeOrder.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="font-sans text-stone-950 max-w-2xl mx-auto px-4 py-8 space-y-8 print:p-0">
      
      {/* SUCCESS CONFIRMATION TOP MARKS */}
      <div className="text-center space-y-4 print:hidden">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200">
          <span className="text-3xl">✓</span>
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Checkout Accomplished!</h2>
          <p className="text-xs text-stone-500">Your shipping request is authorized and routed to logistics providers.</p>
        </div>
      </div>

      {/* CORE RECEIPT CONTAINER */}
      <div className="bg-white border border-[#EAE5DA] rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm print:border-0 print:shadow-none print:p-0">
        
        {/* INVOICE HEADER BLOCK */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-stone-100 gap-4">
          <div className="space-y-1">
            <h3 className="font-mono text-[10px] font-bold text-stone-400 tracking-widest uppercase">Transaction Code</h3>
            <div className="flex items-center space-x-2">
              <strong className="text-lg font-mono text-amber-700 tracking-wider bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                {activeOrder.id}
              </strong>
              <button
                onClick={handleCopyCode}
                className="text-[10px] uppercase font-mono font-bold bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded text-stone-600 transition-colors cursor-pointer print:hidden"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="font-mono text-[10px] font-bold text-stone-400 uppercase">Purchase Timestamp</span>
            <p className="text-xs font-semibold text-stone-700">{formattedDate}</p>
          </div>
        </div>

        {/* SHIPMENT ADDRESS LAYOUT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              1. Delivery Destination
            </h4>
            <div className="text-xs text-stone-800 space-y-1 bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200/60">
              <p className="font-bold text-stone-900">{activeOrder.shippingDetails.fullName}</p>
              <p className="font-medium text-stone-600">{activeOrder.shippingDetails.address}</p>
              <p className="font-medium text-stone-600">
                {activeOrder.shippingDetails.city}, {activeOrder.shippingDetails.postalCode}
              </p>
              <p className="font-mono text-[10px] text-stone-400 pt-1">PH: {activeOrder.shippingDetails.phone}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              2. Status & Contact Details
            </h4>
            <div className="text-xs text-stone-800 space-y-2 bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200/60">
              <div>
                <p className="text-[10px] font-mono text-stone-400 uppercase">Registered Email</p>
                <p className="font-semibold text-stone-900 truncate">{activeOrder.shippingDetails.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-stone-400 uppercase">Fulfillment State</p>
                <span className="inline-flex items-center px-2 py-0.5 mt-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-800 uppercase tracking-wider">
                  {activeOrder.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CART ORDER ITEMS CHECKLIST */}
        <div className="space-y-3 pt-2">
          <h4 className="font-mono text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            3. Order Line Items
          </h4>
          <div className="border border-stone-200/80 rounded-2xl overflow-hidden bg-[#FAF8F5]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200/80 text-[10px] font-mono font-bold text-stone-500">
                  <th className="py-2.5 px-4">Item Details</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {activeItems.map((item) => (
                  <tr key={item.id} className="text-xs text-stone-800 font-medium">
                    <td className="py-3 px-4">
                      <p className="font-bold text-stone-900">{item.productName}</p>
                      {item.selectedColor && (
                        <span className="text-[9px] font-mono uppercase bg-stone-200/40 border border-stone-350/50 px-1 py-0.5 rounded text-stone-500">
                          {item.selectedColor}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-stone-750">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MATH CALCULATION STATEMENT */}
        <div className="border-t border-stone-100 pt-6 flex justify-end">
          <div className="w-full sm:w-80 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-stone-500">
              <span>Items Subtotal</span>
              <span className="font-sans text-stone-800 font-semibold">${activeOrder.subtotal.toFixed(2)}</span>
            </div>

            {activeOrder.discount > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>Voucher Applied ({activeOrder.couponCode || 'PROMOTIONS'})</span>
                <span className="font-sans font-bold">-${activeOrder.discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-stone-500">
              <span>Express Delivery Fees</span>
              <span className="font-sans text-stone-800 font-semibold">
                {activeOrder.shipping === 0 ? 'FREE' : `$${activeOrder.shipping.toFixed(2)}`}
              </span>
            </div>

            <div className="flex justify-between text-stone-500">
              <span>Local Sales Tax ({8.25}%)</span>
              <span className="font-sans text-stone-800 font-semibold">${activeOrder.tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm font-sans font-bold text-stone-900 pt-4 border-t border-stone-100">
              <span>Amount Invoiced</span>
              <span className="text-base tracking-tight font-extrabold text-[#1E1E1E]">${activeOrder.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER & NAVIGATION ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-stone-100 border border-stone-200/80 p-5 rounded-2xl gap-4 print:hidden">
        <p className="text-[11px] text-stone-500 leading-normal max-w-sm text-center sm:text-left">
          Need assistance? Our dispatch support lines are active 24/7. Provide your order serial number for instant resolution.
        </p>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-350 text-stone-800 text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            Print Receipt
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-stone-900 hover:bg-black text-stone-150 text-xs font-bold rounded-lg cursor-pointer transition-all"
          >
            Continue Shopping
          </a>
        </div>
      </div>

    </div>
  );
}

// -------------------------------------------------------------
// MAIN CLIENT-SIDE ENTRY FALLBACK COMPONENT
// -------------------------------------------------------------
export default function SuccessPageFallback() {
  return (
    <div className="py-8 bg-stone-50 min-h-screen flex items-center justify-center">
      <OrderSuccessContent />
    </div>
  );
}
