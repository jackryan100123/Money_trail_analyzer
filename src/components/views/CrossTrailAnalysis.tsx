import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Search, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  extractAccountsFromFile, 
  findCommonAccounts, 
  type TrailFile, 
  type CrossTrailResult 
} from '@/lib/crossTrailAnalyzer';

export function CrossTrailAnalysis() {
  const [trails, setTrails] = useState<TrailFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CrossTrailResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      const newTrails: TrailFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const trail = await extractAccountsFromFile(file);
        newTrails.push(trail);
      }
      
      const updatedTrails = [...trails, ...newTrails];
      setTrails(updatedTrails);
      
      // Automatically analyze if we have 2+ trails
      if (updatedTrails.length >= 2) {
        const analysisResult = findCommonAccounts(updatedTrails);
        setResult(analysisResult);
      } else {
        setResult(null);
      }
    } catch (err) {
      console.error('Failed to process files:', err);
      setError('Failed to process one or more files. Please check the file format.');
    } finally {
      setIsProcessing(false);
      // Reset the input
      e.target.value = '';
    }
  }, [trails]);

  const removeTrail = useCallback((trailId: string) => {
    const updatedTrails = trails.filter(t => t.id !== trailId);
    setTrails(updatedTrails);
    
    if (updatedTrails.length >= 2) {
      const analysisResult = findCommonAccounts(updatedTrails);
      setResult(analysisResult);
    } else {
      setResult(null);
    }
  }, [trails]);

  const clearAll = useCallback(() => {
    setTrails([]);
    setResult(null);
    setError(null);
  }, []);

  const runAnalysis = useCallback(() => {
    if (trails.length >= 2) {
      const analysisResult = findCommonAccounts(trails);
      setResult(analysisResult);
    }
  }, [trails]);

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cross-Trail Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Upload multiple money trail files to find common accounts across trails
          </p>
        </div>
        {trails.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        )}
      </div>

      {/* Upload Section */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={handleFilesUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              <Button 
                variant="outline" 
                className="gap-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Money Trail Excel Files
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Select multiple .xlsx or .xls files to compare
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-4 pb-4 flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files List */}
      {trails.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">
              Uploaded Trails ({trails.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {trails.map((trail) => (
                <Badge 
                  key={trail.id} 
                  variant="secondary" 
                  className="gap-2 py-1.5 px-3"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span className="max-w-[150px] truncate">{trail.name}</span>
                  <span className="text-muted-foreground">
                    ({trail.accounts.size} accounts)
                  </span>
                  <button
                    onClick={() => removeTrail(trail.id)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {trails.length < 2 && (
              <p className="text-xs text-muted-foreground mt-3">
                Upload at least 2 trails to find common accounts
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis Button */}
      {trails.length >= 2 && (
        <Button onClick={runAnalysis} className="gap-2 w-fit">
          <Search className="w-4 h-4" />
          Re-analyze Trails
        </Button>
      )}

      {/* Results */}
      {result && (
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Analysis Results
                </CardTitle>
                <CardDescription className="mt-1">
                  Found {result.commonAccounts.length} common account(s) across {result.trails.length} trails
                </CardDescription>
              </div>
              <Badge variant="outline">
                {result.totalUniqueAccounts} total unique accounts
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            {result.commonAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-center">No common accounts found across the uploaded trails.</p>
                <p className="text-center text-sm mt-2">
                  All accounts in these trails appear in only one file.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {result.commonAccounts.map((common, index) => (
                    <Card key={common.canonicalAccount} className="bg-muted/30">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-muted-foreground">#{index + 1}</span>
                              <code className="text-sm font-mono bg-background px-2 py-0.5 rounded border">
                                {common.account}
                              </code>
                              <Badge variant="default" className="text-xs">
                                Found in {common.count} trails
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {common.foundInTrails.map((trail) => (
                                <Badge 
                                  key={trail.trailId} 
                                  variant="outline" 
                                  className="text-xs gap-1"
                                >
                                  <FileSpreadsheet className="w-3 h-3" />
                                  <span className="max-w-[200px] truncate">
                                    {trail.trailName}
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {trails.length === 0 && (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center py-12">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Trails Uploaded</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Upload two or more money trail Excel files to find common account numbers 
              that appear across different investigations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
