import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
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
        ncScore: 100000, // Default NC Score
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

  async updateNCScore(userId: string, points: number): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ ncScore: () => `nc_score + ${points}` })
      .where('id = :userId', { userId })
      .execute();
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

  async getUsersWithPositiveBalance(): Promise<User[]> {
    return this.userRepository.find({
      where: { balance: MoreThan(0) },
      order: { balance: 'DESC' }
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username }
    });
  }

  calculateNCScore(
    jobLevel: string,
    tenure: number,
    repaymentHistory: number,
  ): number {
    let score = 100000; // Base score

    // Job level bonus
    switch (jobLevel?.toLowerCase()) {
      case 'manager':
        score += 10000;
        break;
      case 'senior':
        score += 5000;
        break;
      case 'junior':
        score += 2000;
        break;
    }

    // Tenure bonus (3,000 per year)
    score += tenure * 3000;

    // Repayment history adjustment
    score += repaymentHistory;

    return Math.max(score, 100000); // Minimum 100,000
  }
}
