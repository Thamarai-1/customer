import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { UserModel, UserRole } from '../modules/users/user.model.js';
import { hashPassword } from '../utils/password.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const seedUsers = async (): Promise<void> => {
  logger.info('Seeding users...', 'SeedUsers');

  const defaultUsers = [
    {
      name: env.ADMIN_NAME || 'System Administrator',
      email: env.ADMIN_EMAIL || 'admin@engagement.hcl.com',
      password: env.ADMIN_PASSWORD || 'Admin@Secure2026!',
      role: UserRole.ADMIN,
      department: 'Executive Administration'
    },
    {
      name: 'Priya Sharma',
      email: 'priya.marketing@example.com',
      password: 'Marketing@2026!',
      role: UserRole.MARKETING_MANAGER,
      department: 'Growth & Customer Retention'
    },
    {
      name: 'David Miller',
      email: 'david.compliance@example.com',
      password: 'Compliance@2026!',
      role: UserRole.COMPLIANCE_REVIEWER,
      department: 'Regulatory & Legal Operations'
    }
  ];

  for (const u of defaultUsers) {
    const existing = await UserModel.findOne({ email: u.email.toLowerCase() });
    if (!existing) {
      const passwordHash = await hashPassword(u.password);
      await UserModel.create({
        name: u.name,
        email: u.email.toLowerCase(),
        passwordHash,
        role: u.role,
        department: u.department,
        isActive: true
      });
      logger.info(`Created user [${u.role}]: ${u.email}`, 'SeedUsers');
    } else {
      logger.info(`User already exists: ${u.email}`, 'SeedUsers');
    }
  }

  logger.info('User seeding completed successfully', 'SeedUsers');
};

// Run standalone if invoked directly
if (process.argv[1]?.endsWith('seed-users.ts') || process.argv[1]?.endsWith('seed-users.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedUsers();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}
