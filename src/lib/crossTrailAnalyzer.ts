import * as XLSX from 'xlsx';

export interface TrailFile {
  id: string;
  name: string;
  accounts: Set<string>;
  rawAccounts: Map<string, string>; // canonical -> original format
}

export interface CommonAccount {
  account: string; // Original format for display
  canonicalAccount: string; // Normalized for matching
  foundInTrails: {
    trailId: string;
    trailName: string;
  }[];
  count: number;
}

export interface CrossTrailResult {
  trails: TrailFile[];
  commonAccounts: CommonAccount[];
  totalUniqueAccounts: number;
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Normalize account for matching - removes leading zeros
 */
function getCanonicalAccount(account: string): string {
  if (!account) return '';
  const cleaned = String(account).trim();
  if (!cleaned || cleaned === 'N/A' || cleaned === 'nan' || cleaned === 'None' || cleaned === 'undefined') {
    return '';
  }
  // Remove leading zeros for canonical matching
  return cleaned.replace(/^0+/, '') || '0';
}

/**
 * Extract accounts from a single Excel file
 * Only searches in "Account No./ (Wallet /PG/PA) Id" and "Account No" columns
 */
export async function extractAccountsFromFile(file: File): Promise<TrailFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const accounts = new Set<string>();
        const rawAccounts = new Map<string, string>(); // canonical -> original
        
        // Target column names (exact matches as specified)
        const targetColumns = [
          'Account No./ (Wallet /PG/PA) Id',
          'Account No'
        ];
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { 
            defval: '',
            raw: false 
          });
          
          if (jsonData.length === 0) continue;
          
          const columns = Object.keys(jsonData[0]);
          
          // Find matching columns (case-insensitive but prefer exact match)
          const matchedColumns: string[] = [];
          for (const col of columns) {
            for (const target of targetColumns) {
              if (col.toLowerCase().trim() === target.toLowerCase().trim()) {
                matchedColumns.push(col);
                break;
              }
            }
          }
          
          // Extract accounts from matched columns
          for (const row of jsonData) {
            for (const col of matchedColumns) {
              const value = row[col];
              if (value !== undefined && value !== null) {
                const accountStr = String(value).trim();
                const canonical = getCanonicalAccount(accountStr);
                
                if (canonical && canonical !== '0') {
                  accounts.add(canonical);
                  // Keep the most complete original format (with leading zeros)
                  const existing = rawAccounts.get(canonical);
                  if (!existing || accountStr.length > existing.length) {
                    rawAccounts.set(canonical, accountStr);
                  }
                }
              }
            }
          }
        }
        
        resolve({
          id: generateId(),
          name: file.name,
          accounts,
          rawAccounts,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Find common accounts across multiple trails
 * Only finds accounts that appear in DIFFERENT trails (not same trail)
 */
export function findCommonAccounts(trails: TrailFile[]): CrossTrailResult {
  if (trails.length < 2) {
    return {
      trails,
      commonAccounts: [],
      totalUniqueAccounts: trails.length > 0 ? trails[0].accounts.size : 0,
    };
  }
  
  // Build a map of canonical account -> which trails contain it
  const accountToTrails = new Map<string, { trailId: string; trailName: string; originalAccount: string }[]>();
  
  for (const trail of trails) {
    for (const canonical of trail.accounts) {
      const original = trail.rawAccounts.get(canonical) || canonical;
      
      if (!accountToTrails.has(canonical)) {
        accountToTrails.set(canonical, []);
      }
      
      accountToTrails.get(canonical)!.push({
        trailId: trail.id,
        trailName: trail.name,
        originalAccount: original,
      });
    }
  }
  
  // Find accounts that appear in more than one trail
  const commonAccounts: CommonAccount[] = [];
  
  for (const [canonical, trailsContaining] of accountToTrails.entries()) {
    if (trailsContaining.length > 1) {
      // Get the best original format (longest, most complete)
      const bestOriginal = trailsContaining.reduce((best, curr) => 
        curr.originalAccount.length > best.length ? curr.originalAccount : best
      , trailsContaining[0].originalAccount);
      
      commonAccounts.push({
        account: bestOriginal,
        canonicalAccount: canonical,
        foundInTrails: trailsContaining.map(t => ({
          trailId: t.trailId,
          trailName: t.trailName,
        })),
        count: trailsContaining.length,
      });
    }
  }
  
  // Sort by count (most common first), then by account number
  commonAccounts.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.account.localeCompare(b.account);
  });
  
  // Calculate total unique accounts across all trails
  const allAccounts = new Set<string>();
  for (const trail of trails) {
    for (const acc of trail.accounts) {
      allAccounts.add(acc);
    }
  }
  
  return {
    trails,
    commonAccounts,
    totalUniqueAccounts: allAccounts.size,
  };
}
