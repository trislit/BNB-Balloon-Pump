import { Router, Request, Response } from 'express';
import { RelayerService } from '../services/RelayerService';
import { logger } from '../utils/logger';

export const vaultRoutes = (relayerService: RelayerService) => {
  const router = Router();

  // POST /api/vault/deposit - Deposit tokens to vault
  router.post('/deposit', async (req: Request, res: Response) => {
    try {
      const { userAddress, amount } = req.body;

      // Validate request body
      if (!userAddress || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userAddress, amount'
        });
      }

      // Validate Ethereum address
      if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Ethereum address format'
        });
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount format'
        });
      }

      logger.info(`💰 Vault deposit request: ${userAddress}, amount: ${amount}`);

      // Process deposit
      const success = await relayerService.depositToVault(userAddress, amount);

      if (success) {
        logger.info(`✅ Vault deposit successful: ${userAddress} +${amount}`);
        res.json({
          success: true,
          message: 'Deposit successful'
        });
      } else {
        logger.warn(`❌ Vault deposit failed: ${userAddress}`);
        res.status(400).json({
          success: false,
          error: 'Deposit failed'
        });
      }

    } catch (error: any) {
      logger.error('❌ Error processing vault deposit:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  // POST /api/vault/withdraw - Withdraw tokens from vault
  router.post('/withdraw', async (req: Request, res: Response) => {
    try {
      const { userAddress, amount } = req.body;

      // Validate request body
      if (!userAddress || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userAddress, amount'
        });
      }

      // Validate Ethereum address
      if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Ethereum address format'
        });
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount format'
        });
      }

      logger.info(`💸 Vault withdrawal request: ${userAddress}, amount: ${amount}`);

      // Process withdrawal
      const success = await relayerService.withdrawFromVault(userAddress, amount);

      if (success) {
        logger.info(`✅ Vault withdrawal successful: ${userAddress} -${amount}`);
        res.json({
          success: true,
          message: 'Withdrawal successful'
        });
      } else {
        logger.warn(`❌ Vault withdrawal failed: ${userAddress}`);
        res.status(400).json({
          success: false,
          error: 'Withdrawal failed - insufficient balance or other error'
        });
      }

    } catch (error: any) {
      logger.error('❌ Error processing vault withdrawal:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  // GET /api/vault/balance/:userAddress - Get vault balance
  router.get('/balance/:userAddress', async (req: Request, res: Response) => {
    try {
      const { userAddress } = req.params;

      if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Ethereum address format'
        });
      }

      const balance = await relayerService.getUserBalance(userAddress);

      res.json({
        success: true,
        balance,
        userAddress: userAddress.toLowerCase()
      });

    } catch (error: any) {
      logger.error(`❌ Error getting vault balance for ${req.params.userAddress}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  return router;
};
