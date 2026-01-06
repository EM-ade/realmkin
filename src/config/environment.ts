/**
 * Frontend Environment Configuration
 * Provides environment-specific settings for development and production
 */

class EnvironmentConfig {
  private nodeEnv: string;
  private isDevelopment: boolean;
  private isProduction: boolean;
  private isTest: boolean;

  constructor() {
    this.nodeEnv = process.env.NODE_ENV || 'development';
    this.isDevelopment = this.nodeEnv === 'development';
    this.isProduction = this.nodeEnv === 'production';
    this.isTest = this.nodeEnv === 'test';
  }

  // API Configuration
  get apiConfig() {
    return {
      // Base URL for API calls
      gatekeeperUrl: this.getGatekeeperUrl(),
      
      // API endpoints
      endpoints: {
        staking: '/api/staking',
        boosters: '/api/boosters',
        goal: '/api/goal',
        leaderboard: '/api/leaderboard',
        balance: '/api/balance',
        transfer: '/api/transfer',
        withdraw: '/api/withdraw',
        verification: '/api/verification',
        discord: '/api/discord',
        admin: '/api/admin',
      },
      
      // Request configuration
      timeout: this.isDevelopment ? 30000 : 15000, // 30s dev, 15s prod
      retryAttempts: this.isDevelopment ? 3 : 2,
      retryDelay: this.isDevelopment ? 1000 : 2000,
    };
  }

  // Network Configuration
  get networkConfig() {
    const isDevnet = this.isDevelopment || process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet';
    
    return {
      isDevnet,
      cluster: isDevnet ? 'devnet' : 'mainnet',
      tokenMint: isDevnet
        ? process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_DEVNET || 'CARXmxarjsCwvzpmjVB2x4xkAo8fMgsAVUBPREoUGyZm'
        : process.env.NEXT_PUBLIC_MKIN_TOKEN_MINT_MAINNET || 'BKDGf6DnDHK87GsZpdWXyBqiNdcNb6KnoFcYbWPUhJLA',
      // Prioritize Helius RPC endpoints, fallback to public endpoints
      rpcUrl: isDevnet
        ? process.env.NEXT_PUBLIC_HELIUS_DEVNET_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com'
        : process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
      heliusUrl: isDevnet
        ? process.env.NEXT_PUBLIC_HELIUS_DEVNET_RPC_URL
        : process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC_URL,
    };
  }

  // Get gatekeeper URL based on environment
  private getGatekeeperUrl(): string {
    // Priority order: NEXT_PUBLIC_GATEKEEPER_BASE > NEXT_PUBLIC_GATEKEEPER_URL > environment default
    const envUrl = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || process.env.NEXT_PUBLIC_GATEKEEPER_URL;
    
    if (envUrl) {
      return envUrl;
    }
    
    // Environment-specific defaults
    if (this.isDevelopment) {
      return 'http://localhost:3001';
    }
    
    if (this.isProduction) {
      return 'https://gatekeeper-bmvu.onrender.com';
    }
    
    // Fallback for testing
    return 'http://localhost:3001';
  }

  // Feature Flags
  get featureFlags() {
    return {
      enableDebugMode: this.isDevelopment,
      enableBoosterSystem: true,
      enableGoalSystem: true,
      enableStakingSystem: true,
      enableWithdrawalSystem: true,
      enableTransferSystem: true,
      enableVerificationSystem: true,
      enableDiscordIntegration: true,
      
      // Development-specific features
      enableMockData: this.isDevelopment,
      enableDetailedLogging: this.isDevelopment,
      enableHotReload: this.isDevelopment,
      
      // Production-specific features
      enableAnalytics: !this.isDevelopment,
      enableErrorReporting: !this.isDevelopment,
      enablePerformanceMonitoring: !this.isDevelopment,
    };
  }

