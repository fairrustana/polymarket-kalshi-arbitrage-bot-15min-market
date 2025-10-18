import { BNBVolumeBot, VolumeBotConfig, DEFAULT_CONFIG, PatternType } from './volume-bot';
import { FourMemeTrader } from './trader';
import * as dotenv from 'dotenv';

dotenv.config();

// Custom volume bot configuration
const VOLUME_BOT_CONFIG: VolumeBotConfig = {
  // Trading Parameters - Adjust these based on your needs
  minTradeAmount: 0.0001,        // Minimum 0.0001 BNB per trade
  maxTradeAmount: 0.001,         // Maximum 0.001 BNB per trade  
  totalVolumeTarget: 0.01,       // Generate 0.01 BNB total volume
  maxPositionSize: 0.005,        // Maximum position size 0.005 BNB
  
  // Pattern Configuration - Customize trading patterns
  patterns: [
    // Aggressive buying pattern
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
    // Sell pressure followed by buy
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
    // Volatile trading pattern
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
    // Buy-sell-buy pattern
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
    // Mixed random pattern
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
    // High volume spike pattern
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
    // Stealth low-volume pattern
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
  ],
  
  // Pattern weights - Higher numbers = more likely to be selected
  patternWeights: [0.15, 0.20, 0.15, 0.20, 0.15, 0.10, 0.05],
  
  // Timing Configuration
  minIntervalMs: 10000,  // 10 seconds minimum between patterns
  maxIntervalMs: 30000,  // 30 seconds maximum between patterns
  burstMode: false,       // Set to true for rapid-fire trading
  
  // Risk Management
  stopLossPercent: 5,        // Stop if position drops 5%
  takeProfitPercent: 10,     // Take profit at 10% gain
  maxDrawdownPercent: 15,    // Stop if total drawdown exceeds 15%
  
  // Safety Limits
  maxConsecutiveLosses: 5,   // Stop after 5 consecutive failed trades
  emergencyStopLoss: 0.01   // Emergency stop if position exceeds 0.01 BNB
};

// Main execution function
async function main() {
  try {
    console.log('🚀 Starting BNB Volume Bot...');
    console.log('='.repeat(50));
    
    // Get token address from environment or use default
    const tokenAddress = process.env.TOKEN_ADDRESS || '0x...'; // Replace with actual token address
    
    if (tokenAddress === '0x...') {
      console.error('❌ Please set TOKEN_ADDRESS in your .env file');
      console.log('Example: TOKEN_ADDRESS=0x1234567890abcdef1234567890abcdef12345678');
      process.exit(1);
    }
    
    console.log(`🎯 Target Token: ${tokenAddress}`);
    console.log(`💰 Volume Target: ${VOLUME_BOT_CONFIG.totalVolumeTarget} BNB`);
    console.log(`📊 Trade Range: ${VOLUME_BOT_CONFIG.minTradeAmount} - ${VOLUME_BOT_CONFIG.maxTradeAmount} BNB`);
    console.log(`🎭 Patterns: ${VOLUME_BOT_CONFIG.patterns.length} configured`);
    console.log('='.repeat(50));
    
    // Initialize volume bot
    const volumeBot = new BNBVolumeBot(VOLUME_BOT_CONFIG);
    
    // Start volume generation
    await volumeBot.generateVolume(tokenAddress);
    
    console.log('\n🎉 Volume bot execution completed successfully!');
    
  } catch (error) {
    console.error('❌ Volume bot execution failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the bot
if (require.main === module) {
  main().catch(console.error);
}

export { main, VOLUME_BOT_CONFIG };
