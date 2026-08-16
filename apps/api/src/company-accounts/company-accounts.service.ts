import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CompanyAccount } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyAccountDto } from './dto/create-company-account.dto';

@Injectable()
export class CompanyAccountsService {
  private readonly logger = new Logger(CompanyAccountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const accounts = await this.prisma.companyAccount.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return accounts.map((a) => this.serialize(a));
  }

  /** Active accounts for form pickers, e.g. Record Payment. */
  async lookup() {
    const accounts = await this.prisma.companyAccount.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        provider: true,
        currency: true,
      },
    });
    return accounts;
  }

  async create(dto: CreateCompanyAccountDto, userId: string) {
    const account = await this.prisma.companyAccount.create({
      data: {
        name: dto.name,
        type: dto.type,
        provider: dto.provider ?? null,
        accountNumber: dto.accountNumber ?? null,
        currency: dto.currency ?? null,
        createdBy: userId,
      },
    });

    this.logger.log(`Company account created: ${account.name}`);
    return this.serialize(account);
  }

  async deactivate(id: string) {
    const account = await this.prisma.companyAccount.findFirst({
      where: { id, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException('Company account not found');
    }

    const updated = await this.prisma.companyAccount.update({
      where: { id },
      data: { isActive: false },
    });

    return this.serialize(updated);
  }

  private serialize(account: CompanyAccount) {
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      provider: account.provider,
      accountNumber: account.accountNumber,
      currency: account.currency,
      isActive: account.isActive,
      createdBy: account.createdBy,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }
}
