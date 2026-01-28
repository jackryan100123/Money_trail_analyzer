import { useMemo } from 'react';
import { useInvestigationStore } from '@/store/investigationStore';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LAYER_COLORS = [
  { border: 'hsl(0,70%,50%)', bg: 'hsl(0,70%,50%)' },      // Layer 1 - Red
  { border: 'hsl(180,70%,45%)', bg: 'hsl(180,70%,45%)' },  // Layer 2 - Cyan
  { border: 'hsl(200,70%,50%)', bg: 'hsl(200,70%,50%)' },  // Layer 3 - Blue
  { border: 'hsl(45,80%,50%)', bg: 'hsl(45,80%,50%)' },    // Layer 4 - Yellow
  { border: 'hsl(280,60%,55%)', bg: 'hsl(280,60%,55%)' },  // Layer 5 - Purple
  { border: 'hsl(210,60%,55%)', bg: 'hsl(210,60%,55%)' },  // Layer 6 - Light Blue
  { border: 'hsl(30,80%,50%)', bg: 'hsl(30,80%,50%)' },    // Layer 7 - Orange
  { border: 'hsl(140,50%,45%)', bg: 'hsl(140,50%,45%)' },  // Layer 8 - Green
];

export function GraphLegend() {
  const { 
    graphNodes, 
    visibleLayers, 
    toggleLayerVisibility, 
    showAllLayers,
    filters 
  } = useInvestigationStore();

  // Get unique layers from graph nodes
  const availableLayers = useMemo(() => {
    const layers = new Set(
      graphNodes
        .filter(n => n.type === 'account')
        .map(n => n.layer)
    );
    return Array.from(layers).sort((a, b) => a - b);
  }, [graphNodes]);

  // Check if any filter is active
  const hasActiveFilter = visibleLayers.size > 0 && visibleLayers.size < availableLayers.length;

  return (
    <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg p-4 z-10 min-w-[180px]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Legend</h4>
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={showAllLayers}
            title="Show all layers"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="space-y-1.5 text-xs">
        {/* Layer items - only show layers that exist in the data */}
        {availableLayers.map(layer => {
          const colorIndex = (layer - 1) % LAYER_COLORS.length;
          const color = LAYER_COLORS[colorIndex];
          const isVisible = visibleLayers.size === 0 || visibleLayers.has(layer);
          
          return (
            <button
              key={layer}
              onClick={() => toggleLayerVisibility(layer)}
              className={`
                flex items-center gap-2 w-full p-1.5 rounded-md transition-all
                hover:bg-accent/50 cursor-pointer group
                ${!isVisible ? 'opacity-40' : ''}
              `}
              title={isVisible ? `Click to hide Layer ${layer}` : `Click to show Layer ${layer}`}
            >
              <div 
                className="w-4 h-4 rounded border-2 transition-all"
                style={{ 
                  borderColor: color.border,
                  backgroundColor: `${color.bg}20`,
                }}
              />
              <span className={`flex-1 text-left ${!isVisible ? 'line-through' : ''}`}>
                Layer {layer}
              </span>
              {isVisible ? (
                <Eye className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              ) : (
                <EyeOff className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          );
        })}
        
        {availableLayers.length === 0 && (
          <p className="text-muted-foreground text-[10px]">No layers to display</p>
        )}
        
        {/* Withdrawal types */}
        <div className="border-t border-border pt-2 mt-2 space-y-1.5">
          <div className="flex items-center gap-2 p-1.5">
            <div className="w-4 h-4 rotate-45 border-2 border-atm bg-atm/10" />
            <span>ATM Withdrawal</span>
          </div>
          <div className="flex items-center gap-2 p-1.5">
            <div className="w-4 h-4 rotate-45 border-2 border-pos bg-pos/10" />
            <span>POS Withdrawal</span>
          </div>
          <div className="flex items-center gap-2 p-1.5">
            <div className="w-4 h-4 rotate-45 border-2 border-cheque bg-cheque/10" />
            <span>Cheque Withdrawal</span>
          </div>
        </div>
        
        {/* Selection indicators */}
        <div className="border-t border-border pt-2 mt-2 space-y-1.5">
          <div className="flex items-center gap-2 p-1.5">
            <div className="w-4 h-4 rounded ring-2 ring-primary" />
            <span className="text-primary">Selected Node</span>
          </div>
          <div className="flex items-center gap-2 p-1.5">
            <div className="w-4 h-4 rounded ring-2 ring-destructive" />
            <span className="text-destructive">Collapsed Node</span>
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
          Click layer = Toggle visibility<br />
          Click node = Select • Dbl-click = Collapse
        </p>
      </div>
    </div>
  );
}
