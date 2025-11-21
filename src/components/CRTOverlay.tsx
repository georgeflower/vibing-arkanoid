const CRTOverlay = () => {
  return (
    <>
      {/* Scanline overlay */}
      <div className="crt-scanlines" />
      
      {/* Screen curvature and vignette effect */}
      <div className="crt-screen" />
      
      {/* Phosphor glow effect */}
      <div className="crt-phosphor" />
    </>
  );
};

export default CRTOverlay;
