import { useState, useCallback } from 'react';
import { Upload, BarChart3, Search, Database, Layers, Filter, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useInvestigationStore } from '@/store/investigationStore';
import { parseExcelFile, exportToCSV } from '@/lib/excelParser';
import { getLayersFromGraph } from '@/lib/graphBuilder';

export function Sidebar() {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const { 
    sheets,
    loadSheets, 
    filters, 
    setFilters, 
    graphNodes,
    graphEdges,
    activeView, 
    setActiveView,
    expandAll,
    collapseLayer,
    transfers,
    withdrawals
  } = useInvestigationStore();

  const layers = getLayersFromGraph(graphNodes);
  const maxAvailableLayer = Math.max(...layers, 1);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);

    try {
      const parsedSheets = await parseExcelFile(file);
      loadSheets(parsedSheets);
    } catch (error) {
      console.error('Failed to parse file:', error);
    } finally {
      setIsUploading(false);
    }
  }, [loadSheets]);

  const handleExport = useCallback(() => {
    const exportData = graphNodes.map(node => ({
      account: node.account,
      layer: node.layer,
      type: node.type,
      totalInflow: node.totalInflow,
      totalOutflow: node.totalOutflow,
      transactionCount: node.transactions.length,
    }));
    exportToCSV(exportData, 'money_trail_export');
  }, [graphNodes]);

  return (
    <aside className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold text-sidebar-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Money Trail
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Financial Investigation Tool</p>
      </div>

      {/* File Upload */}
      <div className="p-4 border-b border-sidebar-border">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
          Data Source
        </Label>
        <div className="relative">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border"
            disabled={isUploading}
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Processing...' : 'Upload Excel File'}
          </Button>
        </div>
        {fileName && (
          <p className="text-xs text-muted-foreground mt-2 truncate font-mono">
            {fileName}
          </p>
        )}
        {sheets.length > 0 && (
          <p className="text-xs text-primary mt-1">
            {sheets.length} sheets loaded • {transfers.length} transfers
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="p-4 border-b border-sidebar-border space-y-1">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
          View Mode
        </Label>
        <Button
          variant={activeView === 'graph' ? 'default' : 'ghost'}
          className="w-full justify-start gap-2"
          onClick={() => setActiveView('graph')}
        >
          <Layers className="w-4 h-4" />
          Graph View
        </Button>
        <Button
          variant={activeView === 'data' ? 'default' : 'ghost'}
          className="w-full justify-start gap-2"
          onClick={() => setActiveView('data')}
        >
          <Database className="w-4 h-4" />
          Data Preview
        </Button>
        <Button
          variant={activeView === 'search' ? 'default' : 'ghost'}
          className="w-full justify-start gap-2"
          onClick={() => setActiveView('search')}
        >
          <Search className="w-4 h-4" />
          Account Search
        </Button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-sidebar-border space-y-4 flex-1 overflow-auto">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Filter className="w-3 h-3" />
          Filters
        </Label>

        {/* Max Layer */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Max Layer</span>
            <span className="font-mono text-primary">{filters.maxLayer}</span>
          </div>
          <Slider
            value={[filters.maxLayer]}
            onValueChange={([value]) => setFilters({ maxLayer: value })}
            min={1}
            max={Math.max(maxAvailableLayer, 10)}
            step={1}
            className="w-full"
          />
        </div>

        {/* Min Amount */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Min Amount (₹)</Label>
          <Input
            type="number"
            value={filters.minAmount}
            onChange={(e) => setFilters({ minAmount: Number(e.target.value) || 0 })}
            className="h-8 text-sm font-mono bg-sidebar-accent border-sidebar-border"
            placeholder="0"
          />
        </div>

        {/* Layer Quick Actions */}
        {layers.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Collapse</Label>
            <div className="flex flex-wrap gap-1">
              {layers.filter(l => l <= filters.maxLayer).map(layer => (
                <Button
                  key={layer}
                  variant="outline"
                  size="sm"
                  className="h-6 w-8 text-xs px-0 bg-sidebar-accent border-sidebar-border"
                  onClick={() => collapseLayer(layer)}
                >
                  L{layer}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2 border-t border-sidebar-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border"
          onClick={expandAll}
        >
          <RotateCcw className="w-4 h-4" />
          Reset View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border"
          onClick={handleExport}
          disabled={graphNodes.length === 0}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Footer */}
      <div className="p-4 bg-muted/30 text-xs text-muted-foreground border-t border-sidebar-border">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-primary font-mono">{graphNodes.length}</span>
            <span>Nodes</span>
          </div>
          <div>
            <span className="block text-primary font-mono">{graphEdges.length}</span>
            <span>Edges</span>
          </div>
          <div>
            <span className="block text-transfer font-mono">{transfers.length}</span>
            <span>Transfers</span>
          </div>
          <div>
            <span className="block text-atm font-mono">{withdrawals.length}</span>
            <span>Withdrawals</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
