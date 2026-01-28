// import { memo, useMemo } from 'react';
// import { Handle, Position } from '@xyflow/react';
// import type { GraphNode } from '@/types/financial';
// import { useInvestigationStore } from '@/store/investigationStore';
// import { Banknote, CreditCard, Receipt, Building2, ChevronDown, ChevronUp } from 'lucide-react';

// export interface TransactionNodeData extends Record<string, unknown> {
//   account: string;
//   layer: number;
//   type: 'account' | 'withdrawal';
//   withdrawalType?: 'atm' | 'pos' | 'cheque' | 'aeps' | 'hold' | 'other' | 'transfer';
//   totalInflow: number;
//   totalOutflow: number;
//   transactions: unknown[];
//   isCollapsed: boolean;
//   bank?: string;
//   ifsc?: string;
//   label: string;
// }

// const formatCurrency = (amount: number): string => {
//   if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
//   if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
//   if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
//   return `₹${amount.toFixed(0)}`;
// };

// const getTypeIcon = (type: TransactionNodeData['withdrawalType']) => {
//   switch (type) {
//     case 'atm': return <Banknote className="w-3 h-3" />;
//     case 'pos': return <CreditCard className="w-3 h-3" />;
//     case 'cheque': return <Receipt className="w-3 h-3" />;
//     default: return <Building2 className="w-3 h-3" />;
//   }
// };

// // Layer-based color coding for better visual distinction
// const getLayerColor = (layer: number): string => {
//   const colors = [
//     'border-[hsl(0,70%,50%)] bg-[hsl(0,70%,50%)]/10 text-[hsl(0,70%,60%)]',      // Layer 1 - Red
//     'border-[hsl(180,70%,45%)] bg-[hsl(180,70%,45%)]/10 text-[hsl(180,70%,55%)]', // Layer 2 - Cyan
//     'border-[hsl(200,70%,50%)] bg-[hsl(200,70%,50%)]/10 text-[hsl(200,70%,60%)]', // Layer 3 - Blue
//     'border-[hsl(45,80%,50%)] bg-[hsl(45,80%,50%)]/10 text-[hsl(45,80%,60%)]',    // Layer 4 - Yellow
//     'border-[hsl(280,60%,55%)] bg-[hsl(280,60%,55%)]/10 text-[hsl(280,60%,65%)]', // Layer 5 - Purple
//     'border-[hsl(210,60%,55%)] bg-[hsl(210,60%,55%)]/10 text-[hsl(210,60%,65%)]', // Layer 6 - Light Blue
//     'border-[hsl(30,80%,50%)] bg-[hsl(30,80%,50%)]/10 text-[hsl(30,80%,60%)]',    // Layer 7 - Orange
//     'border-[hsl(140,50%,45%)] bg-[hsl(140,50%,45%)]/10 text-[hsl(140,50%,55%)]', // Layer 8 - Green
//   ];
//   return colors[(layer - 1) % colors.length];
// };

// const getWithdrawalColor = (withdrawalType?: TransactionNodeData['withdrawalType']) => {
//   switch (withdrawalType) {
//     case 'atm': return 'border-atm bg-atm/10 text-atm';
//     case 'pos': return 'border-pos bg-pos/10 text-pos';
//     case 'cheque': return 'border-cheque bg-cheque/10 text-cheque';
//     default: return 'border-other bg-other/10 text-other';
//   }
// };

// interface TransactionNodeProps {
//   id: string;
//   data: TransactionNodeData;
// }

// export const TransactionNode = memo(({ data, id }: TransactionNodeProps) => {
//   const { collapsedNodes, toggleNodeCollapse, setSelectedNode, graphEdges, selectedNode } = useInvestigationStore();
//   const isCollapsed = collapsedNodes.has(id);
//   const isSelected = selectedNode === id;
  
//   const isWithdrawal = data.type === 'withdrawal';
  
//   // Use layer-based colors for accounts, withdrawal colors for withdrawals
//   const nodeColor = isWithdrawal 
//     ? getWithdrawalColor(data.withdrawalType)
//     : getLayerColor(data.layer);
  
//   // Calculate connection info for visual hints
//   const connectionInfo = useMemo(() => {
//     const incoming = graphEdges.filter(e => e.target === id);
//     const outgoing = graphEdges.filter(e => e.source === id);
//     return {
//       hasIncoming: incoming.length > 0,
//       hasOutgoing: outgoing.length > 0,
//       incomingCount: incoming.length,
//       outgoingCount: outgoing.length,
//     };
//   }, [graphEdges, id]);
  
