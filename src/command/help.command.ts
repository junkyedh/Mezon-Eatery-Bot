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
      // Show help for specific command
      const commandName = args[0].toLowerCase();
      const metadata = CommandStorage.getCommandMetadata(commandName);

      if (!metadata) {
        const messageContent = `Command '${commandName}' not found. Use !help to see all available commands.`;
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

    let messageContent = `**NCC Credit System - Available Commands:**\n\n`;
    
    categories.forEach((commandNames, category) => {
      messageContent += `**${category}:**\n`;
      messageContent += commandNames.map(cmd => `• \`!${cmd}\``).join('\n');
      messageContent += '\n\n';
    });

    messageContent += `Use \`!help [command]\` for detailed information about a specific command.`;

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
