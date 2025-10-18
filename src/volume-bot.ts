import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { ERC20_ABI, HELPER3_ABI, PANCAKE_ROUTER_ABI, TOKEN_MANAGER_ABI } from './4meme-utils/abi';
import { RPC_URL, TOKEN_MANAGER_ADDRESS, HELPER3_ADDRESS } from './4meme-utils/config';
import { VolumeBotMonitor, VolumeBotAlerts, DEFAULT_ALERT_THRESHOLDS } from './monitoring';

dotenv.config();

// Volume Bot Configuration Interface
interface VolumeBotConfig {
  // Trading Parameters
  minTradeAmount: number;        // Minimum BNB per trade
  maxTradeAmount: number;        // Maximum BNB per trade
  totalVolumeTarget: number;     // Total BNB volume to generate
  maxPositionSize: number;       // Maximum position size in BNB
  
  // Pattern Configuration
  patterns: TradingPattern[];    // Available trading patterns
  patternWeights: number[];      // Weight for each pattern (probability)
  
  // Timing Configuration
  minIntervalMs: number;         // Minimum time between trades
  maxIntervalMs: number;         // Maximum time between trades
  burstMode: boolean;             // Enable rapid-fire trading
  
  // Risk Management
  stopLossPercent: number;       // Stop loss percentage
  takeProfitPercent: number;     // Take profit percentage
  maxDrawdownPercent: number;    // Maximum drawdown allowed
  
  // Safety
  maxConsecutiveLosses: number;  // Stop after N consecutive losses
  emergencyStopLoss: number;     // Emergency stop loss in BNB
}

// Trading Pattern Types
enum PatternType {
  BUY_BUY_BUY = 'buy-buy-buy',
  SELL_SELL_BUY = 'sell-sell-buy', 
  SELL_BUY_SELL = 'sell-buy-sell',
  BUY_SELL_BUY = 'buy-sell-buy',
  MIXED_RANDOM = 'mixed-random',
  VOLUME_SPIKE = 'volume-spike',
  STEALTH_MODE = 'stealth-mode'
}

interface TradingPattern {
  type: PatternType;
  trades: TradeAction[];
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface TradeAction {
  action: 'buy' | 'sell';
  amountPercent: number;  // Percentage of base amount
  delayMs: number;       // Delay after this trade
}

interface TradeResult {
  success: boolean;
  txHash: string;
  amount: number;
  action: 'buy' | 'sell';
  timestamp: number;
  gasUsed: string;
  error?: string;
}

interface VolumeBotStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolume: number;
  totalGasUsed: string;
  currentPosition: number;
  profitLoss: number;
  startTime: number;
  patternsUsed: Map<PatternType, number>;
}

class BNBVolumeBot {
  private trader: FourMemeTrader;
  private config: VolumeBotConfig;
  private stats: VolumeBotStats;
  private isRunning: boolean;
  private currentPattern?: TradingPattern;
  private emergencyStop: boolean;
  private monitor: VolumeBotMonitor;
  private alerts: VolumeBotAlerts;

  constructor(config: VolumeBotConfig) {
    this.trader = new FourMemeTrader();
    this.config = config;
    this.stats = this.initializeStats();
    this.isRunning = false;
    this.emergencyStop = false;
    this.monitor = new VolumeBotMonitor();
    this.alerts = new VolumeBotAlerts(DEFAULT_ALERT_THRESHOLDS);
    
    console.log('🤖 BNB Volume Bot initialized');
    console.log(`📊 Target Volume: ${config.totalVolumeTarget} BNB`);
    console.log(`🎯 Patterns: ${config.patterns.length} configured`);
    console.log(`🔍 Monitoring: Enabled`);
  }

  private initializeStats(): VolumeBotStats {
    return {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalVolume: 0,
      totalGasUsed: '0',
      currentPosition: 0,
      profitLoss: 0,
      startTime: Date.now(),
      patternsUsed: new Map()
    };
  }

