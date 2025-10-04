# API Key Integration - Class & Component Diagrams

## Core Component Class Diagram

```mermaid
classDiagram
    class APIKeyProvider {
        <<singleton>>
        -strategies: KeyStrategy[]
        -observers: Observer[]
        -cache: Map~string, CachedKey~
        +getKey(service: APIService, context?: KeyContext): Promise~APIKey~
        +setKey(service: APIService, key: string, options?: KeyOptions): Promise~boolean~
        +removeKey(service: APIService): Promise~boolean~
        +validateKey(service: APIService, key: string): Promise~ValidationResult~
        +subscribe(callback: KeyChangeCallback): UnsubscribeFunction
        +getKeyStatus(service: APIService): KeyStatus
        +markKeyInvalid(service: APIService): Promise~void~
        -resolveKey(service: APIService): Promise~APIKey~
        -notifyObservers(service: APIService, key: APIKey): void
    }

    class KeyStrategy {
        <<interface>>
        +priority: number
        +name: string
        +getKey(service: APIService): Promise~APIKey~
        +isAvailable(): boolean
        +supports(service: APIService): boolean
    }

    class UserSettingsStrategy {
        -settingsManager: SettingsManager
        -secureStorage: SecureStorage
        +priority: 1
        +name: "user-settings"
        +getKey(service: APIService): Promise~APIKey~
        +setKey(service: APIService, key: string): Promise~boolean~
        +removeKey(service: APIService): Promise~boolean~
        +isAvailable(): boolean
        +supports(service: APIService): boolean
    }

    class EnvironmentStrategy {
        -envConfig: EnvironmentConfig
        +priority: 2
        +name: "environment"
        +getKey(service: APIService): Promise~APIKey~
        +isAvailable(): boolean
        +supports(service: APIService): boolean
        -getEnvKeyName(service: APIService): string
    }

    class DemoModeStrategy {
        +priority: 3
        +name: "demo-mode"
        +getKey(service: APIService): Promise~APIKey~
        +isAvailable(): boolean
        +supports(service: APIService): boolean
    }

    class APIKeyManager {
        -provider: APIKeyProvider
        -validator: KeyValidator
        -storage: SecureStorage
        -auditLogger: AuditLogger
        +storeKey(service: APIService, key: string): Promise~boolean~
        +retrieveKey(service: APIService): Promise~APIKey~
        +removeKey(service: APIService): Promise~boolean~
        +rotateKeys(): Promise~RotationResult~
        +clearAllKeys(): Promise~void~
        -encryptKey(key: string): Promise~string~
        -decryptKey(encryptedKey: string): Promise~string~
    }

    class KeyValidator {
        <<interface>>
        +validateFormat(service: APIService, key: string): ValidationResult
        +validatePermissions(service: APIService, key: string): Promise~ValidationResult~
        +sanitizeKey(key: string): string
    }

    class UnsplashKeyValidator {
        +validateFormat(service: APIService, key: string): ValidationResult
        +validatePermissions(service: APIService, key: string): Promise~ValidationResult~
        +sanitizeKey(key: string): string
        -containsSuspiciousPatterns(key: string): boolean
        -testKeyWithAPI(key: string): Promise~boolean~
    }

    class OpenAIKeyValidator {
        +validateFormat(service: APIService, key: string): ValidationResult
        +validatePermissions(service: APIService, key: string): Promise~ValidationResult~
        +sanitizeKey(key: string): string
        -validateKeyFormat(key: string): boolean
        -testKeyWithAPI(key: string): Promise~boolean~
    }

    class SecureStorage {
        <<interface>>
        +store(key: string, value: string): Promise~void~
        +retrieve(key: string): Promise~string~
        +remove(key: string): Promise~void~
        +clear(): Promise~void~
    }

    class ClientSecureStorage {
        -encryptionKey: string
        -storagePrefix: string
        +store(key: string, value: string): Promise~void~
        +retrieve(key: string): Promise~string~
        +remove(key: string): Promise~void~
        +clear(): Promise~void~
        -encrypt(value: string): Promise~string~
        -decrypt(encryptedValue: string): Promise~string~
        -generateStorageKey(key: string): string
    }

    APIKeyProvider --> KeyStrategy
    APIKeyProvider --> APIKeyManager
    UserSettingsStrategy --|> KeyStrategy
    EnvironmentStrategy --|> KeyStrategy
    DemoModeStrategy --|> KeyStrategy
    APIKeyManager --> KeyValidator
    APIKeyManager --> SecureStorage
    UnsplashKeyValidator --|> KeyValidator
    OpenAIKeyValidator --|> KeyValidator
    ClientSecureStorage --|> SecureStorage
    UserSettingsStrategy --> SecureStorage
```

