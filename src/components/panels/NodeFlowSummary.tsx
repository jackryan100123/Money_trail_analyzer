import { useMemo } from 'react';
import { useInvestigationStore } from '@/store/investigationStore';
import { X, ArrowDown, ArrowUp, TrendingDown, TrendingUp, Banknote, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GraphNode, GraphEdge } from '@/types/financial';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

interface FlowNode {
  node: GraphNode;
  edge: GraphEdge;
  direction: 'incoming' | 'outgoing';
}

/**
 * Find all predecessors (money coming IN to this node)
 */
function findPredecessors(
  nodeId: string, 
  nodes: GraphNode[], 
  edges: GraphEdge[]
): FlowNode[] {
  const predecessors: FlowNode[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Find edges where this node is the target
  const incomingEdges = edges.filter(e => e.target === nodeId);
  
  for (const edge of incomingEdges) {
    const sourceNode = nodeMap.get(edge.source);
    if (sourceNode) {
      predecessors.push({
        node: sourceNode,
        edge,
        direction: 'incoming'
      });
    }
  }
  
  return predecessors;
}

/**
 * Find all successors (money going OUT from this node)
 */
function findSuccessors(
  nodeId: string, 
  nodes: GraphNode[], 
  edges: GraphEdge[]
): FlowNode[] {
  const successors: FlowNode[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Find edges where this node is the source
  const outgoingEdges = edges.filter(e => e.source === nodeId);
  
  for (const edge of outgoingEdges) {
    const targetNode = nodeMap.get(edge.target);
    if (targetNode) {
      successors.push({
        node: targetNode,
        edge,
        direction: 'outgoing'
      });
    }
  }
  
  return successors;
}

/**
 * Recursively find the complete chain up to the root
 */
function findFullChainUp(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  visited = new Set<string>()
): FlowNode[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  
  const chain: FlowNode[] = [];
  const predecessors = findPredecessors(nodeId, nodes, edges);
  
  for (const pred of predecessors) {
    // First add ancestors
    const ancestors = findFullChainUp(pred.node.id, nodes, edges, visited);
    chain.push(...ancestors);
    // Then add this predecessor
    chain.push(pred);
  }
  
  return chain;
}

/**
 * Recursively find the complete chain down to leaves
 */
function findFullChainDown(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  visited = new Set<string>()
): FlowNode[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  
  const chain: FlowNode[] = [];
  const successors = findSuccessors(nodeId, nodes, edges);
  
  for (const succ of successors) {
    // Add this successor
    chain.push(succ);
    // Then add descendants
    const descendants = findFullChainDown(succ.node.id, nodes, edges, visited);
    chain.push(...descendants);
  }
  
  return chain;
}

export function NodeFlowSummary() {
  const { 
    selectedNode, 
    setSelectedNode, 
    graphNodes, 
    graphEdges 
  } = useInvestigationStore();

  const node = useMemo(() => {
    if (!selectedNode) return null;
    return graphNodes.find(n => n.id === selectedNode);
  }, [selectedNode, graphNodes]);

  const flowData = useMemo(() => {
    if (!selectedNode || !node) return null;

    const directPredecessors = findPredecessors(selectedNode, graphNodes, graphEdges);
    const directSuccessors = findSuccessors(selectedNode, graphNodes, graphEdges);
    const fullChainUp = findFullChainUp(selectedNode, graphNodes, graphEdges);
    const fullChainDown = findFullChainDown(selectedNode, graphNodes, graphEdges);

    const totalIncoming = directPredecessors.reduce((sum, p) => sum + p.edge.amount, 0);
    const totalOutgoing = directSuccessors.reduce((sum, s) => sum + s.edge.amount, 0);

    return {
      directPredecessors,
      directSuccessors,
      fullChainUp,
      fullChainDown,
      totalIncoming,
      totalOutgoing,
    };
  }, [selectedNode, node, graphNodes, graphEdges]);

  if (!selectedNode || !node || !flowData) return null;

  const isWithdrawal = node.type === 'withdrawal';

  return (
    <div className="absolute top-4 right-4 w-96 bg-card border border-border rounded-lg shadow-xl z-50 animate-fade-in flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <div>
            <span className="font-medium block">Money Flow Summary</span>
            <span className="text-xs text-muted-foreground font-mono">
              {node.account.slice(-10)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedNode(null)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
        <div className="p-4 space-y-4">
          {/* Current Node Summary */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Selected Node
              </span>
              <Badge variant="outline" className="text-xs">
                Layer {node.layer}
              </Badge>
            </div>
            <p className="font-mono text-primary text-sm break-all">{node.account}</p>
            {node.bank && (
              <p className="text-xs text-muted-foreground mt-1">{node.bank}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-green-500" />
                <span className="text-muted-foreground">Inflow:</span>
                <span className="font-mono text-green-500">{formatCurrency(flowData.totalIncoming)}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-red-500" />
                <span className="text-muted-foreground">Outflow:</span>
                <span className="font-mono text-red-500">{formatCurrency(flowData.totalOutgoing)}</span>
              </div>
            </div>
          </div>

          {/* Direct Predecessors */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowDown className="w-4 h-4 text-green-500" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Money Received From ({flowData.directPredecessors.length})
              </span>
            </div>
            {flowData.directPredecessors.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-6">
                No incoming transfers (This may be a source account)
              </p>
            ) : (
              <div className="space-y-2 pl-6">
                {flowData.directPredecessors.map((pred, i) => (
                  <div 
                    key={i}
                    className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs cursor-pointer hover:bg-green-500/20 transition-colors"
                    onClick={() => setSelectedNode(pred.node.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono">{pred.node.account.slice(-10)}</span>
                      <span className="font-mono text-green-500">
                        +{formatCurrency(pred.edge.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground mt-1">
                      <span>Layer {pred.node.layer}</span>
                      {pred.edge.date && <span>{pred.edge.date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Successors */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowUp className="w-4 h-4 text-red-500" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Money Sent To ({flowData.directSuccessors.length})
              </span>
            </div>
            {flowData.directSuccessors.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-6">
                No outgoing transfers (This may be an endpoint)
              </p>
            ) : (
              <div className="space-y-2 pl-6">
                {flowData.directSuccessors.map((succ, i) => (
                  <div 
                    key={i}
                    className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                      succ.node.type === 'withdrawal' 
                        ? 'bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20'
                        : 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20'
                    }`}
                    onClick={() => setSelectedNode(succ.node.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        {succ.node.type === 'withdrawal' && (
                          <Banknote className="w-3 h-3 text-orange-500" />
                        )}
                        <span className="font-mono">{succ.node.account.slice(-10)}</span>
                      </div>
                      <span className={`font-mono ${
                        succ.node.type === 'withdrawal' ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        -{formatCurrency(succ.edge.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground mt-1">
                      <span>
                        {succ.node.type === 'withdrawal' 
                          ? `${succ.node.withdrawalType?.toUpperCase()} Withdrawal`
                          : `Layer ${succ.node.layer}`
                        }
                      </span>
                      {succ.edge.date && <span>{succ.edge.date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full Trail Visualization */}
          {(flowData.fullChainUp.length > 0 || flowData.fullChainDown.length > 0) && (
            <div className="border-t border-border pt-4">
              <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-3">
                Complete Money Trail
              </span>
              
              <div className="relative pl-4 border-l-2 border-dashed border-muted-foreground/30">
                {/* Chain Up (ancestors) */}
                {flowData.fullChainUp.map((item, i) => (
                  <div 
                    key={`up-${i}`}
                    className="mb-2 relative"
                  >
                    <div className="absolute -left-[17px] w-2 h-2 rounded-full bg-green-500" />
                    <div 
                      className="p-2 bg-muted/30 rounded text-xs cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedNode(item.node.id)}
                    >
                      <div className="flex justify-between">
                        <span className="font-mono">{item.node.account.slice(-8)}</span>
                        <span className="text-muted-foreground">L{item.node.layer}</span>
                      </div>
                      <span className="text-green-500 text-[10px]">
                        ↓ {formatCurrency(item.edge.amount)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Current Node Marker */}
                <div className="mb-2 relative">
                  <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-primary ring-2 ring-primary/30" />
                  <div className="p-2 bg-primary/20 border border-primary/30 rounded text-xs">
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-primary">
                        {node.account.slice(-8)}
                      </span>
                      <span className="text-primary">L{node.layer}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">← You are here</span>
                  </div>
                </div>

                {/* Chain Down (descendants) */}
                {flowData.fullChainDown.map((item, i) => (
                  <div 
                    key={`down-${i}`}
                    className="mb-2 relative"
                  >
                    <div className={`absolute -left-[17px] w-2 h-2 rounded-full ${
                      item.node.type === 'withdrawal' ? 'bg-orange-500' : 'bg-red-500'
                    }`} />
                    <div 
                      className={`p-2 rounded text-xs cursor-pointer ${
                        item.node.type === 'withdrawal' 
                          ? 'bg-orange-500/10 hover:bg-orange-500/20'
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedNode(item.node.id)}
                    >
                      <div className="flex justify-between">
                        <span className="font-mono">{item.node.account.slice(-8)}</span>
                        <span className="text-muted-foreground">
                          {item.node.type === 'withdrawal' 
                            ? item.node.withdrawalType?.toUpperCase()
                            : `L${item.node.layer}`
                          }
                        </span>
                      </div>
                      <span className={`text-[10px] ${
                        item.node.type === 'withdrawal' ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        ↓ {formatCurrency(item.edge.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
