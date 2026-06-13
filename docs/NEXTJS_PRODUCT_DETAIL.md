# Supabase Product Detail Page in Next.js (App Router)

This setup guide explains how to build a dynamic, high-performance, and SEO-friendly **Product Detail & Specification Screen** in Next.js (App Router) using live data fetched directly from your Supabase PostgreSQL database by a single product identifier (`id`).

---

## 1. Directory Structure

Add the following dynamic route files under your Next.js directory inside `app/products/[id]/`:

```bash
app/
└── products/
    └── [id]/
        ├── page.tsx          # Server Component: Dynamic route endpoint & SEO metadata
        ├── loading.tsx       # Suspense Boundary: Renders shimmering skeleton placeholder
        └── ProductDetails.tsx # Client Component: Coordinates active color tabs & interactive cart actions
```

---

## 2. Server-Side Dynamic Route (`app/products/[id]/page.tsx`)

This is a React Server Component. It retrieves standard and long descriptions, feature list bullets, and product images directly from Supabase at render time. It also generates dynamic page titles and tags for search engines (SEO) using the native `generateMetadata` callback.

```typescript
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ProductDetails from './ProductDetails';
import { DBProduct } from '../page'; // Import DBProduct interface from catalog list route

interface Params {
  id: string;
}

interface ProductDetailProps {
  params: Params;
}

// 1. Generate dynamic metadata dynamically based on product title
export async function generateMetadata({ params }: ProductDetailProps) {
  const supabase = createClient();
  
  const { data: product } = await supabase
    .from('products')
    .select('name, description')
    .eq('id', params.id)
    .single();

  if (!product) {
    return {
      title: 'Product Not Found | Readersonic',
    };
  }

  return {
    title: `${product.name} - Readersonic Premium Specs`,
    description: product.description,
  };
}

// 2. Pre-generate static routes for popular products at build time (Optional optimization)
export async function generateStaticParams() {
  const supabase = createClient();
  const { data: popularProducts } = await supabase
    .from('products')
    .select('id')
    .eq('popular', true);

  if (!popularProducts) return [];

  return popularProducts.map((p) => ({
    id: p.id,
  }));
}

// 3. Dynamic server component fetching single product detail
export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const supabase = createClient();

  const { data: dbProduct, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !dbProduct) {
    // Triggers Next.js 404 page fallback matches
    notFound();
  }

  // Map snake_case database columns cleanly to camelCase components
  const product = {
    id: dbProduct.id,
    name: dbProduct.name,
    category: dbProduct.category,
    description: dbProduct.description,
    longDescription: dbProduct.long_description,
    price: Number(dbProduct.price),
    rating: Number(dbProduct.rating),
    reviewsCount: dbProduct.reviews_count,
    images: dbProduct.images || [],
    features: dbProduct.features || [],
    specs: (dbProduct.specs as Record<string, string>) || {},
    colors: (dbProduct.colors as { name: string; hex: string }[]) || [],
    stock: dbProduct.stock,
    popular: dbProduct.popular,
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ProductDetails product={product} />
      </div>
    </main>
  );
}
```

---

## 3. Shimmering Loading Placeholder (`app/products/[id]/loading.tsx`)

This is automatically mounted while your Next.js server resolves the database query. It mirrors the exact layout of the Product details page to eliminate visual layout shifts.