## Service Integration Class Diagram

```mermaid
classDiagram
    class ServiceFactory {
        -apiKeyProvider: APIKeyProvider
        -services: Map~string, any~
        -observers: Map~string, Observer[]~
        +createService~T~(type: ServiceType): Promise~T~
        +getService~T~(type: ServiceType): Promise~T~
        +updateServiceKey(service: ServiceType, key: APIKey): Promise~void~
        +registerKeyChangeListener(service: ServiceType, callback: Function): void
        -instantiateService(type: ServiceType, key: APIKey): any
        -setupKeyChangeListeners(): void
    }

    class BaseAPIService {
        <<abstract>>
        #apiKeyProvider: APIKeyProvider
        #currentKey: APIKey
        #isInitialized: boolean
        +constructor(apiKeyProvider: APIKeyProvider)
        +isAvailable(): boolean
        +getCurrentKey(): APIKey
        +healthCheck(): Promise~boolean~
        #abstract updateApiKey(newKey: APIKey): Promise~void~
        #abstract createClient(key: APIKey): any
        #setupKeyChangeListener(): void
        #handleKeyChange(newKey: APIKey): Promise~void~
        #isKeyError(error: Error): boolean
        #generateDemoResponse(request: any): any
    }

    class UnsplashService {
        -client: AxiosInstance
        -rateLimitInfo: RateLimitInfo
        -duplicateUrls: Set~string~
        +searchImages(params: UnsplashSearchParams): Promise~SearchResult~
        +getImage(id: string): Promise~ProcessedImage~
        +downloadImage(id: string): Promise~string~
        +getPopularImages(page: number, perPage: number): Promise~PopularImagesResult~
        +getRateLimitInfo(): RateLimitInfo
        +clearDuplicateCache(): void
        #updateApiKey(newKey: APIKey): Promise~void~
        #createClient(key: APIKey): AxiosInstance
        -setupInterceptors(): void
        -generateDemoImages(params: UnsplashSearchParams): SearchResult
        -processImages(images: UnsplashImage[]): ProcessedImage[]
    }

    class OpenAIService {
        -client: OpenAI
        -retryConfig: RetryConfig
        +generateDescription(request: DescriptionRequest): Promise~GeneratedDescription~
        +generateQA(description: string, language: string, count: number): Promise~QAGeneration[]~
        +extractPhrases(description: string, language: string): Promise~PhraseCategories~
        +translateText(request: TranslationRequest): Promise~string~
        +generateMultipleDescriptions(imageUrl: string, styles: DescriptionStyle[]): Promise~GeneratedDescription[]~
        #updateApiKey(newKey: APIKey): Promise~void~
        #createClient(key: APIKey): OpenAI
        -generateDemoDescription(style: DescriptionStyle, imageUrl: string): GeneratedDescription
        -generateDemoQA(description: string, language: string): QAGeneration[]
        -getStylePrompt(style: DescriptionStyle, language: string): string
    }

    class ServiceObserver {
        -serviceType: ServiceType
        -callbacks: Function[]
        +constructor(serviceType: ServiceType)
        +subscribe(callback: Function): UnsubscribeFunction
        +notify(event: ServiceEvent): void
        +unsubscribeAll(): void
    }

    ServiceFactory --> APIKeyProvider
    ServiceFactory --> BaseAPIService
    UnsplashService --|> BaseAPIService
    OpenAIService --|> BaseAPIService
    BaseAPIService --> APIKeyProvider
    ServiceFactory --> ServiceObserver
```

## Settings & State Management Class Diagram

