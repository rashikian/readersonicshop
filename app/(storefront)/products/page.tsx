/**
 * READ-TO-USE BLUEPRINT FOR NEXT.JS APP ROUTER E-COMMERCE PRODUCTS CATALOG
 * File Location: app/products/page.tsx (or similar routes depending on navigation setup)
 * 
 * Styled perfectly using Tailwind CSS, featuring full responsive grids,
 * custom filter triggers, catalog sorting states, and high-fidelity loading states indicators.
 */

import * as React from 'react';
import { createClient } from '@supabase/supabase-js';

// Define TS Product data interfaces
export interface ProductType {
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

// -------------------------------------------------------------
// SKELETON LOADER SCREEN FOR NEXT.JS OPTIONAL LOADING FALLBACKS
// -------------------------------------------------------------
export function ProductCatalogSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 space-y-8 animate-pulse">
      {/* Hero Header Frame */}
      <div className="h-64 bg-neutral-200 rounded-3xl w-full" />

      {/* Controller Shimmer Bar */}
      <div className="bg-neutral-100 border border-neutral-200 rounded-2xl p-6 space-y-4">
        <div className="h-10 bg-neutral-200 rounded-xl w-full md:w-1/3" />
        <div className="h-px bg-neutral-200" />
        <div className="flex gap-2 pb-1 overflow-x-auto">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-8 bg-neutral-250 rounded-lg w-24 shrink-0" />
          ))}
        </div>
      </div>

      {/* Grid List Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="bg-white border border-[#EAE5DA] rounded-2xl overflow-hidden h-[460px] flex flex-col justify-between p-1">
            <div className="bg-neutral-155 aspect-square rounded-xl w-full" />
            <div className="p-5 space-y-3 flex-1 flex flex-col justify-center">
              <div className="h-4 bg-neutral-200 rounded w-1/3" />
              <div className="h-6 bg-neutral-200 rounded w-2/3" />
              <div className="h-3 bg-neutral-200 rounded w-full" />
              <div className="h-8 bg-neutral-200 rounded-xl w-full mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// CLIENT CATALOG VIEW COMPONENT (FILTERS, SORTS, GRID CARDS)
// -------------------------------------------------------------
'use client';

import { useState } from 'react';

interface ClientCatalogProps {
  products: ProductType[];
}

export function ClientCatalog({ products }: ClientCatalogProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortKey, setSortKey] = useState('featured');

  const categories = [
    { id: 'all', label: 'All Artifacts' },
    { id: 'ereaders', label: 'Whisper Books & Tablets' },
    { id: 'headgear', label: 'Acoustic Headgear' },
    { id: 'glassware', label: 'Fatigue-Resistant Lenses' },
    { id: 'accessories', label: 'Spatial Accessories' },
  ];

  // Client filtering
  const matchingProducts = products.filter((p) => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase()) ||
      p.features.some((f) => f.toLowerCase().includes(query.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Client sorting sorting
  const finalizedProducts = [...matchingProducts].sort((a, b) => {
    if (sortKey === 'price-low') return a.price - b.price;
    if (sortKey === 'price-high') return b.price - a.price;
    if (sortKey === 'rating') return b.rating - a.rating;
    if (sortKey === 'popular') return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="space-y-8 bg-[#FAF8F5] text-stone-900 font-sans p-2 sm:p-6 rounded-3xl">
      {/* Ambient Header Showcase */}
      <section className="relative rounded-3xl overflow-hidden bg-neutral-900 text-stone-100 p-8 sm:p-14 border border-stone-800 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent z-10" />
        <div className="relative z-20 max-w-xl">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] uppercase font-mono tracking-wider text-amber-300 mb-4">
            ★ Live Supabase Storefront
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Readersonic Catalog
          </h2>
          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
            Meticulously engineered audiobooks, bone resonance e-readers, and reading environment focus gears retrieved in real-time.
          </p>
        </div>
      </section>

      {/* Filters & Control Station */}
      <div className="bg-[#FAF7F1] border border-[#EBE6DC] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-3.5 text-stone-400">🔍</span>
            <input
              type="text"
              placeholder="Search specs, dynamic keywords, or item titles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs bg-white border border-[#DDD7CD] py-3.5 pl-10 pr-4 rounded-xl text-[#1E1E1E] focus:outline-none focus:border-[#9E8A6E] transition-all"
            />
          </div>

          <div className="flex items-center space-x-2 bg-white px-3 py-2 border border-[#DDD7CD] rounded-xl self-start md:self-auto">
            <span className="text-xs font-semibold text-[#5E584A] font-mono">Sort By:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="text-xs font-bold text-[#1E1E1E] bg-transparent focus:outline-none cursor-pointer border-none p-0 pr-6"
            >
              <option value="featured">Featured Collection</option>
              <option value="popular">Most Coveted</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Caliber</option>
            </select>
          </div>
        </div>

        <hr className="border-[#E4DDD0]" />

        {/* Scroll Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors duration-150 ${
                activeCategory === c.id
                  ? 'bg-stone-900 text-stone-100 font-bold'
                  : 'bg-white text-stone-600 border border-[#DDD7CD] hover:text-stone-900 hover:border-stone-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      {finalizedProducts.length === 0 ? (
        <div className="py-20 text-center bg-[#FAF7F1] border border-[#EBE6DC] rounded-2xl">
          <p className="text-stone-500 text-sm font-semibold">No catalog relics matching search criteria.</p>
          <button
            onClick={() => { setActiveCategory('all'); setQuery(''); }}
            className="mt-4 px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {finalizedProducts.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col bg-white border border-[#EAE5DA] hover:border-[#9E8A6E] rounded-2xl overflow-hidden shadow-sm transition-all duration-200 h-full"
            >
              <div className="bg-[#FAF8F5] aspect-square overflow-hidden cursor-pointer flex items-center justify-center p-4 border-b border-[#F4EFE6] relative">
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="w-full h-full object-cover object-center rounded-xl transition-transform duration-500 group-hover:scale-102"
                />
                
                {/* Status sticker */}
                {p.popular && (
                  <span className="absolute top-4 left-4 bg-zinc-900 text-amber-200 text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded shadow">
                    COVETED
                  </span>
                )}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">{p.category}</span>
                  <span className="text-xs font-bold text-amber-500">★ {p.rating.toFixed(1)}</span>
                </div>

                <h4 className="font-bold text-base text-stone-900 group-hover:text-amber-700 transition-colors mb-2">
                  {p.name}
                </h4>

                <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 mb-4">
                  {p.description}
                </p>

                {/* Bullets feature highlights */}
                <div className="space-y-1 mb-5 mt-auto">
                  {p.features.slice(0, 2).map((f, idx) => (
                    <div key={idx} className="flex items-center text-[10.5px] text-stone-500">
                      <span className="w-1.5 h-1.5 bg-stone-400 rounded-full mr-2 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-stone-400 block uppercase">Price</span>
                    <strong className="text-base font-bold text-stone-900 block">${p.price.toFixed(2)}</strong>
                  </div>

                  <button className="px-3.5 py-1.5 bg-[#FAF7F1] hover:bg-neutral-900 hover:text-white border border-[#DDD7CD] text-xs font-bold rounded-xl text-stone-700 transition-colors">
                    Observe Specs
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

// -------------------------------------------------------------
// MAIN NEXT.JS APP ROUTER PAGE ACTIONS (FETCHING SECURELY)
// -------------------------------------------------------------
export default async function Page() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Initialize client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Retrieve products
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase fetch failed. Ensure variables are loaded inside Vercel.', error);
  }

  // Pre-seed some default layout models if connection is pending credential setup
  const products: ProductType[] = (data || []).map((dbItem: any) => ({
    id: dbItem.id,
    name: dbItem.name,
    category: dbItem.category,
    description: dbItem.description,
    longDescription: dbItem.long_description || dbItem.description,
    price: Number(dbItem.price),
    rating: Number(dbItem.rating || 4.5),
    reviewsCount: dbItem.reviews_count || 10,
    images: dbItem.images || ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300'],
    features: dbItem.features || [],
    specs: dbItem.specs || {},
    colors: dbItem.colors || [],
    stock: dbItem.stock || 0,
    popular: dbItem.popular || false,
  }));

  return (
    <div className="py-8 px-4 bg-stone-50 min-h-screen">
      <ClientCatalog products={products} />
    </div>
  );
}
