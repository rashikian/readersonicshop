# Next.js Cart Engine with Optional Supabase Sync (App Router)

This integration handbook details how to implement a fully stateful, offline-first **Shopping Cart Context** in Next.js (App Router) that dynamically syncs with Supabase database tables when users are authenticated, and preserves selections in standard browser `localStorage` when they are browsing anonymously.

---

## 1. Schema Configuration (Optional Supabase Sync)

To persist users' cart contents natively inside your PostgreSQL database, you can either store the cart state within a dedicated `carts` table, or use a cached metadata column on the user profile. 

If you prefer a structured table approach, run this SQL inside the **Supabase SQL Editor**:

```sql
-- Create a table to track shopping drafts per user
CREATE TABLE IF NOT EXISTS public.carts (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Stores the compiled array of CartItem objects
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Allow users to fully view and update ONLY their own cart payload
CREATE POLICY "Allow users to read own cart" ON public.carts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to upsert own cart" ON public.carts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to modify own cart" ON public.carts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## 2. Directory Layout
For maximum component modularity, place these files inside your Next.js project directory structure:

```bash
utils/
└── context/
    └── CartContext.tsx      # React Context Provider managing active state and db/sync triggers
components/
├── CartSidebarDrawer.tsx    # Slide-out interactive viewport
└── CartSummaryBlock.tsx     # Cost calculations (Subtotals, taxes, coupons)
```

---

## 3. The Core Context Provider (`context/CartContext.tsx`)

This component coordinates active shopping items, increments/decrements quantity allocations safely, handles deletes, computes cost tallies, and seamlessly synchronizes payloads to Supabase on every mutation if a validated session exists.

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  selectedColor: string;
  quantity: number;
  stock: number;
}

interface CartContextProps {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (itemId: string, selectedColor: string) => void;
  updateQuantity: (itemId: string, selectedColor: string, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  syncCartWithSupabase: (userId: string) => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Load initial cart from LocalStorage on mount
  useEffect(() => {
    const localData = localStorage.getItem('readersonic_cart');
    if (localData) {
      try {
        setCartItems(JSON.parse(localData));
      } catch (err) {
        console.warn('Stale local storage cart discarded.', err);
      }
    }
    setLoading(false);

    // Track user session to sync database rows if they login
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        importRemoteCart(user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        importRemoteCart(user.id);
      } else {
        // Sign-out event: Clear cart or retain local memory
        setCartItems([]);
        localStorage.removeItem('readersonic_cart');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Automatically save state updates to LocalStorage and database (throttled/debounced)
  useEffect(() => {
    if (loading) return;
    localStorage.setItem('readersonic_cart', JSON.stringify(cartItems));

    if (currentUser) {
      exportCartToRemote(currentUser.id, cartItems);
    }
  }, [cartItems, currentUser, loading]);

  // Fetch remote database items on sign-in
  const importRemoteCart = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', userId)
        .single();

      if (!error && data && Array.isArray(data.items)) {
        setCartItems(data.items as CartItem[]);
      }
    } catch (err) {
      console.warn('Failed to retrieve remote Supabase database cart:', err);
    }
  };

  // Push local items to Supabase tables
  const exportCartToRemote = async (userId: string, items: CartItem[]) => {
    try {
      await supabase.from('carts').upsert({
        user_id: userId,
        items,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed syncing state up to Supabase database:', err);
    }
  };

  // 3. CART ACTIONS
  const addToCart = (newItem: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.id === newItem.id && item.selectedColor === newItem.selectedColor
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = Math.min(newItem.stock, updated[existingIdx].quantity + quantity);
        updated[existingIdx].quantity = newQty;
        return updated;
      }

      return [...prev, { ...newItem, quantity: Math.min(newItem.stock, quantity) }];
    });
  };

  const removeFromCart = (itemId: string, selectedColor: string) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.id === itemId && item.selectedColor === selectedColor))
    );
  };

  const updateQuantity = (itemId: string, selectedColor: string, qty: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId && item.selectedColor === selectedColor) {
            return { ...item, quantity: Math.max(1, Math.min(item.stock, qty)) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const syncCartWithSupabase = async (userId: string) => {
    await exportCartToRemote(userId, cartItems);
  };

  // Computations
  const cartCount = cartItems.reduce((acc, current) => acc + current.quantity, 0);
  const subtotal = cartItems.reduce((acc, current) => acc + current.price * current.quantity, 0);

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
    throw new Error('useCart must be wrapped inside a <CartProvider /> system.');
  }
  return context;
}
```

---

## 4. Interactive Sidebar Cart Drawer (`components/CartSidebarDrawer.tsx`)

A modern drawer layout with subtle slide-in motion paths. Fully supports direct quantity adjustments and micro-checkout transitions.

```jsx
'use client';

import { useCart } from '../context/CartContext';
import { ShoppingBag, X, Trash2, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebarDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cartItems, updateQuantity, removeFromCart, subtotal, cartCount } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F5] border-l border-[#EAE5DA] shadow-2xl flex flex-col justify-between">
          
          {/* Header Row */}
          <div className="px-6 py-5 border-b border-[#EAE5DA] flex items-center justify-between bg-white">
            <div className="flex items-center space-x-2 text-stone-900">
              <ShoppingBag className="w-5 h-5 text-[#9E8A6E]" />
              <h3 className="font-display font-semibold text-lg">Your Shipment Bundle ({cartCount})</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full cursor-pointer transition-colors">
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>

          {/* List Scrollway */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cartItems.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
                <ShoppingBag className="w-12 h-12 text-stone-300" />
                <h4 className="font-bold text-stone-800">Your shipping crate is empty</h4>
                <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                  Explore our bone-conduction plates and modular paperwhite tablets inside the main catalog index to secure your technical layout specs.
                </p>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold shadow hover:bg-black transition-colors"
                >
                  Return to Storefront
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={`${item.id}-${item.selectedColor}`} className="flex items-start space-x-4 bg-white p-4 rounded-2xl border border-[#EAE5DA] shadow-xs">
                  <div className="w-16 h-16 rounded-xl bg-[#FAF8F5] p-2 border border-stone-100 flex-shrink-0 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-stone-900 truncate pr-2">{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.id, item.selectedColor)}
                        className="text-stone-400 hover:text-red-650 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[9px] font-mono uppercase bg-[#FAF7F1] border border-[#DDD7CD] px-1.5 py-0.5 rounded text-stone-500">
                        {item.selectedColor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Interactive Quantity Incrementor */}
                      <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white text-[10px] font-mono">
                        <button
                          onClick={() => updateQuantity(item.id, item.selectedColor, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-stone-50 font-bold font-mono cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold text-stone-850">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.selectedColor, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-stone-50 font-bold font-mono cursor-pointer"
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

          {/* Pricing Summary Anchor */}
          {cartItems.length > 0 && (
            <div className="p-6 bg-white border-t border-[#EAE5DA] space-y-4">
              <div className="flex justify-between text-xs font-semibold text-stone-600 font-mono">
                <span>Subtotal Value:</span>
                <span className="text-stone-950 font-sans text-sm font-bold">${subtotal.toFixed(2)}</span>
              </div>
              
              <p className="text-[10px] text-stone-400 leading-normal">
                Standard shipments qualify for dynamic delivery estimates and premium 3-year mechanical warranties.
              </p>

              <button className="w-full py-3.5 bg-stone-900 hover:bg-black text-white text-xs font-bold tracking-tight rounded-xl flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-md cursor-pointer">
                <span>Engage Checkout Protocol</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
```
