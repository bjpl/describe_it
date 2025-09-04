'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { LanguageVisibility } from '@/types'

interface LanguageTogglesProps {
  visibility: LanguageVisibility
  onVisibilityChange: (visibility: LanguageVisibility) => void
  className?: string
}

export function LanguageToggles({ 
  visibility, 
  onVisibilityChange, 
  className = '' 
}: LanguageTogglesProps) {
  const toggleEnglish = () => {
    onVisibilityChange({
      ...visibility,
      showEnglish: !visibility.showEnglish
    })
  }

  const toggleSpanish = () => {
    onVisibilityChange({
      ...visibility,
      showSpanish: !visibility.showSpanish
    })
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Mostrar idiomas:
      </span>
      
      {/* English Toggle */}
      <motion.button
        onClick={toggleEnglish}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200
          ${visibility.showEnglish 
            ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400' 
            : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-150'
          }
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {visibility.showEnglish ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">English</span>
      </motion.button>

      {/* Spanish Toggle */}
      <motion.button
        onClick={toggleSpanish}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200
          ${visibility.showSpanish 
            ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400' 
            : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-150'
          }
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {visibility.showSpanish ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">Español</span>
      </motion.button>

      {/* Status indicator */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {!visibility.showEnglish && !visibility.showSpanish && (
          <span className="text-amber-600 dark:text-amber-400">
            ⚠️ Ningún idioma visible
          </span>
        )}
        {visibility.showEnglish && visibility.showSpanish && (
          <span className="text-emerald-600 dark:text-emerald-400">
            ✓ Ambos idiomas
          </span>
        )}
        {(visibility.showEnglish && !visibility.showSpanish) && (
          <span className="text-blue-600 dark:text-blue-400">
            Solo inglés
          </span>
        )}
        {(!visibility.showEnglish && visibility.showSpanish) && (
          <span className="text-green-600 dark:text-green-400">
            Solo español
          </span>
        )}
      </div>
    </div>
  )
}