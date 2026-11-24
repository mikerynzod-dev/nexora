import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResilientImage } from '../components/ResilientImage';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { WishlistItem } from '../types';
import { formatCurrency } from '../utils/format';

export function WishlistPage() {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ items: WishlistItem[] }>('/wishlist');
      setItems(res.data.items);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load wishlist'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = async (productId: number) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      setItems((prev) => prev.filter((item) => item.productId !== productId));
      showToast('Removed from wishlist', 'info');
    } catch (err) {
      showToast(extractApiError(err, 'Could not remove item'), 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[#27272A] pb-6">
        <h1 className="font-display text-3xl font-semibold text-[#FAFAFA]">Saved Wishlist</h1>
        <p className="text-sm text-[#A1A1AA] mt-1 tabular-nums">
          {items.length} saved {items.length === 1 ? 'instrument' : 'instruments'}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-72 rounded-xl bg-[#18181B] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-14 text-center space-y-4">
          <Heart className="w-10 h-10 text-[#27272A] mx-auto" />
          <p className="text-base font-medium text-[#FAFAFA]">Your wishlist is empty</p>
          <Link
            to="/catalog"
            className="inline-block rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-xs font-medium text-white"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const p = item.product;
            const imgUrl = p.images.find((i) => i.isPrimary)?.url || p.images[0]?.url || null;
            return (
              <div
                key={item.id}
                className="flex flex-col rounded-xl border border-[#27272A] bg-[#18181B] overflow-hidden"
              >
                <Link
                  to={`/products/${p.slug}`}
                  className="aspect-[4/3] bg-[#111114] overflow-hidden"
                >
                  <ResilientImage
                    src={imgUrl}
                    alt={p.name}
                    className="h-full w-full object-cover hover:scale-[1.03] transition-transform duration-300"
                  />
                </Link>
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <Link
                      to={`/products/${p.slug}`}
                      className="text-sm font-semibold text-[#FAFAFA] hover:text-[#8B5CF6]"
                    >
                      {p.name}
                    </Link>
                    <p className="text-sm font-mono tabular-nums text-[#FAFAFA] mt-1">
                      {formatCurrency(p.price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#27272A]">
                    <button
                      type="button"
                      disabled={p.stock <= 0}
                      onClick={() => addToCart(p.id, null, 1, true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#8B5CF6] py-2 text-xs font-medium text-white hover:bg-[#7C3AED] disabled:opacity-40"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{p.stock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId)}
                      className="p-2 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:text-rose-400"
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
