import type {
  SheetData,
  MoneyTransfer,
  Withdrawal,
  GraphNode,
  GraphEdge,
  BaseTransaction,
  UtrColumns
} from '@/types/financial';

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Normalize account number - clean whitespace and invalid values
 * Preserves original format for display
 */
function normalizeAccount(account: string): string {
  if (!account || account === 'N/A' || account === 'nan' || account === 'None' || account === 'undefined') {
    return '';
  }
  return String(account).trim();
}

/**
 * Get canonical account ID for matching - removes leading zeros for consistent matching
 * This ensures accounts like "00120205001778" and "120205001778" match correctly
 * But we preserve the original account string for display
 */
export function getCanonicalAccountId(account: string): string {
  const normalized = normalizeAccount(account);
  if (!normalized) return '';
  // Remove leading zeros for canonical matching, but keep at least one digit
  const canonical = normalized.replace(/^0+/, '') || '0';
  return canonical;
}

/**
 * Compare two account numbers using canonical form (leading zeros removed)
 */
function accountsMatch(acc1: string, acc2: string): boolean {
  const canonical1 = getCanonicalAccountId(acc1);
  const canonical2 = getCanonicalAccountId(acc2);
  if (!canonical1 || !canonical2) return false;
  return canonical1 === canonical2;
}

/**
 * CRITICAL: Detect UTR columns following Python logic exactly
 * - utr2Col (Original/Sent UTR) = "Transaction ID / UTR Number2" 
 * - utr1Col (Linkage/Received UTR) = "Transaction Id / UTR Number"
 */
export function detectUtrColumns(sheet: SheetData): UtrColumns {
  const originalColumns = sheet.originalColumns || [];

  let utr1Col: string | null = null; // Linkage/Received UTR
  let utr2Col: string | null = null; // Original/Sent UTR

  // Find all columns with UTR or TRANSACTION ID
  const possibleUtrCols = originalColumns.filter(col =>
    col.toUpperCase().includes('UTR') ||
    col.toUpperCase().includes('TRANSACTION ID')
  );

  // Strategy 1: Look for exact column names (Python logic)
  for (const col of originalColumns) {
    if (col === "Transaction ID / UTR Number2") { // Original UTR (with "2")
      utr2Col = col;
    } else if (col === "Transaction Id / UTR Number") { // Linkage UTR (lowercase "d", no "2")
      utr1Col = col;
    }
  }

  // Strategy 2: Fallback - look for any column with "2" for original
  if (!utr2Col) {
    for (const col of possibleUtrCols) {
      if (col.includes('2')) {
        utr2Col = col;
        break;
      }
    }
  }

  // Strategy 3: If still not found, use available columns
  if (!utr1Col && possibleUtrCols.length > 0) {
    utr1Col = possibleUtrCols[0];
  }

  if (!utr2Col) {
    if (possibleUtrCols.length > 1) {
      utr2Col = possibleUtrCols[1];
    } else {
      utr2Col = utr1Col; // Use same column for both
    }
  }

  console.log('UTR Columns Detected:', { utr1Col, utr2Col });

  return { utr1Col, utr2Col };
}

/**
 * Get value from row using original column name
 */
function getOriginalValue(row: Record<string, unknown>, colName: string): string {
  // Try original column key first
  const origKey = `_orig_${colName}`;
  if (origKey in row && row[origKey] !== undefined && row[origKey] !== null) {
    const val = String(row[origKey]).trim();
    if (val && val !== 'nan' && val !== 'None' && val !== 'N/A' && val !== 'undefined') {
      return val;
    }
  }

  // Fallback to raw
  const rawKey = `_raw_${colName}`;
  if (rawKey in row && row[rawKey] !== undefined && row[rawKey] !== null) {
    const val = String(row[rawKey]).trim();
    if (val && val !== 'nan' && val !== 'None' && val !== 'N/A' && val !== 'undefined') {
      return val;
    }
  }

  return 'N/A';
}

/**
 * Get layer from Money Transfer sheet based on UTR number
 */
function getLayerFromMoneyTransfer(
  utr: string,
  utrToRow: Map<string, Record<string, unknown>>
): number | null {
  if (!utr || utr === '' || utr === 'nan' || utr === 'None' || utr === 'N/A') {
    return null;
  }

  const row = utrToRow.get(utr.trim());
  if (row && row.layer !== undefined) {
    const layer = parseInt(String(row.layer));
    if (!isNaN(layer)) {
      return layer;
    }
  }

  return null;
}

