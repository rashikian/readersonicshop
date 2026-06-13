# Supabase Product Listing Page in Next.js (App Router)

This setup guide explains how to build a highly responsive, fast, and secure **Product Catalog & Listing Screen** fetching live datasets directly from your Supabase PostgreSQL database tables. It combines the speed of **React Server Components (RSC)** for data fetching with the interactivity of **Client Components** for stateful category filters, keyword searching, and real-time client sorting.

---

## 1. Directory Structure

Place these matching files under your Next.js directory inside `app/products/`:

```bash
app/
├── products/
│   ├── page.tsx          # Server Component: Fetches live data from Supabase
│   ├── loading.tsx       # Suspense Boundary: Renders shimmering skeleton placeholder layout
│   └── ProductCatalog.tsx # Client Component: Coordinates search, filtering, and animations
```

---

## 2. Server-Side Entry Point (`app/products/page.tsx`)

This is a React Server Component. It retrieves products securely at request time or build time directly from the Supabase PostgreSQL layer, bypassing client-side round-trips!

```typescript
import { createClient } from '@/utils/supabase/server';
import ProductCatalog from './ProductCatalog';

// Opt into dynamic rendering to reflect direct stock and catalog updates on reload
export const dynamic = 'force-dynamic';

export interface DBProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  long_description: string;
  price: number;
  rating: number;
  reviews_count: number;
  images: string[];
  features: string[];
  specs: Record<string, string>;
  colors: { name: string; hex: string }[];
  stock: number;
  popular: boolean;
  created_at: string;
}

export default async function ProductsPage() {
  const supabase = createClient();

  // Retrieve products directly from PostgreSQL
  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load products from database:', error.message);
  }

  // Safely map snake_case SQL columns to camelCase JS property specs
  const products = (dbProducts || []).map((p: DBProduct) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    longDescription: p.long_description,
    price: Number(p.price),
    rating: Number(p.rating),
    reviewsCount: p.reviews_count,
    images: p.images,
    features: p.features,
    specs: p.specs,
    colors: p.colors,
    stock: p.stock,
    popular: p.popular,
  }));

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ProductCatalog initialProducts={products} />
      </div>
    </main>
  );
}
```

---

## 3. Shimmering Loading Skeleton (`app/products/loading.tsx`)

This is automatically shown by Next.js using dynamic React Suspense boundaries while the Server Component is fetching. It displays high-fidelity shimmering skeleton representations of the grid card structures!

```jsx
export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        
        {/* Banner Skeleton */}
        <div className="h-64 sm:h-80 bg-neutral-200 rounded-3xl w-full" />

        {/* Filter Controls Skeleton */}
        <div className="bg-neutral-100 border border-neutral-200 rounded-2xl p-5 space-y-4">
          <div className="h-10 bg-neutral-200 rounded-xl w-full md:w-1/3" />
          <div className="h-px bg-neutral-200" />
          <div className="flex gap-2.5 overflow-x-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 bg-neutral-200 rounded-lg w-28 shrink-0" />
            ))}
          </div>
        </div>

        {/* Grid Title Skeleton */}
        <div className="h-6 bg-neutral-200 rounded w-48" />

        {/* Shimmering Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div 
              key={idx} 
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm h-[480px] flex flex-col justify-between"
            >
              {/* Product Card Image Wrapper */}
              <div className="bg-neutral-100 aspect-square w-full" />
              
              {/* Card Body Details */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 bg-neutral-200 rounded w-16" />
                    <div className="h-3 bg-neutral-200 rounded w-10" />
                  </div>
                  <div className="h-5 bg-neutral-200 rounded w-2/3" />
                  <div className="h-3 bg-neutral-200 rounded w-full" />
                  <div className="h-3 bg-neutral-200 rounded w-5/6" />
                </div>
                
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-2.5 bg-neutral-200 rounded w-12" />
                    <div className="h-5 bg-neutral-200 rounded w-20" />
                  </div>
                  <div className="h-9 bg-neutral-200 rounded-xl w-28" />
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
```

---

## 4. Stateful UI Interactions Component (`app/products/ProductCatalog.tsx`)

This Client Component coordinates interactive user elements—such as category switches, real-time query searching, active badge filters, sorting criteria, and navigation parameters.

