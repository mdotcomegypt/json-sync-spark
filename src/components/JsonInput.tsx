import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JsonInputProps {
  onTransform: (
    sourceJson: string,
    primaryAggregator: string,
    secondaryAggregator: string,
    localMarket: string
  ) => void;
}

const JsonInput = ({ onTransform }: JsonInputProps) => {
  const [sourceJson, setSourceJson] = useState("");
  const [primaryAggregator, setPrimaryAggregator] = useState("");
  const [secondaryAggregator, setSecondaryAggregator] = useState("");
  const [localMarket, setLocalMarket] = useState("");
  const [error, setError] = useState("");

  const handleTransform = () => {
    setError("");
    
    if (!sourceJson.trim()) {
      setError("Please enter source JSON");
      return;
    }
    
    if (!primaryAggregator.trim() || !secondaryAggregator.trim()) {
      setError("Please enter both translation aggregators");
      return;
    }
    
    if (!localMarket.trim()) {
      setError("Please enter local market code");
      return;
    }

    try {
      JSON.parse(sourceJson);
      onTransform(sourceJson, primaryAggregator, secondaryAggregator, localMarket);
    } catch (e) {
      setError("Invalid JSON format");
    }
  };

  return (
    <Card className="h-full flex flex-col shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">Source Configuration</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="sourceJson" className="text-sm font-medium">
            Source JSON
          </Label>
          <Textarea
            id="sourceJson"
            placeholder='Paste your JSON here...'
            value={sourceJson}
            onChange={(e) => setSourceJson(e.target.value)}
            className="font-mono text-sm min-h-[300px] resize-none bg-code-bg text-code-foreground border-border"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Translation Aggregator</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  placeholder="Primary (e.g., al-al)"
                  value={primaryAggregator}
                  onChange={(e) => setPrimaryAggregator(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Input
                  placeholder="Secondary (e.g., al-en)"
                  value={secondaryAggregator}
                  onChange={(e) => setSecondaryAggregator(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localMarket" className="text-sm font-medium">
              Local Market Code
            </Label>
            <Input
              id="localMarket"
              placeholder="e.g., al, pt, en"
              value={localMarket}
              onChange={(e) => setLocalMarket(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleTransform} 
          className="w-full mt-auto"
          size="lg"
        >
          Transform Data
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default JsonInput;
