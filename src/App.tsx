import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ProductListing from './components/ProductListing';
import ProductDetail from './components/ProductDetail';
import CartView from './components/CartView';
import CheckoutView from './components/CheckoutView';
import OrderSuccessView from './components/OrderSuccessView';
import OrderTrackerView from './components/OrderTrackerView';
import AdminDashboard from './components/AdminDashboard';
import InfoPages from './components/InfoPages';
import { db } from './lib/supabase';
import { Product, CartItem, ShippingDetails, Coupon, Order } from './types';
import { ChevronRight, CircleAlert, Sparkles, BookOpen, Volume2, ShieldCheck, Mail, Database } from 'lucide-react';

const getInitialView = (): string => {
  try {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check URL search parameters first
    const viewParam = searchParams.get('view') || searchParams.get('page');
    if (viewParam) {
      if (['listing', 'cart', 'checkout', 'success', 'track-order', 'admin', 'faq', 'privacy', 'terms'].includes(viewParam)) {
        return viewParam;
      }
    }
    const productParam = searchParams.get('product') || searchParams.get('p');
    if (productParam) {
      return `detail-${productParam}`;
    }

    // Check clean pathnames
    if (pathname === '/faq') return 'faq';
    if (pathname === '/privacy') return 'privacy';
    if (pathname === '/terms') return 'terms';
    if (pathname === '/cart') return 'cart';
    if (pathname === '/checkout') return 'checkout';
    if (pathname === '/track-order') return 'track-order';
    if (pathname === '/admin') return 'admin';
    
    const productMatch = pathname.match(/^\/product\/([^/]+)/);
    if (productMatch) {
      return `detail-${productMatch[1]}`;
    }
  } catch (e) {
    console.warn('SEO deep-linking handler encountered error parsing URL state:', e);
  }
  return 'listing';
};

