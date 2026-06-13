/**
 * READ-TO-USE BLUEPRINT FOR NEXT.JS APP ROUTER PRODUCT DETAIL ROUTE PAGE
 * File Location: app/products/[id]/page.tsx (or similar routes depending on navigation setup)
 * 
 * Styled perfectly using Tailwind CSS, featuring full responsive grids, galleries, spec details,
 * interactive options, custom ratings, and modular Server Component fetching.
 */

import * as React from 'react';
import { createClient } from '@supabase/supabase-js';

// Define the TS product type
export interface DetailProductType {
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
// SKELETON LOADER SCREEN FOR NEXT.JS DYNAMIC FALLBACK PAGE
// -------------------------------------------------------------
export function DetailPageSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 space-y-10 animate-pulse">
      {/* Return button Shimmer */}
      <div className="h-6 bg-neutral-200 rounded w-28" />

      {/* Grid Layout Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Aspect Shimmer */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-neutral-250 aspect-square rounded-3xl w-full" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-neutral-200 aspect-square rounded-xl" />
            ))}
          </div>
        </div>

        {/* Right Details Shimmer */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <div className="h-4 bg-neutral-200 rounded w-20" />
            <div className="h-8 bg-neutral-200 rounded w-2/3" />
            <div className="h-4 bg-neutral-200 rounded w-32" />
          </div>
          <div className="h-px bg-neutral-200" />
          <div className="h-20 bg-neutral-100 rounded-2xl w-full" />
          <div className="h-12 bg-neutral-200 rounded-xl w-full mt-6" />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// DYNAMIC CLIENT DETAIL PANEL WITH ACCENTS, COLORS AND QUANTITIES
// -------------------------------------------------------------
'use client';

import { useState } from 'react';

interface ClientDetailProps {
  product: DetailProductType;
}

export function ClientProductDetails({ product }: ClientDetailProps) {
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [colorChoice, setColorChoice] = useState(product.colors[0] || null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const triggerAddToCart = () => {
    setStatusMessage('Artifact specifications loaded into order payload!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="space-y-8 bg-[#FAF8F5] text-stone-900 font-sans p-2 sm:p-6 rounded-3xl">
      {/* Dynamic details card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white rounded-3xl border border-[#EAE5DA] p-6 sm:p-10 shadow-sm relative">
        
        {/* Left section: Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-square bg-[#FAF8F5] border border-[#F4EFE6] rounded-2xl overflow-hidden flex items-center justify-center p-6 relative">
            <img
              src={product.images[galleryIndex] || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600'}
              alt={product.name}
              className="w-full h-full object-cover object-center rounded-2xl transition-all"
            />
            {product.popular && (
              <span className="absolute top-4 left-4 bg-[#1E1E1E] text-amber-200 text-[10px] font-mono font-bold tracking-widest px-3 py-1 rounded shadow">
                PREMIUM
              </span>
            )}
          </div>

          {/* Galleries */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setGalleryIndex(index)}
                  className={`aspect-square bg-[#FAF8F5] border rounded-xl overflow-hidden p-1 transition-all ${
                    galleryIndex === index ? 'border-amber-700 ring-2 ring-amber-500/10' : 'border-[#EAE5DA]'
                  }`}
                >
                  <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-cover rounded-lg" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right section: Specs & CTA */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase bg-[#FAF7F1] border border-[#E4DDD0] px-2.5 py-1 rounded">
                SECURE ARTIFACT: {product.id}
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-stone-900 mt-3">{product.name}</h2>
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="text-amber-500 text-sm font-bold">★ {product.rating.toFixed(2)}</span>
                <span className="text-stone-400 font-mono text-xs">({product.reviewsCount} reviews)</span>
              </div>
            </div>

            <div className="text-2xl font-bold text-stone-900">${product.price.toFixed(2)}</div>
            <hr className="border-stone-100" />

            <div className="space-y-3">
              <span className="block text-[10px] font-mono text-stone-400 tracking-wider uppercase font-bold">Literature Outline</span>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{product.longDescription}</p>
            </div>

            {/* highlights list */}
            {product.features.length > 0 && (
              <div className="p-4 bg-[#FAF7F1] border border-stone-200 rounded-2xl space-y-2">
                <span className="text-[9px] font-mono tracking-wider font-bold text-stone-400 uppercase">Core Benefits</span>
                <div className="grid grid-cols-2 gap-2">
                  {product.features.map((f, i) => (
                    <div key={i} className="flex items-center space-x-2 text-[11px] text-stone-600">
                      <span className="w-1 h-1 bg-stone-500 rounded-full shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Color choosing */}
            {product.colors.length > 0 && (
              <div className="space-y-2">
                <span className="block text-[11px] font-mono font-bold text-stone-400 uppercase">Selected Chassis: {colorChoice?.name}</span>
                <div className="flex gap-2">
                  {product.colors.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => setColorChoice(c)}
                      className={`w-6 h-6 rounded-full border relative transition-transform ${
                        colorChoice?.name === c.name ? 'ring-2 ring-stone-950 ring-offset-2' : 'border-stone-300'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-6 border-t border-stone-100">
            {statusMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                {statusMessage}
              </div>
            )}

            <div className="flex gap-4">
              {/* Quantity selectors */}
              <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                  className="px-3 py-2 text-[#5E584A] hover:bg-stone-50 text-xs font-bold font-mono px-3 cursor-pointer"
                >
                  -
                </button>
                <span className="px-3 text-xs font-mono font-bold">{itemQuantity}</span>
                <button
                  onClick={() => setItemQuantity(Math.min(product.stock || 99, itemQuantity + 1))}
                  className="px-3 py-2 text-[#5E584A] hover:bg-stone-50 text-xs font-bold font-mono px-3 cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                onClick={triggerAddToCart}
                disabled={product.stock === 0}
                className="flex-1 py-3 bg-stone-900 text-white font-bold rounded-xl text-xs hover:bg-stone-850 cursor-pointer disabled:bg-neutral-200 disabled:text-neutral-400"
              >
                {product.stock === 0 ? 'Out of Stock' : `Acquire Specs ($${(product.price * itemQuantity).toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Specs Core Specifications list */}
      {Object.keys(product.specs).length > 0 && (
        <div className="bg-[#FAF7F1] border border-[#EBE6DC] rounded-3xl p-6 sm:p-10 space-y-4">
          <h3 className="text-sm font-mono font-bold tracking-wider text-stone-800 uppercase">Core Artifact Anatomy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
            {Object.entries(product.specs).map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-stone-200 text-xs text-stone-700">
                <span className="font-semibold text-stone-500 font-mono">{k}</span>
                <span className="font-bold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MAIN NEXT.JS APP ROUTER DYNAMIC SELECT DATA FETCHES
// -------------------------------------------------------------
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const productId = resolvedParams.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Dynamic Query Fetch for single ID
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error || !data) {
    console.warn(`Query single item ID: ${productId} failed. Ensure proper IDs inside database table.`);
  }

  // Pre-seed matching sample if table query returned nothing
  const dbItem = data || {
    id: productId,
    name: 'Readersonic Whisper Book',
    category: 'ereaders',
    description: 'The world\'s first e-reader with synchronized active noise mask and integrated spatial audiobook reader.',
    long_description: 'Engineered for extreme reading environments. The Readersonic Whisper Book combines an eye-safe, glare-free 300-PPI electronic ink display with dual micro-vibe bone conduction drivers integrated directly into the chassis. Feel the soundscapes of your favorite novels synchronized with the words you read.',
    price: 249.99,
    rating: 4.90,
    reviews_count: 124,
    images: ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600'],
    features: ['300 PPI glare-free paperwhite display', 'Dual micro-vibe bone conduction channels'],
    specs: { 'Screen Size': '7.2 inches high-contrast e-Ink', 'Connections': 'Bluetooth 5.3' },
    colors: [{ name: 'Lunar Charcoal', hex: '#2A2D34' }],
    stock: 12,
    popular: true,
  };

  const product: DetailProductType = {
    id: dbItem.id,
    name: dbItem.name,
    category: dbItem.category,
    description: dbItem.description,
    longDescription: dbItem.long_description || dbItem.description,
    price: Number(dbItem.price),
    rating: Number(dbItem.rating || 4.5),
    reviewsCount: dbItem.reviews_count || 12,
    images: dbItem.images || [],
    features: dbItem.features || [],
    specs: dbItem.specs || {},
    colors: dbItem.colors || [],
    stock: dbItem.stock || 0,
    popular: dbItem.popular || false,
  };

  return (
    <div className="py-8 px-4 bg-stone-50 min-h-screen">
      <ClientProductDetails product={product} />
    </div>
  );
}
