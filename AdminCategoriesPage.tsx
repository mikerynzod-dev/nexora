import { Edit2, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ResilientImage } from '../components/ResilientImage';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Category } from '../types';
import { slugify } from '../utils/format';

export function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<{ categories: Category[] }>('/categories');
      setCategories(res.data.categories);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load categories'), 'error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
      };
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
        showToast('Category updated', 'success');
      } else {
        await api.post('/categories', payload);
        showToast('Category created', 'success');
      }
      resetForm();
      await load();
    } catch (err) {
      showToast(extractApiError(err, 'Failed to save category'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/categories/${id}`);
      showToast('Category deleted', 'info');
      await load();
    } catch (err) {
      showToast(extractApiError(err, 'Cannot delete category'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">Category Management</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">Organize product disciplines and showcase imagery.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-[#27272A] bg-[#111114] overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#18181B]">
                <ResilientImage
                  src={c.imageUrl}
                  alt={c.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#FAFAFA]">{c.name}</h3>
                  <p className="text-xs font-mono text-[#06B6D4]">{c.slug}</p>
                  {c.description && (
                    <p className="text-xs text-[#A1A1AA] mt-1 line-clamp-2">{c.description}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2 border-t border-[#27272A] pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(c.id);
                      setName(c.name);
                      setSlug(c.slug);
                      setDescription(c.description || '');
                      setImageUrl(c.imageUrl || '');
                    }}
                    className="p-1.5 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded border border-[#27272A] text-[#A1A1AA] hover:text-rose-400"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#8B5CF6]" />
            <span>{editingId ? 'Edit Category' : 'Add Category'}</span>
          </h2>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editingId) setSlug(slugify(e.target.value));
            }}
            placeholder="Category Name"
            className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA]"
          />
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="category-slug"
            className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm font-mono text-[#FAFAFA]"
          />
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA]"
          />
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL"
            className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
          />
          <div className="flex gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[#27272A] px-4 py-2 text-xs text-[#A1A1AA]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[#8B5CF6] py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED]"
            >
              {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
