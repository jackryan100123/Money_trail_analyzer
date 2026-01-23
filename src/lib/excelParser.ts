import * as XLSX from 'xlsx';
import type { SheetData, TransactionType } from '@/types/financial';

// Column name normalization mappings
const COLUMN_MAPPINGS: Record<string, string[]> = {
  account: ['account', 'account_no', 'account_number', 'acc_no', 'a/c', 'a/c no', 'account no', 'sender account', 'receiver account', 'from account', 'to account', 'acct'],
  amount: ['amount', 'amt', 'transaction_amount', 'txn_amount', 'value', 'transfer_amount', 'credited', 'debited', 'credit', 'debit', 'disputed amount', 'disputed_amount', 'withdrawal amount', 'withdrawal_amount'],
  date: ['date', 'transaction_date', 'txn_date', 'value_date', 'posting_date', 'trans_date', 'dt'],
  utr: ['utr', 'utr_no', 'utr_number', 'reference', 'ref_no', 'reference_no', 'transaction_id', 'txn_id', 'trans_id', 'rrn'],
  bank: ['bank', 'bank_name', 'beneficiary_bank', 'remitter_bank', 'sender_bank', 'receiver_bank', 'bank/fis'],
  ifsc: ['ifsc', 'ifsc_code', 'ifsc code', 'bank_code'],
  layer: ['layer', 'level', 'tier', 'hop'],
  fromAccount: ['from_account', 'sender', 'sender_account', 'remitter', 'remitter_account', 'source', 'from', 'account no./ (wallet /pg/pa) id'],
  toAccount: ['to_account', 'receiver', 'receiver_account', 'beneficiary', 'beneficiary_account', 'destination', 'to', 'account no'],
  atmId: ['atm id', 'atm_id', 'terminal id', 'terminal_id'],
};

// Sheet type detection based on name (matching Python categories)
const SHEET_TYPE_PATTERNS: Record<TransactionType, RegExp[]> = {
  transfer: [/money\s*transfer/i, /transfer\s*to/i, /fund\s*transfer/i],
  atm: [/withdrawal\s*through\s*atm/i, /atm\s*withdrawal/i, /atm/i],
  pos: [/withdrawal\s*through\s*pos/i, /pos\s*withdrawal/i, /pos/i],
  cheque: [/cash\s*withdrawal\s*through\s*cheque/i, /cheque\s*withdrawal/i, /cheque/i, /check/i],
  aeps: [/aeps/i, /aadhaar/i, /micro\s*atm/i],
  hold: [/transaction\s*put\s*on\s*hold/i, /hold/i, /frozen/i, /blocked/i, /lien/i],
  other: [/others?\s*less\s*th[ae]n/i, /other/i, /misc/i],
};

// Normalize column name
function normalizeColumnName(raw: string): string {
  const cleaned = raw.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  
  for (const [normalized, patterns] of Object.entries(COLUMN_MAPPINGS)) {
    for (const pattern of patterns) {
      if (cleaned.includes(pattern.replace(/[^a-z0-9]/g, '_')) || 
          raw.toLowerCase().includes(pattern)) {
        return normalized;
      }
    }
  }
  
  return cleaned;
}

// Clean currency values (handle ₹, commas, etc.)
function cleanCurrencyValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  
  const str = String(value)
    .replace(/[₹$€£,\s]/g, '')
    .replace(/[()]/g, '')
    .trim();
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

// Clean and format date
function cleanDate(value: unknown): string {
  if (!value) return '';
  
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  const str = String(value).trim();
  // Try to parse various date formats
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return str;
}

// Detect sheet type from name
function detectSheetType(sheetName: string): TransactionType | 'unknown' {
  for (const [type, patterns] of Object.entries(SHEET_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(sheetName)) {
        return type as TransactionType;
      }
    }
  }
  return 'unknown';
}

// Process a single row - keep original column values for UTR detection
function processRow(
  row: Record<string, unknown>, 
  columnMap: Map<string, string>,
  originalColumns: string[]
): Record<string, unknown> {
  const processed: Record<string, unknown> = {};
  
  // First, copy all original values with original column names
  for (const col of originalColumns) {
    processed[`_orig_${col}`] = row[col];
  }
  
  for (const [original, normalized] of columnMap.entries()) {
    const value = row[original];
    
    if (normalized === 'amount') {
      processed[normalized] = cleanCurrencyValue(value);
    } else if (normalized === 'date') {
      processed[normalized] = cleanDate(value);
    } else if (normalized === 'layer') {
      processed[normalized] = parseInt(String(value)) || 1;
    } else {
      processed[normalized] = value !== undefined && value !== null ? String(value).trim() : '';
    }
    
    // Keep original value for reference
    processed[`_raw_${original}`] = value;
  }
  
  return processed;
}

// Parse Excel file
export async function parseExcelFile(file: File): Promise<SheetData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const sheets: SheetData[] = [];
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          
          // First, identify account number columns by reading headers
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          const headers: string[] = [];
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            const cell = worksheet[cellAddress];
            headers[C] = cell ? String(cell.v || '') : '';
          }
          
          // Identify account number column indices
          const accountColumnIndices = new Set<number>();
          headers.forEach((header, idx) => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('account') || 
                lowerHeader.includes('wallet') || 
                lowerHeader.includes('pg') || 
                lowerHeader.includes('pa')) {
              accountColumnIndices.add(idx);
            }
          });
          
          // Read data with raw: false to get formatted strings, but handle dates separately
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { 
            defval: '',
            raw: false, // Get formatted strings to preserve leading zeros
            dateNF: 'yyyy-mm-dd' // Format dates consistently
          });
          
          // For account columns, read the formatted cell value to preserve leading zeros
          if (jsonData.length > 0 && accountColumnIndices.size > 0) {
            const headerKeys = Object.keys(jsonData[0]);
            accountColumnIndices.forEach(colIdx => {
              if (colIdx < headerKeys.length) {
                const colKey = headerKeys[colIdx];
                // Read each cell's formatted value
                for (let R = 1; R <= jsonData.length; ++R) {
                  const cellAddress = XLSX.utils.encode_cell({ r: R, c: colIdx });
                  const cell = worksheet[cellAddress];
                  if (cell) {
                    // Use the formatted text (w property) if available, otherwise use v
                    const cellValue = cell.w || String(cell.v || '');
                    if (cellValue && jsonData[R - 1]) {
                      jsonData[R - 1][colKey] = cellValue;
                    }
                  }
                }
              }
            });
          }
          
          if (jsonData.length === 0) continue;
          
          // Build column mapping
          const originalColumns = Object.keys(jsonData[0]);
          const columnMap = new Map<string, string>();
          
          for (const col of originalColumns) {
            columnMap.set(col, normalizeColumnName(col));
          }
          
          // Process all rows
          const processedRows = jsonData.map(row => processRow(row, columnMap, originalColumns));
          
          sheets.push({
            name: sheetName,
            type: detectSheetType(sheetName),
            rows: processedRows,
            columns: Array.from(new Set(columnMap.values())),
            originalColumns: originalColumns, // Keep original column names
          });
        }
        
        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Export data to CSV
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]).filter(k => !k.startsWith('_raw_') && !k.startsWith('_orig_'));
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        const str = val !== undefined && val !== null ? String(val) : '';
        // Escape quotes and wrap in quotes if contains comma
        return str.includes(',') || str.includes('"') 
          ? `"${str.replace(/"/g, '""')}"` 
          : str;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