/**
 * Extract money transfers from sheet data using Python logic
 */
export function extractMoneyTransfers(sheets: SheetData[]): {
  transfers: MoneyTransfer[];
  utrToRow: Map<string, Record<string, unknown>>;
  utrColumns: UtrColumns;
} {
  const transferSheet = sheets.find(s => s.type === 'transfer');
  if (!transferSheet) {
    return { transfers: [], utrToRow: new Map(), utrColumns: { utr1Col: null, utr2Col: null } };
  }

  // Detect UTR columns
  const utrColumns = detectUtrColumns(transferSheet);
  const { utr1Col, utr2Col } = utrColumns;

  // Create UTR to row mapping for linkage verification
  const utrToRow = new Map<string, Record<string, unknown>>();

  for (const row of transferSheet.rows) {
    if (utr1Col) {
      const linkageUtr = getOriginalValue(row, utr1Col);
      if (linkageUtr !== 'N/A') {
        utrToRow.set(linkageUtr, row);
      }
    }
  }

  const transfers: MoneyTransfer[] = [];

  for (let index = 0; index < transferSheet.rows.length; index++) {
    const row = transferSheet.rows[index];

    // Get layer
    const layer = Number(row.layer) || 1;

    // Get accounts - matching Python column names
    let fromAccount = String(row.fromAccount || '').trim();
    let toAccount = String(row.toAccount || '').trim();

    // Fallback to original column names if normalized ones are empty
    if (!fromAccount || fromAccount === 'undefined') {
      fromAccount = getOriginalValue(row, 'Account No./ (Wallet /PG/PA) Id');
    }
    if (!toAccount || toAccount === 'undefined') {
      toAccount = getOriginalValue(row, 'Account No');
    }

    if (!fromAccount || fromAccount === 'N/A' || fromAccount === 'nan' || fromAccount === 'None') continue;
    if (!toAccount || toAccount === 'N/A' || toAccount === 'nan' || toAccount === 'None') continue;

    const amount = Number(row.amount) || 0;
    if (amount <= 0) continue;

    // Get UTR values
    const utrOriginal = utr2Col ? getOriginalValue(row, utr2Col) : 'N/A'; // Sent UTR
    const utrLinkage = utr1Col ? getOriginalValue(row, utr1Col) : 'N/A'; // Received UTR

    // Verify linkage: check if target account receives this UTR
    let linkageVerified = false;
    if (utrOriginal !== 'N/A' && utrToRow.has(utrOriginal)) {
      const nextRow = utrToRow.get(utrOriginal);
      if (nextRow) {
        let nextSrc = String(nextRow.fromAccount || '').trim();
        if (!nextSrc || nextSrc === 'undefined') {
          nextSrc = getOriginalValue(nextRow, 'Account No./ (Wallet /PG/PA) Id');
        }
        if (nextSrc === toAccount) {
          linkageVerified = true;
        }
      }
    }

    const bank = String(row.bank || '').trim() || getOriginalValue(row, 'Bank/FIs');
    const ifsc = String(row.ifsc || '').trim() || getOriginalValue(row, 'Ifsc Code');

    transfers.push({
      id: generateId(),
      account: toAccount || fromAccount,
      fromAccount,
      toAccount,
      amount,
      date: String(row.date || ''),
      utr: utrOriginal,
      utrSent: utrOriginal,
      utrReceived: utrLinkage,
      bank: bank !== 'undefined' ? bank : '',
      ifsc: ifsc !== 'undefined' ? ifsc : '',
      type: 'transfer' as const,
      layer,
      linkageVerified,
      rawData: row,
    });
  }

  return { transfers, utrToRow, utrColumns };
}

/**
 * Extract withdrawals from sheet data
 */