```mermaid
classDiagram
    class EnhancedSettingsManager {
        -apiKeyProvider: APIKeyProvider
        -settings: APIKeySettings
        -listeners: Function[]
        +updateAPIKey(service: APIService, key: string): Promise~boolean~
        +removeAPIKey(service: APIService): Promise~boolean~
        +validateAPIKeys(): Promise~Record~string, boolean~~
        +getAPIKeyStatus(service: APIService): Promise~KeyStatus~
        +exportSettings(includeAPIKeys: boolean): string
        +importSettings(data: string): Promise~boolean~
        +rotateAPIKeys(): Promise~RotationResult~
        -handleKeyValidation(service: APIService, result: ValidationResult): void
        -updateKeyStatus(service: APIService, status: KeyStatus): void
    }

    class APIKeySettingsComponent {
        -settingsManager: EnhancedSettingsManager
        -state: APIKeyFormState
        +handleKeySubmit(service: APIService, key: string): Promise~void~
        +handleKeyRemove(service: APIService): Promise~void~
        +handleKeyValidation(service: APIService): Promise~void~
        +handleKeyTest(service: APIService): Promise~void~
        -validateKeyFormat(service: APIService, key: string): ValidationResult
        -showSuccessMessage(message: string): void
        -showErrorMessage(message: string): void
        -updateKeyStatus(service: APIService, status: KeyStatus): void
    }

    class useAPIKeys {
        <<hook>>
        +keys: Record~APIService, APIKeyInfo~
        +loading: boolean
        +errors: Record~APIService, string~
        +setKey: (service: APIService, key: string) => Promise~boolean~
        +removeKey: (service: APIService) => Promise~boolean~
        +validateKey: (service: APIService, key: string) => Promise~ValidationResult~
        +testKey: (service: APIService) => Promise~boolean~
        +refreshKeyStatus: (service: APIService) => Promise~void~
    }

    class APIKeyStatusIndicator {
        +service: APIService
        +status: KeyStatus
        +onRefresh: Function
        +onEdit: Function
        +onRemove: Function
        +render(): JSX.Element
        -getStatusIcon(status: KeyStatus): string
        -getStatusColor(status: KeyStatus): string
        -getStatusMessage(status: KeyStatus): string
    }

    class APIKeyForm {
        +service: APIService
        +initialKey: string
        +onSubmit: Function
        +onCancel: Function
        +loading: boolean
        +render(): JSX.Element
        -handleSubmit(event: FormEvent): Promise~void~
        -validateInput(key: string): ValidationResult
        -toggleKeyVisibility(): void
    }

    EnhancedSettingsManager --> APIKeyProvider
    APIKeySettingsComponent --> EnhancedSettingsManager
    APIKeySettingsComponent --> useAPIKeys
    useAPIKeys --> APIKeyProvider
    APIKeySettingsComponent --> APIKeyStatusIndicator
    APIKeySettingsComponent --> APIKeyForm
```

## Security & Validation Class Diagram

