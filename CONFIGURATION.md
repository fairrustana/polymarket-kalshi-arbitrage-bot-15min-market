# BNB Volume Bot - Configuration Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Environment File**
   Create a `.env` file in the root directory with the following variables:

   ```bash
   # Required Configuration
   PRIVATE_KEY=your_private_key_here
   RPC_URL=https://bsc-dataseed.binance.org
   TOKEN_MANAGER2=your_token_manager_address
   HELPER3_ADDRESS=your_helper3_address
   PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E
   WBNB_ADDRESS=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
   
   # Volume Bot Configuration
   TOKEN_ADDRESS=0x...your_target_token_address
   ```

3. **Run the Volume Bot**
   ```bash
   npm run dev
   ```

## Configuration Parameters

### Required Parameters

| Variable | Description | Example |
|----------|-------------|---------|
| `PRIVATE_KEY` | Your wallet private key | `0x1234...` |
| `RPC_URL` | BSC RPC endpoint | `https://bsc-dataseed.binance.org` |
| `TOKEN_MANAGER2` | Four.meme TokenManager contract | `0x1234...` |
| `HELPER3_ADDRESS` | Four.meme Helper3 contract | `0x1234...` |
| `PANCAKE_ROUTER_ADDRESS` | PancakeSwap Router contract | `0x10ED43C718714eb63d5aA57B78B54704E256024E` |
| `WBNB_ADDRESS` | Wrapped BNB contract | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| `TOKEN_ADDRESS` | Target token for volume generation | `0x1234...` |

### Optional Parameters

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `MIN_TRADE_AMOUNT` | Minimum BNB per trade | `0.0001` | `0.0001 - 0.01` |
| `MAX_TRADE_AMOUNT` | Maximum BNB per trade | `0.001` | `0.001 - 0.1` |
| `TOTAL_VOLUME_TARGET` | Total volume to generate | `0.01` | `0.01 - 1.0` |
| `MAX_POSITION_SIZE` | Maximum position size | `0.005` | `0.005 - 0.5` |
| `MIN_INTERVAL_MS` | Minimum time between patterns | `10000` | `5000 - 60000` |
| `MAX_INTERVAL_MS` | Maximum time between patterns | `30000` | `10000 - 300000` |
| `STOP_LOSS_PERCENT` | Stop loss percentage | `5` | `1 - 20` |
| `TAKE_PROFIT_PERCENT` | Take profit percentage | `10` | `5 - 50` |
| `MAX_DRAWDOWN_PERCENT` | Maximum drawdown allowed | `15` | `5 - 30` |
| `MAX_CONSECUTIVE_LOSSES` | Stop after N consecutive losses | `5` | `3 - 10` |
| `EMERGENCY_STOP_LOSS` | Emergency stop loss in BNB | `0.01` | `0.005 - 0.1` |

## Trading Patterns

The bot includes 7 pre-configured trading patterns:

1. **Buy-Buy-Buy** (High Risk) - Aggressive buying pattern
2. **Sell-Sell-Buy** (Medium Risk) - Sell pressure followed by buy
3. **Sell-Buy-Sell** (High Risk) - Volatile trading pattern
4. **Buy-Sell-Buy** (Medium Risk) - Balanced pattern
5. **Mixed Random** (Low Risk) - Natural-looking trades
6. **Volume Spike** (High Risk) - High-volume rapid trades
7. **Stealth Mode** (Low Risk) - Low-volume slow trades

## Risk Management

### Automatic Stops
- **Stop Loss**: Stops if position drops by configured percentage
- **Take Profit**: Takes profit at configured percentage
- **Drawdown Limit**: Stops if total drawdown exceeds maximum
- **Consecutive Losses**: Stops after N consecutive failed trades
- **Emergency Stop**: Hard stop if position exceeds emergency limit

### Safety Features
- Position size limits
- Gas efficiency monitoring
- Real-time performance tracking
- Comprehensive logging
- Alert system for anomalies

## Usage Examples

### Basic Usage
```bash
# Run with default configuration
npm run dev
```

### Custom Configuration
Modify the `VOLUME_BOT_CONFIG` in `src/volume-bot-main.ts`:

```typescript
const VOLUME_BOT_CONFIG: VolumeBotConfig = {
  minTradeAmount: 0.0005,      // Increase minimum trade size
  maxTradeAmount: 0.002,       // Increase maximum trade size
  totalVolumeTarget: 0.05,     // Generate more volume
  maxPositionSize: 0.01,       // Allow larger positions
  
  // Adjust pattern weights
  patternWeights: [0.10, 0.15, 0.10, 0.20, 0.25, 0.15, 0.05],
  
  // Faster trading
  minIntervalMs: 5000,
  maxIntervalMs: 15000,
  
  // Stricter risk management
  stopLossPercent: 3,
  takeProfitPercent: 8,
  maxDrawdownPercent: 10
};
```

### Monitoring and Logs
The bot provides comprehensive monitoring:

```bash
# View real-time statistics
📊 === VOLUME BOT STATISTICS ===
⏱️  Duration: 45.2s
📈 Total Trades: 12
✅ Successful: 11 (91.7%)
❌ Failed: 1
💰 Total Volume: 0.008500 BNB
⛽ Total Gas Used: 2,450,000
📊 Current Position: 0.002100 BNB
💸 P&L: 0.000150 BNB
```

## Troubleshooting

### Common Issues

1. **"Missing environment variable"**
   - Check your `.env` file
   - Ensure all required variables are set

2. **"Insufficient BNB balance"**
   - Add more BNB to your wallet
   - Reduce trade amounts in configuration

3. **"Transaction failed"**
   - Check network conditions
   - Verify gas prices
   - Ensure sufficient gas limit

4. **"Emergency stop triggered"**
   - Review risk management settings
   - Check position size limits
   - Monitor consecutive losses

### Performance Optimization

1. **Gas Optimization**
   - Use `amountOutMin = 0` for speed
   - Batch approvals
   - Optimize transaction timing

2. **Pattern Optimization**
   - Adjust pattern weights
   - Modify trade amounts
   - Change timing intervals

3. **Risk Management**
   - Set appropriate stop losses
   - Monitor drawdown limits
   - Adjust position sizes

## Security Best Practices

1. **Private Key Security**
   - Never share your private key
   - Use environment variables
   - Consider hardware wallets for large amounts

2. **Testing**
   - Test with small amounts first
   - Monitor bot performance
   - Stop if unexpected behavior occurs

3. **Monitoring**
   - Watch for alerts
   - Review logs regularly
   - Set up external monitoring if needed

## Support

For support and custom bot development:
- Telegram: [@cashblaze129](https://t.me/cashblaze129)
- Issues: Create GitHub issues for bugs
- Features: Request new features via GitHub

## Disclaimer

This software is for educational and research purposes only. Trading cryptocurrencies involves substantial risk of loss and is not suitable for all investors. Use at your own risk.