//   return (
//     <div
//       className={`
//         group relative cursor-pointer transition-all duration-200
//         ${isWithdrawal ? 'rotate-45' : ''}
//       `}
//       onClick={() => {
//         setSelectedNode(id);
//       }}
//       onDoubleClick={() => {
//         if (!isWithdrawal) toggleNodeCollapse(id);
//       }}
//     >
//       {/* Incoming indicator */}
//       {!isWithdrawal && connectionInfo.hasIncoming && (
//         <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
//           <ChevronDown className="w-3 h-3 text-green-500 animate-pulse" />
//           {connectionInfo.incomingCount > 1 && (
//             <span className="text-[8px] text-green-500 font-mono">{connectionInfo.incomingCount}</span>
//           )}
//         </div>
//       )}
      
//       <div
//         className={`
//           ${isWithdrawal ? 'w-14 h-14' : 'min-w-[140px] px-3 py-2'}
//           rounded-lg border-2 
//           ${nodeColor}
//           ${isCollapsed ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background' : ''}
//           ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl' : ''}
//           backdrop-blur-sm shadow-lg
//           hover:scale-105 transition-transform
//         `}
//       >
//         <div className={isWithdrawal ? '-rotate-45 flex items-center justify-center h-full' : ''}>
//           {isWithdrawal ? (
//             <div className="flex flex-col items-center">
//               {getTypeIcon(data.withdrawalType)}
//               <span className="text-[8px] font-mono mt-0.5 font-bold">
//                 {formatCurrency(data.totalInflow)}
//               </span>
//               <span className="text-[6px] uppercase tracking-wider opacity-70">
//                 {data.withdrawalType}
//               </span>
//             </div>
//           ) : (
//             <>
//               <div className="flex items-center justify-between mb-1">
//                 <div className="flex items-center gap-1">
//                   <Building2 className="w-3 h-3 opacity-60" />
//                   <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/50">
//                     L{data.layer}
//                   </span>
//                 </div>
//                 {isCollapsed && (
//                   <span className="text-[8px] text-destructive font-bold">●</span>
//                 )}
//               </div>
//               <div className="font-mono text-xs truncate max-w-[120px] font-semibold" title={data.account}>
//                 {data.account.slice(-8)}
//               </div>
//               <div className="flex justify-between text-[9px] mt-1.5 gap-2">
//                 <div className="flex items-center gap-0.5 bg-green-500/20 px-1 rounded">
//                   <ChevronDown className="w-2.5 h-2.5 text-green-400" />
//                   <span className="text-green-400 font-mono">{formatCurrency(data.totalInflow)}</span>
//                 </div>
//                 <div className="flex items-center gap-0.5 bg-red-500/20 px-1 rounded">
//                   <ChevronUp className="w-2.5 h-2.5 text-red-400" />
//                   <span className="text-red-400 font-mono">{formatCurrency(data.totalOutflow)}</span>
//                 </div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
      
//       {/* Outgoing indicator */}
//       {!isWithdrawal && connectionInfo.hasOutgoing && (
//         <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
//           <ChevronDown className="w-3 h-3 text-red-500" />
//           {connectionInfo.outgoingCount > 1 && (
//             <span className="text-[8px] text-red-500 font-mono">{connectionInfo.outgoingCount}</span>
//           )}
//         </div>
//       )}

//       {/* Tooltip */}
//       <div className="
//         absolute left-1/2 -translate-x-1/2 bottom-full mb-2 
//         opacity-0 group-hover:opacity-100 transition-opacity duration-200
//         pointer-events-none z-50
//       ">
//         <div className="bg-popover border border-border rounded-md p-2 shadow-xl text-xs min-w-[180px]">
//           <div className="font-mono text-primary mb-1">{data.account}</div>
//           <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
//             <span>Layer:</span>
//             <span className="text-foreground font-mono">{data.layer}</span>
//             <span>Inflow:</span>
//             <span className="text-green-400 font-mono">{formatCurrency(data.totalInflow)}</span>
//             <span>Outflow:</span>
//             <span className="text-red-400 font-mono">{formatCurrency(data.totalOutflow)}</span>
//             {data.bank && (
//               <>
//                 <span>Bank:</span>
//                 <span className="text-foreground">{data.bank}</span>
//               </>
//             )}
//             {data.ifsc && (
//               <>
//                 <span>IFSC:</span>
//                 <span className="text-foreground font-mono">{data.ifsc}</span>
//               </>
//             )}
//             <span>Txns:</span>
//             <span className="text-foreground font-mono">{data.transactions.length}</span>
//           </div>
//           {isCollapsed && (
//             <div className="mt-2 text-destructive text-[10px] uppercase tracking-wider">
//               ⚠ Collapsed - Click to expand
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Handles */}
//       {!isWithdrawal && (
//         <>
//           <Handle
//             type="target"
//             position={Position.Top}
//             className="w-2 h-2 bg-transfer border-2 border-background"
//           />
//           <Handle
//             type="source"
//             position={Position.Bottom}
//             className="w-2 h-2 bg-transfer border-2 border-background"
//           />
//         </>
//       )}
//       {isWithdrawal && (
//         <Handle
//           type="target"
//           position={Position.Left}
//           className="w-2 h-2 bg-atm border-2 border-background"
//           style={{ transform: 'rotate(-45deg)' }}
//         />
//       )}
//     </div>
//   );
// });

