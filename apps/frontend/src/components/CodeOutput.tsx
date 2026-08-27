import { Terminal, Trash2, FileText, Copy, Check } from "lucide-react";
import { useState } from "react";

interface CodeOutputProps {
  output: string[];
  onClear: () => void;
  input: string;
  onInputChange: (value: any) => void;
}

export const CodeOutput = ({ output, onClear, input, onInputChange }: CodeOutputProps) => {
  const [copied, setCopied] = useState(false);

  const copyOutput = async () => {
    if (!output.length) return;
    await navigator.clipboard.writeText(output.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Input Section */}
      <div className="neu-raised p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="neu-flat grid h-8 w-8 place-items-center"><FileText className="h-4 w-4 text-[var(--brand)]" /></span>
          <div><h3 className="text-sm font-extrabold text-[var(--text-strong)]">Program input</h3><p className="text-[11px] text-[var(--muted)]">Shared with everyone in the room</p></div>
        </div>
        <textarea
          value={input}
          onChange={(e) => onInputChange(e)}
          placeholder="Enter input for your code like...&#10;5&#10;10"
          className="neu-input h-32 w-full resize-none p-3 font-mono-app text-sm"
        />
      </div>

      {/* Output Section */}
      <div className="neu-raised flex min-h-0 flex-1 flex-col p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="neu-flat grid h-8 w-8 place-items-center"><Terminal className="h-4 w-4 text-[var(--brand)]" /></span>
            <div><h3 className="text-sm font-extrabold text-[var(--text-strong)]">Console output</h3><p className="text-[11px] text-[var(--muted)]">Results from your latest run</p></div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={copyOutput} disabled={!output.length} className="neu-icon-btn !shadow-none p-2 disabled:cursor-not-allowed disabled:opacity-35" title="Copy output">
              {copied ? <Check className="h-4 w-4 text-[var(--brand)]" /> : <Copy className="h-4 w-4" />}
            </button>
            <button onClick={onClear} className="neu-icon-btn !shadow-none group p-2 hover:!text-[var(--color-destructive)]" title="Clear output"><Trash2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" /></button>
          </div>
        </div>

        <div className="neu-inset custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          {output.length > 0 ? (
            <div className="space-y-1">
              {output.map((line, index) => (
                <pre key={index} className="font-mono-app text-sm whitespace-pre-wrap break-all text-[var(--brand)]">
                  {line}
                </pre>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Terminal className="mx-auto mb-3 h-10 w-10 text-[var(--muted)]" />
              <p className="text-sm font-bold text-[var(--muted)]">Ready when you are</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Run your code to see its output here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
