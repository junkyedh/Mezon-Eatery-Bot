import { Injectable } from '@nestjs/common';

@Injectable()
export class UserContextService {
  private lastChannelByUser = new Map<string, string>();

  setLastChannel(userId: string, channelId: string) {
    if (!userId || !channelId) return;
    this.lastChannelByUser.set(userId, channelId);
  }

  getLastChannel(userId: string): string | undefined {
    return this.lastChannelByUser.get(userId);
  }
}
