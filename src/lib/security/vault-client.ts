import vault from 'node-vault';
import { createAuditLogger } from './audit-logger';

export interface VaultConfig {
  endpoint: string;
  token?: string;
  roleId?: string;
  secretId?: string;
  namespace?: string;
  timeout?: number;
}

export interface SecretData {
  [key: string]: string | number | boolean;
}

export interface VaultSecret {
  data: SecretData;
  metadata?: {
    created_time: string;
    version: number;
    destroyed?: boolean;
  };
}

export class VaultClient {
  private client: any;
  private logger: ReturnType<typeof createAuditLogger>;
  private isAuthenticated: boolean = false;

  constructor(private config: VaultConfig) {
    this.logger = createAuditLogger('vault-client');
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      this.client = vault({
        apiVersion: 'v1',
        endpoint: this.config.endpoint,
        token: this.config.token,
        namespace: this.config.namespace,
      });

      this.logger.info('Vault client initialized', {
        endpoint: this.config.endpoint,
        namespace: this.config.namespace,
      });
    } catch (error) {
      this.logger.error('Failed to initialize Vault client', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error('Vault client initialization failed');
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      if (this.config.token) {
        // Token-based authentication
        const result = await this.client.tokenLookupSelf();
        this.isAuthenticated = !!result;
        this.logger.info('Token authentication successful');
      } else if (this.config.roleId && this.config.secretId) {
        // AppRole authentication
        const result = await this.client.approleLogin({
          role_id: this.config.roleId,
          secret_id: this.config.secretId,
        });

        if (result?.auth?.client_token) {
          this.client.token = result.auth.client_token;
          this.isAuthenticated = true;
          this.logger.info('AppRole authentication successful');
        }
      } else {
        throw new Error('No authentication method provided');
      }

      return this.isAuthenticated;
    } catch (error) {
      this.logger.error('Vault authentication failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      this.isAuthenticated = false;
      return false;
    }
  }

  async readSecret(path: string): Promise<VaultSecret | null> {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      const result = await this.client.read(path);

      this.logger.info('Secret read successfully', {
        path: this.sanitizePath(path),
        version: result?.data?.metadata?.version,
      });

      return result?.data || null;
    } catch (error) {
      this.logger.error('Failed to read secret', { path: this.sanitizePath(path), error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  async writeSecret(path: string, data: SecretData): Promise<boolean> {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      await this.client.write(path, { data });

      this.logger.info('Secret written successfully', {
        path: this.sanitizePath(path),
        keys: Object.keys(data),
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to write secret', { path: this.sanitizePath(path), error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  async deleteSecret(path: string): Promise<boolean> {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      await this.client.delete(path);

      this.logger.info('Secret deleted successfully', {
        path: this.sanitizePath(path),
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to delete secret', { path: this.sanitizePath(path), error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  async listSecrets(path: string): Promise<string[]> {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      const result = await this.client.list(path);
      return result?.data?.keys || [];
    } catch (error) {
      this.logger.error('Failed to list secrets', { path: this.sanitizePath(path), error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  async createToken(policies: string[], ttl?: string): Promise<string | null> {
    try {
      if (!this.isAuthenticated) {
        await this.authenticate();
      }

      const result = await this.client.tokenCreate({
        policies,
        ttl,
        renewable: true,
      });

      this.logger.info('Token created successfully', {
        policies,
        ttl,
      });

      return result?.auth?.client_token || null;
    } catch (error) {
      this.logger.error('Failed to create token', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  async renewToken(token?: string): Promise<boolean> {
    try {
      const result = await this.client.tokenRenew({ token });

      this.logger.info('Token renewed successfully', {
        renewable: result?.renewable,
        lease_duration: result?.lease_duration,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to renew token', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  async revokeToken(token?: string): Promise<boolean> {
    try {
      await this.client.tokenRevoke({ token });

      this.logger.info('Token revoked successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to revoke token', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.health();
      return result?.initialized && !result?.sealed;
    } catch (error) {
      this.logger.error('Vault health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  private sanitizePath(path: string): string {
    // Remove sensitive information from paths for logging
    return path.replace(/\/([^\/]+)$/, '/***');
  }

  async close(): Promise<void> {
    try {
      if (this.isAuthenticated && this.client.token) {
        await this.revokeToken();
      }
      this.isAuthenticated = false;
      this.logger.info('Vault client connection closed');
    } catch (error) {
      this.logger.error('Error closing Vault client', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

export function createVaultClient(config: VaultConfig): VaultClient {
  return new VaultClient(config);
}