```mermaid
classDiagram
    class SecurityManager {
        -encryptionService: EncryptionService
        -auditLogger: AuditLogger
        -keySanitizer: KeySanitizer
        +validateKeySecurely(service: APIService, key: string): Promise~ValidationResult~
        +encryptKey(key: string): Promise~string~
        +decryptKey(encryptedKey: string): Promise~string~
        +sanitizeKey(key: string): string
        +auditKeyOperation(operation: KeyOperation, service: APIService): void
        +detectSuspiciousActivity(context: SecurityContext): SecurityAssessment
        -generateEncryptionKey(): Promise~CryptoKey~
        -rotateEncryptionKey(): Promise~void~
    }

    class EncryptionService {
        -algorithm: string
        -keyDerivation: KeyDerivationConfig
        +encrypt(data: string, key?: CryptoKey): Promise~EncryptedData~
        +decrypt(encryptedData: EncryptedData, key?: CryptoKey): Promise~string~
        +generateKey(): Promise~CryptoKey~
        +deriveKey(password: string, salt: Uint8Array): Promise~CryptoKey~
        -generateIV(): Uint8Array
        -generateSalt(): Uint8Array
    }

    class AuditLogger {
        -logLevel: LogLevel
        -storage: AuditStorage
        -sensitiveDataFilter: SensitiveDataFilter
        +logKeyOperation(operation: KeyOperation, context: AuditContext): void
        +logSecurityEvent(event: SecurityEvent, severity: Severity): void
        +logValidationAttempt(service: APIService, success: boolean): void
        +generateAuditReport(timeRange: TimeRange): Promise~AuditReport~
        +exportAuditLogs(filters: AuditFilters): Promise~string~
        -filterSensitiveData(data: any): any
        -shouldLog(level: LogLevel): boolean
    }

    class KeySanitizer {
        -allowedCharsets: Map~APIService, RegExp~
        -suspiciousPatterns: RegExp[]
        -placeholderPatterns: string[]
        +sanitize(key: string): string
        +detectSuspiciousPatterns(key: string): SuspiciousPattern[]
        +isPlaceholder(key: string): boolean
        +validateCharset(service: APIService, key: string): boolean
        -removeInvalidCharacters(key: string): string
        -normalizeWhitespace(key: string): string
    }

    class ValidationResult {
        +valid: boolean
        +error?: string
        +warnings: string[]
        +metadata: ValidationMetadata
        +suggestions: string[]
        +severity: ValidationSeverity
        +constructor(valid: boolean, error?: string, metadata?: ValidationMetadata)
        +addWarning(warning: string): void
        +addSuggestion(suggestion: string): void
        +isSuccess(): boolean
        +hasWarnings(): boolean
    }

    class KeyStatus {
        +service: APIService
        +status: 'valid' | 'invalid' | 'pending' | 'demo' | 'expired'
        +lastValidated?: Date
        +lastUsed?: Date
        +permissions: string[]
        +rateLimits?: RateLimitInfo
        +errors: string[]
        +warnings: string[]
        +metadata: StatusMetadata
        +isUsable(): boolean
        +needsValidation(): boolean
        +getDisplayStatus(): string
    }

    SecurityManager --> EncryptionService
    SecurityManager --> AuditLogger
    SecurityManager --> KeySanitizer
    SecurityManager --> ValidationResult
    KeyValidator --> SecurityManager
    KeyValidator --> ValidationResult
    APIKeyProvider --> KeyStatus
```

## Error Handling & Recovery Class Diagram

```mermaid
classDiagram
    class ErrorRecoveryManager {
        -strategies: RecoveryStrategy[]
        -failureTracker: FailureTracker
        -circuitBreaker: CircuitBreaker
        +handleError(error: APIError, context: ErrorContext): Promise~RecoveryResult~
        +registerRecoveryStrategy(strategy: RecoveryStrategy): void
        +getErrorStats(): ErrorStatistics
        +resetErrorState(service: APIService): void
        -selectRecoveryStrategy(error: APIError): RecoveryStrategy
        -shouldAttemptRecovery(error: APIError): boolean
    }

    class RecoveryStrategy {
        <<interface>>
        +canHandle(error: APIError): boolean
        +recover(error: APIError, context: ErrorContext): Promise~RecoveryResult~
        +priority: number
        +name: string
    }

    class KeyRotationRecovery {
        -apiKeyProvider: APIKeyProvider
        -backupKeyManager: BackupKeyManager
        +canHandle(error: APIError): boolean
        +recover(error: APIError, context: ErrorContext): Promise~RecoveryResult~
        +priority: 1
        +name: "key-rotation"
        -hasBackupKey(service: APIService): Promise~boolean~
        -rotateToBackupKey(service: APIService): Promise~boolean~
    }

    class DemoModeRecovery {
        -demoResponseGenerator: DemoResponseGenerator
        +canHandle(error: APIError): boolean
        +recover(error: APIError, context: ErrorContext): Promise~RecoveryResult~
        +priority: 3
        +name: "demo-mode"
        -generateDemoResponse(request: any, service: APIService): any
    }

    class RetryRecovery {
        -retryConfig: RetryConfig
        -backoffCalculator: BackoffCalculator
        +canHandle(error: APIError): boolean
        +recover(error: APIError, context: ErrorContext): Promise~RecoveryResult~
        +priority: 2
        +name: "retry"
        -shouldRetry(error: APIError, attempt: number): boolean
        -calculateDelay(attempt: number): number
    }

    class CircuitBreaker {
        -state: CircuitState
        -failureThreshold: number
        -recoveryTimeout: number
        -failureCount: number
        +execute~T~(operation: () => Promise~T~): Promise~T~
        +isOpen(): boolean
        +reset(): void
        +getState(): CircuitState
        -onSuccess(): void
        -onFailure(): void
        -shouldAllowRequest(): boolean
    }

    class FailureTracker {
        -failures: Map~string, FailureRecord[]~
        -maxHistorySize: number
        +recordFailure(service: APIService, error: APIError): void
        +getFailureRate(service: APIService, timeWindow: number): number
        +getRecentFailures(service: APIService, count: number): FailureRecord[]
        +clearFailures(service: APIService): void
        -cleanOldFailures(service: APIService): void
    }

    ErrorRecoveryManager --> RecoveryStrategy
    ErrorRecoveryManager --> FailureTracker
    ErrorRecoveryManager --> CircuitBreaker
    KeyRotationRecovery --|> RecoveryStrategy
    DemoModeRecovery --|> RecoveryStrategy
    RetryRecovery --|> RecoveryStrategy
    BaseAPIService --> ErrorRecoveryManager
```