```jsx
export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12 animate-pulse">
        
        {/* Back Link Shimmer */}
        <div className="h-5 bg-neutral-200 rounded w-28" />

        {/* Product Layout Grid Shimmer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Image Box Shimmer */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-neutral-250 aspect-square rounded-3xl w-full" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-neutral-200 aspect-square rounded-xl" />
              ))}
            </div>
          </div>

          {/* Right Column: Spec Sheet Shimmer */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="h-4 bg-neutral-200 rounded w-16" />
              <div className="h-10 bg-neutral-200 rounded w-3/4" />
              <div className="h-5 bg-neutral-200 rounded w-1/4" />
            </div>

            <div className="h-px bg-neutral-200" />

            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-full" />
              <div className="h-4 bg-neutral-200 rounded w-full" />
              <div className="h-4 bg-neutral-200 rounded w-4/5" />
            </div>

            <div className="space-y-4 pt-4">
              <div className="h-4 bg-neutral-200 rounded w-24" />
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-neutral-200" />
                <div className="w-8 h-8 rounded-full bg-neutral-200" />
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              <div className="h-12 bg-neutral-200 rounded-xl w-1/3" />
              <div className="h-12 bg-neutral-200 rounded-xl w-2/3" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
```

---

## 4. Stateful UI Interactions Component (`app/products/[id]/ProductDetails.tsx`)

This Client Component coordinates interactive user elements—such as selecting product colors, changing quantity counts, reading detailed specifications lists, and adding items to the cart.

```jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, ShoppingBag, ShieldCheck, Truck, RefreshCw, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  price: number;
  rating: number;
  reviewsCount: number;
  images: string[];
  features: string[];
  specs: Record<string, string>;
  colors: { name: string; hex: string }[];
  stock: number;
  popular: boolean;
}

interface ProductDetailsProps {
  product: Product;
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
    // Integrate with your application's state manager, Redux, or Context API here
    console.log('Added Item to Cart:', {
      product,
      quantity,
      color: selectedColor,
      total: product.price * quantity,
    });
  };

  return (
    <div className="space-y-8 text-neutral-800">
      
      {/* Back to Products Navigation bar */}
      <Link
        href="/products"
        className="inline-flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-[#9E8A6E] hover:text-[#7E6A4E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Catalog</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white rounded-3xl border border-[#EAE5DA] p-6 sm:p-10 shadow-sm">
        
        {/* Left Side Column: Gallery Showcase */}
        <div id="product-gallery-viewport" className="lg:col-span-6 space-y-4">
          <div className="aspect-square bg-[#FAF8F5] border border-[#F4EFE6] rounded-2xl overflow-hidden flex items-center justify-center p-6 relative">
            <img
              src={product.images[activeImageIndex] || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600'}
              alt={product.name}
              className="w-full h-full object-cover object-center rounded-2xl transition-all duration-300"
            />
            
            {product.popular && (
              <span className="absolute top-4 left-4 bg-stone-900 text-[#E6C280] text-[9px] font-mono font-bold tracking-widest uppercase px-3 py-1 rounded shadow-md">
                COVETED SPEC
              </span>
            )}
          </div>

          {/* Mini Thumbnail Buttons Grid */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`aspect-square bg-[#FAF8F5] border rounded-xl overflow-hidden p-1 transition-all ${
                    activeImageIndex === idx ? 'border-[#9E8A6E] ring-2 ring-[#9E8A6E]/10' : 'border-[#EAE5DA] hover:border-neutral-400'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover rounded-lg" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side Column: Technical spec descriptors and Cart controls */}
        <div id="product-purchase-action" className="lg:col-span-6 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-widest text-[#9C9482] uppercase bg-[#FAF7F1] border border-[#E4DDD0] px-2.5 py-1 rounded">
                CATEGORY / {product.category}
              </span>
              <h1 className="text-3xl font-display font-extrabold tracking-tight text-[#1E1E1E] mt-3">
                {product.name}
              </h1>
              
              {/* Star Rating & Review counts */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating) ? 'fill-current' : 'text-neutral-200'
                      }`}
                    />
                  ))}
                </div>
                <strong className="text-sm font-bold">{product.rating.toFixed(2)}</strong>
                <span className="text-stone-400 font-mono text-[11px]">
                  ({product.reviewsCount} certified audits)
                </span>
              </div>
            </div>

            <div className="text-2xl font-bold font-sans tracking-tight text-neutral-900">
              ${product.price.toFixed(2)}
            </div>

            <hr className="border-[#F0EAE1]" />

            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold tracking-wider text-[#9C9482] uppercase">
                Technical Blueprint Synopsis
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {product.longDescription || product.description}
              </p>
            </div>

            {/* Core Features bullets */}
            {product.features.length > 0 && (
              <div className="space-y-2 bg-[#FAF7F1] border border-[#EBE6DC] p-4 rounded-2xl">
                <h4 className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wide">
                  Chassis Highlights
                </h4>
                <ul className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                  {product.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#9E8A6E] rounded-full shrink-0" />
                      <span className="truncate">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Color Swatches selection */}
            {product.colors.length > 0 && (
              <div className="space-y-2.5">
                <span className="block text-[11px] font-mono font-bold text-stone-400 uppercase tracking-widest">
                  Chassis Finish: {selectedColor?.name}
                </span>
                <div className="flex gap-3">
                  {product.colors.map((col, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedColor(col)}
                      className={`w-8 h-8 rounded-full border relative transition-transform hover:scale-105 ${
                        selectedColor?.name === col.name ? 'ring-2 ring-stone-900 ring-offset-2' : 'border-neutral-300'
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selection controls & CTA button */}
          <div className="space-y-6 pt-6 border-t border-[#F0EAE1]">
            <div className="flex items-center gap-4">
              {/* Quantity Picker */}
              <div className="flex items-center border border-[#DDD7CD] rounded-xl overflow-hidden bg-[#FAF8F5]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 py-2.5 hover:bg-neutral-100 font-bold transition-colors cursor-pointer text-xs"
                >
                  -
                </button>
                <span className="px-4 font-mono font-bold text-xs">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-3.5 py-2.5 hover:bg-neutral-100 font-bold transition-colors cursor-pointer text-xs"
                >
                  +
                </button>
              </div>

              {/* Action purchase trigger */}
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`flex-1 py-3.5 px-6 rounded-xl font-bold tracking-tight text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer shadow-md ${
                  product.stock === 0
                    ? 'bg-neutral-200 border-neutral-300 text-neutral-400 cursor-not-allowed shadow-none'
                    : 'bg-[#1E1E1E] hover:bg-black text-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {product.stock === 0
                    ? 'Catalog Depleted'
                    : isAdded
                    ? 'Incorporated into Shipments!'
                    : `Acquire Specs ($${(product.price * quantity).toFixed(2)})`}
                </span>
              </button>
            </div>

            {/* Micro details assurances */}
            <div className="grid grid-cols-3 gap-2.5 text-[10px] font-mono text-[#8E8675] pt-4">
              <div className="flex items-center space-x-1.5 justify-center">
                <Truck className="w-3.5 h-3.5 text-[#9E8A6E]" />
                <span className="font-semibold">Secured Ship</span>
              </div>
              <div className="flex items-center space-x-1.5 justify-center border-x border-[#EAE5DA]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#9E8A6E]" />
                <span className="font-semibold">3-Year Shield</span>
              </div>
              <div className="flex items-center space-x-1.5 justify-center">
                <RefreshCw className="w-3.5 h-3.5 text-[#9E8A6E]" />
                <span className="font-semibold">30-Day returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full specs list block */}
      {Object.keys(product.specs).length > 0 && (
        <section id="detailed-technical-sheet" className="bg-[#FAF7F1] border border-[#EBE6DC] rounded-3xl p-6 sm:p-10 space-y-6">
          <h3 className="text-sm font-mono font-bold tracking-wider text-[#1E1E1E] uppercase">
            Product Specifications Core Sheet
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {Object.entries(product.specs).map(([key, val]) => (
              <div key={key} className="flex justify-between py-2 border-b border-[#EAE5DA] text-xs">
                <span className="font-semibold text-stone-500 font-mono">{key}</span>
                <span className="font-bold text-stone-800">{val}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
