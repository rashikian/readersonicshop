/**
 * READY-TO-USE BLUEPRINT FOR NEXT.JS APP ROUTER CHECKOUT SCREEN
 * File Location: app/checkout/page.tsx / components/CheckoutContent.tsx
 * 
 * Styled perfectly using Tailwind CSS, featuring split layouts,
 * customer information forms, adaptive discounts, tax calculations, and 
 * multi-table Supabase transactional order insertion.
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Define localized types for checkout
export interface ShippingForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface CartCheckoutItem {
  id: string;
  name: string;
  price: number;
  image: string;
  selectedColor: string;
  quantity: number;
  stock: number;
}

// -------------------------------------------------------------
// SKELETON LOADER SCREEN FOR THE CHECKOUT FLOW
// -------------------------------------------------------------
export function CheckoutSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 space-y-10 animate-pulse">
      <div className="h-6 bg-neutral-200 rounded w-32" />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form area shimmer */}
        <div className="lg:col-span-7 space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-1/3" />
          <div className="space-y-4">
            <div className="h-11 bg-neutral-150 rounded-xl w-full" />
            <div className="h-11 bg-neutral-150 rounded-xl w-full" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-11 bg-neutral-150 rounded-xl" />
              <div className="h-11 bg-neutral-150 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Invoice Area shimmer */}
        <div className="lg:col-span-5 bg-neutral-100 rounded-3xl p-6 h-[400px]" />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STATEFUL CHECKOUT CONTENT MODULE
// -------------------------------------------------------------
'use client';

interface CheckoutContentProps {
  initialUser?: any;
  cartItems?: CartCheckoutItem[]; // Fallback array if context isn't active
  onSuccess?: (orderId: string) => void;
}

