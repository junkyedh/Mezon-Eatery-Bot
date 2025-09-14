import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';

@Command('about', {
  description: 'Information about the Mezon bot',
  usage: '!about',
  category: 'General',
  aliases: ['info'],
})
export class AboutCommand extends CommandMessage {
  execute(args: string[], message: ChannelMessage) {
    const messageContent = [
      '🏦 **NCC Credit System**',
      '',
      '**Version:** 2.0.0',
      '**Framework:** NestJS with TypeScript',
      '**Platform:** Mezon Chat',
      '**Database:** PostgreSQL with TypeORM',
      '',
      '**🎯 Core Features:**',
      '• P2P Lending with automated token transfers',
      '• Multi-tier admin system (Owner/Delegate)',
      '• Real-time interest calculation and tracking',
      '• Comprehensive pool and liquidity management',
      '• Advanced transaction safety with idempotency',
      '',
      '**💰 System Highlights:**',
      '• Minimum loan: 10,000đ (fixed fee: 5,000đ)',
      '• Interest rates: 0.5% - 4.85% annually',
      '• Pro-rata daily interest calculation',
      '• Atomic transactions with rollback protection',
      '',
      '**🔧 Admin Configuration:**',
      '• Owner access via ADMIN_MZ_USERS environment variable',
      '• Runtime delegate assignment by owners',
      '• Pool management and fee withdrawal capabilities',
      '• Debug tools for system monitoring',
      '',
      '**📚 Quick Commands:**',
      '• `!help` - Complete command documentation',
      '• `!balance` - Check wallet and pool status',
      '• `!loan <amount> <days>` - Create loan request',
      '• `!admin balance` - View pool health (admin only)',
      '',
      '**🏗️ Built by:** SGI Team',
      '**Repository:** https://github.com/junkyedh/Mezon-Eatery-Bot',
      '**Architecture:** Event-driven, microservice-ready design',
    ].join('\n');

    return this.replyMessageGenerate(
      {
        messageContent,
      },
      message,
    );
  }
}
