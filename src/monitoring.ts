import { VolumeBotStats, TradeResult, PatternType } from './volume-bot';

// Enhanced logging and monitoring utilities
export class VolumeBotMonitor {
  private logs: TradeLog[] = [];
  private performanceMetrics: PerformanceMetrics;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.performanceMetrics = this.initializeMetrics();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalVolume: 0,
      totalGasUsed: 0,
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      averageTradeTime: 0,
      patternsUsed: new Map(),
      hourlyVolume: new Map(),
      gasEfficiency: 0,
      successRate: 0,
      profitLoss: 0,
      maxDrawdown: 0,
      currentDrawdown: 0
    };
  }

  // Log individual trade
  logTrade(result: TradeResult, pattern: PatternType): void {
    const tradeLog: TradeLog = {
      timestamp: Date.now(),
      pattern,
      action: result.action,
      amount: result.amount,
      success: result.success,
      txHash: result.txHash,
      gasUsed: result.gasUsed,
      error: result.error
    };

    this.logs.push(tradeLog);
    this.updateMetrics(tradeLog);
    this.printTradeLog(tradeLog);
  }

  // Update performance metrics
  private updateMetrics(log: TradeLog): void {
    this.performanceMetrics.totalTrades++;
    this.performanceMetrics.totalVolume += log.amount;
    
    if (log.success) {
      this.performanceMetrics.successfulTrades++;
    } else {
      this.performanceMetrics.failedTrades++;
    }

    // Update pattern usage
    const currentCount = this.performanceMetrics.patternsUsed.get(log.pattern) || 0;
    this.performanceMetrics.patternsUsed.set(log.pattern, currentCount + 1);

    // Update hourly volume
    const hour = Math.floor((log.timestamp - this.startTime) / (1000 * 60 * 60));
    const currentHourlyVolume = this.performanceMetrics.hourlyVolume.get(hour) || 0;
    this.performanceMetrics.hourlyVolume.set(hour, currentHourlyVolume + log.amount);

    // Calculate success rate
    this.performanceMetrics.successRate = 
      (this.performanceMetrics.successfulTrades / this.performanceMetrics.totalTrades) * 100;

    // Calculate gas efficiency
    const gasUsed = parseInt(log.gasUsed) || 0;
    this.performanceMetrics.totalGasUsed += gasUsed;
    this.performanceMetrics.gasEfficiency = 
      this.performanceMetrics.totalVolume / (this.performanceMetrics.totalGasUsed / 1e18);
  }

  // Print individual trade log
  private printTradeLog(log: TradeLog): void {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const status = log.success ? '✅' : '❌';
    const action = log.action.toUpperCase();
    
    console.log(`${status} [${timestamp}] ${action} ${log.amount.toFixed(6)} BNB | Pattern: ${log.pattern} | Gas: ${log.gasUsed}`);
    
    if (!log.success && log.error) {
      console.log(`   Error: ${log.error}`);
    }
  }

  // Print comprehensive statistics
  printComprehensiveStats(stats: VolumeBotStats): void {
    const duration = (Date.now() - this.startTime) / 1000;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE VOLUME BOT STATISTICS');
    console.log('='.repeat(60));
    
    // Time and Performance
    console.log(`⏱️  Runtime: ${hours}h ${minutes}m ${seconds}s`);
    console.log(`📈 Total Trades: ${stats.totalTrades}`);
    console.log(`✅ Successful: ${stats.successfulTrades} (${this.performanceMetrics.successRate.toFixed(1)}%)`);
    console.log(`❌ Failed: ${stats.failedTrades}`);
    
    // Volume and Gas
    console.log(`💰 Total Volume: ${stats.totalVolume.toFixed(6)} BNB`);
    console.log(`⛽ Total Gas Used: ${stats.totalGasUsed}`);
    console.log(`⚡ Gas Efficiency: ${this.performanceMetrics.gasEfficiency.toFixed(2)} BNB per Gwei`);
    
    // Position and P&L
    console.log(`📊 Current Position: ${stats.currentPosition.toFixed(6)} BNB`);
    console.log(`💸 P&L: ${stats.profitLoss.toFixed(6)} BNB`);
    
    // Pattern Analysis
    console.log('\n🎭 Pattern Usage Analysis:');
    const sortedPatterns = Array.from(this.performanceMetrics.patternsUsed.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedPatterns.forEach(([pattern, count]) => {
      const percentage = (count / stats.totalTrades) * 100;
      console.log(`  ${pattern}: ${count} times (${percentage.toFixed(1)}%)`);
    });

    // Hourly Volume Analysis
    if (this.performanceMetrics.hourlyVolume.size > 0) {
      console.log('\n📅 Hourly Volume Distribution:');
      const sortedHours = Array.from(this.performanceMetrics.hourlyVolume.entries())
        .sort((a, b) => a[0] - b[0]);
      
      sortedHours.forEach(([hour, volume]) => {
        console.log(`  Hour ${hour}: ${volume.toFixed(6)} BNB`);
      });
    }

    // Performance Insights
    console.log('\n🔍 Performance Insights:');
    const avgVolumePerTrade = stats.totalVolume / stats.totalTrades;
    console.log(`  Average Trade Size: ${avgVolumePerTrade.toFixed(6)} BNB`);
    console.log(`  Trades per Hour: ${(stats.totalTrades / (duration / 3600)).toFixed(1)}`);
    console.log(`  Volume per Hour: ${(stats.totalVolume / (duration / 3600)).toFixed(6)} BNB`);

    console.log('='.repeat(60));
  }

  // Export logs to JSON
  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      metrics: this.performanceMetrics,
      exportTime: new Date().toISOString()
    }, null, 2);
  }

  // Get performance metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Clear logs (useful for long-running bots)
  clearLogs(): void {
    this.logs = [];
    this.performanceMetrics = this.initializeMetrics();
    this.startTime = Date.now();
  }
}