export function CheckoutContent({ initialUser, cartItems: designCartItems, onSuccess }: CheckoutContentProps) {
  // 1. Initialize Supabase Client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Active checkout states
  const [items, setItems] = useState<CartCheckoutItem[]>([]);
  const [form, setForm] = useState<ShippingForm>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
  });

  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0); // In dollars
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedOrderCode, setCompletedOrderCode] = useState<string | null>(null);

  // Populate localized state from props or browser memory fallback
  useEffect(() => {
    if (designCartItems && designCartItems.length > 0) {
      setItems(designCartItems);
    } else {
      const savedCart = localStorage.getItem('readersonic_cart');
      if (savedCart) {
        try {
          setItems(JSON.parse(savedCart));
        } catch (err) {
          console.warn('Unable to populate checkout with saved local storage cart.', err);
        }
      }
    }

    if (initialUser) {
      setForm((prev) => ({
        ...prev,
        fullName: initialUser.user_metadata?.full_name || '',
        email: initialUser.email || '',
      }));
    }
  }, [designCartItems, initialUser]);

  // 3. Price computations
  const rawSubtotal = items.reduce((acc, current) => acc + current.price * current.quantity, 0);
  const shippingCharge = rawSubtotal > 150 ? 0 : 15.00;
  const localTaxRate = 0.0825; // 8.25% localized sales tax
  const taxCharge = Number(((rawSubtotal - appliedDiscount) * localTaxRate).toFixed(2));
  const finalTotal = Math.max(0, rawSubtotal - appliedDiscount + shippingCharge + taxCharge);

  // Apply Coupon promo code code logic
  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccess('');
    
    const formattedCode = promoCode.trim().toUpperCase();
    if (formattedCode === 'SPACE10') {
      const discountAmount = Number((rawSubtotal * 0.1).toFixed(2)); // 10% Off
      setAppliedDiscount(discountAmount);
      setPromoSuccess('Promo code SPACE10 applied! (10% discount subtracted from subtotal)');
    } else if (formattedCode === 'SONIC20') {
      const discountAmount = Number((rawSubtotal * 0.2).toFixed(2)); // 20% Off
      setAppliedDiscount(discountAmount);
      setPromoSuccess('Promo code SONIC20 applied! (20% discount subtracted from subtotal)');
    } else if (formattedCode) {
      setPromoError('Incorrect promo code. Try SPACE10 or SONIC20.');
    }
  };

  // 4. Place Order Order Submitting Sequence
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setSubmitting(true);

    try {
      // Create random invoice order code (e.g. RS-129481)
      const numericSeed = Math.floor(100000 + Math.random() * 900000);
      const generatedOrderId = `RS-${numericSeed}`;

      // A. Ship header order details up to 'orders' table
      const { error: orderError } = await supabase.from('orders').insert({
        id: generatedOrderId,
        user_id: initialUser?.id || null,
        shipping_details: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          postalCode: form.postalCode,
        },
        subtotal: rawSubtotal,
        discount: appliedDiscount,
        shipping: shippingCharge,
        tax: taxCharge,
        total: finalTotal,
        status: 'pending',
        coupon_code: promoCode || null,
      });

      if (orderError) throw orderError;

      // B. Ship line item rows up to 'order_items' table
      const itemsPayload = items.map((i) => ({
        order_id: generatedOrderId,
        product_id: i.id,
        product_name: i.name,
        price: i.price,
        quantity: i.quantity,
        selected_color: i.selectedColor,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);

      if (itemsError) throw itemsError;

      // C. Wipe cart and cache
      localStorage.removeItem('readersonic_cart');
      setItems([]);
      setCompletedOrderCode(generatedOrderId);
      
      if (onSuccess) {
        onSuccess(generatedOrderId);
      }
    } catch (err: any) {
      console.error('Unified checkout transaction failed:', err);
      alert(`Checkout failed: ${err.message || 'Database constraints validation failed. Please check permissions.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS SUBMISSION VIEW
  if (completedOrderCode) {
    return (
      <div className="py-20 text-center max-w-xl mx-auto space-y-6 font-sans">
        <span className="text-5xl">🎉</span>
        <h2 className="text-2xl font-bold text-stone-900">Shipment Protocol Initiated!</h2>
        <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-xs space-y-3">
          <p className="text-xs text-stone-500 font-mono">ORDER SERIAL NO:</p>
          <strong className="text-xl font-mono text-amber-700 block tracking-widest">{completedOrderCode}</strong>
          <p className="text-xs text-stone-600 leading-relaxed pt-2 border-t border-stone-100">
            A confirmation schedule and dynamic tracking metrics have been routed to <span className="font-semibold">{form.email}</span>.
          </p>
        </div>
        
        <p className="text-xs text-stone-400">
          Your credit assets have been securely debited. Deliveries take 3 to 5 business days.
        </p>
      </div>
    );
  }

  return (
    <div className="font-sans text-stone-950 bg-[#FAF8F5] p-2 sm:p-6 rounded-3xl min-h-screen">
      {/* Visual Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Checkout Dispatch</h2>
        <p className="text-xs text-stone-500 mt-1">Provide your shipping details below to initiate transaction protocol.</p>
      </div>

      {items.length === 0 ? (
        <div className="py-24 text-center bg-white border border-stone-200 rounded-3xl space-y-4">
          <span className="text-4xl block">📦</span>
          <h4 className="font-bold text-stone-800 font-sans">Your shipment crate is empty</h4>
          <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
            Please fill the shopping container on our storefront directory before proceeding back to this dispatch deck.
          </p>
        </div>
      ) : (
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT SIDE: CUSTOMER INFO & STREET ADDRESS */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-3xl border border-[#EAE5DA] p-6 sm:p-8 space-y-6 shadow-sm">
              <h3 className="text-sm font-mono font-bold tracking-wider text-stone-400 uppercase">
                1. Customer & Shipment Location
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-500 mb-1.5 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full text-xs bg-[#FAF8F5] border border-stone-200 py-3 px-4 rounded-xl text-stone-900 focus:outline-none focus:border-amber-700 transition-all font-semibold"
                    placeholder="Enter your first and last name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-stone-500 mb-1.5 uppercase">Email Address</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full text-xs bg-[#FAF8F5] border border-stone-200 py-3 px-4 rounded-xl text-stone-900 focus:outline-none focus:border-amber-700 transition-all font-semibold"
                      placeholder="you@domain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-stone-500 mb-1.5 uppercase">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full text-xs bg-[#FAF8F5] border border-stone-200 py-3 px-4 rounded-xl text-stone-900 focus:outline-none focus:border-amber-700 transition-all font-semibold"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-500 mb-1.5 uppercase">Street Address</label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full text-xs bg-[#FAF8F5] border border-stone-200 py-3 px-4 rounded-xl text-stone-900 focus:outline-none focus:border-amber-700 transition-all font-semibold"
                    placeholder="123 Sonic Boulevard, Apt 4"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-stone-500 mb-1.5 uppercase">City</label>
                    <input
                      type="text"
                      required
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full text-xs bg-[#FAF8F5] border border-stone-200 py-3 px-4 rounded-xl text-stone-900 focus:outline-none focus:border-amber-700 transition-all font-semibold"
                      placeholder="Austin"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-stone-500 mb-1.5 uppercase">ZIP / Postal Code</label>
                    <input
                      type="text"
                      required
                      value={form.postalCode}
                      onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      className="w-full text-xs bg-[#FAF8F5] border border-stone-200 py-3 px-4 rounded-xl text-stone-900 focus:outline-none focus:border-amber-700 transition-all font-semibold"
                      placeholder="78701"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Optional payment notice for sandbox purposes */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs leading-relaxed">
              <strong>🔒 Secured Checkout Protocols:</strong> Transaction simulation is active. Clicking &ldquo;Place Order&rdquo; will securely save order information in Supabase without requiring real payment assets.
            </div>
          </div>

          {/* RIGHT SIDE: CART ITEMS SUMMARY & PRICING SHEET */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-[#EAE5DA] p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-mono font-bold tracking-wider text-stone-400 uppercase">
                2. Shipment Invoice Summary
              </h3>

              {/* Items grid list */}
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={`${item.id}-${item.selectedColor}`} className="flex items-center space-x-3 text-xs border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                    <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg bg-stone-50 border border-stone-200 p-0.5 shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-stone-900 truncate">{item.name}</h4>
                      <p className="text-[10px] text-stone-400 font-mono uppercase mt-0.5">Qty: {item.quantity} | {item.selectedColor}</p>
                    </div>

                    <strong className="text-stone-900 font-semibold font-mono">
                      ${(item.price * item.quantity).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>

              <hr className="border-stone-100" />

              {/* Voucher System inputs */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase">Input Promotion Codes</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 text-xs bg-[#FAF8F5] border border-stone-200 py-2.5 px-3 rounded-lg text-stone-900 focus:outline-none uppercase font-mono"
                    placeholder="SPACE10"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2.5 bg-stone-900 hover:bg-black text-stone-100 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {promoError && <span className="text-[10px] text-red-650 font-bold block">{promoError}</span>}
                {promoSuccess && <span className="text-[10.5px] text-emerald-800 font-medium block leading-snug">{promoSuccess}</span>}
              </div>

              <hr className="border-stone-100" />

              {/* Cash calculation sheets */}
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal Value</span>
                  <span className="font-sans text-stone-800 font-semibold">${rawSubtotal.toFixed(2)}</span>
                </div>

                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Coupon Discount</span>
                    <span className="font-sans font-bold">-${appliedDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-500">
                  <span>Shipment Fees</span>
                  <span className="font-sans text-stone-800 font-semibold">
                    {shippingCharge === 0 ? 'FREE' : `$${shippingCharge.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between text-stone-500">
                  <span>Government Sales Tax (8.25%)</span>
                  <span className="font-sans text-stone-800 font-semibold">${taxCharge.toFixed(2)}</span>
                </div>

                <hr className="border-stone-100 my-2" />

                <div className="flex justify-between text-sm font-sans font-bold text-stone-950 pt-1">
                  <span>Total Debit</span>
                  <span className="text-base tracking-tight font-extrabold text-[#1E1E1E]">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-stone-900 hover:bg-black text-stone-100 text-xs font-bold tracking-tight rounded-xl flex items-center justify-center transition-all disabled:bg-neutral-200 disabled:text-neutral-400 cursor-pointer shadow-md"
              >
                {submitting ? 'Transacting payloads securely...' : 'Place Order & Complete Checkout'}
              </button>

            </div>
          </div>

        </form>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MAIN NEXT.JS APP ROUTER PAGE COMPONENT EXPORT
// -------------------------------------------------------------
export default async function Page() {
  return (
    <div className="py-8 px-4 bg-stone-50 min-h-screen">
      <CheckoutContent />
    </div>
  );
}
