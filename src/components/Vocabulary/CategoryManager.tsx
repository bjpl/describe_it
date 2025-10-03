/**
 * CategoryManager Component
 * Manages vocabulary categories with full CRUD operations
 */

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
  BookOpen,
  Tag,
  Palette,
} from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  wordCount: number;
  order: number;
  description?: string;
}

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id' | 'order'>) => Promise<void>;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string, reassignToId?: string) => Promise<void>;
  onReorderCategories: (categories: Category[]) => Promise<void>;
  className?: string;
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

const DEFAULT_ICONS = [
  '📚', '🎓', '✏️', '📖', '🏠', '🍔',
  '🎨', '👨‍👩‍👧‍👦', '😊', '☀️', '✈️', '💼'
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  className = '',
}) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reassignCategoryId, setReassignCategoryId] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    color: DEFAULT_COLORS[0],
    icon: DEFAULT_ICONS[0],
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateCategoryName = useCallback((name: string, currentId?: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return 'Category name is required';
    }

    if (trimmedName.length < 2) {
      return 'Category name must be at least 2 characters';
    }

    if (trimmedName.length > 50) {
      return 'Category name must be less than 50 characters';
    }

    // Check for duplicate names
    const isDuplicate = categories.some(
      cat => cat.name.toLowerCase() === trimmedName.toLowerCase() && cat.id !== currentId
    );

    if (isDuplicate) {
      return 'A category with this name already exists';
    }

    return null;
  }, [categories]);

  const handleStartAdd = () => {
    setIsAddingCategory(true);
    setFormData({
      name: '',
      color: DEFAULT_COLORS[0],
      icon: DEFAULT_ICONS[0],
      description: '',
    });
    setErrors({});
  };

  const handleCancelAdd = () => {
    setIsAddingCategory(false);
    setFormData({
      name: '',
      color: DEFAULT_COLORS[0],
      icon: DEFAULT_ICONS[0],
      description: '',
    });
    setErrors({});
  };

  const handleSaveAdd = async () => {
    const nameError = validateCategoryName(formData.name);

    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    try {
      await onAddCategory({
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
        description: formData.description.trim(),
        wordCount: 0,
      });

      setIsAddingCategory(false);
      setFormData({
        name: '',
        color: DEFAULT_COLORS[0],
        icon: DEFAULT_ICONS[0],
        description: '',
      });
      setErrors({});
    } catch (error) {
      setErrors({ submit: 'Failed to add category' });
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon,
      description: category.description || '',
    });
    setErrors({});
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setFormData({
      name: '',
      color: DEFAULT_COLORS[0],
      icon: DEFAULT_ICONS[0],
      description: '',
    });
    setErrors({});
  };

  const handleSaveEdit = async () => {
    if (!editingCategoryId) return;

    const nameError = validateCategoryName(formData.name, editingCategoryId);

    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    try {
      await onUpdateCategory(editingCategoryId, {
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
        description: formData.description.trim(),
      });

      setEditingCategoryId(null);
      setFormData({
        name: '',
        color: DEFAULT_COLORS[0],
        icon: DEFAULT_ICONS[0],
        description: '',
      });
      setErrors({});
    } catch (error) {
      setErrors({ edit: 'Failed to update category' });
    }
  };

  const handleStartDelete = (categoryId: string) => {
    setDeleteConfirmId(categoryId);
    setReassignCategoryId('');
  };

  const handleConfirmDelete = async (categoryId: string, reassignTo?: string) => {
    try {
      await onDeleteCategory(categoryId, reassignTo);
      setDeleteConfirmId(null);
      setReassignCategoryId('');
    } catch (error) {
      setErrors({ delete: 'Failed to delete category' });
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newCategories = [...categories];
    [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];

    const reordered = newCategories.map((cat, idx) => ({
      ...cat,
      order: idx,
    }));

    await onReorderCategories(reordered);
  };

  const handleMoveDown = async (index: number) => {
    if (index === categories.length - 1) return;

    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];

    const reordered = newCategories.map((cat, idx) => ({
      ...cat,
      order: idx,
    }));

    await onReorderCategories(reordered);
  };

  const handleBulkDelete = async (categoryIds: string[]) => {
    const confirmMessage = `Delete ${categoryIds.length} categories? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      for (const id of categoryIds) {
        await onDeleteCategory(id);
      }
    } catch (error) {
      setErrors({ bulkDelete: 'Failed to delete some categories' });
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Category Manager</h2>
          <span className="text-sm text-gray-500">({categories.length} categories)</span>
        </div>

        <button
          onClick={handleStartAdd}
          disabled={isAddingCategory}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="add-category-button"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Add Category Form */}
      {isAddingCategory && (
        <div className="mb-6 p-4 border-2 border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <h3 className="text-lg font-medium mb-4">Add New Category</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setErrors({ ...errors, name: '' });
                }}
                placeholder="Enter category name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                data-testid="category-name-input"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                data-testid="category-description-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    data-testid={`color-option-${color}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Icon</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 text-2xl border-2 rounded-md transition-all ${
                      formData.icon === icon ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    data-testid={`icon-option-${icon}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {errors.submit && (
              <p className="text-sm text-red-500">{errors.submit}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveAdd}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                data-testid="save-category-button"
              >
                <Save className="w-4 h-4" />
                Save Category
              </button>
              <button
                onClick={handleCancelAdd}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                data-testid="cancel-add-button"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className="space-y-2">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No categories yet. Add your first category to get started!</p>
          </div>
        ) : (
          categories.map((category, index) => (
            <div
              key={category.id}
              className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              data-testid={`category-item-${category.id}`}
            >
              {/* Drag Handle */}
              <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />

              {/* Icon */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: `${category.color}20` }}
              >
                {category.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                {editingCategoryId === category.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        setErrors({ ...errors, name: '' });
                      }}
                      className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      data-testid={`edit-name-input-${category.id}`}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                    {errors.edit && (
                      <p className="text-sm text-red-500">{errors.edit}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        data-testid={`save-edit-button-${category.id}`}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        data-testid={`cancel-edit-button-${category.id}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-medium">{category.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{category.wordCount} words</span>
                      {category.description && (
                        <span className="text-xs">{category.description}</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid={`move-up-button-${category.id}`}
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === categories.length - 1}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid={`move-down-button-${category.id}`}
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleStartEdit(category)}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  data-testid={`edit-button-${category.id}`}
                  title="Edit category"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleStartDelete(category.id)}
                  className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                  data-testid={`delete-button-${category.id}`}
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          data-testid="delete-confirmation-modal"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Category</h3>

            {categories.find(c => c.id === deleteConfirmId)?.wordCount! > 0 ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  This category contains {categories.find(c => c.id === deleteConfirmId)?.wordCount} words.
                  Please reassign them to another category before deleting.
                </p>

                <select
                  value={reassignCategoryId}
                  onChange={(e) => setReassignCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 mb-4"
                  data-testid="reassign-category-select"
                >
                  <option value="">Select a category...</option>
                  {categories
                    .filter(c => c.id !== deleteConfirmId)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmDelete(deleteConfirmId, reassignCategoryId)}
                    disabled={!reassignCategoryId}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="confirm-delete-button"
                  >
                    Delete & Reassign
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirmId(null);
                      setReassignCategoryId('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    data-testid="cancel-delete-button"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete this category? This action cannot be undone.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmDelete(deleteConfirmId)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    data-testid="confirm-delete-button"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    data-testid="cancel-delete-button"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {errors.delete && (
              <p className="text-sm text-red-500 mt-2">{errors.delete}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