export default function App() {
  // Navigation Router state: 'listing' | 'detail-[id]' | 'cart' | 'checkout' | 'success'
  const [currentView, setCurrentView] = useState<string>(getInitialView);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDbLive, setIsDbLive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Refs to track scroll restoration and popstate navigation
  const lastScrollPositions = useRef<Record<string, number>>({});
  const navigationType = useRef<'fresh' | 'popstate' | 'initial'>('initial');

  // Initialize data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const liveStatus = await db.isLive();
        setIsDbLive(liveStatus);

        const allProducts = await db.getProducts();
        setProducts(allProducts);

        const loadedCart = await db.getCart();
        setCartItems(loadedCart);
      } catch (err) {
        console.error('Failed to instantiate catalog state:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Set up real-time sync with Supabase for active/collaborative updates
  useEffect(() => {
    let productsChannel: any = null;
    let ordersChannel: any = null;
    let activeClient: any = null;
    const uniqueSessionId = Math.random().toString(36).substring(2, 9);

    async function subscribeRealtime() {
      try {
        const { getSupabaseClient } = await import('./lib/supabase');
        const client = await getSupabaseClient();
        if (!client) return;
        activeClient = client;

        // Listen for Postgres changes on the products table using a unique channel name per session
        productsChannel = client
          .channel(`prod-chan-${uniqueSessionId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            async (payload) => {
              console.log('Real-time database product update detected:', payload);
              try {
                // Fetch latest products from database
                const freshProducts = await db.getProducts();
                setProducts(freshProducts);
                // Dispatch event so subcomponents know
                window.dispatchEvent(new CustomEvent('supabaseProductsUpdate', { detail: freshProducts }));
              } catch (e) {
                console.warn('Real-time product refresh failed:', e);
              }
            }
          )
          .subscribe();

        // Listen for Postgres changes on the orders table using a unique channel name per session
        ordersChannel = client
          .channel(`ord-chan-${uniqueSessionId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            async (payload) => {
              console.log('Real-time database order update detected:', payload);
              try {
                const freshOrders = await db.getOrders();
                
                // Keep customer's live checkout success order in absolute sync
                setPlacedOrder((current) => {
                  if (current) {
                    const matched = freshOrders.find(o => o.id === current.id);
                    if (matched) return matched;
                  }
                  return current;
                });

                // Dispatch events to all active pages (Admin, customer success, dynamic tracking hub)
                window.dispatchEvent(new CustomEvent('supabaseOrdersUpdate', { detail: freshOrders }));
              } catch (e) {
                console.warn('Real-time orders update processing failed:', e);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Could not bootstrap real-time channel subscriptions:', err);
      }
    }

    subscribeRealtime();

    return () => {
      if (productsChannel && activeClient) {
        try {
          productsChannel.unsubscribe();
          activeClient.removeChannel(productsChannel);
        } catch (e) {
          // silent fallback
        }
      }
      if (ordersChannel && activeClient) {
        try {
          ordersChannel.unsubscribe();
          activeClient.removeChannel(ordersChannel);
        } catch (e) {
          // silent fallback
        }
      }
    };
  }, []);

  // Sync cart adjustments to persistent state helper
  const updateCartStateAndPersist = async (newCart: CartItem[]) => {
    setCartItems(newCart);
    await db.saveCart(newCart);
  };

  // Cart lifecycle callbacks
  const handleAddToCart = async (product: Product, quantity: number, colorName: string) => {
    const existingIdx = cartItems.findIndex(
      (item) => item.product.id === product.id && item.selectedColor === colorName
    );

    let updatedCart = [...cartItems];
    if (existingIdx !== -1) {
      // Increase existing quant to max stock caps
      const newQty = Math.min(product.stock, updatedCart[existingIdx].quantity + quantity);
      updatedCart[existingIdx] = {
        ...updatedCart[existingIdx],
        quantity: newQty,
      };
    } else {
      updatedCart.push({
        product,
        quantity: Math.min(product.stock, quantity),
        selectedColor: colorName,
      });
    }

    await updateCartStateAndPersist(updatedCart);
  };

  const handleAddToCartDirect = async (product: Product, colorName: string) => {
    await handleAddToCart(product, 1, colorName);
  };

  const handleUpdateQuantity = async (productId: string, color: string, quantity: number) => {
    const targetIdx = cartItems.findIndex(
      item => item.product.id === productId && item.selectedColor === color
    );
    if (targetIdx !== -1) {
      let updatedCart = [...cartItems];
      if (quantity <= 0) {
        updatedCart.splice(targetIdx, 1);
      } else {
        const item = updatedCart[targetIdx];
        updatedCart[targetIdx] = {
          ...item,
          quantity: Math.min(item.product.stock, quantity),
        };
      }
      await updateCartStateAndPersist(updatedCart);
    }
  };

  const handleRemoveFromCart = async (productId: string, color: string) => {
    const updatedCart = cartItems.filter(
      item => !(item.product.id === productId && item.selectedColor === color)
    );
    await updateCartStateAndPersist(updatedCart);
  };

  // Checkout and Order Placement
  const handlePlaceOrder = async (
    shipping: ShippingDetails,
    totals: { subtotal: number; discount: number; deliveryFee: number; total: number }
  ) => {
    const orderId = `RS-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: Order = {
      id: orderId,
      items: [...cartItems],
      shipping,
      subtotal: totals.subtotal,
      discount: totals.discount,
      deliveryFee: totals.deliveryFee,
      tax: totals.deliveryFee, // fallback and legacy DB field syncing
      total: totals.total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      payment_method: 'COD',
      payment_status: 'unpaid',
      order_status: 'pending'
    };

    // Save to active DB layers
    await db.createOrder(newOrder);
    setPlacedOrder(newOrder);

    // Document newly formed ticket in local storage history list
    try {
      const stored: string[] = JSON.parse(localStorage.getItem('readersonic_customer_orders') || '[]');
      if (!stored.includes(orderId)) {
        stored.push(orderId);
        localStorage.setItem('readersonic_customer_orders', JSON.stringify(stored));
      }
    } catch (e) {
      console.warn('Silent local order tracking ledger update failed:', e);
    }

    // Empty active shopping bags
    await updateCartStateAndPersist([]);
    setActiveCoupon(null);
    handleNavigationChange('success');
  };

  const saveScrollPosition = (view: string) => {
    if (view && !loading) {
      lastScrollPositions.current[view] = window.scrollY;
    }
  };

  const handleNavigationChange = (view: string, isPopState = false) => {
    if (view === currentView) {
      if (view === 'listing') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        lastScrollPositions.current['listing'] = 0;
      }
      return;
    }

    // Save scroll position for departure view
    saveScrollPosition(currentView);

    setCurrentView(view);

    if (!isPopState) {
      // If we already have a saved scroll position for this target view, restore it
      const hasSavedPosition = lastScrollPositions.current[view] !== undefined && lastScrollPositions.current[view] > 0;
      if (hasSavedPosition) {
        navigationType.current = 'popstate';
      } else {
        navigationType.current = 'fresh';
        window.scrollTo(0, 0);
      }
      try {
        let path = '/';
        if (view === 'faq') path = '/faq';
        else if (view === 'privacy') path = '/privacy';
        else if (view === 'terms') path = '/terms';
        else if (view === 'cart') path = '/cart';
        else if (view === 'checkout') path = '/checkout';
        else if (view === 'track-order') path = '/track-order';
        else if (view === 'admin') path = '/admin';
        else if (view.startsWith('detail-')) {
          const id = view.split('detail-')[1];
          path = `/product/${id}`;
        }
        window.history.pushState({ view }, '', path);
      } catch (e) {
        console.warn('History API push error:', e);
      }
    } else {
      navigationType.current = 'popstate';
    }
  };

  // Register browser's back/forward popstate listner
  useEffect(() => {
    if (!window.history.state || !window.history.state.view) {
      try {
        let path = '/';
        if (currentView === 'faq') path = '/faq';
        else if (currentView === 'privacy') path = '/privacy';
        else if (currentView === 'terms') path = '/terms';
        else if (currentView === 'cart') path = '/cart';
        else if (currentView === 'checkout') path = '/checkout';
        else if (currentView === 'track-order') path = '/track-order';
        else if (currentView === 'admin') path = '/admin';
        else if (currentView.startsWith('detail-')) {
          const id = currentView.split('detail-')[1];
          path = `/product/${id}`;
        }
        window.history.replaceState({ view: currentView }, '', path);
      } catch (e) {
        console.warn('History API replace error:', e);
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      const poppedView = event.state?.view || 'listing';
      handleNavigationChange(poppedView, true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentView, loading]);

  // Reset scroll position on search queries
  useEffect(() => {
    lastScrollPositions.current['listing'] = 0;
  }, [searchQuery]);

  // Restore scroll positions once content finishes loading
  useEffect(() => {
    if (loading) return;

    if (navigationType.current === 'popstate') {
      const targetScroll = lastScrollPositions.current[currentView] || 0;
      
      const timer = setTimeout(() => {
        window.scrollTo({
          top: targetScroll,
          behavior: 'instant' as any
        });
      }, 35); // A minor delay ensures full paint pass is done

      return () => clearTimeout(timer);
    } else {
      // Rule 3: Reset scroll position to top (0,0) if fresh navigation
      window.scrollTo(0, 0);
    }
  }, [currentView, loading]);

  // Dynamic SEO Title and Metadata Updater hook
  useEffect(() => {
    let title = 'Readersonic Shop | Premium Reading Gadgets Bangladesh';
    let description = "Readersonic Shop is Bangladesh's premier destination for premium reading gadgets, high-end e-readers, spatial audio reading frames, narrator headphones, and focus tools.";
    let keywords = 'Readersonic, Readersonic Shop, reading gadgets Bangladesh, e-readers Bangladesh, book light, focus tools';

    if (currentView === 'faq') {
      title = 'Frequently Asked Questions | Readersonic Shop';
      description = 'Check out answers about shipping times, Cash on Delivery (COD) processes across Bangladesh, returns, and support for all your Readersonic gadgets.';
    } else if (currentView === 'privacy') {
      title = 'Privacy Policy | Readersonic Shop';
      description = 'Learn how Readersonic Shop securely handles your order details, privacy, and cookies for our customers in Bangladesh.';
    } else if (currentView === 'terms') {
      title = 'Terms & Conditions | Readersonic Shop';
      description = 'Read the terms of service, billing/courier terms, and user guidelines for purchasing from Readersonic Shop.';
    } else if (currentView === 'cart') {
      title = 'Your Shopping Cart | Readersonic Shop';
      description = 'Review the books, lights, and reading hardware in your Readersonic shopping cart before checkout.';
    } else if (currentView === 'checkout') {
      title = 'Secure Doorstep Checkout | Readersonic Shop';
      description = 'Confirm your shipping address and name to receive your premium reading hardware with nationwide cash on delivery.';
    } else if (currentView === 'track-order') {
      title = 'Track Your Dispatch Status | Readersonic Shop';
      description = 'Enter your Readersonic order number to track your package dispatch state all over Bangladesh.';
    } else if (currentView === 'admin') {
      title = 'System Administrator Dashboard | Readersonic Shop';
      description = 'Internal administrative control panel for readersonic-shop systems.';
    } else if (currentView.startsWith('detail-')) {
      const activeId = currentView.split('detail-')[1];
      const product = products.find((p) => p.id === activeId);
      if (product) {
        title = `${product.name} | Readersonic Shop Bangladesh`;
        description = `${product.description || product.longDescription || ''} Purchase for BDT ${product.price.toFixed(2)} with doorstep delivery.`;
        keywords = `${product.name}, Readersonic ${product.name}, buy ${product.name} Bangladesh, reading gadget`;
      }
    }

    // Apply updates safely to DOM
    document.title = title;

    const setMetaTag = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) {
        el.setAttribute('content', content);
      }
    };

    setMetaTag('meta[name="description"]', description);
    setMetaTag('meta[name="keywords"]', keywords);
    
    // Open Graph
    setMetaTag('meta[property="og:title"]', title);
    setMetaTag('meta[property="og:description"]', description);
    setMetaTag('meta[property="og:url"]', window.location.href);
    
    // Twitter
    setMetaTag('meta[name="twitter:title"]', title);
    setMetaTag('meta[name="twitter:description"]', description);

    // Ensure search engines can index the site (no noindex tags anywhere)
    const noIndexTags = document.querySelectorAll('meta[content*="noindex"]');
    noIndexTags.forEach(tag => tag.remove());

  }, [currentView, products]);

  // Resolve active views
  const renderViewContent = () => {
    if (loading) {
      return (
        <div className="py-48 flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] text-neutral-400 font-sans tracking-[0.2em] uppercase font-semibold">LOADING</p>
        </div>
      );
    }

    if (currentView === 'listing') {
      return (
        <ProductListing
          products={products}
          onNavigateToDetail={(id) => handleNavigationChange(`detail-${id}`)}
          onAddToCartDirect={handleAddToCartDirect}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      );
    }

    if (currentView.startsWith('detail-')) {
      const activeId = currentView.split('detail-')[1];
      const matchProduct = products.find((p) => p.id === activeId);

      if (matchProduct) {
        return (
          <ProductDetail
            product={matchProduct}
            onBack={() => handleNavigationChange('listing')}
            onAddToCart={handleAddToCart}
            allProducts={products}
            onNavigateDetail={(id) => handleNavigationChange(`detail-${id}`)}
          />
        );
      }
      return (
        <div className="p-8 text-center bg-[#FAF7F1] rounded-2xl border border-[#EBE6DC]">
          <CircleAlert className="w-8 h-8 text-amber-600 mx-auto mb-3" />
          <p className="text-sm font-semibold">Product record not mapped.</p>
          <button 
            onClick={() => handleNavigationChange('listing')}
            className="mt-4 px-4 py-2 bg-black text-white rounded text-xs"
          >
            Catalog Home
          </button>
        </div>
      );
    }

    if (currentView === 'cart') {
      return (
        <CartView
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onNavigate={handleNavigationChange}
          coupon={activeCoupon}
          onApplyCoupon={setActiveCoupon}
        />
      );
    }

    if (currentView === 'checkout') {
      return (
        <CheckoutView
          cartItems={cartItems}
          coupon={activeCoupon}
          onPlaceOrder={handlePlaceOrder}
          onBack={() => handleNavigationChange('cart')}
        />
      );
    }

    if (currentView === 'success') {
      return (
        <OrderSuccessView
          order={placedOrder}
          onNavigateHome={() => handleNavigationChange('listing')}
          onNavigateTrack={() => handleNavigationChange('track-order')}
        />
      );
    }

    if (currentView === 'track-order') {
      return (
        <OrderTrackerView
          onBack={() => handleNavigationChange('listing')}
        />
      );
    }

    if (currentView === 'admin') {
      return (
        <AdminDashboard
          onBack={async () => {
            try {
              const allProducts = await db.getProducts();
              setProducts(allProducts);
            } catch (err) {
              console.error('Failed to sync catalog products:', err);
            }
            handleNavigationChange('listing');
          }}
        />
      );
    }

    if (currentView === 'faq') {
      return (
        <InfoPages
          pageType="faq"
          onBack={() => handleNavigationChange('listing')}
        />
      );
    }

    if (currentView === 'privacy') {
      return (
        <InfoPages
          pageType="privacy"
          onBack={() => handleNavigationChange('listing')}
        />
      );
    }

    if (currentView === 'terms') {
      return (
        <InfoPages
          pageType="terms"
          onBack={() => handleNavigationChange('listing')}
        />
      );
    }

    return null;
  };

  const cumulativeCartItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header element bar */}
      <Header
        cartCount={cumulativeCartItemsCount}
        currentView={currentView}
        onNavigate={(view) => handleNavigationChange(view)}
        isDbLive={isDbLive}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main viewport Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderViewContent()}
      </main>

      {/* Black SpaceX-inspired footer with custom legal and utility directories */}
      <footer className="bg-black text-neutral-400 py-16 px-4 mt-24 border-t border-neutral-900 select-none">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
          
          {/* Top Links Hub */}
          <div className="flex flex-row flex-wrap justify-center items-center gap-x-8 gap-y-2.5 text-[11px] font-sans font-medium tracking-[0.2em] text-white uppercase mb-4">
            <button 
              onClick={() => handleNavigationChange('faq')}
              className="hover:text-neutral-400 transition-colors cursor-pointer"
            >
              FAQs
            </button>
            <button 
              onClick={() => {
                handleNavigationChange('listing');
                setTimeout(() => {
                  window.dispatchEvent(new Event('openSearchEvent'));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 50);
              }}
              className="hover:text-neutral-400 transition-colors cursor-pointer"
            >
              Search
            </button>
            <button 
              onClick={() => handleNavigationChange('privacy')}
              className="hover:text-neutral-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>

          {/* Sub-line Link: Terms & Conditions */}
          <div className="text-[11px] font-sans font-medium tracking-[0.2em] text-white uppercase mb-10">
            <button 
              onClick={() => handleNavigationChange('terms')}
              className="hover:text-neutral-400 transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </button>
          </div>

          {/* Bottom Brand Stamp */}
          <div className="flex flex-col items-center gap-3 text-[10px] sm:text-[11px] font-sans tracking-[0.16em] text-neutral-500 uppercase">
            <span>© READERSONIC STORE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
