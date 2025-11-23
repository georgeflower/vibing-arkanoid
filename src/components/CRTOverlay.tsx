import type { QualityLevel } from "@/hooks/useAdaptiveQuality";

interface CRTOverlayProps {
  quality: QualityLevel;
}

const CRTOverlay = ({ quality }: CRTOverlayProps) => {
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
