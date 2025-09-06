# 🎈 Balloon Pump Relayer Service

A gasless transaction relayer service for the BNB Balloon Pump Game, built for Railway deployment.

## 🚀 Features

- **Gasless Transactions**: Users don't pay gas fees for pumping balloons
- **Queue Management**: Handles high-volume transaction requests
- **Rate Limiting**: Prevents abuse with per-user rate limits
- **Real-time Monitoring**: Health checks and queue status
- **Railway Optimized**: Built specifically for Railway deployment
- **Auto-scaling**: Handles traffic spikes automatically
- **Retry Logic**: Automatic retry for failed transactions

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Relayer       │    │   Supabase DB   │
│   (Next.js)     │◄──►│   Service       │◄──►│   (Queue/Cache) │
│                 │    │   Railway       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Smart Contract │
                    │  (BNB Chain)    │
                    └─────────────────┘
```

## 📋 Prerequisites

- Node.js 18+
- Railway account
- Supabase project
- BNB Chain testnet/mainnet access
- Contract deployed on BNB Chain

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp env.example .env
```

Configure your `.env` file:
```env
# Railway Environment Variables
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# RPC Configuration
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
RPC_URL_FALLBACK=https://data-seed-prebsc-2-s1.binance.org:8545/

# Relayer Private Key (CRITICAL: Keep this secure!)
RELAYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# Contract Configuration
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=97

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Relayer Settings
MAX_TX_PER_MINUTE_PER_USER=10
MAX_PENDING_TX=100
PRIORITY_FEE=5000000000

# Queue Settings
QUEUE_PROCESS_INTERVAL_MS=1000
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY_MS=5000
```

### 2. Railway Deployment

#### Option A: Connect Repository (Recommended)

1. **Connect to GitHub**:
   ```bash
   # Push your code to GitHub first
   git add .
   git commit -m "Add relayer service"
   git push origin main
   ```

2. **Railway Setup**:
   ```bash
   # Install Railway CLI
   curl -fsSL https://railway.app/install.sh | sh

   # Login and connect
   railway login
   railway link

   # Deploy
   railway up
   ```

#### Option B: Manual Deploy

