import { Archive, Edit2, Plus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ResilientImage } from '../components/ResilientImage';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Category, Product } from '../types';
import { formatCurrency, slugify } from '../utils/format';

interface ProductFormState {
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  status: 'active' | 'draft' | 'archived';
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  imageUrlsText: string;
  specsText: string;
  variants: Array<{ name: string; sku: string; priceDelta: string; stock: string }>;
}

const emptyForm = (catId: number): ProductFormState => ({
  categoryId: catId,
  name: '',
  slug: '',
  description: '',
  price: '',
  compareAtPrice: '',
  stock: '10',
  sku: '',
  status: 'active',
  isFeatured: false,
  isNewArrival: true,
  isBestSeller: false,
  imageUrlsText: '',
  specsText: 'Material: Anodized Aluminum\nWarranty: 2 Years',
  variants: [],
});

export function AdminProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm(1));
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get<{ products: Product[] }>('/products?includeAll=true&limit=48'),
        api.get<{ categories: Category[] }>('/categories'),
      ]);
      setProducts(prodRes.data.products);
      setCategories(catRes.data.categories);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load products'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(categories[0]?.id || 1));
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      categoryId: p.categoryId,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: String(p.price),
      compareAtPrice: p.compareAtPrice !== null ? String(p.compareAtPrice) : '',
      stock: String(p.stock),
      sku: p.sku,
      status: p.status,
      isFeatured: p.isFeatured,
      isNewArrival: p.isNewArrival,
      isBestSeller: p.isBestSeller,
      imageUrlsText: p.images.map((i) => i.url).join('\n'),
      specsText: Object.entries(p.specifications || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
      variants: p.variants.map((v) => ({
        name: v.name,
        sku: v.sku,
        priceDelta: String(v.priceDelta),
        stock: String(v.stock),
      })),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const specs: Record<string, string> = {};
      form.specsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((line) => {
          const idx = line.indexOf(':');
          if (idx > 0) {
            specs[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        });

      const images = form.imageUrlsText
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url, idx) => ({ url, altText: form.name, isPrimary: idx === 0 }));

      const payload = {
        categoryId: Number(form.categoryId),
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
        specifications: specs,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        stock: Number(form.stock),
        sku: form.sku.trim(),
        status: form.status,
        isFeatured: form.isFeatured,
        isNewArrival: form.isNewArrival,
        isBestSeller: form.isBestSeller,
        images,
        variants: form.variants.map((v) => ({
          name: v.name.trim(),
          sku: v.sku.trim(),
          priceDelta: Number(v.priceDelta || 0),
          stock: Number(v.stock || 0),
          attributes: { Option: v.name.trim() },
        })),
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        showToast('Product updated', 'success');
      } else {
        await api.post('/products', payload);
        showToast('Product created', 'success');
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(extractApiError(err, 'Failed to save product'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await api.delete(`/products/${id}`);
      showToast('Product archived', 'info');
      await loadData();
    } catch (err) {
      showToast(extractApiError(err, 'Could not archive product'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">Product Management</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Create, edit, assign variants, upload image URLs, and manage catalog availability.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED] whitespace-nowrap self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 rounded-xl bg-[#18181B] animate-pulse" />
      ) : (
        <div className="rounded-xl border border-[#27272A] bg-[#111114] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#27272A] bg-[#18181B] text-[#A1A1AA]">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#18181B]/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md border border-[#27272A] bg-[#09090B]">
                        <ResilientImage
                          src={p.images[0]?.url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="font-medium text-[#FAFAFA]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-[#A1A1AA]">{p.sku}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#FAFAFA]">
                    {formatCurrency(p.price)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#FAFAFA]">
                    {p.stock}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.status === 'active'
                          ? 'text-emerald-400'
                          : p.status === 'draft'
                          ? 'text-amber-400'
                          : 'text-[#A1A1AA]'
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {p.status !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => handleArchive(p.id)}
                          className="p-1.5 rounded border border-[#27272A] text-[#A1A1AA] hover:text-rose-400"
                          aria-label={`Archive ${p.name}`}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h2 className="text-base font-semibold text-[#FAFAFA]">
                {editingId ? 'Edit Product' : 'Create Product'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        name: e.target.value,
                        slug: editingId ? f.slug : slugify(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-[#FAFAFA]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Slug</label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 font-mono text-[#FAFAFA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-[#FAFAFA]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 font-mono text-[#FAFAFA]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as ProductFormState['status'],
                      }))
                    }
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-[#FAFAFA]"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 font-mono text-[#FAFAFA]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Compare At Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.compareAtPrice}
                    onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 font-mono text-[#FAFAFA]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 font-mono text-[#FAFAFA]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-[#FAFAFA]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">
                    Image URLs (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={form.imageUrlsText}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrlsText: e.target.value }))}
                    placeholder="/src/assets/images/..."
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">
                    Specifications (Key: Value per line)
                  </label>
                  <textarea
                    rows={3}
                    value={form.specsText}
                    onChange={(e) => setForm((f) => ({ ...f, specsText: e.target.value }))}
                    className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-5 text-xs text-[#FAFAFA]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                    className="accent-[#8B5CF6]"
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isNewArrival}
                    onChange={(e) => setForm((f) => ({ ...f, isNewArrival: e.target.checked }))}
                    className="accent-[#8B5CF6]"
                  />
                  New Arrival
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isBestSeller}
                    onChange={(e) => setForm((f) => ({ ...f, isBestSeller: e.target.checked }))}
                    className="accent-[#8B5CF6]"
                  />
                  Best Seller
                </label>
              </div>

              {/* Variants Editor */}
              <div className="border-t border-[#27272A] pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#FAFAFA]">Product Variants</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        variants: [
                          ...f.variants,
                          { name: '', sku: `${f.sku || 'NX'}-V${f.variants.length + 1}`, priceDelta: '0', stock: '5' },
                        ],
                      }))
                    }
                    className="text-xs text-[#06B6D4] hover:underline"
                  >
                    + Add Variant
                  </button>
                </div>

                {form.variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Name"
                      value={v.name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          variants: f.variants.map((item, i) =>
                            i === idx ? { ...item, name: e.target.value } : item
                          ),
                        }))
                      }
                      className="col-span-4 rounded border border-[#27272A] bg-[#09090B] px-2 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="SKU"
                      value={v.sku}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          variants: f.variants.map((item, i) =>
                            i === idx ? { ...item, sku: e.target.value } : item
                          ),
                        }))
                      }
                      className="col-span-3 rounded border border-[#27272A] bg-[#09090B] px-2 py-1.5 text-xs font-mono"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Delta"
                      value={v.priceDelta}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          variants: f.variants.map((item, i) =>
                            i === idx ? { ...item, priceDelta: e.target.value } : item
                          ),
                        }))
                      }
                      className="col-span-2 rounded border border-[#27272A] bg-[#09090B] px-2 py-1.5 text-xs font-mono"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Stock"
                      value={v.stock}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          variants: f.variants.map((item, i) =>
                            i === idx ? { ...item, stock: e.target.value } : item
                          ),
                        }))
                      }
                      className="col-span-2 rounded border border-[#27272A] bg-[#09090B] px-2 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          variants: f.variants.filter((_, i) => i !== idx),
                        }))
                      }
                      className="col-span-1 text-xs text-rose-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 border-t border-[#27272A] pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#27272A] px-4 py-2 text-xs text-[#A1A1AA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#8B5CF6] px-5 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
