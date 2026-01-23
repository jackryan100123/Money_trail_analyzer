import { ReactFlowProvider } from '@xyflow/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MoneyTrailGraph } from '@/components/graph/MoneyTrailGraph';
import { DataPreview } from '@/components/views/DataPreview';
import { AccountSearch } from '@/components/views/AccountSearch';
import { NodeFlowSummary } from '@/components/panels/NodeFlowSummary';
import { useInvestigationStore } from '@/store/investigationStore';

const Index = () => {
  const { activeView } = useInvestigationStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 relative overflow-hidden">
        {activeView === 'graph' && (
          <ReactFlowProvider>
            <MoneyTrailGraph />
            <NodeFlowSummary />
          </ReactFlowProvider>
        )}
        
        {activeView === 'data' && <DataPreview />}
        
        {activeView === 'search' && <AccountSearch />}
        
        {/* Graph Legend */}
        {activeView === 'graph' && (
          <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg p-4 z-10">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Legend</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-[hsl(0,70%,50%)] bg-[hsl(0,70%,50%)]/10" />
                <span>Layer 1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-[hsl(180,70%,45%)] bg-[hsl(180,70%,45%)]/10" />
                <span>Layer 2</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-[hsl(200,70%,50%)] bg-[hsl(200,70%,50%)]/10" />
                <span>Layer 3</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-[hsl(45,80%,50%)] bg-[hsl(45,80%,50%)]/10" />
                <span>Layer 4</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rotate-45 border-2 border-atm bg-atm/10" />
                  <span>ATM Withdrawal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rotate-45 border-2 border-pos bg-pos/10" />
                  <span>POS Withdrawal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rotate-45 border-2 border-cheque bg-cheque/10" />
                  <span>Cheque Withdrawal</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <div className="w-4 h-4 rounded ring-2 ring-primary" />
                <span className="text-primary">Selected Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded ring-2 ring-destructive" />
                <span className="text-destructive">Collapsed Node</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                Click = Select • Double-click = Collapse
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
