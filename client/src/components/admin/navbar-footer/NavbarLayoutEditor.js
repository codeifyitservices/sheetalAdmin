'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAllCategories } from '../../../services/categoryService';
import { getSettings, saveNavbarLayout } from '../../../services/settingsService';

const ABOUT_ITEM = {
  id: 'about',
  label: 'Our Story',
  href: '/about-us',
  itemType: 'static',
  hidden: false,
};

const buildDefaultLayout = (categories) => {
  const categoryList = categories?.data || categories?.categories || (Array.isArray(categories) ? categories : []);
  const topLevelCategories = categoryList.filter((category) => !category.parentCategory);

  return [
    ...topLevelCategories.map((category) => ({
      id: category._id,
      label: category.name,
      href: `/${category.slug}`,
      itemType: 'category',
      categoryId: category._id,
      categorySlug: category.slug,
      hidden: false,
    })),
    ABOUT_ITEM,
  ];
};

const mergeSavedLayout = (categories, savedLayout) => {
  const defaultLayout = buildDefaultLayout(categories);
  if (!Array.isArray(savedLayout) || savedLayout.length === 0) {
    return defaultLayout;
  }

  const defaultMap = new Map(
    defaultLayout.map((item) => [item.categoryId || item.id, item]),
  );
  const usedKeys = new Set();

  const merged = savedLayout
    .map((item) => {
      const key = item.categoryId || item.id;
      const source = defaultMap.get(key);
      if (!source) return null;
      usedKeys.add(key);
      return {
        ...source,
        hidden: Boolean(item.hidden),
      };
    })
    .filter(Boolean);

  const appended = defaultLayout.filter(
    (item) => !usedKeys.has(item.categoryId || item.id),
  );

  return [...merged, ...appended];
};

const SortableNavItem = ({ item, onToggleHidden }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center">
      <div
        className={`group flex items-center gap-3 px-[19px] py-[10px] text-[15px] tracking-[1px] border-r border-[#f2bf42]/20 bg-transparent ${
          item.hidden ? 'text-[#f5eaac]/35' : 'text-[#f5eaac]'
        }`}
      >
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-[#f5eaac]/70 hover:text-[#f5eaac]"
          aria-label={`Drag ${item.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} />
        </button>
        <span className="whitespace-nowrap">{item.label}</span>
        <button
          type="button"
          onClick={() => onToggleHidden(item.id)}
          className="rounded-full p-1 text-[#f5eaac]/70 hover:text-[#f5eaac] hover:bg-white/10 transition-colors"
          title={item.hidden ? 'Show category' : 'Hide category'}
        >
          {item.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </li>
  );
};

const NavbarLayoutEditor = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const initData = async () => {
      try {
        const [settingsRes, categoriesRes] = await Promise.all([
          getSettings(),
          fetchAllCategories(),
        ]);

        setItems(mergeSavedLayout(categoriesRes, settingsRes?.data?.navbarLayout));
      } catch (error) {
        console.error('Failed to load navbar layout', error);
        toast.error('Failed to load navbar layout');
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const visibleCount = useMemo(
    () => items.filter((item) => !item.hidden).length,
    [items],
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((currentItems) => {
      const oldIndex = currentItems.findIndex((item) => item.id === active.id);
      const newIndex = currentItems.findIndex((item) => item.id === over.id);
      return arrayMove(currentItems, oldIndex, newIndex);
    });
  };

  const handleToggleHidden = (id) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, hidden: !item.hidden } : item,
      ),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveNavbarLayout(items);
      toast.success('Navbar layout saved');
    } catch (error) {
      console.error('Failed to save navbar layout', error);
      toast.error('Failed to save navbar layout');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-gray-600">
        <Loader2 size={18} className="animate-spin" />
        <span>Loading navbar editor...</span>
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      <div className="mb-6 flex items-center justify-between gap-4 px-4">
        <div>
          <h2 className="text-xl font-semibold text-black">Navbar Layout Editor</h2>
          <p className="mt-1 text-sm text-gray-500">
            Reorder top-level navbar items and hide or show any category. The saved layout is used by the live storefront navbar.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Navbar
        </button>
      </div>

      <div className="mb-4 px-4 text-sm text-gray-600">
        Visible items: <span className="font-medium">{visibleCount}</span> / {items.length}
      </div>

      <div className="overflow-x-auto rounded-xl bg-[#082722]/95 py-[22px] shadow-lg">
        <div className="min-w-max px-4">
          <div className="flex items-center justify-end">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={horizontalListSortingStrategy}
              >
                <ul className="m-0 inline-flex list-none items-center gap-0 p-0">
                  {items.map((item) => (
                    <SortableNavItem
                      key={item.id}
                      item={item}
                      onToggleHidden={handleToggleHidden}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavbarLayoutEditor;
