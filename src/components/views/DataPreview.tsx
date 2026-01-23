import { useState } from 'react';
import { useInvestigationStore } from '@/store/investigationStore';
import { Button } from '@/components/ui/button';
import { exportToCSV } from '@/lib/excelParser';
import { Download, ChevronDown, ChevronRight, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function DataPreview() {
  const { sheets } = useInvestigationStore();
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());

  const toggleSheet = (name: string) => {
    const newExpanded = new Set(expandedSheets);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedSheets(newExpanded);
  };

  if (sheets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <Database className="w-12 h-12 mx-auto opacity-50" />
          <div>
            <h3 className="text-lg font-medium text-foreground">No Data Loaded</h3>
            <p className="text-sm mt-1">Upload an Excel file to preview the data</p>
          </div>
        </div>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transfer': return 'bg-transfer/20 text-transfer';
      case 'atm': return 'bg-atm/20 text-atm';
      case 'pos': return 'bg-pos/20 text-pos';
      case 'cheque': return 'bg-cheque/20 text-cheque';
      case 'aeps': return 'bg-aeps/20 text-aeps';
      case 'hold': return 'bg-hold/20 text-hold';
      default: return 'bg-other/20 text-other';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Data Preview</h2>
          <span className="text-sm text-muted-foreground">{sheets.length} sheets loaded</span>
        </div>

        {sheets.map((sheet) => (
          <div key={sheet.name} className="forensic-panel overflow-hidden">
            {/* Sheet Header */}
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              onClick={() => toggleSheet(sheet.name)}
            >
              <div className="flex items-center gap-3">
                {expandedSheets.has(sheet.name) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium">{sheet.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(sheet.type)}`}>
                  {sheet.type}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {sheet.rows.length} rows • {sheet.columns.length} columns
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToCSV(sheet.rows, sheet.name.replace(/\s+/g, '_'));
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </button>

            {/* Sheet Content */}
            {expandedSheets.has(sheet.name) && (
              <div className="border-t border-border overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {sheet.columns.filter(c => !c.startsWith('_raw_')).map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 100).map((row, i) => (
                      <tr key={i}>
                        {sheet.columns.filter(c => !c.startsWith('_raw_')).map((col) => (
                          <td key={col}>
                            {row[col] !== undefined && row[col] !== null 
                              ? String(row[col]).slice(0, 50) 
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sheet.rows.length > 100 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/20">
                    Showing first 100 of {sheet.rows.length} rows
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
