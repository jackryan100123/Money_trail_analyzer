import { useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Search, X } from 'lucide-react';

import { useInvestigationStore } from '@/store/investigationStore';
import { TransactionNode, type TransactionNodeData } from './TransactionNode';
import type { GraphNode, GraphEdge } from '@/types/financial';

const nodeTypes = {
  transaction: TransactionNode as any,
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;
const WITHDRAWAL_SIZE = 50;

// Build hierarchical layout using dagre
function getLayoutedElements(
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[],
  collapsedNodes: Set<string>
): { nodes: Node<TransactionNodeData>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 80 });

  // Filter out nodes that are downstream of collapsed nodes
  const collapsedSubtrees = new Set<string>();

  // Identify descendants of collapsed nodes
  for (const collapsedId of collapsedNodes) {
    const descendants = findDescendants(collapsedId, graphEdges);
    descendants.forEach(d => collapsedSubtrees.add(d));
  }

  // Filter nodes and edges
  const visibleNodes = graphNodes.filter(
    n => !collapsedSubtrees.has(n.id)
  );
  const visibleEdges = graphEdges.filter(
    e => !collapsedSubtrees.has(e.source) && !collapsedSubtrees.has(e.target)
  );

  // Add nodes to dagre
  visibleNodes.forEach((node) => {
    const isWithdrawal = node.type === 'withdrawal';
    dagreGraph.setNode(node.id, {
      width: isWithdrawal ? WITHDRAWAL_SIZE : NODE_WIDTH,
      height: isWithdrawal ? WITHDRAWAL_SIZE : NODE_HEIGHT,
    });
  });

  // Add edges to dagre
  visibleEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Convert to React Flow format
  const nodes: Node<TransactionNodeData>[] = visibleNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isWithdrawal = node.type === 'withdrawal';
    
    return {
      id: node.id,
      type: 'transaction',
      position: {
        x: nodeWithPosition.x - (isWithdrawal ? WITHDRAWAL_SIZE : NODE_WIDTH) / 2,
        y: nodeWithPosition.y - (isWithdrawal ? WITHDRAWAL_SIZE : NODE_HEIGHT) / 2,
      },
      data: {
        account: node.account,
        layer: node.layer,
        type: node.type,
        withdrawalType: node.withdrawalType,
        totalInflow: node.totalInflow,
        totalOutflow: node.totalOutflow,
        transactions: node.transactions,
        isCollapsed: node.isCollapsed,
        bank: node.bank,
        ifsc: node.ifsc,
        label: node.account,
      },
    };
  });

  const edges: Edge[] = visibleEdges.map((edge) => {
    const isWithdrawal = edge.type === 'withdrawal';
    const amount = edge.amount;
    const strokeWidth = Math.min(Math.max(Math.log10(amount + 1), 1), 6);
    
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: !isWithdrawal,
      style: {
        stroke: isWithdrawal 
          ? 'hsl(var(--atm))' 
          : 'hsl(var(--transfer))',
        strokeWidth,
        strokeDasharray: isWithdrawal ? '5,5' : undefined,
        opacity: 0.7,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isWithdrawal ? 'hsl(var(--atm))' : 'hsl(var(--transfer))',
      },
      label: `₹${formatCompact(amount)}`,
      labelStyle: {
        fill: 'hsl(var(--muted-foreground))',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
      labelBgStyle: {
        fill: 'hsl(var(--background))',
        opacity: 0.8,
      },
    };
  });

  return { nodes, edges };
}

function findDescendants(nodeId: string, edges: GraphEdge[]): string[] {
  const descendants: string[] = [];
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const children = edges
      .filter(e => e.source === current)
      .map(e => e.target);

    for (const child of children) {
      if (!visited.has(child)) {
        descendants.push(child);
        queue.push(child);
      }
    }
  }

  return descendants;
}

function formatCompact(num: number): string {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

// Component to handle navigation to searched nodes (must be inside ReactFlow context)
function GraphSearchHandler({ 
  searchResult, 
  nodes, 
  onSelectNode 
}: { 
  searchResult: string | null; 
  nodes: Node<TransactionNodeData>[];
  onSelectNode: (nodeId: string) => void;
}) {
  const { fitView } = useReactFlow();
  
  useEffect(() => {
    if (searchResult) {
      // Find the node in the React Flow nodes
      const flowNode = nodes.find(n => n.id === searchResult);
      if (flowNode) {
        // Select the node
        onSelectNode(searchResult);
        
        // Navigate to the node
        setTimeout(() => {
          fitView({
            nodes: [{ id: searchResult }],
            padding: 0.3,
            duration: 500,
          });
        }, 100);
      }
    }
  }, [searchResult, nodes, fitView, onSelectNode]);
  
  return null;
}

export function MoneyTrailGraph() {
  const { 
    graphNodes, 
    graphEdges, 
    collapsedNodes, 
    sheets,
    graphSearchQuery,
    graphSearchResult,
    performGraphSearch,
    clearGraphSearch,
    selectedNode,
    setSelectedNode
  } = useInvestigationStore();
  
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(graphNodes, graphEdges, collapsedNodes),
    [graphNodes, graphEdges, collapsedNodes]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performGraphSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    clearGraphSearch();
    setSelectedNode(null);
  };

  if (sheets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">No Data Loaded</h3>
            <p className="text-sm mt-1">Upload an Excel file to visualize the money trail</p>
          </div>
        </div>
      </div>
    );
  }

  // Only show "no transfers" if data was loaded but no transfer nodes exist
  const hasTransferNodes = graphNodes.some(n => n.type === 'account');
  
  if (!hasTransferNodes && graphNodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">No Money Transfers Found</h3>
            <p className="text-sm mt-1">Try adjusting the layer filter or check your data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10 w-80">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Account No. or Transaction ID (UTR)..."
              className="w-full pl-10 pr-10 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {graphSearchResult === null && graphSearchQuery && (
            <div className="mt-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              No node found matching "{graphSearchQuery}"
            </div>
          )}
          {graphSearchResult && (
            <div className="mt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md text-sm text-green-600 dark:text-green-400">
              Found node! Navigated to account/transaction.
            </div>
          )}
        </form>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <GraphSearchHandler 
          searchResult={graphSearchResult}
          nodes={nodes}
          onSelectNode={setSelectedNode}
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="hsl(var(--border))"
        />
        <Controls 
          showInteractive={false}
          className="bg-card border border-border rounded-md"
        />
        <MiniMap
          nodeColor={() => 'hsl(var(--transfer))'}
          maskColor="hsl(var(--background) / 0.8)"
          className="bg-card border border-border rounded-md"
        />
      </ReactFlow>
    </div>
  );
}
