import { ArrowRight, Search, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ResilientImage } from '../components/ResilientImage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Category, Product, WishlistItem } from '../types';

type ShowcaseTab = 'featured' | 'new' | 'bestsellers';

export function HomePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('featured');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadHome() {
      try {
        setLoading(true);
        const [catRes, prodRes] = await Promise.all([
          api.get<{ categories: Category[] }>('/categories'),
          api.get<{ products: Product[] }>('/products?limit=12'),
        ]);
        if (!active) return;
        setCategories(catRes.data.categories);
        setProducts(prodRes.data.products);
      } catch (err) {
        if (active) showToast(extractApiError(err, 'Failed to load catalog'), 'error');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadHome();
    return () => {
      active = false;
    };
  }, [showToast]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/catalog?search=${encodeURIComponent(q)}` : '/catalog');
  };

  const displayedProducts = products
    .filter((p) => {
      if (activeTab === 'featured') return p.isFeatured;
      if (activeTab === 'new') return p.isNewArrival;
      return p.isBestSeller;
    })
    .slice(0, 6);

  const fallbackProducts = displayedProducts.length > 0 ? displayedProducts : products.slice(0, 6);

  return (
    <div className="space-y-20">
      {/* Section 1: Flagship Storefront Hero */}
      <section className="border-b border-[#27272A] bg-[#09090B]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <p className="text-xs font-medium tracking-[0.18em] text-[#06B6D4] uppercase">
                  Nexora Precision Hardware
                </p>
                <h1
                  className="font-display font-semibold tracking-tight text-[#FAFAFA] leading-[1.06]"
                  style={{
                    fontSize: 'clamp(2.25rem, 4vw, 3.75rem)',
                    textWrap: 'balance',
                  }}
                >
                  Instruments built for the next decade of work and sound.
                </h1>
                <p className="text-base text-[#A1A1AA] max-w-xl leading-relaxed">
                  Anodized titanium acoustics, sapphire-crystal wearables, and Hall-effect computing peripherals engineered for uncompromised daily clarity.
                </p>

                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-lg">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search headphones, keyboards, watches..."
                      aria-label="Search hardware catalog"
                      className="w-full rounded-lg border border-[#27272A] bg-[#111114] pl-10 pr-4 py-3 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA]/70 focus:border-[#8B5CF6] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#8B5CF6] px-6 py-3 text-sm font-medium text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
                  >
                    Search Catalog
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#FAFAFA] hover:text-[#8B5CF6] transition-colors"
                  >
                    <span>Explore Full Collection</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <span className="text-[#27272A]" aria-hidden="true">
                    |
                  </span>
                  <Link
                    to="/products/aether-x1-spatial-headphones"
                    className="text-sm text-[#A1A1AA] hover:text-[#06B6D4] transition-colors"
                  >
                    Inspect Aether X1 Flagship
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-[#27272A] pt-6 text-xs text-[#A1A1AA]">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[#FAFAFA] font-medium">
                    <Truck className="w-3.5 h-3.5 text-[#06B6D4]" />
                    <span>Free Express</span>
                  </div>
                  <p>Orders over $250</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[#FAFAFA] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>2-Year Warranty</span>
                  </div>
                  <p>Direct hardware coverage</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[#FAFAFA] font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
                    <span>Code NEXORA10</span>
                  </div>
                  <p>10% off orders $100+</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <Link
                to="/products/aether-x1-spatial-headphones"
                className="group relative block h-full min-h-[320px] overflow-hidden rounded-xl border border-[#27272A] bg-[#111114]"
              >
                <ResilientImage
                  src="/src/assets/images/hero_nexora_flagship_1795543900002.jpg"
                  alt="NEXORA Aether X1 Spatial Headphones and Titanium DAC"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-6">
                  <p className="text-xs text-[#06B6D4] mb-1">Flagship Edition · Planar Magnetic</p>
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-[#FAFAFA]">
                      Aether X1 Spatial Reference
                    </h2>
                    <span className="font-mono text-sm font-semibold text-[#FAFAFA] tabular-nums">
                      $449.00
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Curated Collections */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#FAFAFA]">
              Core Disciplines
            </h2>
            <p className="text-sm text-[#A1A1AA] mt-1">
              Three hardware families crafted with unified materials and firmware.
            </p>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8B5CF6] hover:text-[#A78BFA] transition-colors whitespace-nowrap"
          >
            <span>View all categories</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-[4/3] rounded-xl border border-[#27272A] bg-[#18181B] animate-pulse"
                />
              ))
            : categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/catalog?category=${cat.slug}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[#27272A] bg-[#18181B]"
                >
                  <ResilientImage
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-6 flex flex-col justify-end">
                    <h3 className="text-lg font-semibold text-[#FAFAFA] group-hover:text-[#06B6D4] transition-colors">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">{cat.description}</p>
                    )}
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {/* Section 3: Featured, New Arrivals & Best Sellers */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-5">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#FAFAFA]">
              Curated Hardware
            </h2>
            <p className="text-sm text-[#A1A1AA] mt-1">
              Live inventory synchronized directly from our distribution vault.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 rounded-lg border border-[#27272A] bg-[#111114] p-1 self-start sm:self-auto">
            {(
              [
                { id: 'featured', label: 'Featured' },
                { id: 'new', label: 'New Arrivals' },
                { id: 'bestsellers', label: 'Best Sellers' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-80 rounded-xl border border-[#27272A] bg-[#18181B] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fallbackProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlistIds.has(product.id)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Direct Member Release & Coupon Offer */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-medium tracking-[0.16em] text-[#06B6D4] uppercase">
              Direct Dispatch Benefit
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#FAFAFA]">
              Apply code <span className="font-mono text-[#8B5CF6]">NEXORA10</span> at checkout for 10% off.
            </h2>
            <p className="text-sm text-[#A1A1AA]">
              Valid on all hardware orders over $100, or use <span className="font-mono text-[#FAFAFA]">WELCOME25</span> for $25 off orders above $200. Cash on Delivery and hosted online checkout supported.
            </p>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-6 py-3 text-sm font-medium text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Shop the Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