// TransactionNode.displayName = 'TransactionNode';

import { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { GraphNode } from '@/types/financial';
import { useInvestigationStore } from '@/store/investigationStore';
import { Banknote, CreditCard, Receipt, Building2, ChevronDown, ChevronUp } from 'lucide-react';

export interface TransactionNodeData extends Record<string, unknown> {
  account: string;
  layer: number;
  type: 'account' | 'withdrawal';
  withdrawalType?: 'atm' | 'pos' | 'cheque' | 'aeps' | 'hold' | 'other' | 'transfer';
  totalInflow: number;
  totalOutflow: number;
  transactions: unknown[];
  isCollapsed: boolean;
  bank?: string;
  ifsc?: string;
  label: string;
}

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
};

const getTypeIcon = (type: TransactionNodeData['withdrawalType']) => {
  switch (type) {
    case 'atm': return <Banknote className="w-3 h-3" />;
    case 'pos': return <CreditCard className="w-3 h-3" />;
    case 'cheque': return <Receipt className="w-3 h-3" />;
    default: return <Building2 className="w-3 h-3" />;
  }
};

// Layer-based color coding for better visual distinction
const getLayerColor = (layer: number): string => {
  const colors = [
    'border-[hsl(0,70%,50%)] bg-[hsl(0,70%,50%)]/10 text-[hsl(0,70%,60%)]',      // Layer 1 - Red
    'border-[hsl(180,70%,45%)] bg-[hsl(180,70%,45%)]/10 text-[hsl(180,70%,55%)]', // Layer 2 - Cyan
    'border-[hsl(200,70%,50%)] bg-[hsl(200,70%,50%)]/10 text-[hsl(200,70%,60%)]', // Layer 3 - Blue
    'border-[hsl(45,80%,50%)] bg-[hsl(45,80%,50%)]/10 text-[hsl(45,80%,60%)]',    // Layer 4 - Yellow
    'border-[hsl(280,60%,55%)] bg-[hsl(280,60%,55%)]/10 text-[hsl(280,60%,65%)]', // Layer 5 - Purple
    'border-[hsl(210,60%,55%)] bg-[hsl(210,60%,55%)]/10 text-[hsl(210,60%,65%)]', // Layer 6 - Light Blue
    'border-[hsl(30,80%,50%)] bg-[hsl(30,80%,50%)]/10 text-[hsl(30,80%,60%)]',    // Layer 7 - Orange
    'border-[hsl(140,50%,45%)] bg-[hsl(140,50%,45%)]/10 text-[hsl(140,50%,55%)]', // Layer 8 - Green
  ];
  return colors[(layer - 1) % colors.length];
};

const getWithdrawalColor = (withdrawalType?: TransactionNodeData['withdrawalType']) => {
  switch (withdrawalType) {
    case 'atm': return 'border-atm bg-atm/10 text-atm';
    case 'pos': return 'border-pos bg-pos/10 text-pos';
    case 'cheque': return 'border-cheque bg-cheque/10 text-cheque';
    default: return 'border-other bg-other/10 text-other';
  }
};

interface TransactionNodeProps {
  id: string;
  data: TransactionNodeData;
}

