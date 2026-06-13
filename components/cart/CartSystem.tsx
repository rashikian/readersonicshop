/**
 * READY-TO-USE BLUEPRINT FOR NEXT.JS APP ROUTER SHOPPING CART SYSTEM
 * File Location: app/context/CartContext.tsx / components/CartDrawer.tsx
 * 
 * Includes:
 * 1. Fully typed React Cart Context Provider (`CartProvider`)
 * 2. Unified state reduction (add, delete, safe increments)
 * 3. Auto persistence to `localStorage`
 * 4. Micro-integration callbacks ready for Supabase sync
 * 5. Visual sliding checkout drawer with elegant Tailwind components
 */

import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Define the core types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  selectedColor: string;
  quantity: number;
  stock: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, count?: number) => void;
  removeFromCart: (itemId: string, color: string) => void;
  updateQuantity: (itemId: string, color: string, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  syncCartWithSupabase: (userId: string) => Promise<void>;
  loading: boolean;
}

// -------------------------------------------------------------
// 1. STATE MANAGEMENT PROVIDER WITH LOCAL & REMOTE SUPABASE HOOKS
// -------------------------------------------------------------
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);

  // Grab active Supabase variables safely
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // A. Load initial cart from LocalStorage & detect auth scopes
  useEffect(() => {
    // 1. Initial Local load
    const savedCart = localStorage.getItem('readersonic_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (err) {
        console.warn('Unable to deserialize backup cart.', err);
      }
    }
    setLoading(false);

    // 2. Identify active Supabase user session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthenticatedUserId(user.id);
        fetchSupabaseCart(user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      if (user) {
        setAuthenticatedUserId(user.id);
        fetchSupabaseCart(user.id);
      } else {
        setAuthenticatedUserId(null);
        setCartItems([]);
        localStorage.removeItem('readersonic_cart');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // B. Save items to localStorage and optional postgres server database
  useEffect(() => {
    if (loading) return;
    localStorage.setItem('readersonic_cart', JSON.stringify(cartItems));

    if (authenticatedUserId) {
      pushCartToSupabase(authenticatedUserId, cartItems);
    }
  }, [cartItems, authenticatedUserId, loading]);

  // Pull cart columns from persistent DB
  const fetchSupabaseCart = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', uid)
        .single();
      
      if (!error && data && Array.isArray(data.items)) {
        setCartItems(data.items as CartItem[]);
      }
    } catch {
      // Ignored for clients who haven't completed table setup yet
    }
  };

  // Safe Upsert helper
  const pushCartToSupabase = async (uid: string, items: CartItem[]) => {
    try {
      await supabase.from('carts').upsert({
        user_id: uid,
        items: items,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Silent sync lookup skipped. Real-time updates push pending user configuration.', err);
    }
  };

  // C. Core Actions definition
  const addToCart = (item: Omit<CartItem, 'quantity'>, count = 1) => {
    setCartItems((prev) => {
      const index = prev.findIndex(
        (i) => i.id === item.id && i.selectedColor === item.selectedColor
      );

      if (index > -1) {
        const payload = [...prev];
        payload[index].quantity = Math.min(item.stock, payload[index].quantity + count);
        return payload;
      }
      return [...prev, { ...item, quantity: Math.min(item.stock, count) }];
    });
  };

  const removeFromCart = (itemId: string, color: string) => {
    setCartItems((prev) =>
      prev.filter((i) => !(i.id === itemId && i.selectedColor === color))
    );
  };

  const updateQuantity = (itemId: string, color: string, qty: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.id === itemId && i.selectedColor === color) {
            return { ...i, quantity: Math.max(1, Math.min(i.stock, qty)) };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const clearCart = () => setCartItems([]);

  const syncCartWithSupabase = async (uid: string) => {
    await pushCartToSupabase(uid, cartItems);
  };

  // Derive computations variables
  const cartCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = cartItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        syncCartWithSupabase,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be executed inside a matching CartProvider hierarchy.');
  }
  return context;
}

// -------------------------------------------------------------
// 2. INTERACTIVE SIDEBAR CARTS COMPONENT VIEW
// -------------------------------------------------------------
interface CartDrawerProps {
  isVisible: boolean;
  onHide: () => void;
}

export function CartDrawer({ isVisible, onHide }: CartDrawerProps) {
  const { cartItems, updateQuantity, removeFromCart, subtotal, cartCount } = useCart();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Dim backdrop */}
      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity" onClick={onHide} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F5] border-l border-stone-200 shadow-2xl flex flex-col justify-between">
          
          {/* Header section */}
          <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-white">
            <div className="flex items-center space-x-2 text-stone-900">
              <span className="text-xl">💼</span>
              <h3 className="font-bold text-lg">Shipping Basket ({cartCount})</h3>
            </div>
            <button
              onClick={onHide}
              className="p-2 hover:bg-stone-50 rounded-full cursor-pointer transition-colors text-stone-500 font-bold"
            >
              ✕
            </button>
          </div>

          {/* List items body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cartItems.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <span className="text-4xl block">📦</span>
                <h4 className="font-bold text-stone-700">Storage crate is empty</h4>
                <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
                  Proceed back to our premium storefront inventory to incorporate sound gears into your workspace.
                </p>
                <button
                  onClick={onHide}
                  className="px-5 py-2.5 bg-stone-900 text-stone-100 text-xs font-bold rounded-xl hover:bg-black transition-colors"
                >
                  Return to Store
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={`${item.id}-${item.selectedColor}`}
                  className="flex items-start space-x-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs"
                >
                  <div className="w-14 h-14 rounded-xl bg-stone-50 border border-stone-100 p-1 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-stone-900 truncate pr-2">{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.id, item.selectedColor)}
                        className="text-stone-400 hover:text-stone-900 transition-colors text-xs font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>

                    <span className="inline-block text-[9px] font-mono uppercase bg-[#FAF7F1] border border-[#DDD7CD] px-1.5 py-0.5 rounded text-stone-500">
                      Finish: {item.selectedColor}
                    </span>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50 font-mono text-[10px]">
                        <button
                          onClick={() => updateQuantity(item.id, item.selectedColor, item.quantity - 1)}
                          className="px-2.5 py-1 hover:bg-stone-100 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold text-stone-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.selectedColor, item.quantity + 1)}
                          className="px-2.5 py-1 hover:bg-stone-100 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <strong className="text-xs font-bold text-stone-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </strong>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing computations blocks */}
          {cartItems.length > 0 && (
            <div className="p-6 bg-white border-t border-stone-100 space-y-4">
              <div className="flex justify-between items-center text-xs font-semibold text-stone-500 font-mono">
                <span>Bundle Subtotal:</span>
                <span className="text-stone-900 text-base font-bold font-sans">${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-stone-400 leading-normal">
                Shipment parameters and taxes will be evaluated during direct payment processes.
              </p>
              <button className="w-full py-3.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-transform active:scale-98 shadow cursor-pointer">
                Complete Shipment Request
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