// Enhanced alert system
export class VolumeBotAlerts {
  private alerts: Alert[] = [];
  private alertThresholds: AlertThresholds;

  constructor(thresholds: AlertThresholds) {
    this.alertThresholds = thresholds;
  }

  // Check for alert conditions
  checkAlerts(metrics: PerformanceMetrics, stats: VolumeBotStats): Alert[] {
    const newAlerts: Alert[] = [];

    // Success rate alert
    if (metrics.successRate < this.alertThresholds.minSuccessRate) {
      newAlerts.push({
        type: 'success_rate',
        severity: 'warning',
        message: `Success rate dropped to ${metrics.successRate.toFixed(1)}%`,
        timestamp: Date.now()
      });
    }

    // High failure rate alert
    if (stats.failedTrades > this.alertThresholds.maxFailures) {
      newAlerts.push({
        type: 'failure_rate',
        severity: 'critical',
        message: `Too many failed trades: ${stats.failedTrades}`,
        timestamp: Date.now()
      });
    }

    // Gas efficiency alert
    if (metrics.gasEfficiency < this.alertThresholds.minGasEfficiency) {
      newAlerts.push({
        type: 'gas_efficiency',
        severity: 'warning',
        message: `Gas efficiency below threshold: ${metrics.gasEfficiency.toFixed(2)}`,
        timestamp: Date.now()
      });
    }

    // Position size alert
    if (Math.abs(stats.currentPosition) > this.alertThresholds.maxPositionSize) {
      newAlerts.push({
        type: 'position_size',
        severity: 'critical',
        message: `Position size exceeded limit: ${stats.currentPosition.toFixed(6)} BNB`,
        timestamp: Date.now()
      });
    }

    // Add new alerts to the list
    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  // Print alerts
  printAlerts(alerts: Alert[]): void {
    alerts.forEach(alert => {
      const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
      console.log(`${emoji} ALERT [${alert.type.toUpperCase()}]: ${alert.message}`);
    });
  }

  // Get all alerts
  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }
}

// Type definitions
interface TradeLog {
  timestamp: number;
  pattern: PatternType;
  action: 'buy' | 'sell';
  amount: number;
  success: boolean;
  txHash: string;
  gasUsed: string;
  error?: string;
}

interface PerformanceMetrics {
  totalVolume: number;
  totalGasUsed: number;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  averageTradeTime: number;
  patternsUsed: Map<PatternType, number>;
  hourlyVolume: Map<number, number>;
  gasEfficiency: number;
  successRate: number;
  profitLoss: number;
  maxDrawdown: number;
  currentDrawdown: number;
}

interface Alert {
  type: string;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
}

interface AlertThresholds {
  minSuccessRate: number;
  maxFailures: number;
  minGasEfficiency: number;
  maxPositionSize: number;
}

// Default alert thresholds
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  minSuccessRate: 80,        // Alert if success rate drops below 80%
  maxFailures: 5,            // Alert if more than 5 failures
  minGasEfficiency: 0.001,   // Alert if gas efficiency below 0.001 BNB per Gwei
  maxPositionSize: 0.01      // Alert if position exceeds 0.01 BNB
};

export { TradeLog, PerformanceMetrics, Alert, AlertThresholds };