```jsx
'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, Eye, ShoppingCart, AlertCircle, Sparkles } from 'lucide-react';

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

interface ProductCatalogProps {
  initialProducts: Product[];
}

export default function ProductCatalog({ initialProducts }: ProductCatalogProps) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  const categories = [
    { id: 'all', label: 'All Artifacts' },
    { id: 'ereaders', label: 'Whisper Books & Tablets' },
    { id: 'headgear', label: 'Acoustic Headgear' },
    { id: 'glassware', label: 'Fatigue-Resistant Lenses' },
    { id: 'accessories', label: 'Spatial Accessories' },
  ];

  // Client-Side Searching & Categorizing Filter
  const filteredProducts = initialProducts.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      product.description.toLowerCase().includes(searchValue.toLowerCase()) ||
      product.features.some((feat) => feat.toLowerCase().includes(searchValue.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Client-Side Dynamic Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'popular') return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
    return a.id.localeCompare(b.id); // Default / Featured Sorting
  });

  return (
    <div className="space-y-8">
      {/* Visual Literary Header Banner */}
      <section className="relative overflow-hidden bg-[#1E1E1E] text-white rounded-3xl p-8 md:p-12 shadow-lg border border-[#3E382E]">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
        <img
          src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=1200"
          alt="Premium Library"
          className="absolute inset-0 w-full h-full object-cover brightness-50 select-none"
        />
        <div className="relative z-20 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#2C241B] border border-[#524432] rounded-full text-[10px] uppercase font-mono tracking-wider text-[#DCD4C4] mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#E6C280]" />
            <span>Audiophile Literary Artifacts</span>
          </div>
          <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Readersonic Soundscapes
          </h2>
          <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
            Eliminate cognitive fatigue with bone-conduction channels, active vocal isolation pads, and blue-shield eyewear accessories.
          </p>
        </div>
      </section>

      {/* Control Pane Block: Search and Categorization */}
      <div className="bg-[#FAF7F1] border border-[#EBE6DC] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          
          {/* Keyword Query Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-[#9C9482]" />
            <input
              type="text"
              placeholder="Search specs, technical features, or titles..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full text-xs bg-white border border-[#DDD7CD] py-2.5 pl-10 pr-4 rounded-xl text-[#1E1E1E] focus:outline-none focus:border-[#9E8A6E] transition-all"
            />
          </div>

          {/* Sorter Selector dropdown */}
          <div className="flex items-center space-x-2 bg-white px-3 py-2 border border-[#DDD7CD] rounded-xl self-start lg:self-auto">
            <SlidersHorizontal className="w-4 h-4 text-[#867F70]" />
            <span className="text-xs font-semibold text-[#5E584A]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-bold text-[#1E1E1E] bg-transparent focus:outline-none cursor-pointer border-none p-0 pr-6"
            >
              <option value="featured">Featured Relics</option>
              <option value="popular">Most Coveted</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rating</option>
            </select>
          </div>

        </div>

        <hr className="border-[#DDD7CD]" />

        {/* Navigation Category scrollable pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#1E1E1E] text-white font-semibold'
                  : 'bg-white hover:text-black border border-[#DDD7CD] text-[#5E584A]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid view title */}
      <div className="flex justify-between items-center bg-white/40 p-1.5 rounded-lg">
        <h3 className="text-sm font-bold text-[#1E1E1E]">
          {categories.find((c) => c.id === selectedCategory)?.label} Listing
          <span className="ml-2 text-xs font-mono font-normal text-neutral-400">
            ({sortedProducts.length} artifacts available)
          </span>
        </h3>
      </div>

      {/* Main product card responsive grids */}
      {sortedProducts.length === 0 ? (
        <div className="py-20 text-center bg-[#FAF7F1] border border-[#EBE6DC] rounded-2xl flex flex-col items-center justify-center">
          <AlertCircle className="w-10 h-10 text-neutral-400 mb-4" />
          <h4 className="font-bold text-[#1E1E1E]">No compatible relics found</h4>
          <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
            Please reset search patterns or filter parameters to observe original inventory components.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchValue('');
            }}
            className="mt-4 px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              className="group flex flex-col bg-white border border-[#EAE5DA] hover:border-[#9E8A6E] rounded-2xl overflow-hidden shadow-sm transition-all duration-300 h-full"
            >
              {/* Image box frame */}
              <div className="relative bg-[#FAF8F5] aspect-square overflow-hidden cursor-pointer flex items-center justify-center p-4 border-b border-[#F4EFE6]">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover object-center rounded-xl transition-transform duration-500 group-hover:scale-103"
                />

                {/* Popularity or Stock Flag badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                  {product.popular && (
                    <span className="bg-[#1E1E1E] text-[#E6C280] text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                      COVETED
                    </span>
                  )}
                  {product.stock <= 8 && product.stock > 0 && (
                    <span className="bg-amber-600 text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                      LOW STOCK ({product.stock})
                    </span>
                  )}
                  {product.stock === 0 && (
                    <span className="bg-red-600 text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                      DEPLETED
                    </span>
                  )}
                </div>

                {/* Quick overlay buttons */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <span className="px-3.5 py-1.5 bg-white text-xs text-neutral-900 rounded-full font-bold shadow-md transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Specs Screen
                  </span>
                </div>
              </div>

              {/* Item details */}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-mono tracking-widest text-[#9C9482] uppercase">
                    {product.category}
                  </span>
                  <span className="text-xs font-semibold text-amber-500">
                    ★ {product.rating.toFixed(1)}{' '}
                    <span className="text-neutral-400 font-normal font-mono text-[10px]">
                      ({product.reviewsCount})
                    </span>
                  </span>
                </div>

                <h4 className="font-sans font-bold text-base text-[#1E1E1E] group-hover:text-[#9E8A6E] transition-colors mb-1.5">
                  {product.name}
                </h4>

                <p className="text-xs text-[#5E584A] leading-relaxed mb-4 line-clamp-2">
                  {product.description}
                </p>

                {/* Highlights */}
                <div className="space-y-1.5 mb-5 mt-auto">
                  {product.features.slice(0, 2).map((feat, idx) => (
                    <div key={idx} className="flex items-center text-[10.5px] text-[#7C7565]">
                      <div className="w-1 h-1 bg-[#9E8A6E] rounded-full mr-1.5 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-[#9C9482] block leading-none uppercase">
                      Premium Net
                    </span>
                    <strong className="text-lg font-sans font-bold text-[#1E1E1E] tracking-tight block mt-1">
                      ${product.price.toFixed(2)}
                    </strong>
                  </div>

                  <button className="px-3 py-1.5 bg-[#FAF7F1] hover:bg-neutral-900 hover:text-white border border-[#DDD7CD] text-xs font-semibold rounded-xl text-neutral-700 transition-colors flex items-center gap-1">
                    <ShoppingCart className="w-3.5 h-3.5" /> Acquire Specs
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```
