import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JsonOutputProps {
  output: string;
}

const JsonOutput = ({ output }: JsonOutputProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Output JSON copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transformed-output.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Output JSON saved to your device",
    });
  };

  let meta: { mergedCount?: number; notMatchedCount?: number; nonMatchedPaths?: string[] } | null = null;
  try {
    if (output) {
      const parsed = JSON.parse(output);
      if (parsed && typeof parsed === 'object' && parsed.meta) {
        meta = parsed.meta;
      }
    }
  } catch {}

  return (
    <Card className="h-full flex flex-col shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Transformed Output</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!output}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!output}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {meta && (
          <div className="mb-3 text-sm flex items-center gap-4">
            <div className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Merged: <span className="font-semibold">{meta.mergedCount ?? 0}</span>
            </div>
            <div className="px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Not matched: <span className="font-semibold">{meta.notMatchedCount ?? 0}</span>
            </div>
          </div>
        )}
        {meta?.nonMatchedPaths && meta.nonMatchedPaths.length > 0 && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900">
            <div className="px-3 py-2 text-sm font-medium">Did not meet criteria</div>
            <div className="px-3 pb-2 max-h-40 overflow-auto">
              <ul className="list-disc pl-5 text-xs">
                {meta.nonMatchedPaths.map((p, i) => (
                  <li key={`${p}-${i}`} className="truncate" title={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="flex-1 bg-code-bg text-code-foreground rounded-lg p-4 overflow-auto max-h-[1000px]">
          {output ? (
            <pre className="font-mono text-sm whitespace-pre-wrap break-words">
              {output}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-center">
                Configure source data and click "Transform Data" to see the output
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default JsonOutput;
