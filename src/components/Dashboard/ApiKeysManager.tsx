"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { LoadingOverlay, InlineLoader } from "@/components/ui/LoadingStates";
import { 
  useAPIKeys, 
  useActiveAPIKeys, 
  useAPIKeyActions, 
  useAPIKeyUsage,
  useAPIKeyValidation
} from "@/lib/store/apiKeysStore";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Settings,
  Upload,
  Download,
  RefreshCw,
  Shield,
  Clock,
  Activity
} from "lucide-react";

interface ApiKeysManagerProps {
  className?: string;
}

interface AddKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (keyData: any) => Promise<void>;
}

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "For AI-powered descriptions and translations",
    placeholder: "sk-...",
    validation: "Should start with 'sk-'"
  },
  {
    id: "unsplash",
    name: "Unsplash",
    description: "For image search functionality",
    placeholder: "Your Unsplash Access Key",
    validation: "Access key from Unsplash Developer portal"
  },
  {
    id: "custom",
    name: "Custom",
    description: "Custom API endpoint",
    placeholder: "Your custom API key",
    validation: "Any custom API key format"
  }
];

function AddKeyModal({ isOpen, onClose, onAdd }: AddKeyModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    provider: "openai" as "openai" | "unsplash" | "custom",
    key: "",
    expiresAt: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const selectedProvider = PROVIDERS.find(p => p.id === formData.provider);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.key.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        name: formData.name.trim(),
        provider: formData.provider,
        key: formData.key.trim(),
        isActive: true,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined
      });
      
      // Reset form
      setFormData({ name: "", provider: "openai", key: "", expiresAt: "" });
      onClose();
    } catch (error) {
      logger.error("Failed to add API key:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New API Key"
      description="Securely store your API keys for enhanced functionality"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Provider</label>
          <div className="grid gap-2">
            {PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className={cn(
                  "p-3 border rounded-lg cursor-pointer transition-colors",
                  formData.provider === provider.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                )}
                onClick={() => setFormData(prev => ({ ...prev, provider: provider.id as any }))}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{provider.name}</h4>
                    <p className="text-xs text-muted-foreground">{provider.description}</p>
                  </div>
                  <div className={cn(
                    "w-4 h-4 border-2 rounded-full",
                    formData.provider === provider.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Key Name</label>
          <Input
            placeholder="e.g., Main OpenAI Key"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-sm font-medium">API Key</label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder={selectedProvider?.placeholder || "Your API key"}
              value={formData.key}
              onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {selectedProvider && (
            <p className="text-xs text-muted-foreground">
              {selectedProvider.validation}
            </p>
          )}
        </div>

        {/* Expiration Date (Optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Expiration Date (Optional)</label>
          <Input
            type="date"
            value={formData.expiresAt}
            onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.name.trim() || !formData.key.trim()}
            className="flex-1"
          >
            {isSubmitting ? (
              <><InlineLoader size="xs" className="mr-2" /> Adding...</>
            ) : (
              <>Add Key</>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ApiKeyCard({ apiKey, onDelete, onValidate, onSetActive }: {
  apiKey: any;
  onDelete: (id: string) => void;
  onValidate: (id: string) => void;
  onSetActive: (provider: string, id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const usage = useAPIKeyUsage(apiKey.id);
  const activeKeys = useActiveAPIKeys();
  
  const isActive = Object.values(activeKeys).some(key => key?.id === apiKey.id);
  const provider = PROVIDERS.find(p => p.id === apiKey.provider);
  
  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await onValidate(apiKey.id);
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusColor = () => {
    if (!apiKey.isActive) return "destructive";
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return "secondary";
    return "default";
  };

  const getStatusText = () => {
    if (!apiKey.isActive) return "Invalid";
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return "Expired";
    return "Active";
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isActive && "ring-2 ring-primary/20"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{apiKey.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {provider?.name || apiKey.provider}
              </Badge>
              <Badge variant={getStatusColor()} className="text-xs">
                {getStatusText()}
              </Badge>
              {isActive && (
                <Badge className="text-xs bg-emerald-100 text-emerald-800">
                  Current
                </Badge>
              )}
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 transition-opacity duration-200",
            showActions ? "opacity-100" : "opacity-0"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleValidate}
              disabled={isValidating}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", isValidating && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(apiKey.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Usage Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>Usage: {usage.count} requests</span>
            </div>
            {usage.lastUsed && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Last: {new Date(usage.lastUsed).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Rate Limits */}
          {apiKey.rateLimit && (
            <div className="text-xs text-muted-foreground">
              Rate limit: {apiKey.rateLimit.remaining}/{apiKey.rateLimit.requests} remaining
            </div>
          )}

          {/* Expiration Warning */}
          {apiKey.expiresAt && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>
                Expires: {new Date(apiKey.expiresAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {!isActive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSetActive(apiKey.provider, apiKey.id)}
                disabled={!apiKey.isActive}
                className="flex-1"
              >
                Set as Active
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleValidate}
              disabled={isValidating}
              className="flex-1"
            >
              {isValidating ? "Validating..." : "Test Key"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApiKeysManager({ className }: ApiKeysManagerProps) {
  const { keys, isLoading, error } = useAPIKeys();
  const activeKeys = useActiveAPIKeys();
  const { addKey, removeKey, validateKey, setActiveKey, exportKeys, importKeys, clearAllKeys } = useAPIKeyActions();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState("");
  
  // Initialize validation hook
  useAPIKeyValidation();

  const handleAddKey = async (keyData: any) => {
    try {
      const keyId = await addKey(keyData);
      // Automatically set as active if it's the first key for this provider
      const existingActiveKey = activeKeys[keyData.provider as keyof typeof activeKeys];
      if (!existingActiveKey) {
        setActiveKey(keyData.provider, keyId);
      }
    } catch (error) {
      logger.error("Failed to add API key:", error);
      throw error;
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) return;
    try {
      await importKeys(importData.trim());
      setImportData("");
      setShowImportModal(false);
    } catch (error) {
      logger.error("Failed to import keys:", error);
    }
  };

  const handleExport = () => {
    const exportedData = exportKeys();
    const blob = new Blob([exportedData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-keys-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage your API keys for enhanced functionality
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={keys.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Key
          </Button>
        </div>
      </div>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Security Notice
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              API keys are encrypted and stored locally. Never share your keys with others.
              Keys are validated periodically to ensure they remain active.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-xs text-destructive/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Keys Summary */}
      {Object.keys(activeKeys).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Active Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {PROVIDERS.map((provider) => {
                const activeKey = activeKeys[provider.id as keyof typeof activeKeys];
                return (
                  <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">{provider.description}</p>
                    </div>
                    <div className="text-right">
                      {activeKey ? (
                        <div>
                          <Badge className="text-xs mb-1">{activeKey.name}</Badge>
                          <p className="text-xs text-muted-foreground">
                            {activeKey.usageCount} requests
                          </p>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          No key set
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      <LoadingOverlay isLoading={isLoading}>
        {keys.length === 0 ? (
          <div className="text-center p-12 border rounded-lg">
            <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first API key to unlock enhanced features
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Key
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {keys.map((key) => (
              <ApiKeyCard
                key={key.id}
                apiKey={key}
                onDelete={removeKey}
                onValidate={validateKey}
                onSetActive={setActiveKey}
              />
            ))}
          </div>
        )}
      </LoadingOverlay>

      {/* Danger Zone */}
      {keys.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Clear All Keys</p>
                <p className="text-xs text-muted-foreground">
                  This will permanently delete all stored API keys
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure? This action cannot be undone.")) {
                    clearAllKeys();
                  }
                }}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Key Modal */}
      <AddKeyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddKey}
      />

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import API Keys"
        description="Import previously exported API keys"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Exported Data</label>
            <textarea
              className="w-full h-32 p-3 text-sm border rounded-md resize-none"
              placeholder="Paste your exported API keys data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importData.trim()}
              className="flex-1"
            >
              Import Keys
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ApiKeysManager;