1. **Create Railway Project**:
   - Go to [Railway.app](https://railway.app)
   - Create new project
   - Choose "Deploy from GitHub repo"

2. **Set Environment Variables**:
   - Go to project settings
   - Add all variables from `.env` file
   - **CRITICAL**: Set `RELAYER_PRIVATE_KEY` securely

3. **Deploy**:
   - Railway will automatically detect Node.js
   - Build and deploy the service

### 3. Verify Deployment

Check your deployment:
```bash
# Get the Railway URL
railway domain

# Test health endpoint
curl https://your-app.railway.app/health
```

## 📡 API Endpoints

### Health & Monitoring

#### `GET /health`
Basic health check
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "services": {
    "relayer": {
      "status": "healthy",
      "blockNumber": 12345678,
      "relayerBalance": "1.5",
      "network": {
        "name": "bnb",
        "chainId": "97"
      }
    },
    "queue": {
      "queued": 5,
      "processing": 2,
      "isActive": true,
      "lastProcessed": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

#### `GET /health/detailed`
Detailed health information

### Pump Transactions

#### `POST /api/pump`
Submit a pump request to the queue

**Request Body:**
```json
{
  "userAddress": "0x1234567890123456789012345678901234567890",
  "sessionId": "session_123456789",
  "token": "0x0000000000000000000000000000000000000000",
  "amount": "1000000000000000000",
  "roundId": "1"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "pump_123456789_abc123",
  "message": "Pump request queued successfully"
}
```

#### `GET /api/pump/:requestId`
Get pump request status

#### `GET /api/pump/user/:userAddress`
Get user's pump request history

### Queue Management

#### `GET /api/queue/status`
Get current queue status

#### `GET /api/queue/stats`
Get detailed queue statistics

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `production` |
| `PORT` | Service port | No | `3001` |
| `LOG_LEVEL` | Logging level | No | `info` |
| `RPC_URL_PRIMARY` | Primary BNB RPC URL | Yes | - |
| `RPC_URL_FALLBACK` | Fallback BNB RPC URL | No | - |
| `RELAYER_PRIVATE_KEY` | Relayer wallet private key | Yes | - |
| `CONTRACT_ADDRESS` | BalloonPump contract address | Yes | - |
| `CHAIN_ID` | BNB Chain ID (56=mainnet, 97=testnet) | Yes | - |
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_SERVICE_KEY` | Supabase service key | Yes | - |
| `MAX_TX_PER_MINUTE_PER_USER` | Rate limit per user | No | `10` |
| `MAX_PENDING_TX` | Max pending transactions | No | `100` |
| `PRIORITY_FEE` | Gas priority fee (wei) | No | `5000000000` |

### Security Considerations

1. **Private Key Security**:
   - Store `RELAYER_PRIVATE_KEY` as Railway environment variable
   - Never commit private keys to version control
   - Rotate keys regularly

2. **Rate Limiting**:
   - Default: 10 transactions per minute per user
   - Adjustable via `MAX_TX_PER_MINUTE_PER_USER`

3. **CORS Configuration**:
   - Configure allowed origins via `CORS_ORIGINS`
   - Include your frontend URL

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Build the service
npm run build

# Run in development mode
npm run dev

# Run in production mode
npm start
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint
```

### Logging

The service uses Winston for logging with the following levels:
- `error`: Errors and failures
- `warn`: Warnings and retries
- `info`: General information
- `debug`: Detailed debugging information

## 📊 Monitoring & Analytics

### Railway Dashboard

Monitor your service through Railway:
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, and network usage
- **Deployments**: Deployment history and rollback
- **Environment**: Environment variable management

### Health Checks

Railway automatically monitors:
- Service availability
- Response times
- Error rates
- Resource usage

### Custom Metrics

Track via logs:
- Transaction success rates
- Queue processing times
- User activity patterns
- Gas usage statistics

## 🚨 Troubleshooting

### Common Issues

1. **Connection Failed**:
   ```
   Error: No contract found at address
   ```
   - Verify `CONTRACT_ADDRESS` is correct
   - Ensure contract is deployed on the correct network

2. **Private Key Issues**:
   ```
   Error: RELAYER_PRIVATE_KEY is required
   ```
   - Set the environment variable in Railway
   - Ensure it's a valid 64-character hex string

3. **Rate Limiting**:
   ```
   Error: Rate limit exceeded
   ```
   - User hit the per-minute limit
   - Increase `MAX_TX_PER_MINUTE_PER_USER` if needed

4. **Queue Backlog**:
   - Check queue status: `GET /api/queue/status`
   - Monitor Railway metrics for resource usage
   - Consider scaling up if consistently high

### Debug Mode

Enable detailed logging:
```env
LOG_LEVEL=debug
```

## 🔄 Updates & Deployment

### Rolling Updates

Railway supports zero-downtime deployments:
```bash
# Push changes to trigger automatic deployment
git push origin main
```

### Environment Management

```bash
# Update environment variables
railway variables set NEW_VAR=value

# View current variables
railway variables

# Delete variable
railway variables delete OLD_VAR
```

## 📈 Scaling

### Automatic Scaling

Railway automatically scales based on:
- CPU usage
- Memory usage
- Request volume
- Response times

### Manual Scaling

Adjust resources in Railway dashboard:
- **RAM**: 0.25GB to 32GB
- **CPU**: Automatic based on load
- **Concurrent Builds**: 1 to 10

## 🔐 Security Best Practices

1. **Environment Variables**:
   - Never log sensitive information
   - Use Railway's secure variable storage
   - Rotate private keys regularly

2. **Access Control**:
   - Use CORS to restrict origins
   - Implement rate limiting
   - Validate all input data

3. **Monitoring**:
   - Monitor for unusual activity
   - Set up alerts for failures
   - Regular security audits

## 🎯 Performance Optimization

### Gas Optimization

- Uses optimal gas prices via `getOptimalGasPrice()`
- Batches transactions when possible
- Monitors gas usage per transaction

### Queue Optimization

- Processes requests in parallel (up to 5 concurrent)
- Implements retry logic with exponential backoff
- Real-time subscription for immediate processing

### Database Optimization

- Uses Supabase for real-time updates
- Efficient query patterns
- Connection pooling

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [BNB Smart Chain Docs](https://docs.bnbchain.org/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Supabase Documentation](https://supabase.com/docs)

## 🤝 Support

For issues and questions:
- Check Railway logs in the dashboard
- Review the troubleshooting section above
- Verify all environment variables are set
- Test with the health endpoints

---

**Happy Relaying!** 🚀

Built with ❤️ for the BNB Balloon Pump Game
