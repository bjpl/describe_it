'use client';

import { memo, useCallback } from 'react';
import { PrivacySettingsProps } from './types';
import { Globe, Languages } from 'lucide-react';

/**
 * Language Settings Component
 *
 * Previously "Privacy Settings" - API key configuration has been moved to
 * the dedicated "API Keys" tab (ApiKeysSection component) for a cleaner UX.
 */
export const PrivacySettings = memo<PrivacySettingsProps>(function PrivacySettings({
  settings,
  onSettingChange,
}) {
  return (
    <div className='space-y-8'>
      {/* Header Section */}
      <div className='border-b border-gray-200 dark:border-gray-700 pb-4'>
        <div className='flex items-center mb-2'>
          <Globe className='w-6 h-6 mr-2 text-blue-600 dark:text-blue-400' />
          <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>Language Settings</h2>
        </div>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          Configure interface and learning language preferences.
        </p>
      </div>

      {/* Language Settings */}
      <div className='space-y-6'>
        {/* UI Language */}
        <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700'>
          <div className='flex items-start gap-4'>
            <div className='p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
              <Languages className='w-5 h-5 text-blue-500' />
            </div>
            <div className='flex-1'>
              <h4 className='font-medium text-gray-900 dark:text-white mb-1'>Interface Language</h4>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-3'>
                The language used for buttons, menus, and interface elements.
              </p>
              <select
                value={settings.language.ui}
                onChange={e =>
                  onSettingChange('language', {
                    ui: e.target.value as 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt',
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              >
                <option value='en'>English</option>
                <option value='es'>Español</option>
                <option value='fr'>Français</option>
                <option value='de'>Deutsch</option>
                <option value='it'>Italiano</option>
                <option value='pt'>Português</option>
              </select>
            </div>
          </div>
        </div>

        {/* Target Language */}
        <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700'>
          <div className='flex items-start gap-4'>
            <div className='p-2 bg-green-50 dark:bg-green-900/20 rounded-lg'>
              <Globe className='w-5 h-5 text-green-500' />
            </div>
            <div className='flex-1'>
              <h4 className='font-medium text-gray-900 dark:text-white mb-1'>
                Learning Target Language
              </h4>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-3'>
                The language you are learning. Descriptions will be translated to this language.
              </p>
              <select
                value={settings.language.target}
                onChange={e =>
                  onSettingChange('language', {
                    target: e.target.value as
                      | 'spanish'
                      | 'french'
                      | 'german'
                      | 'italian'
                      | 'portuguese'
                      | 'english',
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500'
              >
                <option value='spanish'>Spanish</option>
                <option value='french'>French</option>
                <option value='german'>German</option>
                <option value='italian'>Italian</option>
                <option value='portuguese'>Portuguese</option>
                <option value='english'>English</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
        <div className='flex gap-3'>
          <Languages className='w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
          <div className='text-sm text-blue-800 dark:text-blue-300'>
            <p className='font-medium mb-1'>Tip: Language Learning Mode</p>
            <p className='text-xs'>
              When you select a target language, AI-generated descriptions will include translations
              and vocabulary tips to help you learn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

PrivacySettings.displayName = 'PrivacySettings';
