import { ArrowLeft, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ResilientImage } from '../components/ResilientImage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Product, Review, WishlistItem } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadProduct = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get<{ product: Product; relatedProducts: Product[] }>(
        `/products/${id}`
      );
      setProduct(res.data.product);
      setRelated(res.data.relatedProducts);
      setSelectedImageIdx(0);
      setSelectedVariantId(res.data.product.variants?.[0]?.id ?? null);
      setQuantity(1);
    } catch (err) {
      showToast(extractApiError(err, 'Product not found'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!user || !product) {
      setIsWishlisted(false);
      return;
    }
    api
      .get<{ items: WishlistItem[] }>('/wishlist')
      .then((res) => {
        setIsWishlisted(res.data.items.some((w) => w.productId === product.id));
      })
      .catch(() => {});
  }, [user, product]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 aspect-[4/3] rounded-xl bg-[#18181B] animate-pulse" />
          <div className="lg:col-span-5 h-96 rounded-xl bg-[#18181B] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-sm font-medium text-white"
        >
          Back to Catalog
        </Link>
      </div>
    );
  }

  const activeVariant = product.variants.find((v) => v.id === selectedVariantId) || null;
  const activePrice = product.price + (activeVariant ? activeVariant.priceDelta : 0);
  const activeStock = activeVariant ? activeVariant.stock : product.stock;
  const images = product.images.length > 0 ? product.images : [];
  const mainImage = images[selectedImageIdx]?.url || images[0]?.url || null;

  const handleToggleWishlist = async () => {
    if (!user) {
      showToast('Sign in to save items to your wishlist', 'info');
      navigate('/login');
      return;
    }
    try {
      if (isWishlisted) {
        await api.delete(`/wishlist/${product.id}`);
        setIsWishlisted(false);
        showToast('Removed from wishlist', 'info');
      } else {
        await api.post('/wishlist', { productId: product.id });
        setIsWishlisted(true);
        showToast('Saved to wishlist', 'success');
      }
    } catch (err) {
      showToast(extractApiError(err, 'Could not update wishlist'), 'error');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setSubmittingReview(true);
      await api.post('/reviews', {
        productId: product.id,
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      });
      setReviewTitle('');
      setReviewComment('');
      showToast('Review published', 'success');
      await loadProduct();
    } catch (err) {
      showToast(extractApiError(err, 'Unable to submit review'), 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <div>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </Link>

        {/* Contiguous Purchase Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Gallery */}
          <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#27272A] bg-[#18181B]">
              <ResilientImage
                src={mainImage}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`aspect-[4/3] overflow-hidden rounded-lg border transition-colors ${
                      idx === selectedImageIdx
                        ? 'border-[#8B5CF6]'
                        : 'border-[#27272A] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <ResilientImage
                      src={img.url}
                      alt={img.altText || product.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Purchase Module */}
          <div className="lg:col-span-5 rounded-xl border border-[#27272A] bg-[#111114] p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                <span>{product.category?.name || 'Hardware'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{activeVariant ? activeVariant.sku : product.sku}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums text-[#FAFAFA]">
                  <Star className="w-3.5 h-3.5 text-[#06B6D4] fill-[#06B6D4]" />
                  {product.ratingAvg.toFixed(1)} ({product.reviewCount})
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#FAFAFA]">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3 pt-1 tabular-nums">
                <span className="text-2xl font-semibold font-mono text-[#FAFAFA]">
                  {formatCurrency(activePrice)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > activePrice && (
                  <span className="text-sm font-mono text-[#A1A1AA] line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-[#A1A1AA] leading-relaxed">{product.description}</p>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="space-y-2.5 border-t border-[#27272A] pt-5">
                <span className="text-xs font-medium text-[#A1A1AA] block">
                  Configuration: <span className="text-[#FAFAFA]">{activeVariant?.name}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(1);
                      }}
                      className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                        variant.id === selectedVariantId
                          ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#FAFAFA]'
                          : 'border-[#27272A] bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA]'
                      }`}
                    >
                      {variant.name}
                      {variant.priceDelta !== 0 && (
                        <span className="ml-1.5 font-mono text-[#06B6D4]">
                          {variant.priceDelta > 0 ? '+' : ''}
                          {formatCurrency(variant.priceDelta)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Availability */}
            <div className="flex items-center justify-between border-t border-[#27272A] pt-5">
              <div className="inline-flex items-center rounded-lg border border-[#27272A] bg-[#18181B]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-[#A1A1AA] hover:text-[#FAFAFA]"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 text-sm font-mono tabular-nums">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= activeStock}
                  onClick={() => setQuantity((q) => Math.min(activeStock, q + 1))}
                  className="px-3 py-2 text-[#A1A1AA] hover:text-[#FAFAFA] disabled:opacity-30"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span
                className={`text-xs font-medium tabular-nums ${
                  activeStock > 5
                    ? 'text-emerald-400'
                    : activeStock > 0
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {activeStock > 0 ? `${activeStock} units available` : 'Out of stock'}
              </span>
            </div>

            {/* Buy Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={activeStock <= 0}
                onClick={() => addToCart(product.id, selectedVariantId, quantity, true)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-6 py-3.5 text-sm font-medium text-white hover:bg-[#7C3AED] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{activeStock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleWishlist}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                className={`px-4 rounded-lg border transition-colors ${
                  isWishlisted
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6]'
                    : 'border-[#27272A] bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[#27272A] pt-5 text-xs text-[#A1A1AA]">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#06B6D4] shrink-0" />
                <span>Free express shipping $250+</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>24-month NEXORA warranty</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      {Object.keys(product.specifications || {}).length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">
            Technical Specifications
          </h2>
          <div className="rounded-xl border border-[#27272A] bg-[#111114] divide-y divide-[#27272A]">
            {Object.entries(product.specifications).map(([key, val]) => (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-6 py-3.5 text-sm"
              >
                <span className="text-[#A1A1AA]">{key}</span>
                <span className="font-mono text-[#FAFAFA]">{val}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Customer Reviews */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-[#27272A] pt-12">
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">
            Verified Customer Reviews
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold font-mono tabular-nums text-[#FAFAFA]">
              {product.ratingAvg.toFixed(1)}
            </span>
            <span className="text-sm text-[#A1A1AA]">
              out of 5 · {product.reviewCount} reviews
            </span>
          </div>

          <form
            onSubmit={handleSubmitReview}
            className="rounded-xl border border-[#27272A] bg-[#111114] p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-[#FAFAFA]">Write a Review</h3>
            <p className="text-xs text-[#A1A1AA]">
              Available to verified purchasers of {product.name}.
            </p>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1.5">Rating</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= reviewRating
                          ? 'text-[#06B6D4] fill-[#06B6D4]'
                          : 'text-[#27272A]'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              required
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Headline (e.g., Studio-grade acoustics)"
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
            />

            <textarea
              required
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience with build quality and performance..."
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
            />

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full rounded-lg bg-[#8B5CF6] py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors"
            >
              {submittingReview ? 'Submitting...' : user ? 'Publish Review' : 'Sign In to Review'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {!product.reviews || product.reviews.length === 0 ? (
            <div className="rounded-xl border border-[#27272A] bg-[#111114] p-8 text-center text-sm text-[#A1A1AA]">
              No customer reviews yet for this product.
            </div>
          ) : (
            <div className="space-y-4">
              {product.reviews.map((rev: Review) => (
                <article
                  key={rev.id}
                  className="rounded-xl border border-[#27272A] bg-[#111114] p-5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                      <span className="font-medium text-[#FAFAFA]">{rev.userName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(rev.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="w-3.5 h-3.5 text-[#06B6D4] fill-[#06B6D4]"
                        />
                      ))}
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-[#FAFAFA]">{rev.title}</h4>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">{rev.comment}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="space-y-6 border-t border-[#27272A] pt-12">
          <h2 className="font-display text-2xl font-semibold text-[#FAFAFA]">
            Related Hardware
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
