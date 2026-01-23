import { useState } from 'react';
import { useInvestigationStore } from '@/store/investigationStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ArrowDownLeft, ArrowUpRight, Banknote, FileText, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/excelParser';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export function AccountSearch() {
  const [searchInput, setSearchInput] = useState('');
  const { searchResults, performSearch, clearSearch, sheets } = useInvestigationStore();

  const handleSearch = () => {
    if (searchInput.trim()) {
      performSearch(searchInput.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Calculate KPIs
  const totalInflow = searchResults?.incoming.reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalOutflow = searchResults?.outgoing.reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalWithdrawals = searchResults?.withdrawals.reduce((sum, w) => sum + w.amount, 0) || 0;
  const layersInvolved = new Set([
    ...(searchResults?.incoming.map(t => t.layer) || []),
    ...(searchResults?.outgoing.map(t => t.layer) || []),
  ]);
  const totalTransactions = 
    (searchResults?.incoming.length || 0) + 
    (searchResults?.outgoing.length || 0) + 
    (searchResults?.withdrawals.length || 0) +
    (searchResults?.other.length || 0);

  if (sheets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <Search className="w-12 h-12 mx-auto opacity-50" />
          <div>
            <h3 className="text-lg font-medium text-foreground">No Data Loaded</h3>
            <p className="text-sm mt-1">Upload an Excel file to search accounts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold mb-4">Account Trail Analysis</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter account number to search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 font-mono bg-muted border-border"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
          {searchResults && (
            <Button variant="outline" onClick={clearSearch}>Clear</Button>
          )}
        </div>
      </div>

      {/* Results */}
      {searchResults && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* KPI Cards */}
          <div className="p-6 border-b border-border">
            <div className="grid grid-cols-5 gap-4">
              <div className="kpi-card">
                <div className="kpi-value text-green-400">{formatCurrency(totalInflow)}</div>
                <div className="kpi-label">Total Inflow</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value text-red-400">{formatCurrency(totalOutflow)}</div>
                <div className="kpi-label">Total Outflow</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value text-atm">{formatCurrency(totalWithdrawals)}</div>
                <div className="kpi-label">Withdrawals</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{layersInvolved.size}</div>
                <div className="kpi-label">Layers Involved</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">{totalTransactions}</div>
                <div className="kpi-label">Transactions</div>
              </div>
            </div>
          </div>

          {/* Transaction Tabs */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="incoming" className="h-full flex flex-col">
              <div className="px-6 pt-4">
                <TabsList className="bg-muted">
                  <TabsTrigger value="incoming" className="gap-2">
                    <ArrowDownLeft className="w-4 h-4" />
                    Incoming ({searchResults.incoming.length})
                  </TabsTrigger>
                  <TabsTrigger value="outgoing" className="gap-2">
                    <ArrowUpRight className="w-4 h-4" />
                    Outgoing ({searchResults.outgoing.length})
                  </TabsTrigger>
                  <TabsTrigger value="withdrawals" className="gap-2">
                    <Banknote className="w-4 h-4" />
                    Withdrawals ({searchResults.withdrawals.length})
                  </TabsTrigger>
                  <TabsTrigger value="other" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Other ({searchResults.other.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <TabsContent value="incoming" className="p-6 pt-4 m-0">
                  <TransactionTable 
                    transactions={searchResults.incoming} 
                    type="incoming"
                  />
                </TabsContent>
                <TabsContent value="outgoing" className="p-6 pt-4 m-0">
                  <TransactionTable 
                    transactions={searchResults.outgoing} 
                    type="outgoing"
                  />
                </TabsContent>
                <TabsContent value="withdrawals" className="p-6 pt-4 m-0">
                  <WithdrawalTable withdrawals={searchResults.withdrawals} />
                </TabsContent>
                <TabsContent value="other" className="p-6 pt-4 m-0">
                  <OtherTable transactions={searchResults.other} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!searchResults && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <p>Enter an account number to analyze its transaction trail</p>
            <p className="text-sm">The search will scan all loaded sheets</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionTable({ 
  transactions, 
  type 
}: { 
  transactions: any[]; 
  type: 'incoming' | 'outgoing' 
}) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No transactions found</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(transactions, `${type}_transactions`)}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
      <div className="forensic-panel overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Layer</th>
              <th>{type === 'incoming' ? 'From Account' : 'To Account'}</th>
              <th>Amount</th>
              <th>UTR</th>
              <th>Bank</th>
              <th>IFSC</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr key={i}>
                <td>{t.date || '-'}</td>
                <td>
                  <span className="px-2 py-0.5 rounded bg-transfer/20 text-transfer">
                    L{t.layer}
                  </span>
                </td>
                <td>{type === 'incoming' ? t.fromAccount : t.toAccount}</td>
                <td className={type === 'incoming' ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(t.amount)}
                </td>
                <td>{t.utr || '-'}</td>
                <td>{t.bank || '-'}</td>
                <td>{t.ifsc || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WithdrawalTable({ withdrawals }: { withdrawals: any[] }) {
  if (withdrawals.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No withdrawals found</p>;
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'atm': return 'bg-atm/20 text-atm';
      case 'pos': return 'bg-pos/20 text-pos';
      case 'cheque': return 'bg-cheque/20 text-cheque';
      default: return 'bg-other/20 text-other';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(withdrawals, 'withdrawals')}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
      <div className="forensic-panel overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>UTR</th>
              <th>Linked Layer</th>
              <th>Bank</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w, i) => (
              <tr key={i}>
                <td>{w.date || '-'}</td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs uppercase ${getTypeColor(w.type)}`}>
                    {w.type}
                  </span>
                </td>
                <td className="text-atm">{formatCurrency(w.amount)}</td>
                <td>{w.utr || '-'}</td>
                <td>{w.linkedLayer ? `L${w.linkedLayer}` : '-'}</td>
                <td>{w.bank || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OtherTable({ transactions }: { transactions: any[] }) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No other transactions found</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(transactions, 'other_transactions')}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>
      <div className="forensic-panel overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>UTR</th>
              <th>Bank</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr key={i}>
                <td>{t.date || '-'}</td>
                <td>
                  <span className="px-2 py-0.5 rounded text-xs uppercase bg-aeps/20 text-aeps">
                    {t.type}
                  </span>
                </td>
                <td>{formatCurrency(t.amount)}</td>
                <td>{t.utr || '-'}</td>
                <td>{t.bank || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCurrencyLocal(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
