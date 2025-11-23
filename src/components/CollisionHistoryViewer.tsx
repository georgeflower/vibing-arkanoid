import { useState } from "react";
import { collisionHistory, CollisionHistoryEntry } from "@/utils/collisionHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export const CollisionHistoryViewer = ({ onClose }: { onClose: () => void }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const history = collisionHistory.getHistory();

  const handleExport = () => {
    const json = collisionHistory.exportToJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collision-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    collisionHistory.clear();
    setSelectedIndex(null);
  };

  const selectedEntry = selectedIndex !== null ? history[selectedIndex] : null;

  return (
    <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl h-[80vh] z-50 bg-background/95 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Collision History (Last 50)</CardTitle>
        <div className="flex gap-2">
          <Button onClick={handleExport} size="sm" variant="outline">
            Export JSON
          </Button>
          <Button onClick={handleClear} size="sm" variant="outline">
            Clear
          </Button>
          <Button onClick={onClose} size="sm" variant="outline">
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex gap-4 h-[calc(100%-4rem)]">
        {/* History List */}
        <ScrollArea className="w-1/3 border rounded p-2">
          <div className="space-y-1">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collisions recorded</p>
            ) : (
              history.map((entry, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full text-left p-2 rounded text-xs hover:bg-accent transition-colors ${
                    selectedIndex === index ? "bg-accent" : ""
                  }`}
                >
                  <div className="font-mono">
                    #{history.length - index} Frame {entry.frameNumber}
                  </div>
                  <div className="text-muted-foreground">
                    {entry.objectType.toUpperCase()} - {entry.timestamp.toFixed(0)}ms
                  </div>
                  {entry.reflectionApplied ? (
                    <span className="text-green-500">✓ Reflected</span>
                  ) : (
                    <span className="text-yellow-500">→ Pass Through</span>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Details Panel */}
        <div className="flex-1 border rounded p-4 overflow-auto">
          {selectedEntry ? (
            <div className="space-y-3 text-sm font-mono">
              <div>
                <h3 className="font-bold text-base mb-2">Collision Details</h3>
                <p>
                  <strong>Frame:</strong> {selectedEntry.frameNumber}
                </p>
                <p>
                  <strong>Timestamp:</strong> {selectedEntry.timestamp.toFixed(2)}ms
                </p>
                <p>
                  <strong>Object Type:</strong> {selectedEntry.objectType}
                </p>
                <p>
                  <strong>Object ID:</strong> {selectedEntry.objectId}
                </p>
                {selectedEntry.objectMeta && (
                  <div className="mt-2">
                    <strong>Object Metadata:</strong>
                    <pre className="bg-muted p-2 rounded mt-1">
                      {JSON.stringify(selectedEntry.objectMeta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="border-t pt-3">
                <h4 className="font-bold mb-1">Ball State BEFORE CCD</h4>
                <p>Position: ({selectedEntry.ballBefore.x.toFixed(2)}, {selectedEntry.ballBefore.y.toFixed(2)})</p>
                <p>Velocity: dx={selectedEntry.ballBefore.dx.toFixed(2)}, dy={selectedEntry.ballBefore.dy.toFixed(2)}</p>
                <p>Speed: {selectedEntry.ballBefore.speed.toFixed(2)}</p>
                <p>Fireball: {selectedEntry.ballBefore.isFireball ? "Yes" : "No"}</p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-bold mb-1">Ball State AFTER CCD</h4>
                <p>Position: ({selectedEntry.ballAfter.x.toFixed(2)}, {selectedEntry.ballAfter.y.toFixed(2)})</p>
                <p>Velocity: dx={selectedEntry.ballAfter.dx.toFixed(2)}, dy={selectedEntry.ballAfter.dy.toFixed(2)}</p>
                <p>Speed: {selectedEntry.ballAfter.speed.toFixed(2)}</p>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-bold mb-1">Collision Details</h4>
                <p>Point: ({selectedEntry.collisionPoint.x.toFixed(2)}, {selectedEntry.collisionPoint.y.toFixed(2)})</p>
                <p>Normal: ({selectedEntry.collisionNormal.x.toFixed(2)}, {selectedEntry.collisionNormal.y.toFixed(2)})</p>
                <p>
                  <strong>Reflection Applied:</strong>{" "}
                  {selectedEntry.reflectionApplied ? (
                    <span className="text-green-500">Yes</span>
                  ) : (
                    <span className="text-yellow-500">No (Pass Through)</span>
                  )}
                </p>
                {selectedEntry.soundPlayed && <p>Sound: {selectedEntry.soundPlayed}</p>}
              </div>

              <div className="border-t pt-3">
                <h4 className="font-bold mb-1">Velocity Change</h4>
                <p>Δdx: {(selectedEntry.ballAfter.dx - selectedEntry.ballBefore.dx).toFixed(2)}</p>
                <p>Δdy: {(selectedEntry.ballAfter.dy - selectedEntry.ballBefore.dy).toFixed(2)}</p>
                <p>Δspeed: {(selectedEntry.ballAfter.speed - selectedEntry.ballBefore.speed).toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Select a collision from the list to view details</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
