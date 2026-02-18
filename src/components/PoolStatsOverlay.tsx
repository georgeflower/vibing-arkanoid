import { useState, useEffect } from "react";
import { getAllPoolStats } from "@/utils/entityPool";
import { particlePool } from "@/utils/particlePool";
import { brickSpatialHash } from "@/utils/spatialHash";
import { brickRenderer } from "@/utils/brickLayerCache";

interface PoolStatsOverlayProps {
  visible?: boolean;
}

const getUtilColor = (active: number, total: number): string => {
  if (total === 0) return "text-muted-foreground";
  const ratio = active / total;
  if (ratio > 0.8) return "text-red-400";
  if (ratio > 0.5) return "text-yellow-400";
  return "text-green-400";
};

export const PoolStatsOverlay = ({ visible = true }: PoolStatsOverlayProps) => {
  const [stats, setStats] = useState<{
    pools: Record<string, { active: number; pooled: number }>;
    particles: { active: number; pooled: number; total: number };
    spatial: { cells: number; objects: number; avgPerCell: number };
    cache: { version: number; width: number; height: number } | null;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setStats({
        pools: getAllPoolStats(),
        particles: particlePool.getStats(),
        spatial: brickSpatialHash.getStats(),
        cache: brickRenderer.getStats(),
      });
    }, 200);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible || !stats) return null;

  return (
    <div
      className="fixed bottom-2 left-2 z-[9990] pointer-events-none font-mono text-[10px] leading-tight"
      style={{ background: "rgba(0,0,0,0.8)", padding: "6px 8px", borderRadius: 4, border: "1px solid hsl(var(--primary) / 0.4)" }}
    >
      {/* Entity Pools */}
      <div className="text-primary font-bold mb-1">Entity Pools</div>
      {Object.entries(stats.pools).map(([name, p]) => {
        const total = p.active + p.pooled;
        return (
          <div key={name} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{name}</span>
            <span className={getUtilColor(p.active, total)}>
              {p.active}/{total}
            </span>
          </div>
        );
      })}

      {/* Particles */}
      <div className="text-primary font-bold mt-2 mb-1">Particles</div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">active/total</span>
        <span className={getUtilColor(stats.particles.active, stats.particles.total)}>
          {stats.particles.active}/{stats.particles.total}
        </span>
      </div>

      {/* Spatial Hash */}
      <div className="text-primary font-bold mt-2 mb-1">Spatial Hash</div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">cells</span>
        <span className="text-foreground">{stats.spatial.cells}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">objects</span>
        <span className="text-foreground">{stats.spatial.objects}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">avg/cell</span>
        <span className="text-foreground">{stats.spatial.avgPerCell.toFixed(1)}</span>
      </div>

      {/* Brick Cache */}
      <div className="text-primary font-bold mt-2 mb-1">Brick Cache</div>
      {stats.cache ? (
        <>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">rebuilds</span>
            <span className="text-foreground">{stats.cache.version}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">size</span>
            <span className="text-foreground">{stats.cache.width}×{stats.cache.height}</span>
          </div>
        </>
      ) : (
        <div className="text-muted-foreground">not initialized</div>
      )}
    </div>
  );
};