export const TransactionNode = memo(({ data, id }: TransactionNodeProps) => {
  const { collapsedNodes, toggleNodeCollapse, setSelectedNode, graphEdges, selectedNode } = useInvestigationStore();
  const isCollapsed = collapsedNodes.has(id);
  const isSelected = selectedNode === id;
  
  const isWithdrawal = data.type === 'withdrawal';
  
  // Use layer-based colors for accounts, withdrawal colors for withdrawals
  const nodeColor = isWithdrawal 
    ? getWithdrawalColor(data.withdrawalType)
    : getLayerColor(data.layer);
  
  // Calculate connection info for visual hints
  const connectionInfo = useMemo(() => {
    const incoming = graphEdges.filter(e => e.target === id);
    const outgoing = graphEdges.filter(e => e.source === id);
    return {
      hasIncoming: incoming.length > 0,
      hasOutgoing: outgoing.length > 0,
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
    };
  }, [graphEdges, id]);
  
  return (
    <div
      className={`
        group relative cursor-pointer transition-all duration-200
        ${isWithdrawal ? 'rotate-45' : ''}
      `}
      onClick={() => {
        setSelectedNode(id);
      }}
      onDoubleClick={() => {
        if (!isWithdrawal) toggleNodeCollapse(id);
      }}
    >
      {/* Incoming indicator */}
      {!isWithdrawal && connectionInfo.hasIncoming && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
          <ChevronDown className="w-3 h-3 text-green-500 animate-pulse" />
          {connectionInfo.incomingCount > 1 && (
            <span className="text-[8px] text-green-500 font-mono">{connectionInfo.incomingCount}</span>
          )}
        </div>
      )}
      
      <div
        className={`
          ${isWithdrawal ? 'w-14 h-14' : 'min-w-[140px] px-3 py-2'}
          rounded-lg border-2 
          ${nodeColor}
          ${isCollapsed ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background' : ''}
          ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl' : ''}
          backdrop-blur-sm shadow-lg
          hover:scale-105 transition-transform
        `}
      >
        <div className={isWithdrawal ? '-rotate-45 flex items-center justify-center h-full' : ''}>
          {isWithdrawal ? (
            <div className="flex flex-col items-center">
              {getTypeIcon(data.withdrawalType)}
              <span className="text-[8px] font-mono mt-0.5 font-bold">
                {formatCurrency(data.totalInflow)}
              </span>
              <span className="text-[6px] uppercase tracking-wider opacity-70">
                {data.withdrawalType}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 opacity-60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/50">
                    L{data.layer}
                  </span>
                </div>
                {isCollapsed && (
                  <span className="text-[8px] text-destructive font-bold">●</span>
                )}
              </div>
              <div className="font-mono text-xs truncate max-w-[120px] font-semibold" title={data.account}>
                {data.account.slice(-8)}
              </div>
              <div className="flex justify-between text-[9px] mt-1.5 gap-2">
                <div className="flex items-center gap-0.5 bg-green-500/20 px-1 rounded">
                  <ChevronDown className="w-2.5 h-2.5 text-green-400" />
                  <span className="text-green-400 font-mono">{formatCurrency(data.totalInflow)}</span>
                </div>
                <div className="flex items-center gap-0.5 bg-red-500/20 px-1 rounded">
                  <ChevronUp className="w-2.5 h-2.5 text-red-400" />
                  <span className="text-red-400 font-mono">{formatCurrency(data.totalOutflow)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Outgoing indicator */}
      {!isWithdrawal && connectionInfo.hasOutgoing && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
          <ChevronDown className="w-3 h-3 text-red-500" />
          {connectionInfo.outgoingCount > 1 && (
            <span className="text-[8px] text-red-500 font-mono">{connectionInfo.outgoingCount}</span>
          )}
        </div>
      )}

      {/* Tooltip */}
      <div className="
        absolute left-1/2 -translate-x-1/2 bottom-full mb-2 
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        pointer-events-none z-50
      ">
        <div className="bg-popover border border-border rounded-md p-2 shadow-xl text-xs min-w-[180px]">
          <div className="font-mono text-primary mb-1">{data.account}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
            <span>Layer:</span>
            <span className="text-foreground font-mono">{data.layer}</span>
            <span>Inflow:</span>
            <span className="text-green-400 font-mono">{formatCurrency(data.totalInflow)}</span>
            <span>Outflow:</span>
            <span className="text-red-400 font-mono">{formatCurrency(data.totalOutflow)}</span>
            {data.bank && (
              <>
                <span>Bank:</span>
                <span className="text-foreground">{data.bank}</span>
              </>
            )}
            {data.ifsc && (
              <>
                <span>IFSC:</span>
                <span className="text-foreground font-mono">{data.ifsc}</span>
              </>
            )}
            <span>Txns:</span>
            <span className="text-foreground font-mono">{data.transactions.length}</span>
          </div>
          {isCollapsed && (
            <div className="mt-2 text-destructive text-[10px] uppercase tracking-wider">
              ⚠ Collapsed - Click to expand
            </div>
          )}
        </div>
      </div>

      {/* Handles */}
      {!isWithdrawal && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="w-2 h-2 bg-transfer border-2 border-background"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-2 h-2 bg-transfer border-2 border-background"
          />
        </>
      )}
      {isWithdrawal && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-2 h-2 bg-atm border-2 border-background"
          style={{ transform: 'rotate(-45deg)' }}
        />
      )}
    </div>
  );
});

TransactionNode.displayName = 'TransactionNode';
