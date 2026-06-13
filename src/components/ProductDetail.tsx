import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, colorName: string) => void;
  allProducts?: Product[];
  onNavigateDetail?: (id: string) => void;
}

export default function ProductDetail({ 
  product, 
  onBack, 
  onAddToCart, 
  allProducts, 
  onNavigateDetail 
}: ProductDetailProps) {
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors && product.colors.length > 0 ? product.colors[0].name : 'Default'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotify, setAddedNotify] = useState<boolean>(false);

  const dragStartX = useRef<number>(0);
  const dragStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Fallback to guarantee we always have images and never breach layout/cause broken state
  const productImages = product.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=600'];

  // Ensure selected index is always valid
  const currentImageIdx = selectedImageIdx >= productImages.length ? 0 : selectedImageIdx;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      dragStartX.current = e.touches[0].clientX;
      dragStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || e.touches.length === 0) return;
    const diffX = e.touches[0].clientX - dragStartX.current;
    const diffY = e.touches[0].clientY - dragStartY.current;
    // Prevent default vertical-scroll if swiping horizontally dominantly
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (e.changedTouches.length > 0) {
      const diffX = e.changedTouches[0].clientX - dragStartX.current;
      const swipeThreshold = 40; // simple responsive threshold
      if (Math.abs(diffX) > swipeThreshold) {
        if (diffX > 0) {
          // Swipe Right -> Show Previous
          setSelectedImageIdx(prev => (prev === 0 ? productImages.length - 1 : prev - 1));
        } else {
          // Swipe Left -> Show Next
          setSelectedImageIdx(prev => (prev === productImages.length - 1 ? 0 : prev + 1));
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const diffX = e.clientX - dragStartX.current;
    const diffY = e.clientY - dragStartY.current;
    if (Math.abs(diffX) > Math.abs(diffY)) {
      e.preventDefault();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diffX = e.clientX - dragStartX.current;
    const swipeThreshold = 40;
    if (Math.abs(diffX) > swipeThreshold) {
      if (diffX > 0) {
        setSelectedImageIdx(prev => (prev === 0 ? productImages.length - 1 : prev - 1));
      } else {
        setSelectedImageIdx(prev => (prev === productImages.length - 1 ? 0 : prev + 1));
      }
    }
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
  };

  const handleNextImage = () => {
    setSelectedImageIdx(prev => (prev === productImages.length - 1 ? 0 : prev + 1));
  };

  const handlePrevImage = () => {
    setSelectedImageIdx(prev => (prev === 0 ? productImages.length - 1 : prev - 1));
  };

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity(q => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  const handleAddToCartClick = () => {
    onAddToCart(product, quantity, selectedColor);
    setAddedNotify(true);
    setTimeout(() => {
      setAddedNotify(false);
    }, 3000);
  };

  return (
    <div id="product-detail-area" className="py-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Return button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-[10px] font-sans font-bold tracking-[0.25em] text-neutral-400 hover:text-neutral-900 transition-colors mb-8 sm:mb-12 uppercase cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>BACK TO CATALOG</span>
      </button>

      {/* Main presentation Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-20 items-start">
        
        {/* Left Side: Product Gallery (Matching SpaceX aesthetic) */}
        <div className="flex flex-col items-center">
          <div 
            className="relative w-full aspect-square bg-[#f4f4f4] flex items-center justify-center overflow-hidden mb-6 group cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'pan-y' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <img
              src={productImages[currentImageIdx]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 scale-100 pointer-events-none"
              referrerPolicy="no-referrer"
            />
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center pointer-events-none select-none">
                <span className="bg-neutral-950 text-white font-sans text-xs font-bold uppercase tracking-widest px-5 py-2.5">
                  TEMPORARILY OUT OF STOCK
                </span>
              </div>
            )}

            {/* Left/Right Overlays (Visible on Hover on Desktop, Always Visible on Mobile for outstanding UX) */}
            {productImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-white/90 hover:bg-white text-neutral-900 border border-neutral-200 shadow-sm flex items-center justify-center transition-all cursor-pointer rounded-none md:opacity-0 group-hover:opacity-100"
                  aria-label="Previous product image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 bg-white/90 hover:bg-white text-neutral-900 border border-neutral-200 shadow-sm flex items-center justify-center transition-all cursor-pointer rounded-none md:opacity-0 group-hover:opacity-100"
                  aria-label="Next product image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Dots Indicator below image */}
          {productImages.length > 1 && (
            <div className="flex space-x-2.5 mb-4 items-center justify-center">
              {productImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`w-2.5 h-2.5 transition-colors duration-200 cursor-pointer border border-neutral-300 rounded-full ${
                    currentImageIdx === idx 
                      ? 'bg-[#000000] border-black scale-110 shadow-sm' 
                      : 'bg-[#BDBDBD] hover:bg-neutral-500'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: SpaceX detail information & checkout options */}
        <div className="flex flex-col text-center lg:text-left">
          
          {/* Centered Title on screen sizes / responsive spacing */}
          <h1 className="font-sans font-bold text-lg sm:text-xl tracking-[0.16em] leading-relaxed text-[#121212] uppercase mb-1.5 text-center lg:text-left">
            {product.name}
          </h1>

          {/* Centered Price below title */}
          <div className="text-[13px] sm:text-sm font-sans tracking-[0.1em] text-neutral-900 font-medium mb-4 text-center lg:text-left">
            BDT {product.price % 1 === 0 ? Math.round(product.price).toFixed(2) : product.price.toFixed(2)}
          </div>

          {/* Short Description */}
          {product.description && (
            <p className="text-xs sm:text-[13px] text-neutral-500 font-sans tracking-wide leading-relaxed mb-6 text-center lg:text-left max-w-lg mx-auto lg:mx-0">
              {product.description}
            </p>
          )}

          {/* Dividing grey line */}
          <div className="w-full h-[1px] bg-neutral-200 mb-8" />

          {/* Left-aligned details block (Bullet list exactly like SpaceX screenshots) */}
          <div className="text-left space-y-6 text-[#121212] font-sans text-[13px] leading-relaxed">
            {product.longDescription && product.longDescription.trim() !== '' && product.longDescription !== product.description && (
              <div>
                <p className="font-semibold text-neutral-800 uppercase tracking-wider mb-2">Overview:</p>
                <p className="text-neutral-600 font-normal leading-relaxed text-xs sm:text-[13px] whitespace-pre-line">
                  {product.longDescription}
                </p>
              </div>
            )}

            {product.features && product.features.filter(f => f && f.trim() !== '').length > 0 && (
              <div>
                <p className="font-semibold text-neutral-800 uppercase tracking-wider mb-2">Details:</p>
                <ul className="space-y-1.5 text-neutral-600 font-normal">
                  {product.features.filter(f => f && f.trim() !== '').map((feat, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2 text-neutral-400">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.specs && Object.keys(product.specs).length > 0 && (
              <div>
                <p className="font-semibold text-neutral-800 uppercase tracking-wider mb-2">Specifications:</p>
                <ul className="space-y-1.5 text-neutral-600 font-normal">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <li key={key} className="flex items-start">
                      <span className="mr-2 text-neutral-400">•</span>
                      <span className="uppercase text-[11px] tracking-wider font-semibold text-neutral-500 mr-1.5">{key}:</span>
                      <span>{val}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Color choice bar */}
          {product.colors && product.colors.length > 0 && (
            <div className="mt-8 text-left">
              <label className="block text-[13px] font-sans text-neutral-800 font-semibold mb-3">
                Color: <span className="text-neutral-500 font-normal">{selectedColor}</span>
              </label>
              <div className="flex space-x-3">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-9 h-9 flex items-center justify-center transition-all cursor-pointer rounded-full ${
                      selectedColor === color.name 
                        ? 'ring-2 ring-neutral-950 ring-offset-2' 
                        : 'hover:scale-105'
                    }`}
                    title={color.name}
                  >
                    <span
                      className="w-7 h-7 rounded-full shadow-inner border border-neutral-250"
                      style={{ backgroundColor: color.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}



          {/* Quantity Counter adjustment */}
          <div className="mt-8 text-left">
            <label className="block text-[13px] font-sans text-neutral-800 font-semibold mb-2">
              Quantity:
            </label>
            <div className="flex items-center border border-neutral-300 w-32 h-12 justify-between">
              <button
                onClick={handleDecrement}
                className="px-4 text-neutral-400 hover:text-neutral-900 transition-colors h-full flex items-center justify-center cursor-pointer text-lg font-light"
              >
                —
              </button>
              <span className="w-8 text-center text-[13px] font-bold text-neutral-950 select-none">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                className="px-4 text-neutral-400 hover:text-neutral-900 transition-colors h-full flex items-center justify-center cursor-pointer text-lg font-light"
              >
                +
              </button>
            </div>
          </div>

          {/* Large Black ADD TO CART Button */}
          <div className="mt-8 text-left">
            <button
              onClick={handleAddToCartClick}
              disabled={product.stock === 0}
              className={`w-full max-w-lg bg-black hover:bg-neutral-900 text-white font-sans text-xs font-bold tracking-[0.25em] py-4 uppercase transition-colors duration-200 cursor-pointer h-14 flex items-center justify-center ${
                product.stock === 0 ? 'opacity-50 cursor-not-allowed bg-neutral-700' : ''
              }`}
            >
              ADD TO CART
            </button>

            {addedNotify && (
              <div className="mt-3.5 w-full max-w-lg bg-neutral-950 text-white text-[10px] font-bold text-center py-3.5 uppercase tracking-[0.2em] flex items-center justify-center space-x-2">
                <Check className="w-3.5 h-3.5 text-white shrink-0" />
                <span>ITEM ADDED TO CART</span>
              </div>
            )}
          </div>



        </div>
      </div>

      {/* SpaceX "YOU MAY ALSO LIKE" Related Section */}
      {allProducts && allProducts.length > 1 && (
        <div className="w-full max-w-4xl mx-auto mt-24 pt-12 border-t border-neutral-200">
          <h2 className="font-sans font-bold text-xs tracking-[0.25em] text-neutral-800 uppercase mb-10 text-center">
            YOU MAY ALSO LIKE
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-12">
            {allProducts
              .filter(p => p.id !== product.id)
              .slice(0, 3)
              .map((relatedProd) => (
                <div
                  key={relatedProd.id}
                  onClick={() => onNavigateDetail && onNavigateDetail(relatedProd.id)}
                  className="group flex flex-col items-center text-center cursor-pointer"
                >
                  <div className="relative w-full aspect-square bg-[#f4f4f4] overflow-hidden flex items-center justify-center transition-colors group-hover:bg-[#ebebeb]">
                    <img
                      src={relatedProd.images[0]}
                      alt={relatedProd.name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-102"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="pt-4 pb-2 flex flex-col items-center max-w-[90%]">
                    <h3 className="font-sans font-bold text-[10px] sm:text-[11px] tracking-[0.16em] leading-relaxed text-[#121212] group-hover:text-neutral-600 transition-colors uppercase text-center">
                      {relatedProd.name}
                    </h3>
                    <span className="text-[10px] sm:text-[11px] font-sans tracking-[0.1em] text-neutral-900 font-medium mt-1">
                      BDT {relatedProd.price % 1 === 0 ? Math.round(relatedProd.price) : relatedProd.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}
