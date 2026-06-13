import { useState, useEffect } from 'react';
import { Product } from '../types';
import { SlidersHorizontal, ArrowRight, Star } from 'lucide-react';

interface ProductListingProps {
  products: Product[];
  onNavigateToDetail: (productId: string) => void;
  onAddToCartDirect: (product: Product, colorName: string) => void;
  searchValue: string;
  onSearchChange: (search: string) => void;
}

export default function ProductListing({
  products,
  onNavigateToDetail,
  onAddToCartDirect,
  searchValue,
  onSearchChange,
}: ProductListingProps) {
  const [sortBy, setSortBy] = useState<string>('featured');

  // Filter Products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      product.description.toLowerCase().includes(searchValue.toLowerCase());
    return matchesSearch;
  });

  // Sort Products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'popular':
        return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
      default:
        return a.id.localeCompare(b.id);
    }
  });

  return (
    <div id="product-catalog-root" className="py-6">
      


      {/* Grid Content */}
      {sortedProducts.length === 0 ? (
        <div className="py-24 text-center border border-neutral-100 rounded bg-neutral-50/50">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">NO PRODUCTS FOUND</h3>
          <p className="text-xs text-neutral-500 mt-2 mb-6 uppercase tracking-wider">REFINE YOUR CRITERIA</p>
          <button
            onClick={() => {
              onSearchChange('');
            }}
            className="px-6 py-3 bg-neutral-950 text-white text-xs font-bold tracking-widest hover:bg-neutral-800 uppercase"
          >
            RESET CATALOG FILTERS
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 sm:gap-x-10 gap-y-12 sm:gap-y-16 max-w-5xl mx-auto">
          {sortedProducts.map((product) => {
            const displayPrice = product.price % 1 === 0 
              ? `BDT ${Math.round(product.price)}` 
              : `BDT ${product.price.toFixed(2)}`;

            return (
              <div
                key={product.id}
                className="group flex flex-col items-center text-center cursor-pointer"
                onClick={() => onNavigateToDetail(product.id)}
              >
                {/* Product Image Box (SpaceX gray container) */}
                <div 
                  className="relative w-full aspect-square bg-[#f4f4f4] overflow-hidden flex items-center justify-center transition-colors group-hover:bg-[#ebebeb]"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-102"
                    referrerPolicy="no-referrer"
                  />

                  {/* Minimal Status Indicators */}
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1">
                    {product.stock === 0 && (
                      <span className="bg-neutral-950 text-white text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-2 py-0.5">
                        SOLD OUT
                      </span>
                    )}
                    {product.stock > 0 && product.stock <= 5 && (
                      <span className="bg-neutral-950 text-white text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-2 py-0.5">
                        LOW STOCK
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Block - Perfectly Centered SpaceX Typography */}
                <div className="pt-5 pb-2 flex flex-col items-center max-w-[90%] sm:max-w-[85%]">
                  <h3 
                    className="font-sans font-bold text-[11px] sm:text-[13px] tracking-[0.16em] leading-relaxed text-[#121212] group-hover:text-neutral-600 transition-colors uppercase text-center"
                  >
                    {product.name}
                  </h3>
                  
                  <span className="text-[11px] sm:text-[13px] font-sans tracking-[0.1em] text-neutral-900 font-medium mt-1.5 sm:mt-2">
                    {displayPrice}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
