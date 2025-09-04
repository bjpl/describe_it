'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Heart, GraduationCap, MessageCircle, Smile } from 'lucide-react'
import { DescriptionStyle } from '@/types'

interface StyleSelectorProps {
  selectedStyle: DescriptionStyle
  onStyleSelect: (style: DescriptionStyle) => void
  disabled?: boolean
  className?: string
}

const STYLE_CONFIG: Record<DescriptionStyle, {
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}> = {
  narrativo: {
    label: 'Narrativo',
    description: 'Cuenta una historia rica y detallada',
    icon: BookOpen,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 hover:bg-blue-200'
  },
  poetico: {
    label: 'Poético',
    description: 'Expresivo y lleno de metáforas',
    icon: Heart,
    color: 'text-pink-700',
    bgColor: 'bg-pink-100 hover:bg-pink-200'
  },
  academico: {
    label: 'Académico',
    description: 'Formal y técnicamente preciso',
    icon: GraduationCap,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 hover:bg-purple-200'
  },
  conversacional: {
    label: 'Conversacional',
    description: 'Natural y fácil de entender',
    icon: MessageCircle,
    color: 'text-green-700',
    bgColor: 'bg-green-100 hover:bg-green-200'
  },
  infantil: {
    label: 'Infantil',
    description: 'Simple y divertido para niños',
    icon: Smile,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 hover:bg-orange-200'
  }
}

export function StyleSelector({ 
  selectedStyle, 
  onStyleSelect, 
  disabled = false,
  className = '' 
}: StyleSelectorProps) {
  const styles = Object.entries(STYLE_CONFIG) as [DescriptionStyle, typeof STYLE_CONFIG[DescriptionStyle]][]

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Estilo de Descripción
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {styles.map(([style, config]) => {
          const Icon = config.icon
          const isSelected = selectedStyle === style
          
          return (
            <motion.button
              key={style}
              onClick={() => !disabled && onStyleSelect(style)}
              disabled={disabled}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                ${isSelected 
                  ? `${config.bgColor} border-current ${config.color}` 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
              `}
              whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  className="absolute -top-2 -right-2 w-6 h-6 bg-current rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <div className="w-2 h-2 bg-white rounded-full" />
                </motion.div>
              )}
              
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/50' : config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${isSelected ? config.color : 'text-gray-600'}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-sm ${
                    isSelected ? config.color : 'text-gray-900 dark:text-white'
                  }`}>
                    {config.label}
                  </h4>
                  <p className={`text-xs mt-1 ${
                    isSelected ? config.color + ' opacity-80' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {config.description}
                  </p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
      
      {selectedStyle && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Estilo seleccionado:</strong> {STYLE_CONFIG[selectedStyle].label} - {STYLE_CONFIG[selectedStyle].description}
          </p>
        </motion.div>
      )}
    </div>
  )
}