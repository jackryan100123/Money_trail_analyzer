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
  searchAccount 
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
  visibleLayers: Set<number>; // Empty = all visible, otherwise only specified layers
  
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
  
  // Layer visibility
  toggleLayerVisibility: (layer: number) => void;
  showAllLayers: () => void;
  setVisibleLayers: (layers: number[]) => void;
  
  // Search
  searchResults: ReturnType<typeof searchAccount> | null;
  performSearch: (account: string) => void;
  clearSearch: () => void;
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
  visibleLayers: new Set(), // Empty = all visible
  
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
      visibleLayers: new Set(), // Reset to show all layers
    });
  },
  
  setFilters: (newFilters) => {
    const { filters, transfers, withdrawals, utrToRow } = get();
    const updatedFilters = { ...filters, ...newFilters };
    
    const { nodes, edges } = buildMoneyTrailGraph(
      transfers,
      withdrawals,
      updatedFilters.maxLayer,
      updatedFilters.minAmount,
      utrToRow
    );
    
    set({
      filters: updatedFilters,
      graphNodes: nodes,
      graphEdges: edges,
      visibleLayers: new Set(), // Reset layer visibility when filters change
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
  
  // Layer visibility actions
  toggleLayerVisibility: (layer) => {
    const { visibleLayers, graphNodes } = get();
    const newVisible = new Set(visibleLayers);
    
    // Get all available layers
    const allLayers = new Set(
      graphNodes.filter(n => n.type === 'account').map(n => n.layer)
    );
    
    // If currently showing all (empty set), switch to showing all except clicked
    if (newVisible.size === 0) {
      allLayers.forEach(l => {
        if (l !== layer) newVisible.add(l);
      });
    } else if (newVisible.has(layer)) {
      // If layer is visible, hide it
      newVisible.delete(layer);
      // If all would be hidden, show all instead
      if (newVisible.size === 0) {
        // Keep at least one layer visible - re-add this one
        newVisible.add(layer);
      }
    } else {
      // If layer is hidden, show it
      newVisible.add(layer);
      // If all layers are now visible, clear the set (show all mode)
      if (newVisible.size === allLayers.size) {
        newVisible.clear();
      }
    }
    
    set({ visibleLayers: newVisible });
  },
  
  showAllLayers: () => {
    set({ visibleLayers: new Set() });
  },
  
  setVisibleLayers: (layers) => {
    set({ visibleLayers: new Set(layers) });
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
}));
