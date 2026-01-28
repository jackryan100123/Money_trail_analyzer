// import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
// import {
//   ReactFlow,
//   Controls,
//   MiniMap,
//   Background,
//   BackgroundVariant,
//   useNodesState,
//   useEdgesState,
//   useReactFlow,
//   type Node,
//   type Edge,
//   MarkerType,
// } from '@xyflow/react';
// import '@xyflow/react/dist/style.css';
// import dagre from 'dagre';
// import { Search, X } from 'lucide-react';

// import { useInvestigationStore } from '@/store/investigationStore';
// import { TransactionNode, type TransactionNodeData } from './TransactionNode';
// import type { GraphNode, GraphEdge } from '@/types/financial';

// const nodeTypes = {
//   transaction: TransactionNode as any,
// };

// const NODE_WIDTH = 140;
// const NODE_HEIGHT = 80;
// const WITHDRAWAL_SIZE = 50;

// // Build hierarchical layout using dagre
// function getLayoutedElements(
//   graphNodes: GraphNode[],
//   graphEdges: GraphEdge[],
//   collapsedNodes: Set<string>
// ): { nodes: Node<TransactionNodeData>[]; edges: Edge[] } {
//   // Handle empty graph
//   if (graphNodes.length === 0) {
//     return { nodes: [], edges: [] };
//   }

//   const dagreGraph = new dagre.graphlib.Graph();
//   dagreGraph.setDefaultEdgeLabel(() => ({}));
//   dagreGraph.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 80 });

//   // Filter out nodes that are downstream of collapsed nodes
//   const collapsedSubtrees = new Set<string>();

//   // Identify descendants of collapsed nodes
//   for (const collapsedId of collapsedNodes) {
//     const descendants = findDescendants(collapsedId, graphEdges);
//     descendants.forEach(d => collapsedSubtrees.add(d));
//   }

//   // Filter nodes and edges
//   const visibleNodes = graphNodes.filter(
//     n => !collapsedSubtrees.has(n.id)
//   );
//   const visibleEdges = graphEdges.filter(
//     e => !collapsedSubtrees.has(e.source) && !collapsedSubtrees.has(e.target)
//   );

//   // Handle case where all nodes are filtered out
//   if (visibleNodes.length === 0) {
//     return { nodes: [], edges: [] };
//   }

//   // Add nodes to dagre
//   visibleNodes.forEach((node) => {
//     const isWithdrawal = node.type === 'withdrawal';
//     dagreGraph.setNode(node.id, {
//       width: isWithdrawal ? WITHDRAWAL_SIZE : NODE_WIDTH,
//       height: isWithdrawal ? WITHDRAWAL_SIZE : NODE_HEIGHT,
//     });
//   });

//   // Add edges to dagre
//   visibleEdges.forEach((edge) => {
//     dagreGraph.setEdge(edge.source, edge.target);
//   });

//   try {
//     dagre.layout(dagreGraph);
//   } catch (error) {
//     console.error('Dagre layout error:', error);
//     // Return empty if layout fails
//     return { nodes: [], edges: [] };
//   }

//   // Convert to React Flow format
//   const nodes: Node<TransactionNodeData>[] = visibleNodes.map((node) => {
//     const nodeWithPosition = dagreGraph.node(node.id);
//     const isWithdrawal = node.type === 'withdrawal';

//     return {
//       id: node.id,
//       type: 'transaction',
//       position: {
//         x: nodeWithPosition.x - (isWithdrawal ? WITHDRAWAL_SIZE : NODE_WIDTH) / 2,
//         y: nodeWithPosition.y - (isWithdrawal ? WITHDRAWAL_SIZE : NODE_HEIGHT) / 2,
//       },
//       data: {
//         account: node.account,
//         layer: node.layer,
//         type: node.type,
//         withdrawalType: node.withdrawalType,
//         totalInflow: node.totalInflow,
//         totalOutflow: node.totalOutflow,
//         transactions: node.transactions,
//         isCollapsed: node.isCollapsed,
//         bank: node.bank,
//         ifsc: node.ifsc,
//         label: node.account,
//       },
//     };
//   });

//   const edges: Edge[] = visibleEdges.map((edge) => {
//     const isWithdrawal = edge.type === 'withdrawal';
//     const amount = edge.amount;
//     const strokeWidth = Math.min(Math.max(Math.log10(amount + 1), 1), 6);

