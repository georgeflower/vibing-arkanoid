import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { levelLayouts } from "@/constants/levelLayouts";
import { toast } from "sonner";

type CellValue = boolean | number;

export default function LevelEditor() {
  const navigate = useNavigate();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [grid, setGrid] = useState<CellValue[][]>([]);
  const [hasChanges, setHasChanges] = useState(false);

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

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    const newGrid = grid.map((row, rIdx) => 
      row.map((cell, cIdx) => {
        if (rIdx === rowIndex && cIdx === colIndex) {
          // Cycle: false -> true -> 2 -> false
          if (cell === false) return true;
          if (cell === true) return 2;
          return false;
        }
        return cell;
      })
    );
    setGrid(newGrid);
    setHasChanges(true);
  };

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
        return "2";
      }).join(", ");
      return `    [${cells}]`;
    }).join(",\n");
    
    return `  // Level ${currentLevel}\n  [\n${rows}\n  ],`;
  };

  const getCellColor = (value: CellValue): string => {
    if (value === false) return "bg-gray-800";
    if (value === true) return "bg-[hsl(200,70%,50%)]";
    return "bg-[hsl(0,85%,55%)]"; // Indestructible
  };

  const getCellLabel = (value: CellValue): string => {
    if (value === false) return "";
    if (value === true) return "B";
    return "I";
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

              <div className="space-y-2">
                <Label className="text-white text-lg">Legend</Label>
                <div className="space-y-2 text-white text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-800 border border-white/20"></div>
                    <span>Empty (false)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[hsl(200,70%,50%)] border border-white/20 flex items-center justify-center text-xs font-bold">B</div>
                    <span>Brick (true)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[hsl(0,85%,55%)] border border-white/20 flex items-center justify-center text-xs font-bold">I</div>
                    <span>Indestructible (2)</span>
                  </div>
                </div>
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
              <div className="bg-black/30 p-4 rounded-lg border border-[hsl(200,70%,50%)]/30">
                <Label className="text-white text-lg mb-4 block">
                  Grid (Click cells to cycle: Empty → Brick → Indestructible)
                </Label>
                <div className="inline-block">
                  {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1">
                      {row.map((cell, colIndex) => (
                        <button
                          key={`${rowIndex}-${colIndex}`}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          className={`w-8 h-8 border border-white/20 ${getCellColor(cell)} hover:opacity-80 transition-opacity flex items-center justify-center text-xs font-bold text-white`}
                          title={`Row ${rowIndex}, Col ${colIndex}: ${cell === false ? "Empty" : cell === true ? "Brick" : "Indestructible"}`}
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
