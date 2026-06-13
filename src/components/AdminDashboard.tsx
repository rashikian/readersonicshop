import { useState, useEffect, useRef, FormEvent, DragEvent, ChangeEvent } from 'react';
import { db } from '../lib/supabase';
import { Product, Order } from '../types';
import { safeSessionStorage } from '../lib/safeStorage';

const sessionStorage = safeSessionStorage;

import { 
  Package, 
  AlertTriangle, 
  DollarSign, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  ShieldCheck,
  Clock,
  Upload,
  X,
  Trash2
} from 'lucide-react';

interface AutoExpandingTextareaProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: number;
}

function AutoExpandingTextarea({
  value,
  onChange,
  placeholder,
  className = '',
  maxHeight = 200
}: AutoExpandingTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height before calculating so scrollHeight is accurate when deleting text
    textarea.style.height = 'auto';

    const scrollHeight = textarea.scrollHeight;
    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [value, maxHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`resize-none transition-[height] duration-75 block w-full text-base md:text-xs bg-[#f4f4f4] border border-neutral-200 py-2.5 px-3 focus:outline-none rounded-none ${className}`}
    />
  );
}

const DEFAULT_EMPTY_PRODUCT: Omit<Product, 'id'> = {
  name: '',
  description: '',
  longDescription: '',
  price: 0,
  rating: 5.0,
  reviewsCount: 0,
  images: [],
  features: [],
  specs: {},
  colors: [],
  stock: 10,
  popular: false
};

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('readersonic_admin_authed') === 'true';
  });
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Local active states
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [loading, setLoading] = useState<boolean>(true);
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Database live status checking
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkDb() {
      try {
        const live = await db.isLive();
        setDbConnected(live);
      } catch {
        setDbConnected(false);
      }
    }
    checkDb();
  }, []);

  // Form management states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>(DEFAULT_EMPTY_PRODUCT);

  // Helper inputs state for specifications and colors
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#000000');

  const [actionMessage, setActionMessage] = useState('');
  const [formError, setFormError] = useState('');

  // File upload state & handlers
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Only image files are supported.');
      return;
    }
    const activeImages = (newProduct.images || []).filter(img => img && img.trim() !== '');
    if (activeImages.length >= 5) {
      setFormError('Maximum of 5 photos is allowed.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const uploadedBase64 = reader.result;
        setNewProduct(prev => {
          const currentList = (prev.images || []).filter(img => img && img.trim() !== '');
          if (currentList.length >= 5) return prev;
          return {
            ...prev,
            images: [...currentList, uploadedBase64]
          };
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImageIdx = (indexToRemove: number) => {
    setNewProduct(prev => {
      const activeImages = (prev.images || []).filter(img => img && img.trim() !== '');
      const updated = activeImages.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: updated
      };
    });
  };

  // Reload data from database
  const loadData = async () => {
    setLoading(true);
    try {
      const allProducts = await db.getProducts();
      const allOrders = await db.getOrders();
      setProducts(allProducts);
      setOrders(allOrders);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up listeners for real-time background updates
    const handleOrdersRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<Order[]>;
      if (customEvent.detail) {
        setOrders(customEvent.detail);
      } else {
        db.getOrders().then(setOrders).catch(err => console.warn(err));
      }
    };

    const handleProductsRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<Product[]>;
      if (customEvent.detail) {
        setProducts(customEvent.detail);
      } else {
        db.getProducts().then(setProducts).catch(err => console.warn(err));
      }
    };

    window.addEventListener('supabaseOrdersUpdate', handleOrdersRefreshed);
    window.addEventListener('supabaseProductsUpdate', handleProductsRefreshed);

    return () => {
      window.removeEventListener('supabaseOrdersUpdate', handleOrdersRefreshed);
      window.removeEventListener('supabaseProductsUpdate', handleProductsRefreshed);
    };
  }, []);

  // Compute stats
  const grossProceeds = orders.reduce((acc, curr) => {
    const status = (curr.order_status || curr.status || 'pending').toLowerCase();
    const isDelivered = status === 'delivered' || status === 'completed';
    return isDelivered ? acc + curr.total : acc;
  }, 0);
  const totalVolume = orders.length;
  const lowStockCount = products.filter(p => p.stock <= 5).length;
  const unpaidCount = orders.filter(o => (o.payment_status || 'unpaid') === 'unpaid').length;

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setActionMessage('');

    if (!newProduct.name.trim()) {
      setFormError('Product title is required.');
      return;
    }
    if (newProduct.price <= 0) {
      setFormError('Price must be greater than zero.');
      return;
    }
    if (!newProduct.images || !newProduct.images[0]) {
      setFormError('Please upload a product image.');
      return;
    }

    try {
      // Prepare final product properties
      const finalProductObj = {
        ...newProduct,
        longDescription: newProduct.longDescription.trim() || newProduct.description.trim()
      };

      if (editingId) {
        const productToUpdate: Product = {
          ...finalProductObj,
          id: editingId
        };
        await db.updateProduct(productToUpdate);
        setActionMessage('Product updated successfully.');
      } else {
        const generatedSKU = `prod_${Math.floor(1000 + Math.random() * 9000)}`;
        const productToCreate: Product = {
          ...finalProductObj,
          id: generatedSKU
        };
        await db.createProduct(productToCreate);
        setActionMessage('New product added successfully.');
      }

      // Reset form
      setNewProduct(DEFAULT_EMPTY_PRODUCT);
      setSpecKey('');
      setSpecValue('');
      setColorName('');
      setColorHex('#000000');
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    }
  };

  const handleEditClick = (p: Product) => {
    setEditingId(p.id);
    setNewProduct({
      name: p.name,
      description: p.description,
      longDescription: p.longDescription || p.description,
      price: p.price,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      images: p.images,
      features: p.features,
      specs: p.specs,
      colors: p.colors,
      stock: p.stock,
      popular: p.popular || false
    });
    setFormError('');
    setActionMessage('');
    // Scroll to form on mobile
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you absolutely certain you want to delete this product?')) return;
    try {
      await db.deleteProduct(id);
      setActionMessage('Product successfully removed.');
      await loadData();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Modify Order Status Handlers
  const handleUpdateOrderStatus = async (orderId: string, newOrderStatus: string) => {
    try {
      await db.updateOrderStatus(orderId, { 
          order_status: newOrderStatus, 
          status: newOrderStatus as any 
      });
      await loadData();
      setActionMessage(`Order status updated to ${newOrderStatus}.`);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    try {
      await db.updateOrderStatus(orderId, { 
          payment_status: newPaymentStatus 
      });
      await loadData();
      setActionMessage(`Payment status updated to ${newPaymentStatus}.`);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you absolutely certain you want to delete this order? This action is irreversible.')) return;
    try {
      await db.deleteOrder(orderId);
      await loadData();
      setActionMessage('Order was successfully removed from logs.');
    } catch (err: any) {
      console.error(err);
      setActionMessage('Failed to delete the order: ' + (err.message || 'Unknown network error.'));
    }
  };

  // Filtering
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.shipping.fullName.toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.shipping.phone || '').toLowerCase().includes(orderSearch.toLowerCase())
  );

  const handlePasscodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      let authed = false;
      let errorMsg = '';

      if (db.verifyAdminPasscode) {
        try {
          const response = await db.verifyAdminPasscode(passcodeInput);
          if (response.success) {
            authed = true;
          } else {
            errorMsg = response.error || 'ACCESS DENIED. INVALID CREDENTIALS.';
          }
        } catch (serverErr: any) {
          console.warn('Server-side verify failed:', serverErr);
          errorMsg = 'VERIFICATION ERROR: ' + (serverErr.message || 'Server Unreachable');
        }
      } else {
        errorMsg = 'ACCESS DENIED. VERIFICATION COMPONENT NOT AVAILABLE.';
      }

      if (authed) {
        setIsAuthenticated(true);
        sessionStorage.setItem('readersonic_admin_authed', 'true');
        setPasscodeError('');
        await loadData();
      } else {
        setPasscodeError(errorMsg || 'ACCESS DENIED. INVALID CREDENTIALS.');
      }
    } catch (err: any) {
      setPasscodeError('VERIFICATION ERROR: ' + (err.message || 'Server Unreachable'));
    }
  };

  // Security Login Gate (SpaceX aesthetics)
  if (!isAuthenticated) {
    return (
      <div id="admin-passcode-gate" className="font-sans min-h-[60vh] flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm border border-neutral-200 bg-white p-8 text-center rounded-none shadow-sm">
          <div className="flex justify-center mb-5">
            <ShieldCheck className="w-10 h-10 text-neutral-950 stroke-[1.25]" />
          </div>
          <h2 className="text-xs font-bold tracking-[0.22em] text-neutral-900 uppercase mb-2">
            ADMINISTRATIVE LOGIN
          </h2>
          <p className="text-[10px] text-neutral-500 tracking-wider uppercase mb-5 leading-relaxed max-w-xs mx-auto">
            Authorized Personnel Only. Please enter your passcode key to manage inventory and client orders.
          </p>

          <form onSubmit={handlePasscodeSubmit} className="space-y-6">
            {passcodeError && (
              <p className="text-[10px] text-red-650 bg-red-50 border border-red-100 py-3 px-2 rounded-none font-sans font-bold tracking-widest uppercase">
                {passcodeError}
              </p>
            )}
            <div className="text-left">
              <label className="block text-[9px] font-sans font-bold text-neutral-400 mb-2.5 uppercase tracking-[0.18em]">
                ACCESS KEY
              </label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="••••••••"
                className="w-full text-center text-base md:text-xs font-bold bg-[#f4f4f4] border border-neutral-200 py-3.5 px-4 rounded-none focus:outline-none focus:border-neutral-900 transition-all font-mono tracking-widest"
              />
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="submit"
                className="w-full py-4 bg-black text-white text-xs font-bold tracking-[0.2em] hover:bg-neutral-900 transition-all rounded-none cursor-pointer uppercase"
              >
                UNLOCK SYSTEM
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full py-3 bg-white text-neutral-500 border border-neutral-200 hover:text-neutral-900 hover:border-neutral-400 text-xs font-bold tracking-[0.2em] transition-all rounded-none cursor-pointer uppercase"
              >
                RETURN HOME
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Workspace
  return (
    <div id="admin-dashboard-container" className="font-sans text-neutral-900 bg-white p-1 sm:p-4 min-h-screen">
      
      {/* Upper Navigation / Tab Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 pb-6 border-b border-neutral-250">
        <div>
          <button 
            onClick={onBack}
            className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 hover:text-black flex items-center gap-1.5 mb-2 cursor-pointer transition-colors uppercase"
          >
            ← Back to Shop
          </button>
          <h1 className="text-base sm:text-lg font-bold tracking-[0.18em] text-neutral-900 uppercase">
            ADMIN WORKSPACE
          </h1>
          <div className="mt-2.5 flex items-center gap-2">
            {dbConnected === true ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-[9px] font-sans font-extrabold tracking-widest uppercase border border-green-150">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                SUPABASE LINKED & ACTIVE
              </div>
            ) : dbConnected === false ? (
              <div className="inline-flex flex-col sm:flex-row sm:items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 text-[9px] font-mono border border-amber-200">
                <div className="flex items-center gap-1.5 font-bold tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  REPLICA FALLBACK ACTIVE
                </div>
                <span className="text-neutral-500 text-[8px] sm:ml-2">
                  (Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to link a live cloud postgres database)
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 text-neutral-500 text-[9px] font-sans font-bold tracking-widest uppercase border border-neutral-200">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse"></span>
                STABILIZING TUNNEL ACCURACY...
              </div>
            )}
          </div>

        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#f4f4f4] p-1 rounded-none border border-neutral-200 text-[10px] font-bold tracking-widest uppercase">
          <button
            onClick={() => { setActiveTab('products'); setActionMessage(''); }}
            className={`px-4 py-2.5 transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-black text-white' : 'text-neutral-500 hover:text-black'
            }`}
          >
            CATALOG ({products.length})
          </button>
          <button
            onClick={() => { setActiveTab('orders'); setActionMessage(''); }}
            className={`px-4 py-2.5 transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-black text-white' : 'text-neutral-500 hover:text-black'
            }`}
          >
            ORDERS ({orders.length})
          </button>
        </div>
      </div>

      {/* KPI Stats Widgets (Sleek minimalist SpaceX boxes) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        <div className="bg-[#f4f4f4] p-5 sm:p-6 rounded-none flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.16em]">Total Revenue</p>
            <strong className="text-sm font-bold text-neutral-900 block mt-1.5 font-mono">BDT {grossProceeds.toFixed(2)}</strong>
          </div>
          <DollarSign className="w-5 h-5 text-neutral-350 stroke-[1.5]" />
        </div>

        <div className="bg-[#f4f4f4] p-5 sm:p-6 rounded-none flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.16em]">Invoiced orders</p>
            <strong className="text-sm font-bold text-neutral-900 block mt-1.5 font-mono">{totalVolume}</strong>
          </div>
          <Package className="w-5 h-5 text-neutral-350 stroke-[1.5]" />
        </div>

        <div className="bg-[#f4f4f4] p-5 sm:p-6 rounded-none flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.16em]">Low Stock Alert</p>
            <strong className={`text-sm font-bold block mt-1.5 font-mono ${lowStockCount > 0 ? 'text-red-650' : 'text-neutral-900'}`}>
              {lowStockCount}
            </strong>
          </div>
          <AlertTriangle className="w-5 h-5 text-neutral-350 stroke-[1.5]" />
        </div>

        <div className="bg-[#f4f4f4] p-5 sm:p-6 rounded-none flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.16em]">Unpaid COD logs</p>
            <strong className="text-sm font-bold text-neutral-900 block mt-1.5 font-mono">{unpaidCount}</strong>
          </div>
          <Clock className="w-5 h-5 text-neutral-350 stroke-[1.5]" />
        </div>
      </div>

      {/* Successful alert notification design */}
      {actionMessage && (
        <div className="mb-8 p-4 bg-neutral-950 text-white text-[10px] font-semibold tracking-[0.15em] flex items-center gap-2.5 uppercase justify-center">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0 stroke-[2]" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Primary Workspace Section */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-950" />
          <p className="text-[10px] text-neutral-400 tracking-widest uppercase">Synchronizing databases...</p>
        </div>
      ) : activeTab === 'products' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Create/Edit Product Panel */}
          <div className="lg:col-span-5 bg-white border border-neutral-250 p-6 space-y-5 rounded-none">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-neutral-800 uppercase pb-3 border-b border-neutral-200">
              {editingId ? 'EDIT PRODUCT DESIGN' : 'ADD NEW CATALOG SHELF ENTRY'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-105 text-red-700 text-[10px] font-bold tracking-wide uppercase">
                  ERROR: {formError}
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Product Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full text-base md:text-xs font-medium bg-[#f4f4f4] border border-neutral-200 py-3 px-3 focus:outline-none focus:border-neutral-950 transition-colors rounded-none"
                  placeholder="e.g. UNISEX LOGO FLEECE ZIP HOODIE"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Price (BDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={newProduct.price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full text-base md:text-xs font-semibold bg-[#f4f4f4] border border-neutral-200 py-2.5 px-3 focus:outline-none rounded-none"
                    placeholder="e.g. 65.00"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Stock Units</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full text-base md:text-xs bg-[#f4f4f4] border border-neutral-200 py-2.5 px-3 focus:outline-none rounded-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Popular Choice?</label>
                <select
                  value={newProduct.popular ? 'true' : 'false'}
                  onChange={(e) => setNewProduct({ ...newProduct, popular: e.target.value === 'true' })}
                  className="w-full text-base md:text-xs bg-[#f4f4f4] border border-neutral-200 py-2.5 px-2 focus:outline-none cursor-pointer rounded-none font-bold"
                >
                  <option value="false">STANDARD SKU</option>
                  <option value="true">FEATURED DISPLAY</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Short Description</label>
                <AutoExpandingTextarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Provide precise details..."
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Product Long Description (Optional)</label>
                <AutoExpandingTextarea
                  value={newProduct.longDescription}
                  onChange={(e) => setNewProduct({ ...newProduct, longDescription: e.target.value })}
                  placeholder="Detailed specifications explanation (defaults to short description)..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Key Details (Bullet points)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProduct({
                        ...newProduct,
                        features: [...(newProduct.features || []), '']
                      });
                    }}
                    className="text-[9px] font-bold tracking-widest text-[#2A2D34] hover:underline uppercase"
                  >
                    + Add bullet
                  </button>
                </div>
                
                <div className="space-y-1.5">
                  {newProduct.features && newProduct.features.map((feat, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-neutral-400 text-xs font-bold font-mono">#{idx+1}</span>
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => {
                          const updated = [...newProduct.features];
                          updated[idx] = e.target.value;
                          setNewProduct({ ...newProduct, features: updated });
                        }}
                        className="flex-1 text-xs bg-[#f4f4f4] border border-neutral-200 py-2 px-2.5 focus:outline-none rounded-none font-medium"
                        placeholder={`Detail feature number ${idx + 1}...`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = newProduct.features.filter((_, i) => i !== idx);
                          setNewProduct({ ...newProduct, features: updated });
                        }}
                        className="p-1 text-xs text-red-500 hover:bg-neutral-100 font-bold px-2 rounded-none"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(!newProduct.features || newProduct.features.length === 0) && (
                    <p className="text-[9px] text-neutral-400 lowercase italic py-1">No bullet points provided. (Will not display on page)</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Product Specifications</label>
                
                {Object.keys(newProduct.specs || {}).length > 0 && (
                  <div className="space-y-1 bg-neutral-50 p-2 border border-neutral-200 max-h-40 overflow-y-auto">
                    {Object.entries(newProduct.specs || {}).map(([key, val]) => (
                      <div key={key} className="flex gap-2 items-center justify-between text-xs py-1 border-b border-neutral-100 last:border-0">
                        <div className="font-sans leading-relaxed">
                          <span className="font-bold text-neutral-700 tracking-wide uppercase text-[9px] mr-1">{key}:</span> 
                          <span className="text-neutral-600">{val}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextSpecs = { ...newProduct.specs };
                            delete nextSpecs[key];
                            setNewProduct({ ...newProduct, specs: nextSpecs });
                          }}
                          className="text-red-500 font-bold hover:text-red-700 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5 items-end border border-neutral-200 bg-neutral-50 p-2.5">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={specKey}
                      onChange={(e) => setSpecKey(e.target.value)}
                      className="w-full text-[11px] bg-white border border-neutral-200 py-1.5 px-2 focus:outline-none"
                      placeholder="e.g. Warranty"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <input
                      type="text"
                      value={specValue}
                      onChange={(e) => setSpecValue(e.target.value)}
                      className="w-full text-[11px] bg-white border border-neutral-200 py-1.5 px-2 focus:outline-none"
                      placeholder="e.g. 2 Years limited"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!specKey.trim() || !specValue.trim()) return;
                      setNewProduct({
                        ...newProduct,
                        specs: { ...newProduct.specs, [specKey.trim()]: specValue.trim() }
                      });
                      setSpecKey('');
                      setSpecValue('');
                    }}
                    className="bg-neutral-900 text-white hover:bg-black font-bold text-[9px] px-3 py-2 uppercase tracking-widest cursor-pointer shrink-0"
                  >
                    ADD
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1 pb-1">
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Available Colors (Optional)</label>
                
                {newProduct.colors && newProduct.colors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-1 bg-neutral-50 border border-neutral-200">
                    {newProduct.colors.map((color, index) => (
                      <div key={index} className="flex items-center gap-1 bg-white border border-neutral-200 px-1.5 py-0.5 rounded-none shadow-sm">
                        <span className="w-3 h-3 rounded-full border border-neutral-300 shrink-0" style={{ backgroundColor: color.hex }} />
                        <span className="text-[9px] font-bold text-neutral-700 uppercase tracking-wider">{color.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProduct({
                              ...newProduct,
                              colors: newProduct.colors.filter((_, idx) => idx !== index)
                            });
                          }}
                          className="text-red-500 font-bold hover:text-red-700 ml-1 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] text-neutral-400 lowercase italic py-0.5">No colors configured. (Color selector will be hidden on frontpage)</p>
                )}

                <div className="flex gap-1.5 items-end border border-neutral-200 bg-neutral-50 p-2.5">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      className="w-full text-[11px] bg-white border border-neutral-200 py-1.5 px-2 focus:outline-none"
                      placeholder="e.g. Cobalt Blue"
                    />
                  </div>
                  <div className="w-12 shrink-0">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-full h-[29px] bg-white border border-neutral-200 p-0.5 cursor-pointer block"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!colorName.trim()) return;
                      setNewProduct({
                        ...newProduct,
                        colors: [...(newProduct.colors || []), { name: colorName.trim(), hex: colorHex }]
                      });
                      setColorName('');
                      setColorHex('#121212');
                    }}
                    className="bg-neutral-900 text-white hover:bg-black font-bold text-[9px] px-3 py-2 uppercase tracking-widest cursor-pointer shrink-0"
                  >
                    ADD
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Product Images ({newProduct.images.filter(x => x && x !== '').length}/5)</label>
                  <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">Supports up to 5 photos</span>
                </div>
                
                {newProduct.images && newProduct.images.filter(x => x && x !== '').length > 0 ? (
                  <div className="border border-neutral-200 bg-[#f4f4f4] p-3 space-y-3">
                    {/* Grid of existing thumbnails */}
                    <div className="flex flex-wrap gap-2.5">
                      {newProduct.images.filter(x => x && x !== '').map((img, index) => (
                        <div key={index} className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white border border-neutral-200 flex items-center justify-center overflow-hidden group">
                          <img 
                            src={img} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImageIdx(index)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            title="Remove photo"
                          >
                            <X className="w-5 h-5 hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      ))}

                      {/* Small Add Photo Card trigger if less than 5 */}
                      {newProduct.images.filter(x => x && x !== '').length < 5 && (
                        <label 
                          htmlFor="product-image-upload-file-mini"
                          className="w-16 h-16 sm:w-20 sm:h-20 bg-white border-2 border-dashed border-neutral-250 hover:border-neutral-900 cursor-pointer flex flex-col items-center justify-center transition-colors text-neutral-500 hover:text-black shrink-0"
                        >
                          <Upload className="w-4 h-4 stroke-[2]" />
                          <span className="text-[7px] font-bold tracking-wider mt-1 uppercase">ADD</span>
                          <input
                            id="product-image-upload-file-mini"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleImageUpload(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed transition-all p-6 text-center flex flex-col items-center justify-center ${
                      isDragging 
                        ? 'border-neutral-900 bg-neutral-50' 
                        : 'border-neutral-250 hover:border-neutral-400 bg-white'
                    }`}
                  >
                    <label htmlFor="product-image-upload-file" className="cursor-pointer w-full flex flex-col items-center justify-center">
                      <Upload className="w-5 h-5 text-neutral-450 stroke-[1.5] mb-2.5" />
                      <span className="block text-[10px] font-bold tracking-widest text-neutral-900 uppercase">
                        DRAG &amp; DROP IMAGES HERE
                      </span>
                      <span className="block text-[9px] text-neutral-400 mt-1 uppercase tracking-wider">
                        OR CLICK TO CHOOSE FILE (MAX 5)
                      </span>
                      <input
                        id="product-image-upload-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-4 bg-black text-white hover:bg-neutral-900 text-xs font-bold tracking-[0.2em] transition-colors rounded-none cursor-pointer uppercase"
                >
                  {editingId ? 'SAVE CHANGES' : 'PUBLISH SKU'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setNewProduct(DEFAULT_EMPTY_PRODUCT);
                      setSpecKey('');
                      setSpecValue('');
                      setColorName('');
                      setColorHex('#000000');
                      setFormError('');
                    }}
                    className="px-4 py-3 bg-white text-neutral-500 border border-neutral-200 hover:text-black hover:border-black text-xs font-bold tracking-[0.16em] transition-colors rounded-none"
                  >
                    CANCEL
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Active catalog shelf list */}
          <div className="lg:col-span-7 bg-white border border-neutral-250 p-4 sm:p-6 rounded-none">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-neutral-200 mb-5 gap-3">
              <h3 className="text-[10px] font-bold tracking-[0.18em] text-neutral-800 uppercase">
                ACTIVE INVENTORY SHELF
              </h3>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="text-base md:text-xs bg-[#f4f4f4] border border-neutral-200 py-2 pl-9 pr-3 rounded-none focus:outline-none w-full sm:w-48 font-bold text-neutral-800 focus:border-neutral-900"
                  placeholder="FILTER PRODUCTS..."
                />
              </div>
            </div>

            {/* Mobile-optimized Cards (visible only on mobile, fits perfectly without horizontal scrolling) */}
            <div className="block md:hidden space-y-4">
              {filteredProducts.map((p) => (
                <div key={p.id} className="border border-neutral-200 p-3 flex gap-3 bg-white">
                  <div className="w-16 h-16 bg-[#f4f4f4] flex items-center justify-center border border-neutral-250/50 shrink-0 overflow-hidden">
                    <img src={p.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-grow min-w-0 flex flex-col justify-between">
                    <div>
                      <strong className="text-[11px] font-bold text-neutral-950 block truncate uppercase tracking-widest leading-tight">{p.name}</strong>
                      <span className="text-[8px] font-mono text-neutral-400 uppercase tracking-wider block">ID: {p.id}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-dotted border-neutral-100 text-[9px]">
                      <span className={`font-bold tracking-wider uppercase ${
                        p.stock <= 5 ? 'text-red-700 font-extrabold' : 'text-neutral-500'
                      }`}>
                        {p.stock} UNITS
                      </span>
                      <strong className="font-mono font-bold text-neutral-950">BDT {p.price.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-end gap-4 mt-2.5 pt-1.5 border-t border-neutral-100">
                      <button
                        onClick={() => handleEditClick(p)}
                        className="text-neutral-900 hover:text-black font-bold uppercase text-[9px] tracking-wider cursor-pointer"
                      >
                        Modify
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="text-red-650 hover:text-red-750 font-bold uppercase text-[9px] tracking-wider cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="py-12 bg-neutral-50 border border-dashed border-neutral-250 text-center text-[10px] text-neutral-400 font-mono tracking-widest uppercase">
                  No matching products exist in inventory.
                </div>
              )}
            </div>

            {/* Desktop Table (hidden on mobile, visible on tablet and desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left font-sans text-xs text-neutral-800">
                <thead>
                  <tr className="bg-[#f4f4f4] text-[9px] font-bold text-neutral-400 tracking-wider border-b border-neutral-200">
                    <th className="py-3 px-3 uppercase text-neutral-600 font-bold">PRODUCT DESIGN</th>
                    <th className="py-3 px-3 text-center uppercase text-neutral-600 font-bold">STOCK</th>
                    <th className="py-3 px-3 text-right uppercase text-neutral-600 font-bold">PRICE</th>
                    <th className="py-3 px-3 text-center uppercase text-neutral-600 font-bold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-3 max-w-xs truncate">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#f4f4f4] flex items-center justify-center border border-neutral-200/50 shrink-0 overflow-hidden">
                            <img src={p.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <strong className="text-[11px] font-bold text-neutral-950 block max-w-[160px] truncate uppercase tracking-wide">{p.name}</strong>
                            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block mt-0.5">ID: {p.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-1 text-[9px] font-bold tracking-widest uppercase ${
                          p.stock <= 5 ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-800'
                        }`}>
                          {p.stock} UNITS
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900">BDT {p.price.toFixed(2)}</td>
                      <td className="py-3 px-3 text-center space-x-4">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="text-neutral-900 hover:text-black font-bold uppercase text-[10px] tracking-wider relative group"
                          title="Edit Entry"
                        >
                          Modify
                          <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-black scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-red-650 hover:text-red-750 font-bold uppercase text-[10px] tracking-wider relative group"
                          title="Delete Product"
                        >
                          Delete
                          <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-red-650 scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-[10px] text-neutral-400 font-mono tracking-widest uppercase">
                        No matching products exist in inventory.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        
        /* Consignment & Fulfillment Center */
        <div className="bg-white border border-neutral-250 p-6 rounded-none space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-neutral-200 gap-4">
            <h3 className="text-[10px] font-bold tracking-[0.18em] text-neutral-800 uppercase">
              DOORSTEP COURIER & CASH ON DELIVERY FULFILLMENT LOGS
            </h3>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="text-base md:text-xs bg-[#f4f4f4] border border-neutral-200 py-2 pl-9 pr-3 rounded-none focus:outline-none w-full sm:w-56 font-bold text-neutral-800 focus:border-neutral-900"
                placeholder="SEARCH CLIENT INVOICE ID..."
              />
            </div>
          </div>

          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border border-neutral-200 bg-white hover:bg-neutral-50/30 p-5 sm:p-6 rounded-none transition-all space-y-5">
                
                {/* Order Metadata Header Layout */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-neutral-150 pb-3.5 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-neutral-400 bg-neutral-900 text-white px-2 py-0.5 rounded-none uppercase">
                        INVOICE
                      </span>
                      <strong className="text-xs font-mono text-neutral-900 tracking-wider font-black select-all">{order.id}</strong>
                      <span className="text-[10px] text-neutral-400 font-sans tracking-wide uppercase">| {new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-neutral-700 font-sans tracking-tight">
                      Recipient: <span className="text-neutral-950 font-bold">{order.shipping.fullName}</span> ({order.shipping.phone})
                    </p>
                    <div className="flex gap-2.5 mt-2">
                      <span className="text-[9px] font-sans font-bold tracking-widest text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 uppercase">
                        Method: {order.payment_method || 'CASH ON DELIVERY (COD)'}
                      </span>
                      <span className={`text-[9px] font-sans font-bold tracking-widest px-2 py-0.5 border uppercase ${
                        (order.payment_status || 'unpaid') === 'paid' 
                          ? 'bg-neutral-900 text-white border-neutral-950' 
                          : 'bg-white text-neutral-500 border-neutral-250'
                      }`}>
                        Payment: {order.payment_status || 'unpaid'}
                      </span>
                    </div>
                  </div>

                  {/* Manual Dropdowns to match SpaceX sleek designs */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 w-full xl:w-auto">
                    
                    {/* Payment Change Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 w-full sm:w-auto">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">DOORSTEP PAYMENT:</span>
                      <select
                        value={order.payment_status || 'unpaid'}
                        onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value)}
                        className={`text-base md:text-[9px] font-bold uppercase tracking-widest py-1.5 px-2 focus:outline-none border rounded-none cursor-pointer w-full sm:w-auto ${
                          (order.payment_status || 'unpaid') === 'paid' 
                            ? 'bg-black text-white border-black' 
                            : 'bg-white text-neutral-600 border-neutral-300'
                        }`}
                      >
                        <option value="unpaid">COD UNPAID (Collect Cash)</option>
                        <option value="paid">PAID & CLEAR</option>
                      </select>
                    </div>

                    {/* Delivery Status Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 w-full sm:w-auto">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">FULFILLMENT:</span>
                      <select
                        value={order.order_status || order.status || 'pending'}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="text-base md:text-[9px] font-bold uppercase tracking-widest py-1.5 px-2 bg-[#f4f4f4] text-[#121212] border border-neutral-300 focus:outline-none rounded-none cursor-pointer w-full sm:w-auto"
                      >
                        <option value="pending">VERIFYING</option>
                        <option value="processing">PACKAGING</option>
                        <option value="shipped">SHIPPED</option>
                        <option value="delivered">DELIVERED</option>
                        <option value="completed">COMPLETED</option>
                      </select>
                    </div>

                    {/* Delete Order Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 w-full sm:w-auto">
                      <span className="text-[9px] font-bold text-transparent select-none uppercase tracking-widest hidden sm:inline">ACTION:</span>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-[9px] font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 py-1.5 px-3 uppercase tracking-widest transition-all rounded-none cursor-pointer h-[29.5px]"
                        title="Delete Order Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>REMOVE ORDER</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Logistics Info Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-neutral-700">
                  
                  {/* Address coordinates */}
                  <div className="md:col-span-4 bg-[#f4f4f4] p-4 rounded-none flex flex-col justify-between text-xs space-y-1">
                    <div>
                      <span className="font-sans text-[8px] font-bold text-neutral-400 uppercase tracking-[0.2em] block mb-2">
                        Recipient Coordinates
                      </span>
                      <p className="font-bold text-neutral-900 uppercase tracking-wide">{order.shipping.address}</p>
                      <p className="font-semibold text-neutral-500 uppercase tracking-wide">
                        {order.shipping.city}, {order.shipping.postalCode}, {order.shipping.country}
                      </p>
                    </div>
                  </div>

                  {/* Products details */}
                  <div className="md:col-span-5 bg-[#f4f4f4] p-4 rounded-none text-xs space-y-2">
                    <span className="font-sans text-[8px] font-bold text-neutral-400 uppercase tracking-[0.2em] block mb-2">
                      Equipment Package Details ({(order.items || []).reduce((acc, i) => acc + i.quantity, 0)} items)
                    </span>
                    <div className="space-y-2 max-h-24 overflow-y-auto font-sans">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] font-bold uppercase border-b border-neutral-200 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-neutral-900 truncate pr-2 max-w-[200px]">
                            {item.product?.name || 'Unknown Item'} <span className="text-neutral-400 font-mono text-[8px]">({item.selectedColor || 'N/A'})</span>
                          </span>
                          <span className="text-neutral-500 shrink-0">
                            QTY {item.quantity} | BDT {((item.product?.price || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                           {/* Financial computations summary */}
                  <div className="md:col-span-3 bg-neutral-950 text-white p-4 rounded-none font-mono text-[9px] space-y-2 flex flex-col justify-center">
                    <div className="flex justify-between text-neutral-400 uppercase tracking-wider">
                      <span>Subtotal:</span>
                      <span>BDT {order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400 uppercase tracking-wider">
                      <span>Delivery Fee:</span>
                      <span>BDT {(order.deliveryFee ?? order.tax ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="text-[8px] text-neutral-400 uppercase tracking-tight text-right mt-1 font-bold">
                      Location: {order.shipping.city || 'Dhaka'} ({ (order.shipping.city || '').trim().toLowerCase().includes('dhaka') ? 'Inside Dhaka City' : 'Outside Dhaka City' })
                    </div>
                    <div className="flex justify-between text-white border-t border-neutral-800 pt-2 text-[11px] font-bold font-sans uppercase tracking-[0.15em]">
                      <span>TOTAL COD:</span>
                      <span>BDT {order.total.toFixed(2)}</span>
                    </div>
                  </div>            </div>

                </div>

              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="py-24 text-center text-[10px] text-neutral-400 font-mono tracking-widest uppercase">
                No custom client orders currently recorded.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