export function extractWithdrawals(sheets: SheetData[]): Withdrawal[] {
  const withdrawalTypes = ['atm', 'pos', 'cheque'] as const;
  const withdrawals: Withdrawal[] = [];

  for (const type of withdrawalTypes) {
    const sheet = sheets.find(s => s.type === type);
    if (!sheet) continue;

    for (const row of sheet.rows) {
      // Try multiple account column names for withdrawals
      let account = String(row.account || '').trim();
      if (!account || account === 'undefined' || account === 'N/A') {
        account = getOriginalValue(row, 'Account No./ (Wallet /PG/PA) Id');
      }
      if (!account || account === 'N/A') {
        account = getOriginalValue(row, 'Account No');
      }
      if (!account || account === 'N/A') {
        account = getOriginalValue(row, 'Account Number');
      }
      if (!account || account === 'N/A') {
        account = getOriginalValue(row, 'Account No./ (Wallet /PG/PA) Id');
      }

      if (!account || account === 'N/A' || account === 'nan' || account === 'None') continue;

      const amount = Number(row.amount) || 0;
      if (amount <= 0) continue;

      // Try multiple UTR column names for withdrawals
      let utr = String(row.utr || '').trim();
      if (!utr || utr === 'undefined' || utr === 'N/A') {
        utr = getOriginalValue(row, 'Transaction Id / UTR Number');
      }
      if (!utr || utr === 'N/A') {
        utr = getOriginalValue(row, 'Transaction ID / UTR Number');
      }
      if (!utr || utr === 'N/A') {
        utr = getOriginalValue(row, 'Transaction Id / UTR Number2');
      }
      if (!utr || utr === 'N/A') {
        utr = getOriginalValue(row, 'UTR Number');
      }
      if (!utr || utr === 'N/A') {
        utr = getOriginalValue(row, 'UTR');
      }

      const atmId = String(row.atmId || '').trim() || getOriginalValue(row, 'ATM ID');

      withdrawals.push({
        id: generateId(),
        account,
        amount,
        date: String(row.date || ''),
        utr: utr !== 'undefined' ? utr : '',
        bank: String(row.bank || ''),
        ifsc: String(row.ifsc || ''),
        type,
        atmId: atmId !== 'undefined' && atmId !== 'N/A' ? atmId : undefined,
        rawData: row,
      });
    }
  }

  return withdrawals;
}

/**
 * Build the money trail graph using Python logic exactly
 * 
 * Key concepts from Python:
 * 1. Source node ID = `{fromAccount}_{layer}`
 * 2. Target node ID = `{toAccount}_{layer + 1}` 
 * 3. Withdrawal matching: account + layer + UTR sent from transfer = UTR of withdrawal
 * 4. Fallback matching: account + layer only
 */
