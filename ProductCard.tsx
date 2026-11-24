import { Heart, ShoppingBag, Star } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../types';
import { formatCurrency } from '../utils/format';
import { ResilientImage } from './ResilientImage';

interface ProductCardProps {
  product: Product;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: number) => void;
  layout?: 'grid' | 'list';
}

export function ProductCard({
  product,
  isWishlisted = false,
  onToggleWishlist,
  layout = 'grid',
}: ProductCardProps) {
  const { addToCart } = useCart();
  const primaryImage =
    product.images.find((img) => img.isPrimary)?.url || product.images[0]?.url || null;
  const defaultVariantId = product.variants?.[0]?.id ?? null;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product.id, defaultVariantId, 1, true);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWishlist?.(product.id);
  };

  if (layout === 'list') {
    return (
      <Link
        to={`/products/${product.slug}`}
        className="group flex flex-col sm:flex-row gap-5 rounded-xl border border-[#27272A] bg-[#18181B] p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6]/50"
      >
        <div className="w-full sm:w-56 aspect-[4/3] shrink-0 overflow-hidden rounded-lg bg-[#111114]">
          <ResilientImage
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mb-1.5">
              <span>{product.category?.name || 'Hardware'}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="w-3.5 h-3.5 text-[#06B6D4] fill-[#06B6D4]" />
                {product.ratingAvg.toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
            </div>
            <h3 className="text-base font-semibold text-[#FAFAFA] group-hover:text-[#8B5CF6] transition-colors">
              {product.name}
            </h3>
            <p className="mt-1.5 text-sm text-[#A1A1AA] line-clamp-2">{product.description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#27272A]">
            <div className="flex items-baseline gap-2.5 tabular-nums">
              <span className="text-base font-semibold text-[#FAFAFA] font-mono">
                {formatCurrency(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-xs text-[#A1A1AA] line-through font-mono">
                  {formatCurrency(product.compareAtPrice)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onToggleWishlist && (
                <button
                  type="button"
                  onClick={handleWishlist}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                  className={`p-2 rounded-lg border transition-colors ${
                    isWishlisted
                      ? 'border-[#8B5CF6]/60 bg-[#8B5CF6]/15 text-[#8B5CF6]'
                      : 'border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              )}
              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={handleQuickAdd}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {product.stock > 0 ? 'Add to Bag' : 'Sold Out'}
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col rounded-xl border border-[#27272A] bg-[#18181B] overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6]/50"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#111114]">
        <ResilientImage
          src={primaryImage}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {onToggleWishlist && (
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`absolute top-3 right-3 p-2 rounded-lg border backdrop-blur-md transition-colors ${
              isWishlisted
                ? 'border-[#8B5CF6]/60 bg-[#09090B]/80 text-[#8B5CF6]'
                : 'border-[#27272A] bg-[#09090B]/70 text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mb-1">
            <span className="truncate">{product.category?.name || 'Hardware'}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums shrink-0">
              <Star className="w-3 h-3 text-[#06B6D4] fill-[#06B6D4]" />
              {product.ratingAvg.toFixed(1)}
            </span>
          </div>
          <h3 className="text-[15px] font-semibold text-[#FAFAFA] leading-snug line-clamp-1 group-hover:text-[#8B5CF6] transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#27272A]">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-[15px] font-semibold text-[#FAFAFA] font-mono">
              {formatCurrency(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-[#A1A1AA] line-through font-mono">
                {formatCurrency(product.compareAtPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={handleQuickAdd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#111114] px-3 py-1.5 text-xs font-medium text-[#FAFAFA] hover:border-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {product.stock > 0 ? 'Add' : 'Out'}
          </button>
        </div>
      </div>
    </Link>
  );
}
