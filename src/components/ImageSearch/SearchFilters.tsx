"use client";

import React from 'react';
import { motion } from 'framer-motion';
import * as RadioGroup from '@radix-ui/react-radio-group';

interface SearchFiltersProps {
  filters: {
    orientation: 'all' | 'landscape' | 'portrait' | 'squarish';
    category: 'all' | 'nature' | 'people' | 'technology' | 'architecture';
    color: 'all' | 'black_and_white' | 'black' | 'white' | 'yellow' | 'orange' | 'red' | 'purple' | 'magenta' | 'green' | 'teal' | 'blue';
  };
  onFiltersChange: (filters: any) => void;
}

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const orientationOptions = [
    { value: 'all', label: 'All Orientations' },
    { value: 'landscape', label: 'Landscape' },
    { value: 'portrait', label: 'Portrait' },
    { value: 'squarish', label: 'Square' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'nature', label: 'Nature' },
    { value: 'people', label: 'People' },
    { value: 'technology', label: 'Technology' },
    { value: 'architecture', label: 'Architecture' }
  ];

  const colorOptions = [
    { value: 'all', label: 'All Colors', color: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)' },
    { value: 'black_and_white', label: 'B&W', color: 'linear-gradient(45deg, #000000, #ffffff)' },
    { value: 'black', label: 'Black', color: '#000000' },
    { value: 'white', label: 'White', color: '#ffffff' },
    { value: 'yellow', label: 'Yellow', color: '#ffff00' },
    { value: 'orange', label: 'Orange', color: '#ffa500' },
    { value: 'red', label: 'Red', color: '#ff0000' },
    { value: 'purple', label: 'Purple', color: '#800080' },
    { value: 'magenta', label: 'Magenta', color: '#ff00ff' },
    { value: 'green', label: 'Green', color: '#008000' },
    { value: 'teal', label: 'Teal', color: '#008080' },
    { value: 'blue', label: 'Blue', color: '#0000ff' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gray-50 rounded-xl p-6 space-y-6"
    >
      {/* Orientation Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Orientation</h3>
        <RadioGroup.Root
          value={filters.orientation}
          onValueChange={(value) => handleFilterChange('orientation', value)}
          className="flex flex-wrap gap-2"
        >
          {orientationOptions.map((option) => (
            <div key={option.value} className="flex items-center">
              <RadioGroup.Item
                value={option.value}
                id={`orientation-${option.value}`}
                className="sr-only"
              />
              <label
                htmlFor={`orientation-${option.value}`}
                className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                  filters.orientation === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup.Root>
      </div>

      {/* Category Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Category</h3>
        <RadioGroup.Root
          value={filters.category}
          onValueChange={(value) => handleFilterChange('category', value)}
          className="flex flex-wrap gap-2"
        >
          {categoryOptions.map((option) => (
            <div key={option.value} className="flex items-center">
              <RadioGroup.Item
                value={option.value}
                id={`category-${option.value}`}
                className="sr-only"
              />
              <label
                htmlFor={`category-${option.value}`}
                className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                  filters.category === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup.Root>
      </div>

      {/* Color Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Color</h3>
        <RadioGroup.Root
          value={filters.color}
          onValueChange={(value) => handleFilterChange('color', value)}
          className="flex flex-wrap gap-2"
        >
          {colorOptions.map((option) => (
            <div key={option.value} className="flex items-center">
              <RadioGroup.Item
                value={option.value}
                id={`color-${option.value}`}
                className="sr-only"
              />
              <label
                htmlFor={`color-${option.value}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                  filters.color === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ 
                    background: option.color,
                    border: option.value === 'white' ? '1px solid #ccc' : 'none'
                  }}
                />
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup.Root>
      </div>

      {/* Clear Filters */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <motion.button
          onClick={() => onFiltersChange({
            orientation: 'all',
            category: 'all',
            color: 'all'
          })}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Clear All Filters
        </motion.button>
      </div>
    </motion.div>
  );
}