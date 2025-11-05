import { X } from "lucide-react";
import { CHANGELOG } from "@/constants/version";

interface ChangelogProps {
  onClose: () => void;
}

export const Changelog = ({ onClose }: ChangelogProps) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 rounded-lg border-2 border-cyan-500/30 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-cyan-400 font-mono">CHANGELOG</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className="border-l-4 border-cyan-500/50 pl-4">
              <h3 className="text-xl font-bold text-amber-400 font-mono mb-2">
                Version {entry.version}
              </h3>
              <ul className="space-y-1">
                {entry.changes.map((change, idx) => (
                  <li key={idx} className="text-sm text-slate-300 font-mono">
                    • {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};