import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Category, Product, WishlistItem } from '../types';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'featured';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') === 'true';
  const page = Math.max(1, Number(searchParams.get('page') || 1));

  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    api
      .get<{ categories: Category[] }>('/categories')
      .then((res) => setCategories(res.data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setWishlistIds(new Set());
      return;
    }
    api
      .get<{ items: WishlistItem[] }>('/wishlist')
      .then((res) => setWishlistIds(new Set(res.data.items.map((w) => w.productId))))
      .catch(() => {});
  }, [user]);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category && category !== 'all') params.set('category', category);
      if (sort) params.set('sort', sort);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (inStock) params.set('inStock', 'true');
      params.set('page', String(page));
      params.set('limit', '9');

      const res = await api.get<{
        products: Product[];
        pagination: { page: number; totalPages: number; total: number };
      }>(`/products?${params.toString()}`);

      setProducts(res.data.products);
      setTotalPages(Math.max(1, res.data.pagination.totalPages));
      setTotalItems(res.data.pagination.total);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load products'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, minPrice, maxPrice, inStock, page, showToast]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const updateFilter = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all') {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    });
    if (!('page' in updates)) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter({ search: searchDraft.trim() || null });
  };

  const handleToggleWishlist = async (productId: number) => {
    if (!user) {
      showToast('Sign in to save items to your wishlist', 'info');
      navigate('/login');
      return;
    }
    try {
      if (wishlistIds.has(productId)) {
        await api.delete(`/wishlist/${productId}`);
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        showToast('Removed from wishlist', 'info');
      } else {
        await api.post('/wishlist', { productId });
        setWishlistIds((prev) => new Set(prev).add(productId));
        showToast('Saved to wishlist', 'success');
      }
    } catch (err) {
      showToast(extractApiError(err, 'Could not update wishlist'), 'error');
    }
  };

  const clearAllFilters = () => {
    setSearchDraft('');
    setSearchParams({});
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#27272A] pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#FAFAFA]">
            Hardware Catalog
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1 tabular-nums">
            Showing {products.length} of {totalItems} instruments
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-96">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search name, specs, SKU..."
              className="w-full rounded-lg border border-[#27272A] bg-[#111114] pl-9 pr-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA]/60 focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Filter Sidebar */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="rounded-xl border border-[#27272A] bg-[#111114] p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#FAFAFA]">
                <SlidersHorizontal className="w-4 h-4 text-[#8B5CF6]" />
                <span>Filters</span>
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                Reset
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-medium text-[#A1A1AA] block">Category</label>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => updateFilter({ category: 'all' })}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    category === 'all'
                      ? 'bg-[#8B5CF6]/15 text-[#FAFAFA] border border-[#8B5CF6]/40'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B]'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateFilter({ category: cat.slug })}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === cat.slug
                        ? 'bg-[#8B5CF6]/15 text-[#FAFAFA] border border-[#8B5CF6]/40'
                        : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-[#27272A] pt-5">
              <label className="text-xs font-medium text-[#A1A1AA] block">Price Range (USD)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => updateFilter({ minPrice: e.target.value || null })}
                  className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => updateFilter({ maxPrice: e.target.value || null })}
                  className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-[#27272A] pt-5">
              <label className="flex items-center gap-2.5 text-sm text-[#FAFAFA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => updateFilter({ inStock: e.target.checked ? 'true' : null })}
                  className="rounded border-[#27272A] bg-[#09090B] accent-[#8B5CF6]"
                />
                <span>In stock only</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Results Column */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#27272A] bg-[#111114] px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap text-xs text-[#A1A1AA]">
              {search && (
                <button
                  type="button"
                  onClick={() => updateFilter({ search: null })}
                  className="inline-flex items-center gap-1 rounded-md border border-[#27272A] bg-[#18181B] px-2.5 py-1 text-[#FAFAFA]"
                >
                  <span>Search: {search}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              {!search && <span>Sort and inspect available hardware</span>}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={sort}
                onChange={(e) => updateFilter({ sort: e.target.value })}
                aria-label="Sort products"
                className="rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-1.5 text-xs text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>

              <div className="inline-flex rounded-lg border border-[#27272A] bg-[#09090B] p-0.5">
                <button
                  type="button"
                  onClick={() => setLayout('grid')}
                  aria-label="Grid view"
                  className={`p-1.5 rounded-md transition-colors ${
                    layout === 'grid' ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('list')}
                  aria-label="List view"
                  className={`p-1.5 rounded-md transition-colors ${
                    layout === 'list' ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-80 rounded-xl border border-[#27272A] bg-[#18181B] animate-pulse"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-[#27272A] bg-[#111114] p-12 text-center space-y-4">
              <p className="text-base font-medium text-[#FAFAFA]">No products match your filters</p>
              <p className="text-sm text-[#A1A1AA]">
                Try adjusting your search query, category, or price bounds.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED] transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div
              className={
                layout === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'flex flex-col gap-4'
              }
            >
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  layout={layout}
                  isWishlisted={wishlistIds.has(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const p = idx + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateFilter({ page: String(p) })}
                    className={`h-9 min-w-[36px] px-3 rounded-lg text-xs font-mono tabular-nums border transition-colors ${
                      p === page
                        ? 'border-[#8B5CF6] bg-[#8B5CF6] text-white'
                        : 'border-[#27272A] bg-[#111114] text-[#A1A1AA] hover:text-[#FAFAFA]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
