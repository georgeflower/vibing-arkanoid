import type { QualityLevel } from "@/hooks/useAdaptiveQuality";
import { useIsMobile } from "@/hooks/use-mobile";

interface CRTOverlayProps {
  quality: QualityLevel;
}

const CRTOverlay = ({ quality }: CRTOverlayProps) => {
  const isMobile = useIsMobile();
  
  // Disable CRT on mobile devices AND on LOW quality (eliminates compositor overhead)
  if (isMobile || quality === 'low') {
    return null;
  }
  
  const qualityClass = quality === 'high' ? 'crt-high' : quality === 'medium' ? 'crt-medium' : '';
  
  return (
    <>
      {/* Scanline overlay */}
      <div className={`crt-scanlines ${qualityClass}`} />
      
      {/* Screen curvature and vignette effect */}
      <div className={`crt-screen ${qualityClass}`} />
      
      {/* Phosphor glow effect */}
      <div className={`crt-phosphor ${qualityClass}`} />
    </>
  );
};

export default CRTOverlay;
