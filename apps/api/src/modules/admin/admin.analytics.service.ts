import { AdminRepository } from './admin.repository.js';

export class AdminAnalyticsService {
  public constructor(private readonly repository: AdminRepository) {}

  public async getAnalytics() {
    const counts = await this.repository.getCounts();
    const revenue = await this.repository.getRevenueEstimate();

    return {
      usersCount: counts.usersCount,
      listingsCount: counts.listingsCount,
      bookingsCount: counts.bookingsCount,
      activeListings: counts.activeListings,
      estimatedRevenue: revenue ? revenue.toString() : '0',
    };
  }
}
