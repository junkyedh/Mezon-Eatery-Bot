import { ChannelMessage } from 'mezon-sdk';
import { Command } from '@app/decorators/command.decorator';
import { CommandMessage } from '@app/command/common/command.abstract';
import { CommandStorage } from '@app/command/common/command.storage';

@Command('help', {
  description: 'Shows available commands and their usage',
  usage: '!help [command]',
  category: 'General',
  aliases: ['h', 'commands'],
})
export class HelpCommand extends CommandMessage {
  constructor() {
    super();
  }

  execute(args: string[], message: ChannelMessage) {
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const metadata = CommandStorage.getCommandMetadata(commandName);

      if (!metadata) {
        const messageContent = `Command '${commandName}' không tồn tại. Dùng !help để xem tất cả các lệnh có sẵn.`;
        return this.replyMessageGenerate({ messageContent }, message);
      }

      const messageContent = this.formatCommandHelp(metadata);
      return this.replyMessageGenerate(
        {
          messageContent,
          mk: [{ type: 'pre', s: 0, e: messageContent.length }],
        },
        message,
      );
    }

    // Show all commands grouped by category
    const commands = Array.from(CommandStorage.getAllCommands().entries());
    const categories = new Map<string, string[]>();

    commands.forEach(([name, metadata]) => {
      const category = metadata.category || 'General';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(name);
    });

    let messageContent =
      `**NCC Credit System - Hướng Dẫn Nhanh**\n\n` +
      `📌 Tiền tố (prefix) mặc định: dấu chấm than (!)\n` +
      `Gõ \`!help <command>\` để xem chi tiết một lệnh cụ thể.\n\n` +
      `🧩 Nhóm chức năng chính:\n` +
      `• Ví & Số dư: !balance, !deposit <sotien>, !withdraw <sotien>\n` +
      `• Vay P2P (Borrower): !loan <sotien> <songay>, !checklist-loan, !transaction <loanId>, !repay <loanId>\n` +
      `• Cho vay P2P (Lender): !checklist-loan, !loan-fund <loanId>, !transaction <loanId>\n` +
      `• Khác: !score, !about, !ping\n\n` +
      `🔁 Quy trình vay nhanh (ví dụ):\n` +
      `1️⃣ Borrower: !loan 15000 30  → tạo yêu cầu vay 15,000 trong 30 ngày\n` +
      `2️⃣ Lender: !checklist-loan  → xem danh sách yêu cầu\n` +
      `3️⃣ Lender: !loan-fund <loanId>  → giải ngân khoản vay\n` +
      `4️⃣ Borrower: !transaction <loanId>  → theo dõi khoản vay\n` +
      `5️⃣ Borrower: !repay <loanId>  → tất toán khi đủ tiền\n\n` +
      `⚠️ Điều kiện & Lưu ý:\n` +
      `• Mọi giao dịch < 1,000 tokens bị từ chối.\n` +
      `• Phí cố định khi vay: 5,000 tokens (trừ lúc giải ngân).\n` +
      `• Lãi suất tính theo năm, quy đổi pro‑rata theo số ngày thực tế.\n` +
      `• Trả sớm: lãi chỉ tính đến ngày trả.\n` +
      `• Lender phải nạp (!deposit) đủ số token vào bot trước khi dùng !loan-fund.\n` +
      `• Borrower phải có đủ token nội bộ & ví khi tất toán (!repay).\n\n`;

    categories.forEach((commandNames, category) => {
      messageContent += `**${category}:**\n`;
      messageContent += commandNames.map((cmd) => `• \`!${cmd}\``).join('\n');
      messageContent += '\n\n';
    });

    messageContent += `Gõ \`!help <command>\` để xem hướng dẫn chi tiết hơn cho từng lệnh.`;

    return this.replyMessageGenerate(
      {
        messageContent,
        mk: [{ type: 'pre', s: 0, e: messageContent.length }],
      },
      message,
    );
  }

  private formatCommandHelp(metadata: any): string {
    return [
      `**Command: ${metadata.name}**`,
      `**Description:** ${metadata.description}`,
      `**Usage:** ${metadata.usage}`,
      `**Category:** ${metadata.category}`,
      metadata.aliases?.length
        ? `**Aliases:** ${metadata.aliases.join(', ')}`
        : '',
      metadata.permissions?.length
        ? `**Permissions:** ${metadata.permissions.join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
