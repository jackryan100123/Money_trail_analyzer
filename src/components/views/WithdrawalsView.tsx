import { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useInvestigationStore } from '@/store/investigationStore';
import { Banknote, CreditCard, FileText } from 'lucide-react';
import type { Withdrawal } from '@/types/financial';

interface WithdrawalNodeData {
  withdrawal: Withdrawal;
  type: 'atm' | 'pos' | 'cheque';
  [key: string]: unknown;
}

// Custom node for withdrawals
function WithdrawalNode({ data }: { data: WithdrawalNodeData }) {
  const { withdrawal, type } = data;
  
  const typeConfig = {
    atm: {
      color: 'hsl(var(--atm))',
      bgColor: 'hsl(var(--atm) / 0.15)',
      borderColor: 'hsl(var(--atm) / 0.5)',
      icon: Banknote,
      label: 'ATM',
    },
    pos: {
      color: 'hsl(var(--pos))',
      bgColor: 'hsl(var(--pos) / 0.15)',
      borderColor: 'hsl(var(--pos) / 0.5)',
      icon: CreditCard,
      label: 'POS',
    },
    cheque: {
      color: 'hsl(var(--cheque))',
      bgColor: 'hsl(var(--cheque) / 0.15)',
      borderColor: 'hsl(var(--cheque) / 0.5)',
      icon: FileText,
      label: 'Cheque',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const formatAmount = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  return (
    <div
      className="p-3 rounded-lg border-2 min-w-[120px] text-center transition-all hover:scale-105 cursor-pointer"
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      <div className="flex items-center justify-center gap-1 mb-1">
        <Icon className="w-4 h-4" style={{ color: config.color }} />
        <span className="text-xs font-semibold" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>
      <p className="text-xs font-mono text-foreground truncate">
        {withdrawal.account.slice(-8)}
      </p>
      <p className="text-sm font-bold mt-1" style={{ color: config.color }}>
        {formatAmount(withdrawal.amount)}
      </p>
      {withdrawal.date && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {withdrawal.date}
        </p>
      )}
      {withdrawal.linkedLayer && (
        <span 
          className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: config.borderColor, color: config.color }}
        >
          Layer {withdrawal.linkedLayer}
        </span>
      )}
    </div>
  );
}

const nodeTypes = {
  withdrawal: WithdrawalNode as any,
};

export function WithdrawalsView() {
  const { withdrawals, sheets } = useInvestigationStore();

  // Group withdrawals by type
  const groupedWithdrawals = useMemo(() => {
    const groups = {
      atm: withdrawals.filter(w => w.type === 'atm'),
      pos: withdrawals.filter(w => w.type === 'pos'),
      cheque: withdrawals.filter(w => w.type === 'cheque'),
    };
    return groups;
  }, [withdrawals]);

  // Create nodes for React Flow - arrange in a grid pattern by type
  const nodes = useMemo(() => {
    const result: Node<WithdrawalNodeData>[] = [];
    const types = ['atm', 'pos', 'cheque'] as const;
    const spacing = { x: 160, y: 140 };
    const groupSpacing = 200; // Vertical spacing between groups
    
    let yOffset = 0;
    
    for (const type of types) {
      const typeWithdrawals = groupedWithdrawals[type];
      if (typeWithdrawals.length === 0) continue;
      
      // Calculate grid dimensions
      const cols = Math.ceil(Math.sqrt(typeWithdrawals.length));
      
      typeWithdrawals.forEach((withdrawal, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        result.push({
          id: `${type}_${withdrawal.id}`,
          type: 'withdrawal',
          position: {
            x: col * spacing.x + 50,
            y: yOffset + row * spacing.y + 80,
          },
          data: {
            withdrawal,
            type,
          },
        });
      });
      
      // Calculate rows for this group
      const rows = Math.ceil(typeWithdrawals.length / cols);
      yOffset += rows * spacing.y + groupSpacing;
    }
    
    return result;
  }, [groupedWithdrawals]);

  const [flowNodes, , onNodesChange] = useNodesState(nodes);

  if (sheets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Banknote className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">No Data Loaded</h3>
            <p className="text-sm mt-1">Upload an Excel file to view withdrawals</p>
          </div>
        </div>
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Banknote className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">No Withdrawals Found</h3>
            <p className="text-sm mt-1">No ATM, POS, or Cheque withdrawals in the data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Summary Cards */}
      <div className="absolute top-4 left-4 z-10 flex gap-3">
        <div className="bg-card border border-border rounded-lg p-3 min-w-[100px]">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-atm" />
            <span className="text-xs text-muted-foreground">ATM</span>
          </div>
          <p className="text-lg font-bold text-atm">{groupedWithdrawals.atm.length}</p>
          <p className="text-[10px] text-muted-foreground">
            ₹{(groupedWithdrawals.atm.reduce((sum, w) => sum + w.amount, 0) / 100000).toFixed(1)}L
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 min-w-[100px]">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-pos" />
            <span className="text-xs text-muted-foreground">POS</span>
          </div>
          <p className="text-lg font-bold text-pos">{groupedWithdrawals.pos.length}</p>
          <p className="text-[10px] text-muted-foreground">
            ₹{(groupedWithdrawals.pos.reduce((sum, w) => sum + w.amount, 0) / 100000).toFixed(1)}L
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 min-w-[100px]">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-cheque" />
            <span className="text-xs text-muted-foreground">Cheque</span>
          </div>
          <p className="text-lg font-bold text-cheque">{groupedWithdrawals.cheque.length}</p>
          <p className="text-[10px] text-muted-foreground">
            ₹{(groupedWithdrawals.cheque.reduce((sum, w) => sum + w.amount, 0) / 100000).toFixed(1)}L
          </p>
        </div>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={[]}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
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
      </ReactFlow>
    </div>
  );
}