  // UI Configuration
  get uiConfig() {
    return {
      theme: {
        primaryColor: '#da9c2f',
        secondaryColor: '#8b7355',
        successColor: '#22c55e',
        errorColor: '#ef4444',
        warningColor: '#f59e0b',
      },
      
      animations: {
        enableAnimations: !this.isDevelopment, // Disable in dev for performance
        animationDuration: this.isDevelopment ? 0 : 300,
        transitionDuration: this.isDevelopment ? 0 : 200,
      },
      
      layout: {
        showDebugInfo: this.isDevelopment,
        showEnvironmentBadge: this.isDevelopment,
        compactMode: false,
        sidebarCollapsed: false,
      },
    };
  }

  // Caching Configuration
  get cacheConfig() {
    return {
      // Cache TTL in milliseconds
      stakingDataCache: this.isDevelopment ? 30000 : 60000, // 30s dev, 1min prod
      boosterDataCache: this.isDevelopment ? 60000 : 300000, // 1min dev, 5min prod
      nftDataCache: this.isDevelopment ? 300000 : 1800000, // 5min dev, 30min prod
      priceDataCache: this.isDevelopment ? 30000 : 60000, // 30s dev, 1min prod
      
      // Cache size limits
      maxCacheSize: this.isDevelopment ? 50 : 200,
      
      // Cache strategies
      enableBackgroundRefresh: !this.isDevelopment,
      enableStaleWhileRevalidate: true,
    };
  }

  // WebSocket Configuration
  get websocketConfig() {
    return {
      enabled: !this.isDevelopment,
      url: this.getGatekeeperUrl().replace('http', 'ws'),
      reconnectInterval: this.isDevelopment ? 5000 : 3000,
      maxReconnectAttempts: this.isDevelopment ? 10 : 5,
      heartbeatInterval: 30000,
    };
  }

  // Logging Configuration
  get loggingConfig() {
    return {
      level: this.isDevelopment ? 'debug' : 'info',
      enableConsoleLogging: true,
      enableRemoteLogging: !this.isDevelopment,
      enableErrorTracking: !this.isDevelopment,
      
      // Log formatting
      includeTimestamp: true,
      includeStackTrace: this.isDevelopment,
      includeUserInfo: !this.isDevelopment,
      
      // Log filtering
      filterSensitiveData: !this.isDevelopment,
      maxLogSize: 1000, // characters
    };
  }

  // Performance Configuration
  get performanceConfig() {
    return {
      enablePerformanceMonitoring: !this.isDevelopment,
      enableReactProfiler: this.isDevelopment,
      enableNetworkMonitoring: this.isDevelopment,
      
      // Metrics collection
      collectMetrics: !this.isDevelopment,
      metricsInterval: this.isDevelopment ? 10000 : 60000, // 10s dev, 1min prod
      
      // Bundle optimization
      enableCodeSplitting: !this.isDevelopment,
      enableTreeShaking: !this.isDevelopment,
      enableMinification: !this.isDevelopment,
    };
  }

  // Helper method to get current environment info
  getEnvironmentInfo() {
    return {
      nodeEnv: this.nodeEnv,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      isTest: this.isTest,
      gatekeeperUrl: this.getGatekeeperUrl(),
      timestamp: new Date().toISOString(),
    };
  }

  // Helper method to validate required environment variables
  validateRequiredEnvVars() {
    const required = this.isProduction ? [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ] : this.isDevelopment ? [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    ] : [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      const envType = this.isProduction ? 'Production' : this.isDevelopment ? 'Development' : 'Test';
      console.warn(`⚠️ ${envType} environment - missing recommended environment variables: ${missing.join(', ')}`);
      console.log('💡 Set these variables in your .env.local file for full functionality');
      
      // Only throw error in production for missing critical vars
      if (this.isProduction) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
    } else {
      const envType = this.isProduction ? 'Production' : this.isDevelopment ? 'Development' : 'Test';
      console.log(`✅ ${envType} environment - all required variables present`);
    }
  }
}

// Create and export singleton instance
const environmentConfig = new EnvironmentConfig();

export default environmentConfig;