import { useInvestigationStore } from '@/store/investigationStore';
import { X, ChevronDown, ChevronUp, Banknote, CreditCard, Receipt, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export function NodeDetails() {
  const { 
    selectedNode, 
    setSelectedNode, 
    graphNodes, 
    collapsedNodes, 
    toggleNodeCollapse 
  } = useInvestigationStore();

  if (!selectedNode) return null;

  const node = graphNodes.find(n => n.id === selectedNode);
  if (!node) return null;

  const isCollapsed = collapsedNodes.has(selectedNode);
  const isWithdrawal = node.type === 'withdrawal';

  const getTypeIcon = () => {
    if (!isWithdrawal) return <Building2 className="w-5 h-5" />;
    switch (node.withdrawalType) {
      case 'atm': return <Banknote className="w-5 h-5" />;
      case 'pos': return <CreditCard className="w-5 h-5" />;
      case 'cheque': return <Receipt className="w-5 h-5" />;
      default: return <Building2 className="w-5 h-5" />;
    }
  };

  const getTypeColor = () => {
    if (!isWithdrawal) return 'text-transfer';
    switch (node.withdrawalType) {
      case 'atm': return 'text-atm';
      case 'pos': return 'text-pos';
      case 'cheque': return 'text-cheque';
      default: return 'text-other';
    }
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-card border border-border rounded-lg shadow-xl z-50 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className={getTypeColor()}>{getTypeIcon()}</span>
          <span className="font-medium">
            {isWithdrawal ? 'Withdrawal' : 'Account'} Details
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedNode(null)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="p-4 space-y-4">
          {/* Account Info */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Account Number
            </label>
            <p className="font-mono text-primary mt-1">{node.account}</p>
          </div>

          {/* Layer & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Layer
              </label>
              <p className="font-mono mt-1">Layer {node.layer}</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Type
              </label>
              <p className={`mt-1 capitalize ${getTypeColor()}`}>
                {isWithdrawal ? node.withdrawalType : 'Account'}
              </p>
            </div>
          </div>

          {/* Flow Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Total Inflow
              </label>
              <p className="font-mono text-green-400 mt-1">
                {formatCurrency(node.totalInflow)}
              </p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Total Outflow
              </label>
              <p className="font-mono text-red-400 mt-1">
                {formatCurrency(node.totalOutflow)}
              </p>
            </div>
          </div>

          {/* Bank Info */}
          {(node.bank || node.ifsc) && (
            <div className="grid grid-cols-2 gap-4">
              {node.bank && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Bank
                  </label>
                  <p className="mt-1 text-sm">{node.bank}</p>
                </div>
              )}
              {node.ifsc && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    IFSC
                  </label>
                  <p className="font-mono mt-1 text-sm">{node.ifsc}</p>
                </div>
              )}
            </div>
          )}

          {/* Transaction Count */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Transactions
            </label>
            <p className="font-mono mt-1">{node.transactions.length} transaction(s)</p>
          </div>

          {/* Collapse/Expand Button */}
          {!isWithdrawal && (
            <Button
              variant={isCollapsed ? 'destructive' : 'outline'}
              className="w-full gap-2"
              onClick={() => toggleNodeCollapse(selectedNode)}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Expand Subtree
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Collapse Subtree
                </>
              )}
            </Button>
          )}

          {/* Transaction List */}
          {node.transactions.length > 0 && (
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Transaction History
              </label>
              <div className="space-y-2">
                {node.transactions.slice(0, 5).map((txn, i) => (
                  <div 
                    key={i} 
                    className="p-2 bg-muted/30 rounded text-xs font-mono space-y-1"
                  >
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{txn.date || 'No date'}</span>
                      <span className={txn.type === 'transfer' ? 'text-transfer' : 'text-atm'}>
                        {formatCurrency(txn.amount)}
                      </span>
                    </div>
                    {txn.utr && (
                      <div className="text-muted-foreground truncate">
                        UTR: {txn.utr}
                      </div>
                    )}
                  </div>
                ))}
                {node.transactions.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{node.transactions.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