//     return {
//       id: edge.id,
//       source: edge.source,
//       target: edge.target,
//       type: 'smoothstep',
//       animated: !isWithdrawal,
//       style: {
//         stroke: isWithdrawal
//           ? 'hsl(var(--atm))'
//           : 'hsl(var(--transfer))',
//         strokeWidth,
//         strokeDasharray: isWithdrawal ? '5,5' : undefined,
//         opacity: 0.7,
//       },
//       markerEnd: {
//         type: MarkerType.ArrowClosed,
//         color: isWithdrawal ? 'hsl(var(--atm))' : 'hsl(var(--transfer))',
//       },
//       label: `?${formatCompact(amount)}`,
//       labelStyle: {
//         fill: 'hsl(var(--muted-foreground))',
//         fontSize: 10,
//         fontFamily: 'JetBrains Mono, monospace',
//       },
//       labelBgStyle: {
//         fill: 'hsl(var(--background))',
//         opacity: 0.8,
//       },
//     };
//   });

//   return { nodes, edges };
// }

// function findDescendants(nodeId: string, edges: GraphEdge[]): string[] {
//   const descendants: string[] = [];
//   const queue = [nodeId];
//   const visited = new Set<string>();

//   while (queue.length > 0) {
//     const current = queue.shift()!;
//     if (visited.has(current)) continue;
//     visited.add(current);

//     const children = edges
//       .filter(e => e.source === current)
//       .map(e => e.target);

//     for (const child of children) {
//       if (!visited.has(child)) {
//         descendants.push(child);
//         queue.push(child);
//       }
//     }
//   }

//   return descendants;
// }

// function formatCompact(num: number): string {
//   if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
//   if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
//   if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
//   return num.toFixed(0);
// }

// // Component to handle navigation to searched nodes and graph updates (must be inside ReactFlow context)
// function GraphSearchHandler({
//   searchResult,
//   nodes,
//   onSelectNode,
//   nodeCount,
//   shouldFitView
// }: {
//   searchResult: string | null;
//   nodes: Node<TransactionNodeData>[];
//   onSelectNode: (nodeId: string) => void;
//   nodeCount: number;
//   shouldFitView: boolean;
// }) {
//   const { fitView } = useReactFlow();

//   // Handle search result navigation
//   useEffect(() => {
//     if (searchResult) {
//       const flowNode = nodes.find(n => n.id === searchResult);
//       if (flowNode) {
//         onSelectNode(searchResult);
//         setTimeout(() => {
//           fitView({
//             nodes: [{ id: searchResult }],
//             padding: 0.3,
//             duration: 500,
//           });
//         }, 100);
//       }
//     }
//   }, [searchResult, nodes, fitView, onSelectNode]);

//   // Force fitView when graph changes (e.g., when filters change)
//   // This centers the trail in the view automatically
//   const prevShouldFitViewRef = useRef(false);
//   useEffect(() => {
//     if (shouldFitView && nodes.length > 0 && !prevShouldFitViewRef.current) {
//       prevShouldFitViewRef.current = true;
//       // Small delay to ensure React Flow has fully updated with new nodes/edges
//       const timeoutId = setTimeout(() => {
//         fitView({
//           padding: 0.2,
//           duration: 400,
//           maxZoom: 1.5,
//           minZoom: 0.1
//         });
//         // Reset the flag after fitting
//         setTimeout(() => {
//           prevShouldFitViewRef.current = false;
//         }, 500);
//       }, 200);
//       return () => clearTimeout(timeoutId);
//     } else if (!shouldFitView) {
//       prevShouldFitViewRef.current = false;
//     }
//   }, [shouldFitView, nodes.length, fitView]);

//   return null;
// }

// export function MoneyTrailGraph() {
//   const {
//     graphNodes,
//     graphEdges,
//     collapsedNodes,
//     sheets,
//     graphSearchQuery,
//     graphSearchResult,
//     performGraphSearch,
//     clearGraphSearch,
//     selectedNode,
//     setSelectedNode
//   } = useInvestigationStore();

//   const [searchInput, setSearchInput] = useState('');
//   const searchInputRef = useRef<HTMLInputElement>(null);

//   const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
//     () => getLayoutedElements(graphNodes, graphEdges, collapsedNodes),
//     [graphNodes, graphEdges, collapsedNodes]
//   );

//   const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
//   const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

//   // Track when we should fit the view (when filters change)
//   const [shouldFitView, setShouldFitView] = useState(false);

//   // Force update when graph data changes - use a ref to track changes
//   const prevDataRef = useRef({
//     nodeIds: graphNodes.map(n => n.id).join(','),
//     nodeCount: graphNodes.length
//   });