  // Main volume generation method
  async generateVolume(tokenAddress: string): Promise<void> {
    console.log('🚀 Starting BNB Volume Bot...');
    console.log(`🎯 Token: ${tokenAddress}`);
    
    this.isRunning = true;
    this.stats.startTime = Date.now();

    try {
      // Check migration status first
      const migrated = await this.trader.getMigrationStatus(tokenAddress);
      console.log(`📋 Migration Status: ${migrated ? 'Migrated (PancakeSwap)' : 'Not Migrated (Four.meme)'}`);

      // Generate volume until target reached or emergency stop
      while (this.isRunning && !this.emergencyStop && this.stats.totalVolume < this.config.totalVolumeTarget) {
        await this.executeVolumePattern(tokenAddress, migrated);
        await this.randomDelay();
        
        // Check emergency conditions
        if (this.shouldEmergencyStop()) {
          console.log('🚨 Emergency stop triggered!');
          break;
        }
      }

      console.log('✅ Volume generation completed');
      this.printStats();
      
      // Print comprehensive monitoring statistics
      this.monitor.printComprehensiveStats(this.stats);

    } catch (error) {
      console.error('❌ Volume generation failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Execute a single volume pattern
  private async executeVolumePattern(tokenAddress: string, migrated: boolean): Promise<void> {
    const pattern = this.selectRandomPattern();
    this.currentPattern = pattern;
    
    console.log(`🎭 Executing pattern: ${pattern.type} (${pattern.description})`);
    
    const baseAmount = this.calculateBaseAmount();
    let patternVolume = 0;

    for (const trade of pattern.trades) {
      if (!this.isRunning || this.emergencyStop) break;
      
      const tradeAmount = baseAmount * (trade.amountPercent / 100);
      
      try {
        const result = await this.executeTrade(tokenAddress, trade.action, tradeAmount, migrated);
        
        // Log trade with monitoring
        this.monitor.logTrade(result, pattern.type);
        
        if (result.success) {
          patternVolume += tradeAmount;
          this.stats.successfulTrades++;
          this.updatePosition(trade.action, tradeAmount);
        } else {
          this.stats.failedTrades++;
          console.error(`❌ Trade failed: ${result.error}`);
        }
        
        this.stats.totalTrades++;
        this.stats.totalVolume += tradeAmount;
        
        // Update pattern usage stats
        const currentCount = this.stats.patternsUsed.get(pattern.type) || 0;
        this.stats.patternsUsed.set(pattern.type, currentCount + 1);
        
        // Check for alerts
        const newAlerts = this.alerts.checkAlerts(this.monitor.getMetrics(), this.stats);
        if (newAlerts.length > 0) {
          this.alerts.printAlerts(newAlerts);
        }
        
        // Wait before next trade in pattern
        if (trade.delayMs > 0) {
          await this.sleep(trade.delayMs);
        }
        
      } catch (error) {
        console.error(`❌ Pattern execution error:`, error);
        this.stats.failedTrades++;
        break;
      }
    }
    
    console.log(`📊 Pattern completed. Volume: ${patternVolume.toFixed(6)} BNB`);
  }

  // Execute individual trade
  private async executeTrade(
    tokenAddress: string, 
    action: 'buy' | 'sell', 
    amount: number, 
    migrated: boolean
  ): Promise<TradeResult> {
    const startTime = Date.now();
    
    try {
      let txHash = '';
      let gasUsed = '0';
      
      if (migrated) {
        // Use PancakeSwap methods
        if (action === 'buy') {
          const result = await this.trader.buyPancakeToken(tokenAddress, amount);
          txHash = result.txHash;
          gasUsed = result.gasUsed;
        } else {
          const result = await this.trader.sellPancakeToken(tokenAddress, amount);
          txHash = result.txHash;
          gasUsed = result.gasUsed;
        }
      } else {
        // Use Four.meme methods
        if (action === 'buy') {
          const result = await this.trader.buyToken(tokenAddress, amount);
          txHash = result.txHash;
          gasUsed = result.gasUsed;
        } else {
          txHash = await this.trader.sellAmount(tokenAddress, amount);
        }
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${action.toUpperCase()} ${amount.toFixed(6)} BNB - TX: ${txHash} - Gas: ${gasUsed} - ${duration}ms`);
      
      return {
        success: true,
        txHash,
        amount,
        action,
        timestamp: Date.now(),
        gasUsed,
      };
      
    } catch (error) {
      console.error(`❌ ${action.toUpperCase()} failed:`, error);
      return {
        success: false,
        txHash: '',
        amount,
        action,
        timestamp: Date.now(),
        gasUsed: '0',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Select random pattern based on weights
  private selectRandomPattern(): TradingPattern {
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < this.config.patterns.length; i++) {
      cumulativeWeight += this.config.patternWeights[i];
      if (random <= cumulativeWeight) {
        return this.config.patterns[i];
      }
    }
    
    // Fallback to first pattern
    return this.config.patterns[0];
  }

  // Calculate base trade amount with randomization
  private calculateBaseAmount(): number {
    const min = this.config.minTradeAmount;
    const max = this.config.maxTradeAmount;
    const randomAmount = min + Math.random() * (max - min);
    
    // Add some randomness to make it look more natural
    const variance = 0.1; // 10% variance
    const varianceAmount = randomAmount * (Math.random() - 0.5) * variance;
    
    return Math.max(min, randomAmount + varianceAmount);
  }

  // Update current position tracking
  private updatePosition(action: 'buy' | 'sell', amount: number): void {
    if (action === 'buy') {
      this.stats.currentPosition += amount;
    } else {
      this.stats.currentPosition -= amount;
    }
  }

  // Random delay between patterns
  private async randomDelay(): Promise<void> {
    const delay = this.config.minIntervalMs + 
      Math.random() * (this.config.maxIntervalMs - this.config.minIntervalMs);
    
    console.log(`⏳ Waiting ${(delay / 1000).toFixed(1)}s before next pattern...`);
    await this.sleep(delay);
  }

  // Sleep utility
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Emergency stop conditions
  private shouldEmergencyStop(): boolean {
    // Check consecutive losses
    if (this.stats.failedTrades >= this.config.maxConsecutiveLosses) {
      console.log(`🚨 Too many consecutive losses: ${this.stats.failedTrades}`);
      return true;
    }
    
    // Check emergency stop loss
    if (Math.abs(this.stats.currentPosition) >= this.config.emergencyStopLoss) {
      console.log(`🚨 Emergency stop loss reached: ${this.stats.currentPosition}`);
      return true;
    }
    
    // Check drawdown
    const drawdownPercent = (this.stats.profitLoss / this.stats.totalVolume) * 100;
    if (drawdownPercent <= -this.config.maxDrawdownPercent) {
      console.log(`🚨 Maximum drawdown exceeded: ${drawdownPercent.toFixed(2)}%`);
      return true;
    }
    
    return false;
  }

  // Stop the bot
  public stop(): void {
    console.log('🛑 Stopping volume bot...');
    this.isRunning = false;
  }

  // Emergency stop
  public emergencyStop(): void {
    console.log('🚨 EMERGENCY STOP!');
    this.emergencyStop = true;
    this.isRunning = false;
  }

  // Print statistics
  private printStats(): void {
    const duration = (Date.now() - this.stats.startTime) / 1000;
    const successRate = (this.stats.successfulTrades / this.stats.totalTrades) * 100;
    
    console.log('\n📊 === VOLUME BOT STATISTICS ===');
    console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
    console.log(`📈 Total Trades: ${this.stats.totalTrades}`);
    console.log(`✅ Successful: ${this.stats.successfulTrades} (${successRate.toFixed(1)}%)`);
    console.log(`❌ Failed: ${this.stats.failedTrades}`);
    console.log(`💰 Total Volume: ${this.stats.totalVolume.toFixed(6)} BNB`);
    console.log(`⛽ Total Gas Used: ${this.stats.totalGasUsed}`);
    console.log(`📊 Current Position: ${this.stats.currentPosition.toFixed(6)} BNB`);
    console.log(`💸 P&L: ${this.stats.profitLoss.toFixed(6)} BNB`);
    
    console.log('\n🎭 Pattern Usage:');
    for (const [pattern, count] of this.stats.patternsUsed) {
      console.log(`  ${pattern}: ${count} times`);
    }
  }

  // Get current stats
  public getStats(): VolumeBotStats {
    return { ...this.stats };
  }

  // Export monitoring logs
  public exportLogs(): string {
    return this.monitor.exportLogs();
  }

  // Get monitoring metrics
  public getMonitoringMetrics() {
    return this.monitor.getMetrics();
  }

  // Get all alerts
  public getAllAlerts() {
    return this.alerts.getAllAlerts();
  }
}

// Predefined trading patterns
const DEFAULT_PATTERNS: TradingPattern[] = [
  {
    type: PatternType.BUY_BUY_BUY,
    trades: [
      { action: 'buy', amountPercent: 30, delayMs: 2000 },
      { action: 'buy', amountPercent: 50, delayMs: 3000 },
      { action: 'buy', amountPercent: 20, delayMs: 0 }
    ],
    description: 'Aggressive buying pattern',
    riskLevel: 'high'
  },
  {
    type: PatternType.SELL_SELL_BUY,
    trades: [
      { action: 'sell', amountPercent: 25, delayMs: 1500 },
      { action: 'sell', amountPercent: 35, delayMs: 2500 },
      { action: 'buy', amountPercent: 60, delayMs: 0 }
    ],
    description: 'Sell pressure followed by buy',
    riskLevel: 'medium'
  },
  {
    type: PatternType.SELL_BUY_SELL,
    trades: [
      { action: 'sell', amountPercent: 40, delayMs: 2000 },
      { action: 'buy', amountPercent: 80, delayMs: 3000 },
      { action: 'sell', amountPercent: 40, delayMs: 0 }
    ],
    description: 'Volatile trading pattern',
    riskLevel: 'high'
  },
  {
    type: PatternType.BUY_SELL_BUY,
    trades: [
      { action: 'buy', amountPercent: 50, delayMs: 2000 },
      { action: 'sell', amountPercent: 30, delayMs: 2500 },
      { action: 'buy', amountPercent: 40, delayMs: 0 }
    ],
    description: 'Buy-sell-buy pattern',
    riskLevel: 'medium'
  },
  {
    type: PatternType.MIXED_RANDOM,
    trades: [
      { action: 'buy', amountPercent: 35, delayMs: 1000 },
      { action: 'sell', amountPercent: 25, delayMs: 1500 },
      { action: 'buy', amountPercent: 30, delayMs: 2000 },
      { action: 'sell', amountPercent: 20, delayMs: 0 }
    ],
    description: 'Mixed random pattern',
    riskLevel: 'low'
  },
  {
    type: PatternType.VOLUME_SPIKE,
    trades: [
      { action: 'buy', amountPercent: 100, delayMs: 500 },
      { action: 'sell', amountPercent: 80, delayMs: 1000 },
      { action: 'buy', amountPercent: 60, delayMs: 0 }
    ],
    description: 'High volume spike pattern',
    riskLevel: 'high'
  },
  {
    type: PatternType.STEALTH_MODE,
    trades: [
      { action: 'buy', amountPercent: 15, delayMs: 5000 },
      { action: 'sell', amountPercent: 10, delayMs: 8000 },
      { action: 'buy', amountPercent: 12, delayMs: 0 }
    ],
    description: 'Stealth low-volume pattern',
    riskLevel: 'low'
  }
];

// Default configuration
const DEFAULT_CONFIG: VolumeBotConfig = {
  minTradeAmount: 0.0001,
  maxTradeAmount: 0.001,
  totalVolumeTarget: 0.01,
  maxPositionSize: 0.005,
  
  patterns: DEFAULT_PATTERNS,
  patternWeights: [0.15, 0.20, 0.15, 0.20, 0.15, 0.10, 0.05], // Equal distribution
  
  minIntervalMs: 10000,  // 10 seconds
  maxIntervalMs: 30000,  // 30 seconds
  burstMode: false,
  
  stopLossPercent: 5,
  takeProfitPercent: 10,
  maxDrawdownPercent: 15,
  
  maxConsecutiveLosses: 5,
  emergencyStopLoss: 0.01
};

export { 
  BNBVolumeBot, 
  VolumeBotConfig, 
  TradingPattern, 
  PatternType, 
  TradeResult, 
  VolumeBotStats,
  DEFAULT_CONFIG,
  DEFAULT_PATTERNS
};
