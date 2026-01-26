import { create } from 'zustand';
import type { 
  SheetData, 
  MoneyTransfer, 
  Withdrawal, 
  GraphNode, 
  GraphEdge,
  FilterState,
  UtrColumns
} from '@/types/financial';
import { 
  extractMoneyTransfers, 
  extractWithdrawals, 
  buildMoneyTrailGraph,
  searchAccount,
  getCanonicalAccountId
} from '@/lib/graphBuilder';

interface InvestigationState {
  // Data
  sheets: SheetData[];
  transfers: MoneyTransfer[];
  withdrawals: Withdrawal[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  
  // UTR tracking for proper linkage (matching Python logic)
  utrToRow: Map<string, Record<string, unknown>>;
  utrColumns: UtrColumns;
  
  // UI State
  collapsedNodes: Set<string>;
  selectedNode: string | null;
  activeView: 'graph' | 'data' | 'search' | 'withdrawals';
  
  // Filters
  filters: FilterState;
  
  // Actions
  loadSheets: (sheets: SheetData[]) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  collapseLayer: (layer: number) => void;
  expandAll: () => void;
  setSelectedNode: (nodeId: string | null) => void;
  setActiveView: (view: 'graph' | 'data' | 'search' | 'withdrawals') => void;
  rebuildGraph: () => void;
  
  // Search
  searchResults: ReturnType<typeof searchAccount> | null;
  performSearch: (account: string) => void;
  clearSearch: () => void;
  
  // Graph search (for navigating to nodes)
  graphSearchQuery: string;
  graphSearchResult: string | null; // nodeId or null
  performGraphSearch: (query: string) => void;
  clearGraphSearch: () => void;
}

export const useInvestigationStore = create<InvestigationState>((set, get) => ({
  // Initial state
  sheets: [],
  transfers: [],
  withdrawals: [],
  graphNodes: [],
  graphEdges: [],
  utrToRow: new Map(),
  utrColumns: { utr1Col: null, utr2Col: null },
  collapsedNodes: new Set(),
  selectedNode: null,
  activeView: 'graph',
  searchResults: null,
  graphSearchQuery: '',
  graphSearchResult: null,
  
  filters: {
    maxLayer: 4, // Default to layer 4 per user requirement
    minAmount: 0,
    selectedSheets: [],
    searchAccount: '',
    transactionTypes: ['transfer', 'atm', 'pos', 'cheque', 'aeps', 'hold', 'other'],
  },
  
  loadSheets: (sheets) => {
    // Extract transfers with UTR tracking (matching Python logic)
    const { transfers, utrToRow, utrColumns } = extractMoneyTransfers(sheets);
    const withdrawals = extractWithdrawals(sheets);
    
    const { filters } = get();
    const { nodes, edges } = buildMoneyTrailGraph(
      transfers, 
      withdrawals, 
      filters.maxLayer, 
      filters.minAmount,
      utrToRow
    );
    
    set({
      sheets,
      transfers,
      withdrawals,
      utrToRow,
      utrColumns,
      graphNodes: nodes,
      graphEdges: edges,
      collapsedNodes: new Set(),
      selectedNode: null,
    });
  },
  
  setFilters: (newFilters) => {
    const { filters, transfers, withdrawals, utrToRow, selectedNode } = get();
    const updatedFilters = { ...filters, ...newFilters };
    
    const { nodes, edges } = buildMoneyTrailGraph(
      transfers,
      withdrawals,
      updatedFilters.maxLayer,
      updatedFilters.minAmount,
      utrToRow
    );
    
    // Clear selected node if it no longer exists after filtering
    const shouldClearSelection = selectedNode && !nodes.find(n => n.id === selectedNode);
    
    set({
      filters: updatedFilters,
      graphNodes: nodes,
      graphEdges: edges,
      selectedNode: shouldClearSelection ? null : selectedNode,
      collapsedNodes: new Set(), // Reset collapsed nodes when filters change
    });
  },
  
  toggleNodeCollapse: (nodeId) => {
    const { collapsedNodes } = get();
    const newCollapsed = new Set(collapsedNodes);
    
    if (newCollapsed.has(nodeId)) {
      newCollapsed.delete(nodeId);
    } else {
      newCollapsed.add(nodeId);
    }
    
    set({ collapsedNodes: newCollapsed });
  },
  
  collapseLayer: (layer) => {
    const { graphNodes, collapsedNodes } = get();
    const newCollapsed = new Set(collapsedNodes);
    
    graphNodes
      .filter(n => n.layer === layer && n.type === 'account')
      .forEach(n => newCollapsed.add(n.id));
    
    set({ collapsedNodes: newCollapsed });
  },
  
  expandAll: () => {
    set({ collapsedNodes: new Set() });
  },
  
  setSelectedNode: (nodeId) => {
    set({ selectedNode: nodeId });
  },
  
  setActiveView: (view) => {
    set({ activeView: view });
  },
  
  rebuildGraph: () => {
    const { transfers, withdrawals, filters, utrToRow } = get();
    const { nodes, edges } = buildMoneyTrailGraph(
      transfers,
      withdrawals,
      filters.maxLayer,
      filters.minAmount,
      utrToRow
    );
    
    set({
      graphNodes: nodes,
      graphEdges: edges,
    });
  },
  
  performSearch: (account) => {
    const { transfers, withdrawals, sheets } = get();
    const results = searchAccount(account, transfers, withdrawals, sheets);
    set({ 
      searchResults: results,
      filters: { ...get().filters, searchAccount: account }
    });
  },
  
  clearSearch: () => {
    set({ 
      searchResults: null,
      filters: { ...get().filters, searchAccount: '' }
    });
  },
  
  performGraphSearch: (query) => {
    const { graphNodes, graphEdges } = get();
    const searchTerm = query.trim();
    
    if (!searchTerm) {
      set({ graphSearchQuery: '', graphSearchResult: null, selectedNode: null });
      return;
    }
    
    // Search by account number (canonical matching)
    const accountCanonical = getCanonicalAccountId(searchTerm);
    
    // Search by UTR
    const utrSearch = searchTerm;
    
    // Find matching node
    let foundNodeId: string | null = null;
    
    for (const node of graphNodes) {
      // Match by account (canonical)
      if (accountCanonical) {
        const nodeCanonical = getCanonicalAccountId(node.account);
        if (nodeCanonical === accountCanonical) {
          foundNodeId = node.id;
          break;
        }
      }
      
      // Match by account (exact or partial)
      if (node.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.account.includes(searchTerm)) {
        foundNodeId = node.id;
        break;
      }
      
      // Match by UTR in transactions
      for (const txn of node.transactions) {
        if (txn.utr && (txn.utr.includes(utrSearch) || txn.utr === utrSearch)) {
          foundNodeId = node.id;
          break;
        }
      }
      
      // Match by node's UTR fields
      if (node.utrSent && (node.utrSent.includes(utrSearch) || node.utrSent === utrSearch)) {
        foundNodeId = node.id;
        break;
      }
      if (node.utrReceived && (node.utrReceived.includes(utrSearch) || node.utrReceived === utrSearch)) {
        foundNodeId = node.id;
        break;
      }
      
      if (foundNodeId) break;
    }
    
    // Also search edges for UTR matches
    if (!foundNodeId) {
      for (const edge of graphEdges) {
        if (edge.utr && (edge.utr.includes(utrSearch) || edge.utr === utrSearch)) {
          // Find the target node (withdrawal) or source node
          const targetNode = graphNodes.find(n => n.id === edge.target);
          if (targetNode) {
            foundNodeId = targetNode.id;
            break;
          }
        }
      }
    }
    
    set({ 
      graphSearchQuery: searchTerm,
      graphSearchResult: foundNodeId,
      selectedNode: foundNodeId
    });
  },
  
  clearGraphSearch: () => {
    set({ 
      graphSearchQuery: '',
      graphSearchResult: null
    });
  },
}));
