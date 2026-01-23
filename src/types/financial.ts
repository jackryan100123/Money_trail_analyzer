// Core transaction types for money trail analysis

export type TransactionType = 
  | 'transfer' 
  | 'atm' 
  | 'pos' 
  | 'cheque' 
  | 'aeps' 
  | 'hold' 
  | 'other';

export interface BaseTransaction {
  id: string;
  account: string;
  amount: number;
  date: string;
  utr: string;
  bank?: string;
  ifsc?: string;
  type: TransactionType;
  rawData: Record<string, unknown>;
}

export interface MoneyTransfer extends BaseTransaction {
  type: 'transfer';
  layer: number;
  fromAccount: string;
  toAccount: string;
  // CRITICAL: Two different UTR fields as per Python logic
  utrSent: string;      // Original/Sent UTR (Transaction ID / UTR Number2)
  utrReceived: string;  // Linkage/Received UTR (Transaction Id / UTR Number)
  linkageVerified?: boolean;
}

export interface Withdrawal extends BaseTransaction {
  type: 'atm' | 'pos' | 'cheque';
  linkedLayer?: number;
  linkedUtr?: string;
  atmId?: string;
}

export interface OtherTransaction extends BaseTransaction {
  type: 'aeps' | 'hold' | 'other';
  subType?: string;
  linkedLayer?: number;
}

// Graph node types
export interface GraphNode {
  id: string;
  account: string;
  layer: number;
  type: 'account' | 'withdrawal';
  withdrawalType?: TransactionType;
  totalInflow: number;
  totalOutflow: number;
  transactions: BaseTransaction[];
  isCollapsed: boolean;
  bank?: string;
  ifsc?: string;
  // UTR tracking for proper linkage
  utrSent?: string;
  utrReceived?: string;
  linkageVerified?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  utr: string;
  date: string;
  type: 'transfer' | 'withdrawal';
  linkageVerified?: boolean;
  bank?: string;
  ifsc?: string;
}

// Sheet data structure
export interface SheetData {
  name: string;
  type: TransactionType | 'unknown';
  rows: Record<string, unknown>[];
  columns: string[];
  originalColumns: string[]; // Keep original column names for UTR detection
}

// UTR Column Detection Result
export interface UtrColumns {
  utr1Col: string | null; // Linkage/Received UTR (Transaction Id / UTR Number)
  utr2Col: string | null; // Original/Sent UTR (Transaction ID / UTR Number2)
}

// Analysis results
export interface AccountTrail {
  account: string;
  incomingTransfers: MoneyTransfer[];
  outgoingTransfers: MoneyTransfer[];
  withdrawals: Withdrawal[];
  otherTransactions: OtherTransaction[];
  layersInvolved: number[];
  totalInflow: number;
  totalOutflow: number;
  totalWithdrawals: number;
  transactionCount: number;
}

// Filter state
export interface FilterState {
  maxLayer: number;
  minAmount: number;
  selectedSheets: string[];
  searchAccount: string;
  transactionTypes: TransactionType[];
}
