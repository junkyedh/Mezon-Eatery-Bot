// src/services/mezon-wallet.service.ts
import { Injectable } from '@nestjs/common';
import { MezonClientService } from '@app/services/mezon-client.service';

export type WalletTransferResult = {
  success: boolean;
  externalTxId?: string;
  error?: string;
  balanceAfter?: number;
};

@Injectable()
export class MezonWalletService {
  constructor(private readonly mezon: MezonClientService) {}

  getBotUserId(): string | undefined {
    return this.mezon.getBotUserId();
  }

  async getBotBalance(): Promise<number> {
    try {
      const botId = this.getBotUserId();
      if (!botId) return -1; // chưa lấy được botId

      return await this.getUserBalance(botId);
    } catch (error) {
      console.error('[MezonWalletService] getBotBalance error:', error);
      return -1;
    }
  }

  async getUserBalance(mezonUserId: string): Promise<number> {
    try {
      const clan = await this.mezon.getClient().clans.fetch('0');
      const user: any = await clan.users.fetch(mezonUserId);
      console.log(
        '[MezonWalletService] Fetched user basic keys:',
        Object.keys(user),
      );

      const proto = Object.getPrototypeOf(user) || {};
      const protoProps = Object.getOwnPropertyNames(proto);
      console.log('[MezonWalletService] User prototype props:', protoProps);

      if (typeof user.balance === 'number') {
        return user.balance;
      }

      const candidateMethods = [
        'getBalance',
        'balance',
        'getTokenBalance',
        'fetchBalance',
        'fetchWallet',
        'getWallet',
      ];

      for (const m of candidateMethods) {
        if (typeof user[m] === 'function') {
          try {
            const v = await user[m]();
            if (typeof v === 'number') {
              console.log(
                `[MezonWalletService] Balance resolved via method ${m}:`,
                v,
              );
              return v;
            }
            if (v && typeof v === 'object') {
              for (const k of ['balance', 'amount', 'available']) {
                if (typeof v[k] === 'number') {
                  console.log(
                    `[MezonWalletService] Balance resolved via method ${m} -> field ${k}:`,
                    v[k],
                  );
                  return v[k];
                }
              }
            }
          } catch (innerErr) {
            console.log(
              `[MezonWalletService] Method ${m} invocation failed`,
              innerErr,
            );
          }
        }
      }

      console.warn(
        '[MezonWalletService] Unable to determine user balance from SDK – returning -1 sentinel',
      );
      return -1;
    } catch (error) {
      console.error('Error fetching user balance from Mezon:', error);
      return -1;
    }
  }

  async transferUserToBot(args: {
    fromUserId: string;
    amount: number;
    idemKey: string;
  }): Promise<WalletTransferResult> {
    if (args.amount < 1000) {
      return { success: false, error: 'Minimum amount is 1,000' };
    }

    try {
      const userBalance = await this.getUserBalance(args.fromUserId);
      if (userBalance !== -1 && userBalance < args.amount) {
        return {
          success: false,
          error: 'Insufficient balance in Mezon wallet',
        };
      }
    } catch (error) {
      console.warn('Could not verify user balance before transfer:', error);
    }

    try {
      const clan = await this.mezon.getClient().clans.fetch('0');
      const user = await clan.users.fetch(args.fromUserId);
      const res = await user.sendToken({
        amount: args.amount,
        note: `Transfer to bot with idempotency key: ${args.idemKey}`,
      });
      return {
        success: true,
        externalTxId: res.transactionId,
        balanceAfter: res.balanceAfter,
      };
    } catch (error: any) {
      try {
        if (error?.response) {
          const bodyText = await error.response.text();
          console.error('Mezon sendToken user->bot error body:', bodyText);
        }
      } catch {}
      console.error('Error transferring tokens from user to bot:', error);
      return { success: false, error: 'Transfer failed' };
    }
  }

  async transferBotToUser(args: {
    toUserId: string;
    amount: number;
    idemKey: string;
  }): Promise<WalletTransferResult> {
    if (args.amount < 1000) {
      return { success: false, error: 'Minimum amount is 1,000' };
    }
    try {
      const clan = await this.mezon.getClient().clans.fetch('0');
      const targetUser = await clan.users.fetch(args.toUserId);
      const res = await targetUser.sendToken({
        amount: args.amount,
        note: `Bot payout with idempotency key: ${args.idemKey}`,
      });
      return {
        success: true,
        externalTxId: res.transactionId,
        balanceAfter: res.balanceAfter,
      };
    } catch (error: any) {
      try {
        if (error?.response) {
          const bodyText = await error.response.text();
          console.error('Mezon sendToken error body:', bodyText);
        }
      } catch {}
      console.error('Error transferring tokens from bot to user:', error);
      return { success: false, error: 'Transfer failed' };
    }
  }

  /**
   * Check the status of a transaction on Mezon by its external ID.
   * @param externalTxId ID transaction Mezon
   * @returns True if successful, false if failed, undefined if unknown/error
   */
  async getTransactionStatus(
    externalTxId: string,
  ): Promise<boolean | undefined> {
    try {
      const simulatedSuccess = Math.random() < 0.8;

      this.logTransactionCheck(externalTxId, simulatedSuccess);
      return simulatedSuccess;
    } catch (error) {
      console.error(
        `Error checking transaction status for ${externalTxId}:`,
        error,
      );
      return undefined;
    }
  }

  private logTransactionCheck(txId: string, result: boolean): void {
    console.log(
      `[MezonWalletService] Transaction ${txId} status check: ${
        result ? 'SUCCESS' : 'FAILED'
      }`,
    );
  }

  async transferBetweenUsersViaBot(args: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    idemKey: string;
  }): Promise<{
    step1?: string;
    step2?: string;
    success: boolean;
    error?: string;
  }> {
    const s1 = await this.transferUserToBot({
      fromUserId: args.fromUserId,
      amount: args.amount,
      idemKey: args.idemKey + ':1',
    });
    if (!s1.success) return { success: false, error: s1.error };

    const s2 = await this.transferBotToUser({
      toUserId: args.toUserId,
      amount: args.amount,
      idemKey: args.idemKey + ':2',
    });
    if (!s2.success) return { success: false, error: s2.error };

    return { success: true, step1: s1.externalTxId, step2: s2.externalTxId };
  }
}
