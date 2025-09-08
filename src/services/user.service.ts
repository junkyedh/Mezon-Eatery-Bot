import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@app/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOrCreateUser(mezonUserId: string, username: string): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { mezonUserId },
    });

    if (!user) {
      user = this.userRepository.create({
        mezonUserId,
        username,
        balance: 0,
      });
      await this.userRepository.save(user);
    }

    return user;
  }

  async getUserByMezonId(mezonUserId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { mezonUserId },
      relations: ['loans', 'transactions'],
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['loans', 'transactions'],
    });
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (!ids.length) return [];
    return this.userRepository.find({ where: ids.map((id) => ({ id })) });
  }

  async updateBalance(userId: string, amount: number): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ balance: () => `balance + ${amount}` })
      .where('id = :userId', { userId })
      .execute();
  }

  async blockUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, { isBlocked: true });
  }

  async unblockUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, { isBlocked: false });
  }
}
