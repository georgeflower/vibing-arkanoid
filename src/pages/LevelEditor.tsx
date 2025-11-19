import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { levelLayouts } from "@/constants/levelLayouts";
import { toast } from "sonner";
import crackedBrick3 from "@/assets/brick-cracked-3.png";

type CellValue = boolean | number;

// Brick Preview Component
const BrickPreview = ({ type, isSelected, onClick }: { 
  type: CellValue; 
  isSelected: boolean; 
  onClick: () => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw brick based on type
    if (type === false) {
      // Empty - dark background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, 60, 30);
    } else if (type === 2) {
      // Metal brick
      ctx.fillStyle = 'hsl(0, 0%, 33%)';
      ctx.fillRect(0, 0, 60, 30);
      
      // Steel gradient effect
      const gradient = ctx.createLinearGradient(0, 0, 60, 0);
      gradient.addColorStop(0, 'rgba(180, 180, 180, 0.3)');
      gradient.addColorStop(0.5, 'rgba(120, 120, 120, 0.3)');
      gradient.addColorStop(1, 'rgba(80, 80, 80, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 60, 30);
      
      // Highlights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, 0, 60, 2);
      ctx.fillRect(0, 0, 2, 30);
      
      // Diagonal hatching
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 90; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(0, i);
        ctx.stroke();
      }
    } else if (type === 3) {
      // Explosive brick
      ctx.fillStyle = 'hsl(15, 90%, 50%)';
      ctx.fillRect(0, 0, 60, 30);
      
      // Top highlight
      ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
      ctx.fillRect(0, 0, 60, 2);
      
      // Warning pattern (darker dotted diagonals)
      ctx.strokeStyle = 'rgba(50, 50, 50, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i < 90; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(0, i);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      
      // Explosion icon
      ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💥', 30, 15);
    } else if (type === 4) {
      // Cracked brick - load and use the texture
      const img = new Image();
      img.src = crackedBrick3;
      if (img.complete) {
        ctx.drawImage(img, 0, 0, 60, 30);
      } else {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, 60, 30);
        };
      }
    } else {
      // Normal brick (true)
      ctx.fillStyle = 'hsl(200, 70%, 50%)';
      ctx.fillRect(0, 0, 60, 30);
      
      // Highlights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, 0, 60, 2);
      ctx.fillRect(0, 0, 2, 30);
      
      // Shadows
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 28, 60, 2);
      ctx.fillRect(58, 0, 2, 30);
      
      // Pixel pattern texture
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let py = 4; py < 26; py += 4) {
        for (let px = 4; px < 56; px += 4) {
          if ((px + py) % 8 === 0) {
            ctx.fillRect(px, py, 2, 2);
          }
        }
      }
    }
  }, [type]);
  
  return (
    <button
      onClick={onClick}
      className={`relative border-2 rounded transition-all ${
        isSelected 
          ? 'border-cyan-400 shadow-lg shadow-cyan-400/50 scale-105' 
          : 'border-white/20 hover:border-white/40'
      }`}
    >
      <canvas 
        ref={canvasRef} 
        width={60} 
        height={30}
        className="rounded"
      />
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
      )}
    </button>
  );
};

