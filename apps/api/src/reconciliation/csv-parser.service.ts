import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export interface ParsedBankTransaction {
  transactionDate: Date;
  description: string;
  debitAmount: number | null;
  creditAmount: number | null;
  balance: number;
  reference: string | null;
}

interface CsvRow {
  [key: string]: string | undefined;
}

@Injectable()
export class CsvParserService {
  private readonly logger = new Logger(CsvParserService.name);

  parse(buffer: Buffer): ParsedBankTransaction[] {
    let records: CsvRow[];
    try {
      records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as CsvRow[];
    } catch (err) {
      this.logger.error(`CSV parse failed: ${String(err)}`);
      throw new BadRequestException('Invalid CSV file format');
    }

    if (records.length === 0) return [];

    const headers = Object.keys(records[0]).map((h) => h.toLowerCase());
    const format = this.detectFormat(headers);

    const transactions = records
      .map((row) => this.parseRow(row, format))
      .filter((t): t is ParsedBankTransaction => t !== null);

    this.logger.log(`Parsed ${transactions.length} bank transactions`);
    return transactions;
  }

  private detectFormat(headers: string[]): 'A' | 'B' | 'C' {
    if (
      headers.some((h) => h.includes('narration')) &&
      headers.some((h) => h.includes('debit amount'))
    ) {
      return 'B';
    }
    if (headers.some((h) => h.includes('transaction date'))) {
      return 'C';
    }
    return 'A';
  }

  private parseRow(row: CsvRow, format: 'A' | 'B' | 'C'): ParsedBankTransaction | null {
    const normalized = this.normalizeRow(row);

    let dateStr: string | undefined;
    let description: string | undefined;
    let debitStr: string | undefined;
    let creditStr: string | undefined;
    let balanceStr: string | undefined;
    let reference: string | null = null;

    if (format === 'B') {
      dateStr = normalized['date'] ?? normalized['transaction date'];
      description = normalized['narration'] ?? normalized['description'];
      debitStr = normalized['debit amount'] ?? normalized['debit'];
      creditStr = normalized['credit amount'] ?? normalized['credit'];
      balanceStr = normalized['balance'] ?? normalized['running balance'];
      reference = normalized['reference'] ?? null;
    } else if (format === 'C') {
      dateStr = normalized['transaction date'] ?? normalized['date'];
      description = normalized['description'] ?? normalized['narration'];
      debitStr = normalized['debit'] ?? normalized['debit amount'];
      creditStr = normalized['credit'] ?? normalized['credit amount'];
      balanceStr = normalized['running balance'] ?? normalized['balance'];
      reference = normalized['reference'] ?? null;
    } else {
      dateStr = normalized['date'];
      description = normalized['description'];
      debitStr = normalized['debit'];
      creditStr = normalized['credit'];
      balanceStr = normalized['balance'];
      reference = normalized['reference'] ?? null;
    }

    if (!dateStr || !description || !balanceStr) return null;

    const transactionDate = new Date(dateStr);
    if (Number.isNaN(transactionDate.getTime())) return null;

    const debitAmount = this.parseAmount(debitStr);
    const creditAmount = this.parseAmount(creditStr);
    const balance = this.parseAmount(balanceStr);

    if (balance === null) return null;

    return {
      transactionDate,
      description: description.trim(),
      debitAmount,
      creditAmount,
      balance,
      reference,
    };
  }

  private normalizeRow(row: CsvRow): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== undefined) {
        out[key.toLowerCase().trim()] = value;
      }
    }
    return out;
  }

  private parseAmount(value: string | undefined): number | null {
    if (!value || value.trim() === '' || value === '-') return null;
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? null : num;
  }
}
