import { useState, FormEvent } from 'react';
import { CartItem, Coupon } from '../types';
import { Trash2, AlertCircle, Percent, ArrowRight, Truck } from 'lucide-react';

interface CartViewProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, color: string, quantity: number) => void;
  onRemoveItem: (productId: string, color: string) => void;
  onNavigate: (view: string) => void;
  coupon: Coupon | null;
  onApplyCoupon: (coupon: Coupon | null) => void;
}

const AVAILABLE_COUPONS: Coupon[] = [
  { code: 'SONIC10', discountPercent: 10, description: '10% discount on entire catalog' },
  { code: 'READFREE', discountPercent: 15, description: '15% early adopter discount' }
];

export default function CartView({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onNavigate,
  coupon,
  onApplyCoupon
}: CartViewProps) {
  const [couponInput, setCouponInput] = useState<string>('');
  const [couponError, setCouponError] = useState<string>('');
  const [couponSuccess, setCouponSuccess] = useState<string>('');

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = 0;
  const shipping = 0;
  const tax = 0;
  const total = subtotal;

  const handleApplyCouponClick = (e: FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');

    if (!couponInput.trim()) {
      setCouponError('PLEASE DEFINE A COUPON CODE.');
      return;
    }

    const matched = AVAILABLE_COUPONS.find(
      c => c.code.toLowerCase() === couponInput.trim().toLowerCase()
    );

    if (matched) {
      onApplyCoupon(matched);
      setCouponSuccess(`SUCCESSFULLY APPLIED: ${matched.code} (${matched.discountPercent}% OFF)`);
      setCouponInput('');
    } else {
      setCouponError('NO MATCHING PROMO CODE IN OUR SYSTEM.');
    }
  };

  const handleRemoveCoupon = () => {
    onApplyCoupon(null);
    setCouponSuccess('');
  };

  if (cartItems.length === 0) {
    return (
      <div id="empty-cart-splash" className="py-24 text-center max-w-md mx-auto">
        <h2 className="font-sans font-black tracking-widest text-lg text-neutral-900 uppercase">YOUR CART IS EMPTY</h2>

        <button
          onClick={() => onNavigate('listing')}
          className="w-full bg-neutral-950 hover:bg-neutral-850 text-white font-sans text-xs font-bold tracking-[0.2em] py-4 uppercase cursor-pointer"
        >
          CONTINUE SHOPPING
        </button>
      </div>
    );
  }

  return (
    <div id="cart-workspace" className="py-6">
      <h1 className="font-sans text-xl font-black tracking-widest text-neutral-900 mb-10 pb-4 border-b border-neutral-100 uppercase">
        YOUR CART <span className="text-neutral-400 font-normal">({cartItems.length} ITEMS)</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Side: Cart items list layout */}
        <div className="lg:col-span-8 space-y-6">
          {cartItems.map((item) => (
            <div
              key={`${item.product.id}-${item.selectedColor}`}
              className="border-b border-neutral-150 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
            >
              {/* Product Info left align */}
              <div className="flex items-center space-x-5">
                <div 
                  className="w-20 h-20 bg-neutral-50 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center border border-neutral-105"
                  onClick={() => onNavigate(`detail-${item.product.id}`)}
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 
                    onClick={() => onNavigate(`detail-${item.product.id}`)}
                    className="font-sans font-bold text-sm tracking-wide text-neutral-950 uppercase cursor-pointer hover:text-neutral-500 transition-colors"
                  >
                    {item.product.name}
                  </h3>
                  
                  {/* Swatch detail */}
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full border border-neutral-300"
                      style={{ 
                        backgroundColor: item.product.colors.find(c => c.name === item.selectedColor)?.hex || '#ccc' 
                      }}
                    />
                    <span className="text-[10px] text-neutral-400 font-sans tracking-widest uppercase font-bold">
                      {item.selectedColor} EDITION
                    </span>
                  </div>

                  {/* Price display */}
                  <p className="text-xs text-neutral-400 font-sans font-medium mt-1">
                    BDT {item.product.price.toFixed(2)} ea
                  </p>
                </div>
              </div>

              {/* Adjust Quantity Middle Align */}
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-8 pt-4 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                
                {/* Minimalist Counter */}
                <div className="flex items-center border border-neutral-200 text-xs h-9">
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, item.selectedColor, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="px-2.5 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 transition-colors h-full disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-neutral-950">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, item.selectedColor, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="px-2.5 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 transition-colors h-full disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right min-w-[80px]">
                  <p className="text-sm font-sans font-extrabold text-neutral-950">
                    BDT {(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>

                {/* Remove item */}
                <button
                  onClick={() => onRemoveItem(item.product.id, item.selectedColor)}
                  className="p-2 text-neutral-450 hover:text-neutral-950 transition-colors cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Logistics banner with clean copy */}
          <div className="border border-neutral-200 px-5 py-4 text-[10px] font-sans font-bold tracking-widest text-[#9A9180] uppercase flex items-center space-x-3">
            <Truck className="w-4 h-4 text-neutral-900 shrink-0" />
            <span>
              Standard shipping fee is BDT 80 inside Dhaka City and BDT 150 outside Dhaka City.
            </span>
          </div>
        </div>

        {/* Right Side: Order Summary Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-neutral-250 p-6 bg-neutral-50/50">
            <span className="text-[10px] tracking-widest font-sans font-black text-neutral-400 uppercase block mb-6">
              ORDER SUMMARY
            </span>

            {/* Calculations breakout */}
            <div className="space-y-4 text-xs font-sans text-neutral-500 pb-5 border-b border-neutral-200">
              <div className="flex justify-between uppercase tracking-wider font-bold">
                <span>SUBTOTAL:</span>
                <span className="font-extrabold text-neutral-950">BDT {subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between uppercase tracking-wider font-bold">
                <span>SHIPPING:</span>
                <span className="font-extrabold text-neutral-400">
                  CALCULATED AT CHECKOUT
                </span>
              </div>
            </div>

            {/* Total display */}
            <div className="flex justify-between items-baseline pt-5 mb-8">
              <span className="font-sans font-bold text-xs uppercase tracking-widest text-neutral-950">ESTIMATED TOTAL:</span>
              <span className="text-xl font-sans font-extrabold text-neutral-950">BDT {total.toFixed(2)}</span>
            </div>

            {/* Checkout button */}
            <button
              onClick={() => onNavigate('checkout')}
              className="w-full bg-neutral-950 hover:bg-neutral-850 text-white font-sans text-xs font-bold tracking-[0.2em] py-4 flex items-center justify-center space-x-2.5 uppercase transition-colors cursor-pointer"
            >
              <span>CHECKOUT</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
