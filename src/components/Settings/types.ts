import { AppSettings } from "@/lib/settings/settingsManager";

export interface BaseSettingsProps {
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(
    section: K,
    updates: Partial<AppSettings[K]>
  ) => void;
}

export interface GeneralSettingsProps extends BaseSettingsProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export interface AppearanceSettingsProps extends BaseSettingsProps {}

export interface PrivacySettingsProps extends BaseSettingsProps {
  apiKeyValidation: { unsplash: boolean; openai: boolean } | null;
  validating: boolean;
  onValidateAPIKeys: () => void;
}

export interface ExportSettingsProps extends BaseSettingsProps {
  cacheSize: number;
  onClearCache: () => void;
  onExportSettings: () => void;
  onImportSettings: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onResetSettings: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export interface NotificationSettingsProps extends BaseSettingsProps {}

export type TabType = 
  | "general"
  | "api"
  | "language"
  | "study"
  | "theme"
  | "accessibility"
  | "cache"
  | "backup";

export interface Tab {
  id: TabType;
  label: string;
  icon: string;
}