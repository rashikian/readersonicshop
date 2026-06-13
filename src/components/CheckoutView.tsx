import { useState, ChangeEvent, FormEvent } from 'react';
import { CartItem, ShippingDetails, Coupon } from '../types';
import { Lock, ShoppingCart, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

interface CheckoutViewProps {
  cartItems: CartItem[];
  coupon: Coupon | null;
  onPlaceOrder: (shipping: ShippingDetails, orderTotals: { subtotal: number; discount: number; deliveryFee: number; total: number }) => void;
  onBack: () => void;
}

export default function CheckoutView({
  cartItems,
  coupon,
  onPlaceOrder,
  onBack
}: CheckoutViewProps) {
  // Shipping details state
  const [shipping, setShipping] = useState<ShippingDetails>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Bangladesh',
    paymentMethod: 'cod',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Financial layout
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discount = 0;
  const isInsideDhaka = shipping.city.trim().toLowerCase().includes('dhaka');
  const shippingCost = shipping.city.trim() ? (isInsideDhaka ? 80 : 150) : 80; // default to 80 BDT prior to entry
  const total = subtotal + shippingCost;

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setShipping(prev => ({ ...prev, [name]: value }));

    // Clean exact error if input exists
    if (formErrors[name]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!shipping.fullName.trim()) errors.fullName = 'FULL LEGAL NAME IS REQUIRED.';

    if (!shipping.phone || !shipping.phone.trim()) {
      errors.phone = 'PHONE NUMBER IS REQUIRED FOR DELIVERY COORDINATION.';
    } else if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(shipping.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'PLEASE PROVIDE A VALID BANGLADESHI MOBILE NUMBER (E.G. 017XXXXXXXX).';
    }

    if (!shipping.address.trim()) errors.address = 'POSTAL STREET DELIVERIES ADDRESS IS REQUIRED.';
    if (!shipping.city.trim()) errors.city = 'CITY COORDINATE IS REQUIRED.';
    if (!shipping.postalCode.trim()) errors.postalCode = 'POSTAL ZIP DECREE IS REQUIRED.';

    return errors;
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstErrorKey = Object.keys(errors)[0];
      const errEl = document.getElementsByName(firstErrorKey)[0];
      if (errEl) errEl.focus();
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onPlaceOrder(shipping, { subtotal, discount, deliveryFee: shippingCost, total });
    }, 1500); 
  };

  return (
    <div id="checkout-workspace" className="py-6 animate-fadeIn">
      {/* Return link */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-bold tracking-widest text-neutral-400 hover:text-neutral-950 transition-colors mb-10 uppercase cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>BACK TO SHOPPING CART</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Side: Dynamic Forms */}
        <div className="lg:col-span-7">
          <form onSubmit={handleFormSubmit} className="space-y-12">
            
            {/* Phase 1: Shipping Parameters */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-neutral-200">
                <span className="font-sans text-xs font-black tracking-[0.2em] text-neutral-400">1 /</span>
                <h2 className="font-sans font-black text-sm text-neutral-950 uppercase tracking-widest">SHIPPING SHIPPING INFO</h2>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-[10px] font-sans tracking-widest uppercase text-neutral-400 mb-2 font-bold">
                    RECIPIENT FULL NAME
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={shipping.fullName}
                    onChange={handleInputChange}
                    placeholder="E.G. EVELYN VANCE"
                    className={`w-full text-base md:text-xs font-medium bg-white border px-4 py-3 text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-950 rounded-none transition-all ${
                      formErrors.fullName ? 'border-neutral-900' : 'border-neutral-200'
                    }`}
                  />
                  {formErrors.fullName && <p className="text-[9px] text-neutral-900 mt-1.5 font-bold tracking-wider uppercase">{formErrors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-sans tracking-widest uppercase text-neutral-400 mb-2 font-bold">
                    DELIVERY MOBILE PHONE
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={shipping.phone || ''}
                    onChange={handleInputChange}
                    placeholder="E.G. 01712345678"
                    className={`w-full text-base md:text-xs font-medium bg-white border px-4 py-3 text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-950 rounded-none transition-all ${
                      formErrors.phone ? 'border-neutral-900' : 'border-neutral-200'
                    }`}
                  />
                  {formErrors.phone && <p className="text-[9px] text-neutral-900 mt-1.5 font-bold tracking-wider uppercase">{formErrors.phone}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-sans tracking-widest uppercase text-neutral-400 mb-2 font-bold">
                      COUNTRY
                    </label>
                    <select
                      name="country"
                      value={shipping.country || 'Bangladesh'}
                      onChange={handleInputChange}
                      className="w-full text-base md:text-xs font-bold tracking-wider uppercase bg-white border border-neutral-200 px-4 py-3 text-neutral-950 focus:outline-none focus:border-neutral-950 rounded-none transition-all cursor-pointer"
                    >
                      <option value="Bangladesh">BANGLADESH ONLY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-sans tracking-widest uppercase text-neutral-400 mb-2 font-bold">
                      CITY / DISTRICT
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={shipping.city}
                      onChange={handleInputChange}
                      placeholder="E.G. DHAKA"
                      className={`w-full text-base md:text-xs font-medium bg-white border px-4 py-3 text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-950 rounded-none transition-all ${
                        formErrors.city ? 'border-neutral-900' : 'border-neutral-200'
                      }`}
                    />
                    {formErrors.city && <p className="text-[9px] text-neutral-900 mt-1.5 font-bold tracking-wider uppercase">{formErrors.city}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-sans tracking-widest uppercase text-neutral-400 mb-2 font-bold">
                    STREET ADDRESS (HOUSE, ROAD, BLOCK/AREA)
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={shipping.address}
                    onChange={handleInputChange}
                    placeholder="E.G. HOUSE 12, ROAD 4, BANANI"
                    className={`w-full text-base md:text-xs font-medium bg-white border px-4 py-3 text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-950 rounded-none transition-all ${
                      formErrors.address ? 'border-neutral-900' : 'border-neutral-200'
                    }`}
                  />
                  {formErrors.address && <p className="text-[9px] text-neutral-900 mt-1.5 font-bold tracking-wider uppercase">{formErrors.address}</p>}
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-[10px] font-sans tracking-widest uppercase text-neutral-400 mb-2 font-bold">
                      POSTAL CODE
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={shipping.postalCode}
                      onChange={handleInputChange}
                      placeholder="E.G. 1213"
                      className={`w-full text-base md:text-xs font-medium bg-white border px-4 py-3 text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-950 rounded-none transition-all ${
                        formErrors.postalCode ? 'border-neutral-900' : 'border-neutral-200'
                      }`}
                    />
                    {formErrors.postalCode && <p className="text-[9px] text-neutral-900 mt-1.5 font-bold tracking-wider uppercase">{formErrors.postalCode}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 2: Checkout choices */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-neutral-200">
                <span className="font-sans text-xs font-black tracking-[0.2em] text-neutral-400">2 /</span>
                <h2 className="font-sans font-black text-sm text-neutral-950 uppercase tracking-widest">PAYMENT INFO</h2>
              </div>

              <div className="space-y-4">
                <div id="cod-payment-block" className="p-5 border border-neutral-900 bg-neutral-50 flex flex-col gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">💵</span>
                    <div>
                      <strong className="text-xs font-bold font-sans tracking-wider text-neutral-950 block uppercase">CASH ON DELIVERY (COD)</strong>
                      <span className="text-[9px] tracking-widest uppercase text-neutral-400 font-bold block mt-0.5">DIRECT DOORSTEP HANDOVER</span>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-neutral-500 leading-relaxed uppercase tracking-tight font-semibold">
                    No online card credentials are required today! You will simply settle the amount of <strong className="text-neutral-900 font-black">BDT {total.toFixed(2)}</strong> in cash at standard doorstep delivery.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:flex-1 px-5 py-4 border border-neutral-300 hover:border-neutral-900 text-neutral-500 hover:text-neutral-950 text-xs font-bold tracking-widest transition-colors text-center uppercase cursor-pointer order-2 sm:order-1"
              >
                CANCEL
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-[2] bg-neutral-950 hover:bg-neutral-850 text-white p-4 font-sans text-xs font-bold tracking-[0.2em] flex items-center justify-center space-x-2.5 uppercase transition-colors cursor-pointer disabled:opacity-50 order-1 sm:order-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>TRANSMITTING...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-neutral-400" />
                    <span>PLACE COD ORDER (BDT {total.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Right Side: Quick order list totals */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-neutral-200 p-6 sticky top-28 bg-neutral-50/50">
            <h2 className="font-sans font-black text-xs text-neutral-950 uppercase tracking-widest mb-6 pb-2 border-b border-neutral-200 flex items-center justify-between">
              <span>ITEMS IN BAG</span>
              <ShoppingCart className="w-4 h-4 text-neutral-400" />
            </h2>

            {/* List */}
            <div className="space-y-4 max-h-[250px] overflow-y-auto mb-6 pr-2 scrollbar-thin">
              {cartItems.map((item) => (
                <div key={`${item.product.id}-${item.selectedColor}`} className="flex items-center justify-between gap-4 text-xs font-medium">
                  <div className="flex items-center space-x-3 truncate">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-10 h-10 object-cover bg-white border border-neutral-200 shrink-0"
                    />
                    <div className="truncate">
                      <p className="font-bold text-neutral-950 truncate uppercase tracking-wide">{item.product.name}</p>
                      <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-black block mt-0.5">
                        {item.selectedColor} x {item.quantity}
                      </span>
                    </div>
                  </div>
                  <span className="font-sans font-bold text-neutral-950 shrink-0">BDT {(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Line item subtotal breakdowns */}
            <div className="border-t border-neutral-200 pt-4 pb-4 text-xs font-bold uppercase tracking-wider text-neutral-500 space-y-3">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span className="font-extrabold text-neutral-950">BDT {subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>SHIPPING:</span>
                <span className="font-extrabold text-neutral-950">
                  BDT {shippingCost.toFixed(2)} <span className="text-[9px] text-neutral-400 font-normal">({isInsideDhaka ? 'INSIDE DHAKA' : 'OUTSIDE DHAKA'})</span>
                </span>
              </div>
            </div>

            {/* Absolute total */}
            <div className="border-t border-neutral-200 pt-4 flex justify-between items-baseline mb-6">
              <span className="font-sans font-bold text-xs uppercase tracking-widest text-neutral-950">TOTAL DUE:</span>
              <span className="text-xl font-sans font-extrabold text-neutral-950">BDT {total.toFixed(2)}</span>
            </div>

            {/* Security Note */}
            <div className="border border-dashed border-neutral-300 p-4 flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-neutral-900 shrink-0 mt-0.5" />
              <p className="text-[9px] text-neutral-400 font-sans tracking-wide uppercase font-bold leading-normal">
                SESSIONS ENCRYPTED SECURELY. YOUR SHIPPING DECREE DETAILS AND PERSONAL PARAMETERS ARE COVERED UNDER FULL DATA LAWS.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
