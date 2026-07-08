'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CATEGORY_META } from '@/lib/categories';

export interface Category {
  name: string;
  label: string;
  hourly_rate: number | string;
  color: string;
  description: string | null;
  features: string[];
}

interface CategoryContextType {
  categories: Category[];
  categoryMeta: Record<
    string,
    { label: string; short: string; color: string; defaultRate: number; description: string; features: string[] }
  >;
  loading: boolean;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({
  children,
  initialCategories,
}: {
  children: React.ReactNode;
  initialCategories?: Category[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const [loading, setLoading] = useState(!initialCategories);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialCategories) {
      fetchCategories();
    }
  }, [initialCategories]);

  const refreshCategories = async () => {
    setLoading(true);
    await fetchCategories();
  };

  // Build dynamic categoryMeta. Fallback to static CATEGORY_META for defaults if not in db.
  const categoryMeta: Record<
    string,
    { label: string; short: string; color: string; defaultRate: number; description: string; features: string[] }
  > = { ...CATEGORY_META };

  categories.forEach((c) => {
    categoryMeta[c.name] = {
      label: c.label,
      short: c.name.slice(0, 2),
      color: c.color || '#C0C0C0',
      defaultRate: Number(c.hourly_rate),
      description: c.description || '',
      features: c.features || [],
    };
  });

  return (
    <CategoryContext.Provider value={{ categories, categoryMeta, loading, refreshCategories }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
}
