import endScreenImg from "@/assets/end-screen.png";

interface EndScreenProps {
  onContinue: () => void;
  onReturnToMenu: () => void;
}

export const EndScreen = ({ onContinue, onReturnToMenu }: EndScreenProps) => {
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center cursor-pointer"
      onClick={onContinue}
      style={{
        backgroundImage: `url(${endScreenImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="text-center animate-pulse">
        <p className="text-2xl font-mono text-white/80 mt-8">
          CLICK TO CONTINUE
        </p>
      </div>
    </div>
  );
};
