import { ReactFlowProvider } from '@xyflow/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MoneyTrailGraph } from '@/components/graph/MoneyTrailGraph';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { DataPreview } from '@/components/views/DataPreview';
import { AccountSearch } from '@/components/views/AccountSearch';
import { WithdrawalsView } from '@/components/views/WithdrawalsView';
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
            <GraphLegend />
          </ReactFlowProvider>
        )}
        
        {activeView === 'data' && <DataPreview />}
        
        {activeView === 'search' && <AccountSearch />}
        
         {activeView === 'withdrawals' && (
          <ReactFlowProvider>
            <WithdrawalsView />
          </ReactFlowProvider>
        )}
      </main>
    </div>
  );
};

export default Index;