export default function LevelEditor() {
  const navigate = useNavigate();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [grid, setGrid] = useState<CellValue[][]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedBrush, setSelectedBrush] = useState<CellValue>(true);
  const [isPainting, setIsPainting] = useState(false);

  // Initialize grid with 14 rows x 13 columns
  useEffect(() => {
    loadLevel(currentLevel);
  }, []);

  const loadLevel = (levelNum: number) => {
    const levelIndex = levelNum - 1;
    if (levelIndex >= 0 && levelIndex < levelLayouts.length) {
      // Clone the level layout
      const layout = levelLayouts[levelIndex].map(row => [...row]);
      setGrid(layout);
      setHasChanges(false);
    } else {
      // Create empty grid for new levels
      const emptyGrid = Array.from({ length: 14 }, () => 
        Array.from({ length: 13 }, () => false as CellValue)
      );
      setGrid(emptyGrid);
      setHasChanges(false);
    }
  };

  const handleLevelChange = (level: number) => {
    if (level < 1 || level > 100) return;
    
    if (hasChanges) {
      const confirm = window.confirm("You have unsaved changes. Do you want to discard them?");
      if (!confirm) return;
    }
    
    setCurrentLevel(level);
    loadLevel(level);
  };

  const paintCell = (rowIndex: number, colIndex: number) => {
    const newGrid = grid.map((row, rIdx) => 
      row.map((cell, cIdx) => {
        if (rIdx === rowIndex && cIdx === colIndex) {
          return selectedBrush;
        }
        return cell;
      })
    );
    setGrid(newGrid);
    setHasChanges(true);
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    paintCell(rowIndex, colIndex);
  };

  const handleCellMouseDown = (rowIndex: number, colIndex: number) => {
    setIsPainting(true);
    paintCell(rowIndex, colIndex);
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (isPainting) {
      paintCell(rowIndex, colIndex);
    }
  };

  const handleMouseUp = () => {
    setIsPainting(false);
  };

  const handleCellRightClick = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    const newGrid = grid.map((row, rIdx) => 
      row.map((cell, cIdx) => {
        if (rIdx === rowIndex && cIdx === colIndex) {
          return false;
        }
        return cell;
      })
    );
    setGrid(newGrid);
    setHasChanges(true);
  };

  // Keyboard shortcuts for brush selection
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '1') setSelectedBrush(false);  // Empty
      if (e.key === '2') setSelectedBrush(true);   // Normal
      if (e.key === '3') setSelectedBrush(2);      // Metal
      if (e.key === '4') setSelectedBrush(3);      // Explosive
      if (e.key === '5') setSelectedBrush(4);      // Cracked
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleSave = () => {
    // Generate the code for the level
    const levelCode = generateLevelCode(grid);
    
    // Copy to clipboard
    navigator.clipboard.writeText(levelCode).then(() => {
      toast.success("Level code copied to clipboard! Paste it into levelLayouts.ts");
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
    
    setHasChanges(false);
  };

  const generateLevelCode = (levelGrid: CellValue[][]): string => {
    const rows = levelGrid.map(row => {
      const cells = row.map(cell => {
        if (cell === false) return "false";
        if (cell === true) return "true";
        if (cell === 2) return "2"; // metal
        if (cell === 3) return "3"; // explosive
        if (cell === 4) return "4"; // cracked
        return "false";
      }).join(", ");
      return `    [${cells}]`;
    }).join(",\n");
    
    return `  // Level ${currentLevel}\n  [\n${rows}\n  ],`;
  };

  const getCellColor = (value: CellValue): string => {
    if (value === false) return "bg-gray-800";
    if (value === true) return "bg-[hsl(200,70%,50%)]"; // Normal brick
    if (value === 2) return "bg-[hsl(0,0%,33%)]"; // Metal (indestructible)
    if (value === 3) return "bg-[hsl(15,90%,50%)]"; // Explosive
    if (value === 4) return "bg-[hsl(40,15%,45%)]"; // Cracked
    return "bg-gray-800";
  };

  const getCellLabel = (value: CellValue): string => {
    if (value === false) return "";
    if (value === true) return "N"; // Normal
    if (value === 2) return "M"; // Metal
    if (value === 3) return "E"; // Explosive
    if (value === 4) return "C"; // Cracked
    return "";
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[hsl(220,25%,12%)] to-[hsl(220,30%,8%)] p-4 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <Card className="p-6 bg-[hsl(220,20%,15%)] border-[hsl(200,70%,50%)]">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-[hsl(200,70%,50%)]">Level Editor</h1>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="border-[hsl(200,70%,50%)] text-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,50%)] hover:text-white"
            >
              Back to Menu
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-1 space-y-4">
              <div>
                <Label htmlFor="level" className="text-white text-lg">Level Number</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    max="100"
                    value={currentLevel}
                    onChange={(e) => handleLevelChange(parseInt(e.target.value) || 1)}
                    className="bg-[hsl(220,20%,20%)] border-[hsl(200,70%,50%)] text-white"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-white text-lg">Brush Selector</Label>
                <p className="text-white/60 text-xs">Click to select, then paint on grid</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <BrickPreview 
                      type={false} 
                      isSelected={selectedBrush === false}
                      onClick={() => setSelectedBrush(false)}
                    />
                    <span className="text-white text-xs block text-center">Empty</span>
                  </div>
                  
                  <div className="space-y-1">
                    <BrickPreview 
                      type={true} 
                      isSelected={selectedBrush === true}
                      onClick={() => setSelectedBrush(true)}
                    />
                    <span className="text-white text-xs block text-center">Normal</span>
                  </div>
                  
                  <div className="space-y-1">
                    <BrickPreview 
                      type={2} 
                      isSelected={selectedBrush === 2}
                      onClick={() => setSelectedBrush(2)}
                    />
                    <span className="text-white text-xs block text-center">Metal</span>
                  </div>
                  
                  <div className="space-y-1">
                    <BrickPreview 
                      type={3} 
                      isSelected={selectedBrush === 3}
                      onClick={() => setSelectedBrush(3)}
                    />
                    <span className="text-white text-xs block text-center">Explosive</span>
                  </div>
                  
                  <div className="space-y-1">
                    <BrickPreview 
                      type={4} 
                      isSelected={selectedBrush === 4}
                      onClick={() => setSelectedBrush(4)}
                    />
                    <span className="text-white text-xs block text-center">Cracked</span>
                  </div>
                </div>
                
                <p className="text-white/40 text-xs mt-2">
                  Shortcuts: 1-Empty, 2-Normal, 3-Metal, 4-Explosive, 5-Cracked
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-lg">Quick Actions</Label>
                <Button
                  onClick={() => {
                    const emptyGrid = Array.from({ length: 14 }, () => 
                      Array.from({ length: 13 }, () => false as CellValue)
                    );
                    setGrid(emptyGrid);
                    setHasChanges(true);
                  }}
                  variant="outline"
                  className="w-full border-[hsl(200,70%,50%)] text-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,50%)] hover:text-white"
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => {
                    const fullGrid = Array.from({ length: 14 }, () => 
                      Array.from({ length: 13 }, () => true as CellValue)
                    );
                    setGrid(fullGrid);
                    setHasChanges(true);
                  }}
                  variant="outline"
                  className="w-full border-[hsl(200,70%,50%)] text-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,50%)] hover:text-white"
                >
                  Fill All
                </Button>
              </div>

              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className="w-full bg-[hsl(200,70%,50%)] hover:bg-[hsl(200,70%,60%)] text-white text-lg py-6"
              >
                {hasChanges ? "Save Level (Copy Code)" : "No Changes"}
              </Button>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-black/30 p-4 rounded-lg border border-[hsl(200,70%,50%)]/30 relative">
                {/* Current brush indicator */}
                <div className="absolute top-2 right-2 bg-black/60 rounded px-3 py-1 flex items-center gap-2">
                  <span className="text-white/60 text-xs">Brush:</span>
                  <div 
                    className="w-6 h-3 rounded border border-white/20" 
                    style={{ 
                      backgroundColor: selectedBrush === false ? '#1a1a1a' : 
                                       selectedBrush === true ? 'hsl(200, 70%, 50%)' : 
                                       selectedBrush === 2 ? 'hsl(0, 0%, 33%)' : 
                                       selectedBrush === 3 ? 'hsl(15, 90%, 50%)' : 
                                       'hsl(40, 15%, 45%)' 
                    }}
                  />
                </div>
                
                <Label className="text-white text-lg mb-4 block">
                  Grid (Select brush, then click or drag to paint)
                </Label>
                
                <div 
                  className={`inline-block transition-all ${isPainting ? 'ring-2 ring-cyan-400 ring-opacity-50' : ''}`}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1">
                      {row.map((cell, colIndex) => (
                        <button
                          key={`${rowIndex}-${colIndex}`}
                          onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                          onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          onContextMenu={(e) => handleCellRightClick(rowIndex, colIndex, e)}
                          onTouchStart={() => handleCellMouseDown(rowIndex, colIndex)}
                          className={`w-8 h-8 border border-white/20 ${getCellColor(cell)} hover:opacity-80 transition-opacity flex items-center justify-center text-xs font-bold text-white select-none`}
                          style={{ cursor: 'crosshair' }}
                          title={`Left-click: Paint | Right-click: Clear`}
                        >
                          {getCellLabel(cell)}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[hsl(30,100%,60%)]/10 border border-[hsl(30,100%,60%)]/30 rounded-lg p-4">
            <p className="text-[hsl(30,100%,60%)] text-sm">
              <strong>Note:</strong> After saving, paste the generated code into <code className="bg-black/30 px-2 py-1 rounded">src/constants/levelLayouts.ts</code> at the appropriate level index. The code will be copied to your clipboard.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