//   // Update nodes and edges when layout changes (e.g., when filters change)
//   useEffect(() => {
//     const currentNodeIds = graphNodes.map(n => n.id).join(',');
//     const dataChanged =
//       prevDataRef.current.nodeIds !== currentNodeIds ||
//       prevDataRef.current.nodeCount !== graphNodes.length;

//     if (dataChanged) {
//       prevDataRef.current = {
//         nodeIds: currentNodeIds,
//         nodeCount: graphNodes.length
//       };

//       // Force update - create new arrays to ensure React Flow detects change
//       setNodes(layoutedNodes.map(n => ({ ...n })));
//       setEdges(layoutedEdges.map(e => ({ ...e })));

//       // Trigger fitView after update (only if we have nodes)
//       if (layoutedNodes.length > 0) {
//         setShouldFitView(true);
//         // Reset flag after a delay to allow fitView to trigger
//         setTimeout(() => setShouldFitView(false), 1000);
//       }
//     } else {
//       // Still update to sync with layout changes
//       setNodes(layoutedNodes);
//       setEdges(layoutedEdges);
//     }

//     // Clear selected node if it no longer exists in the graph
//     if (selectedNode && !layoutedNodes.find(n => n.id === selectedNode)) {
//       setSelectedNode(null);
//     }
//   }, [layoutedNodes, layoutedEdges, setNodes, setEdges, selectedNode, setSelectedNode, graphNodes]);

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault();
//     performGraphSearch(searchInput);
//   };

//   const handleClearSearch = () => {
//     setSearchInput('');
//     clearGraphSearch();
//     setSelectedNode(null);
//   };

//   if (sheets.length === 0) {
//     return (
//       <div className="h-full flex items-center justify-center text-muted-foreground">
//         <div className="text-center space-y-4">
//           <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
//             <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
//             </svg>
//           </div>
//           <div>
//             <h3 className="text-lg font-medium text-foreground">No Data Loaded</h3>
//             <p className="text-sm mt-1">Upload an Excel file to visualize the money trail</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Check if there are any nodes after filtering
//   const hasNodes = graphNodes.length > 0;
//   const hasLayoutedNodes = layoutedNodes.length > 0;
//   const hasTransferNodes = graphNodes.some(n => n.type === 'account');

//   // Show message if no nodes after filtering (but data exists)
//   if (sheets.length > 0 && !hasNodes) {
//     return (
//       <div className="h-full flex items-center justify-center text-muted-foreground">
//         <div className="text-center space-y-4">
//           <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
//             <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//           </div>
//           <div>
//             <h3 className="text-lg font-medium text-foreground">No Nodes Found</h3>
//             <p className="text-sm mt-1">No nodes match the current filter settings. Try adjusting the layer or amount filters.</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Only show "no transfers" if data was loaded but no transfer nodes exist
//   if (!hasTransferNodes && graphNodes.length === 0 && sheets.length > 0) {
//     return (
//       <div className="h-full flex items-center justify-center text-muted-foreground">
//         <div className="text-center space-y-4">
//           <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
//             <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//           </div>
//           <div>
//             <h3 className="text-lg font-medium text-foreground">No Money Transfers Found</h3>
//             <p className="text-sm mt-1">Try adjusting the layer filter or check your data</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Don't render ReactFlow if there are no layouted nodes (all collapsed or filtered out)
//   if (!hasLayoutedNodes && sheets.length > 0) {
//     return (
//       <div className="h-full flex items-center justify-center text-muted-foreground">
//         <div className="text-center space-y-4">
//           <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
//             <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//           </div>
//           <div>
//             <h3 className="text-lg font-medium text-foreground">No Visible Nodes</h3>
//             <p className="text-sm mt-1">All nodes are collapsed or filtered out. Try expanding nodes or adjusting filters.</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="relative w-full h-full">
//       {/* Search Bar */}
//       <div className="absolute top-4 left-4 z-10 w-80">
//         <form onSubmit={handleSearch} className="relative">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//             <input
//               ref={searchInputRef}
//               type="text"
//               value={searchInput}
//               onChange={(e) => setSearchInput(e.target.value)}
//               placeholder="Search by Account No. or Transaction ID (UTR)..."
//               className="w-full pl-10 pr-10 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
//             />
//             {searchInput && (
//               <button
//                 type="button"
//                 onClick={handleClearSearch}
//                 className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
//               >
//                 <X className="w-4 h-4 text-muted-foreground" />
//               </button>
//             )}
//           </div>
//           {graphSearchResult === null && graphSearchQuery && (
//             <div className="mt-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
//               No node found matching "{graphSearchQuery}"
//             </div>
//           )}
//           {graphSearchResult && (
//             <div className="mt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md text-sm text-green-600 dark:text-green-400">
//               Found node! Navigated to account/transaction.
//             </div>
//           )}
//         </form>
//       </div>

