/**
 * Password Requirements Component
 *
 * Displays modern password requirements following NIST SP 800-63B guidelines
 * Bilingual support (English | Spanish)
 */

import React from 'react';
import { CheckCircle, Info } from 'lucide-react';

interface PasswordRequirementsProps {
  password?: string;
  showSuccess?: boolean;
  className?: string;
}

export function PasswordRequirements({
  password = '',
  showSuccess = true,
  className = ''
}: PasswordRequirementsProps) {
  const meetsRequirements = password.length >= 8 && password.trim().length >= 8;

  if (showSuccess && meetsRequirements) {
    return (
      <div className={`flex items-center gap-2 text-green-600 dark:text-green-400 ${className}`}>
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm">
          Password meets requirements | Contraseña válida ✓
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
        <Info className="w-4 h-4 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Password Requirements | Requisitos de Contraseña:</p>
        </div>
      </div>

      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400 ml-6">
        <li className={password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
          Minimum 8 characters | Mínimo 8 caracteres
        </li>
        <li className="text-gray-500 dark:text-gray-500 italic">
          💡 Recommended 12+ for better security | Recomendado 12+ para mayor seguridad
        </li>
        <li className="text-gray-500 dark:text-gray-500">
          ✨ You can use spaces and any characters | Puedes usar espacios y cualquier carácter
        </li>
      </ul>

      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
        <p className="font-medium">Why the change? | ¿Por qué el cambio?</p>
        <p className="mt-1">
          Modern security research shows that longer passwords (like &quot;my dog loves tacos&quot;)
          are more secure than short complex ones (like &quot;P@ss1&quot;).
        </p>
        <p className="mt-1 italic">
          La investigación muestra que contraseñas largas son más seguras que contraseñas cortas y complejas.
        </p>
      </div>
    </div>
  );
}

/**
 * Password Strength Meter
 * Simple visual indicator of password strength based on length
 */
interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className = '' }: PasswordStrengthProps) {
  const getStrength = () => {
    const len = password.length;
    if (len === 0) return { level: 0, label: '', color: 'bg-gray-300' };
    if (len < 8) return { level: 1, label: 'Too short | Muy corta', color: 'bg-red-500' };
    if (len < 12) return { level: 2, label: 'Okay | Aceptable', color: 'bg-yellow-500' };
    if (len < 16) return { level: 3, label: 'Good | Buena', color: 'bg-blue-500' };
    return { level: 4, label: 'Excellent | Excelente', color: 'bg-green-500' };
  };

  const strength = getStrength();

  if (!password) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">Strength | Fortaleza:</span>
        <span className="font-medium">{strength.label}</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${strength.color} transition-all duration-300`}
          style={{ width: `${(strength.level / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Usage Example:
 *
 * <PasswordRequirements password={password} />
 * <PasswordStrength password={password} className="mt-2" />
 */