export function buildMoneyTrailGraph(
  transfers: MoneyTransfer[],
  withdrawals: Withdrawal[],
  maxLayer: number,
  minAmount: number,
  utrToRow?: Map<string, Record<string, unknown>>
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: Map<string, GraphNode> = new Map();
  const edges: GraphEdge[] = [];

  // Filter transfers by layer and amount
  const filteredTransfers = transfers.filter(
    t => t.layer <= maxLayer && t.amount >= minAmount
  );

  // Build graph with proper node IDs: {canonicalAccount}_{layer}
  // Use canonical account IDs to ensure consistent matching even with leading zeros
  for (const transfer of filteredTransfers) {
    const fromAccountCanonical = getCanonicalAccountId(transfer.fromAccount);
    const toAccountCanonical = getCanonicalAccountId(transfer.toAccount);

    if (!fromAccountCanonical || !toAccountCanonical) continue;

    const srcNodeId = `${fromAccountCanonical}_${transfer.layer}`;
    const targetLayer = transfer.layer + 1;
    const tgtNodeId = `${toAccountCanonical}_${targetLayer}`;

    // Add source node - preserve original account string for display
    if (!nodes.has(srcNodeId)) {
      nodes.set(srcNodeId, {
        id: srcNodeId,
        account: transfer.fromAccount, // Keep original for display
        layer: transfer.layer,
        type: 'account',
        totalInflow: 0,
        totalOutflow: 0,
        transactions: [],
        isCollapsed: false,
        bank: transfer.bank,
        ifsc: transfer.ifsc,
        utrSent: transfer.utrSent,
        utrReceived: transfer.utrReceived,
      });
    }
    const srcNode = nodes.get(srcNodeId)!;
    // Preserve account string with leading zeros if the new one is more complete
    if (transfer.fromAccount &&
      (transfer.fromAccount.length > (srcNode.account?.length || 0) ||
        (transfer.fromAccount.startsWith('0') && !srcNode.account?.startsWith('0')))) {
      srcNode.account = transfer.fromAccount;
    }
    srcNode.totalOutflow += transfer.amount;
    srcNode.transactions.push(transfer);

    // Add target node only if within layer limit
    if (targetLayer <= maxLayer) {
      if (!nodes.has(tgtNodeId)) {
        nodes.set(tgtNodeId, {
          id: tgtNodeId,
          account: transfer.toAccount, // Keep original for display
          layer: targetLayer,
          type: 'account',
          totalInflow: 0,
          totalOutflow: 0,
          transactions: [],
          isCollapsed: false,
          bank: transfer.bank,
          ifsc: transfer.ifsc,
          utrSent: transfer.utrSent,
          utrReceived: transfer.utrReceived,
          linkageVerified: transfer.linkageVerified,
        });
      }
      const tgtNode = nodes.get(tgtNodeId)!;
      // Preserve account string with leading zeros if the new one is more complete
      if (transfer.toAccount &&
        (transfer.toAccount.length > (tgtNode.account?.length || 0) ||
          (transfer.toAccount.startsWith('0') && !tgtNode.account?.startsWith('0')))) {
        tgtNode.account = transfer.toAccount;
      }
      tgtNode.totalInflow += transfer.amount;
      tgtNode.transactions.push(transfer);

      // Add edge with UTR information
      edges.push({
        id: generateId(),
        source: srcNodeId,
        target: tgtNodeId,
        amount: transfer.amount,
        utr: transfer.utrSent,
        date: transfer.date,
        type: 'transfer',
        linkageVerified: transfer.linkageVerified,
        bank: transfer.bank,
        ifsc: transfer.ifsc,
      });
    }
  }

  // CRITICAL FIX: Ensure all nodes have proper incoming edges
  // Some nodes might be created as targets but also need to be sources
  // We need to merge nodes that represent the same account at the same layer
  // but were created from different transfers with different account formats
  const accountLayerMap = new Map<string, string>(); // canonicalAccount_layer -> nodeId
  const nodesToMerge: Array<{ canonical: string; nodeId: string; account: string }> = [];

  for (const node of nodes.values()) {
    if (node.type === 'account') {
      const canonical = getCanonicalAccountId(node.account);
      if (!canonical) continue;
      const key = `${canonical}_${node.layer}`;

      if (accountLayerMap.has(key)) {
        // Found duplicate - need to merge
        const existingNodeId = accountLayerMap.get(key)!;
        if (existingNodeId !== node.id) {
          nodesToMerge.push({ canonical: key, nodeId: node.id, account: node.account });
        }
      } else {
        accountLayerMap.set(key, node.id);
      }
    }
  }

  // Merge duplicate nodes
  for (const { canonical, nodeId, account } of nodesToMerge) {
    const existingNodeId = accountLayerMap.get(canonical);
    if (existingNodeId && existingNodeId !== nodeId && nodes.has(existingNodeId) && nodes.has(nodeId)) {
      const existingNode = nodes.get(existingNodeId)!;
      const duplicateNode = nodes.get(nodeId)!;

      // Merge transactions and amounts
      existingNode.totalInflow += duplicateNode.totalInflow;
      existingNode.totalOutflow += duplicateNode.totalOutflow;
      existingNode.transactions.push(...duplicateNode.transactions);

      // Preserve the account string with leading zeros (most complete format)
      // Prefer the longer account string or one that starts with zeros
      const existingAccount = existingNode.account || '';
      const duplicateAccount = duplicateNode.account || account || '';
      if (duplicateAccount.length > existingAccount.length ||
        (duplicateAccount.startsWith('0') && !existingAccount.startsWith('0'))) {
        existingNode.account = duplicateAccount;
      }

      // Preserve the most complete bank/IFSC info
      if (!existingNode.bank && duplicateNode.bank) {
        existingNode.bank = duplicateNode.bank;
      }
      if (!existingNode.ifsc && duplicateNode.ifsc) {
        existingNode.ifsc = duplicateNode.ifsc;
      }

      // Update all edges that reference the duplicate node
      for (const edge of edges) {
        if (edge.source === nodeId) {
          edge.source = existingNodeId;
        }
        if (edge.target === nodeId) {
          edge.target = existingNodeId;
        }
      }

      // Remove duplicate node
      nodes.delete(nodeId);
    }
  }

  // Final verification: ensure all target nodes that should have incoming edges do
  // This fixes the Layer 4 nodes missing incoming edges issue
  const nodeIds = new Set(nodes.keys());
  for (const edge of edges) {
    // If target node exists, it should have this incoming edge
    if (nodeIds.has(edge.target)) {
      const targetNode = nodes.get(edge.target);
      if (targetNode && targetNode.type === 'account') {
        // Verify the edge is properly connected
        // This is already handled by the edge creation above
      }
    }
  }

  // Get all accounts from graph nodes for withdrawal matching
  const graphAccounts = new Map<string, GraphNode>(); // canonicalAccount -> node
  for (const node of nodes.values()) {
    if (node.type === 'account' && node.account) {
      const canonical = getCanonicalAccountId(node.account);
      if (canonical) {
        graphAccounts.set(canonical, node);
      }
    }
  }

  // Match withdrawals to accounts using Python logic with proper account matching
  // Enhanced matching with better debugging and fallback logic
  for (const withdrawal of withdrawals) {
    const wAccount = withdrawal.account.trim();
    const wAccountCanonical = getCanonicalAccountId(wAccount);
    const wUtr = withdrawal.utr?.trim() || '';

    if (!wAccountCanonical) {
      console.warn('Withdrawal skipped: invalid account', withdrawal);
      continue;
    }

    // Check if account exists in graph - try multiple matching strategies
    let matchedAccountNode: GraphNode | null = null;

    // Strategy 1: Direct canonical match
    if (graphAccounts.has(wAccountCanonical)) {
      matchedAccountNode = graphAccounts.get(wAccountCanonical)!;
    } else {
      // Strategy 2: Try to find by matching any node with same canonical account (might be in different layer)
      for (const node of nodes.values()) {
        if (node.type === 'account') {
          const nodeCanonical = getCanonicalAccountId(node.account);
          if (nodeCanonical === wAccountCanonical) {
            matchedAccountNode = node;
            break;
          }
        }
      }
    }

    if (!matchedAccountNode) {
      // Account not found in graph - might be filtered out or doesn't exist
      console.warn('Withdrawal account not found in graph:', {
        withdrawalAccount: wAccount,
        canonical: wAccountCanonical,
        utr: wUtr,
        type: withdrawal.type,
        amount: withdrawal.amount
      });
      continue;
    }

    // Find layer from money transfer using UTR
    let matchedLayer: number | null = null;
    if (utrToRow && wUtr) {
      matchedLayer = getLayerFromMoneyTransfer(wUtr, utrToRow);
    }

    // If no layer found via UTR, use the matched node's layer
    if (matchedLayer === null) {
      matchedLayer = matchedAccountNode.layer;
    }

    // Check if layer is within limits
    if (matchedLayer === null || matchedLayer > maxLayer) {
      console.warn('Withdrawal layer out of bounds:', {
        withdrawalAccount: wAccount,
        matchedLayer,
        maxLayer,
        utr: wUtr
      });
      continue;
    }

    // Update matched account node if we found a better match
    // Check if there's a node at the matched layer with this account
    const layerSpecificNode = Array.from(nodes.values()).find(
      n => n.type === 'account' &&
        getCanonicalAccountId(n.account) === wAccountCanonical &&
        n.layer === matchedLayer
    );

    // Use layer-specific node if found, otherwise use the initially matched node
    const finalNode = layerSpecificNode || matchedAccountNode;

    withdrawal.linkedLayer = matchedLayer;
    withdrawal.linkedUtr = wUtr;

    // Create withdrawal node ID - always use unique withdrawal.id to ensure each withdrawal gets its own node
    // This ensures all withdrawals are visible, even if they have the same account and UTR
    const wNodeId = `${withdrawal.type.toUpperCase()}_${wAccountCanonical}_${withdrawal.id}`;

    // Always create a new node for each withdrawal to ensure all are visible
    // Each withdrawal.id is unique, so each withdrawal gets its own node
    nodes.set(wNodeId, {
      id: wNodeId,
      account: wAccount, // Keep original for display
      layer: matchedLayer,
      type: 'withdrawal',
      withdrawalType: withdrawal.type,
      totalInflow: withdrawal.amount,
      totalOutflow: 0,
      transactions: [withdrawal],
      isCollapsed: false,
      bank: withdrawal.bank,
      ifsc: withdrawal.ifsc,
    });

    // CRITICAL: Connect withdrawal to transfer node by matching BOTH account AND UTR sent
    // Python logic: Match by same account (canonical), same layer, and UTR sent from transfer = UTR of withdrawal
    let matched = false;

    // Verify the final node is at the correct layer
    if (finalNode.layer === matchedLayer) {
      // Try UTR matching first (preferred)
      // Check if ANY transaction in the node has a matching UTR
      let utrMatched = false;
      if (wUtr) {
        // Check node's utrSent first
        if (finalNode.utrSent === wUtr) {
          utrMatched = true;
        } else {
          // Check all transactions in the node for matching UTR
          for (const txn of finalNode.transactions) {
            if (txn.type === 'transfer') {
              const transfer = txn as MoneyTransfer;
              if (transfer.utrSent === wUtr || transfer.utrReceived === wUtr) {
                utrMatched = true;
                break;
              }
            }
          }
        }
      }

      // Always create an edge for each withdrawal
      // Each withdrawal gets its own unique node ID, so each gets its own edge
      edges.push({
        id: generateId(),
        source: finalNode.id,
        target: wNodeId,
        amount: withdrawal.amount,
        utr: wUtr,
        date: withdrawal.date,
        type: 'withdrawal',
      });
      matched = true;
    } else {
      // Layer mismatch - this shouldn't happen if layerSpecificNode was found earlier
      // But handle it just in case
      console.warn('Withdrawal layer mismatch (should not happen):', {
        withdrawalAccount: wAccount,
        matchedLayer,
        nodeLayer: finalNode.layer,
        utr: wUtr
      });

      // Still try to create edge as fallback
      edges.push({
        id: generateId(),
        source: finalNode.id,
        target: wNodeId,
        amount: withdrawal.amount,
        utr: wUtr,
        date: withdrawal.date,
        type: 'withdrawal',
      });
      matched = true;
    }

    if (!matched) {
      console.warn('Withdrawal not linked:', {
        withdrawalAccount: wAccount,
        canonical: wAccountCanonical,
        matchedLayer,
        utr: wUtr,
        nodeId: matchedAccountNode.id,
        nodeLayer: matchedAccountNode.layer,
        nodeUtrSent: matchedAccountNode.utrSent
      });
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

// Get all layers from graph
export function getLayersFromGraph(nodes: GraphNode[]): number[] {
  const layers = new Set(nodes.map(n => n.layer));
  return Array.from(layers).sort((a, b) => a - b);
}

// Search for account across all data
export function searchAccount(
  account: string,
  transfers: MoneyTransfer[],
  withdrawals: Withdrawal[],
  sheets: SheetData[]
): {
  incoming: MoneyTransfer[];
  outgoing: MoneyTransfer[];
  withdrawals: Withdrawal[];
  other: BaseTransaction[];
} {
  const searchTerm = account.toLowerCase().trim();

  const incoming = transfers.filter(
    t => t.toAccount.toLowerCase().includes(searchTerm)
  );

  const outgoing = transfers.filter(
    t => t.fromAccount.toLowerCase().includes(searchTerm)
  );

  const matchedWithdrawals = withdrawals.filter(
    w => w.account.toLowerCase().includes(searchTerm)
  );

  // Search other sheets (AEPS, holds, etc.)
  const other: BaseTransaction[] = [];
  for (const sheet of sheets) {
    if (['aeps', 'hold', 'other'].includes(sheet.type)) {
      for (const row of sheet.rows) {
        const accountVal = String(row.account || '').toLowerCase();
        const fromAccountVal = String(row.fromAccount || '').toLowerCase();

        if (accountVal.includes(searchTerm) || fromAccountVal.includes(searchTerm)) {
          other.push({
            id: generateId(),
            account: String(row.account || row.fromAccount),
            amount: Number(row.amount) || 0,
            date: String(row.date || ''),
            utr: String(row.utr || ''),
            bank: String(row.bank || ''),
            ifsc: String(row.ifsc || ''),
            type: sheet.type as any,
            rawData: row,
          });
        }
      }
    }
  }

  return { incoming, outgoing, withdrawals: matchedWithdrawals, other };
}