//       <ReactFlow
//         key={`rf-${graphNodes.length}-${graphEdges.length}`}
//         nodes={nodes}
//         edges={edges}
//         onNodesChange={onNodesChange}
//         onEdgesChange={onEdgesChange}
//         nodeTypes={nodeTypes}
//         fitView
//         fitViewOptions={{ padding: 0.2 }}
//         minZoom={0.1}
//         maxZoom={2}
//         proOptions={{ hideAttribution: true }}
//       >
//         <GraphSearchHandler
//           searchResult={graphSearchResult}
//           nodes={nodes}
//           onSelectNode={setSelectedNode}
//           nodeCount={graphNodes.length}
//           shouldFitView={shouldFitView}
//         />
//         <Background
//           variant={BackgroundVariant.Dots}
//           gap={20}
//           size={1}
//           color="hsl(var(--border))"
//         />
//         <Controls
//           showInteractive={false}
//           className="bg-card border border-border rounded-md"
//         />
//         <MiniMap
//           nodeColor={() => 'hsl(var(--transfer))'}
//           maskColor="hsl(var(--background) / 0.8)"
//           className="bg-card border border-border rounded-md"
//         />
//       </ReactFlow>
//     </div>
//   );
// }

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  MarkerType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import { useInvestigationStore } from '@/store/investigationStore';
import { TransactionNode, type TransactionNodeData } from './TransactionNode';
import type { GraphNode, GraphEdge } from '@/types/financial';

const nodeTypes = {
  transaction: TransactionNode as any,
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 90;
const WITHDRAWAL_SIZE = 60;

// Build hierarchical layout using dagre - VERTICAL orientation with better spacing
function getLayoutedElements(
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[],
  collapsedNodes: Set<string>
): { nodes: Node<TransactionNodeData>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  // Use TB (top-to-bottom) with increased spacing to reduce overlap
  dagreGraph.setGraph({ 
    rankdir: 'TB', 
    ranksep: 180,  // Increased vertical spacing between layers
    nodesep: 100,  // Increased horizontal spacing between nodes
    edgesep: 50,   // Edge spacing
    marginx: 50,
    marginy: 50,
  });

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

// Inner component that uses useReactFlow
function MoneyTrailGraphInner() {
  const { graphNodes, graphEdges, collapsedNodes, sheets, filters, visibleLayers } = useInvestigationStore();
  const { fitView } = useReactFlow();
  
  // Create a unique key based on filter state and visible layers to force re-render
  const visibleLayersKey = Array.from(visibleLayers).sort().join(',');
  const graphKey = useMemo(() => {
    return `graph-${filters.maxLayer}-${filters.minAmount}-${graphNodes.length}-${graphEdges.length}-${visibleLayersKey}`;
  }, [filters.maxLayer, filters.minAmount, graphNodes.length, graphEdges.length, visibleLayersKey]);
  
  // Filter nodes and edges based on visible layers
  const filteredData = useMemo(() => {
    // If visibleLayers is empty, show all
    if (visibleLayers.size === 0) {
      return { nodes: graphNodes, edges: graphEdges };
    }
    
    // Filter nodes to only include visible layers
    const visibleNodeIds = new Set<string>();
    const filteredNodes = graphNodes.filter(node => {
      // Always show withdrawal nodes if their linked layer is visible
      if (node.type === 'withdrawal') {
        const isVisible = visibleLayers.has(node.layer);
        if (isVisible) visibleNodeIds.add(node.id);
        return isVisible;
      }
      // Show account nodes only if their layer is visible
      const isVisible = visibleLayers.has(node.layer);
      if (isVisible) visibleNodeIds.add(node.id);
      return isVisible;
    });
    
    // Filter edges to only include those between visible nodes
    const filteredEdges = graphEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
    
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphNodes, graphEdges, visibleLayers]);
  
  const { nodes, edges } = useMemo(
    () => getLayoutedElements(filteredData.nodes, filteredData.edges, collapsedNodes),
    [filteredData.nodes, filteredData.edges, collapsedNodes]
  );

  // Fit view when nodes change
  const onInit = useCallback(() => {
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 100);
  }, [fitView]);

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
    <ReactFlow
      key={graphKey}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={onInit}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
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
  );
}

// Wrapper component that doesn't need useReactFlow
export function MoneyTrailGraph() {
  return <MoneyTrailGraphInner />;
}