## Data Flow Component Diagram

```mermaid
graph TD
    subgraph "UI Layer"
        UI[Settings UI Components]
        FORM[API Key Forms]
        STATUS[Status Indicators]
    end

    subgraph "Hook Layer"
        HOOKS[useAPIKeys Hook]
        SETTINGS_HOOK[useSettings Hook]
    end

    subgraph "Management Layer"
        SETTINGS_MGR[Enhanced Settings Manager]
        PROVIDER[API Key Provider]
        FACTORY[Service Factory]
    end

    subgraph "Strategy Layer"
        USER_STRAT[User Settings Strategy]
        ENV_STRAT[Environment Strategy] 
        DEMO_STRAT[Demo Mode Strategy]
    end

    subgraph "Security Layer"
        VALIDATOR[Key Validator]
        STORAGE[Secure Storage]
        ENCRYPTION[Encryption Service]
        AUDIT[Audit Logger]
    end

    subgraph "Service Layer"
        UNSPLASH[Unsplash Service]
        OPENAI[OpenAI Service]
        ERROR_MGR[Error Recovery Manager]
    end

    subgraph "External"
        UNSPLASH_API[Unsplash API]
        OPENAI_API[OpenAI API]
        LOCAL_STORAGE[Local Storage]
    end

    UI --> HOOKS
    FORM --> HOOKS
    STATUS --> HOOKS
    
    HOOKS --> SETTINGS_MGR
    SETTINGS_HOOK --> SETTINGS_MGR
    
    SETTINGS_MGR --> PROVIDER
    PROVIDER --> FACTORY
    
    PROVIDER --> USER_STRAT
    PROVIDER --> ENV_STRAT
    PROVIDER --> DEMO_STRAT
    
    USER_STRAT --> STORAGE
    USER_STRAT --> VALIDATOR
    VALIDATOR --> ENCRYPTION
    VALIDATOR --> AUDIT
    STORAGE --> ENCRYPTION
    STORAGE --> LOCAL_STORAGE
    
    FACTORY --> UNSPLASH
    FACTORY --> OPENAI
    UNSPLASH --> ERROR_MGR
    OPENAI --> ERROR_MGR
    
    UNSPLASH --> UNSPLASH_API
    OPENAI --> OPENAI_API
    
    PROVIDER -.->|Key Change Events| FACTORY
    FACTORY -.->|Service Updates| UNSPLASH
    FACTORY -.->|Service Updates| OPENAI
    ERROR_MGR -.->|Recovery Actions| PROVIDER
```

This comprehensive class diagram architecture provides:

1. **Clear Separation of Concerns**: Each layer has distinct responsibilities
2. **Strategy Pattern Implementation**: Flexible key source management
3. **Observer Pattern**: Real-time key change propagation
4. **Factory Pattern**: Service instantiation and management
5. **Secure Storage**: Client-side encryption and secure handling
6. **Robust Error Handling**: Multiple recovery strategies
7. **Comprehensive Validation**: Format and permission validation
8. **Audit & Monitoring**: Complete operation tracking
9. **State Management**: React hooks and enhanced settings integration
10. **Migration Support**: Backward compatibility and gradual rollout

The architecture ensures scalability, maintainability, and security while providing a seamless user experience for API key management.