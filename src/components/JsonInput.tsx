import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface JsonInputProps {
  onTransform: (
    sourceJson: string,
    primaryAggregator: string,
    secondaryAggregator: string,
    localMarket: string,
    aggregationMethod: 'id' | 'path',
    aggregationProperty: string,
    sourcePathPattern?: string,
    translationPathPattern?: string
  ) => void;
  onLocalesChange?: (locales: { primary: string; secondary: string }) => void;
}

const JsonInput = ({ onTransform, onLocalesChange }: JsonInputProps) => {
  const [sourceJson, setSourceJson] = useState("");
  const [aggregationProperty, setAggregationProperty] = useState("id");
  const [primaryAggregator, setPrimaryAggregator] = useState("");
  const [secondaryAggregator, setSecondaryAggregator] = useState("");
  const [localMarket, setLocalMarket] = useState("");
  const [aggregationMethod, setAggregationMethod] = useState<'id' | 'path'>('id');
  const [error, setError] = useState("");
  const [primaryLocale, setPrimaryLocale] = useState<string>((import.meta.env.VITE_CONTENTFUL_PRIMARY_LOCALE as string | undefined) || "en-US");
  const [secondaryLocale, setSecondaryLocale] = useState<string>((import.meta.env.VITE_CONTENTFUL_SECONDARY_LOCALE as string | undefined) || "en-GB");
  const [sourcePathPattern, setSourcePathPattern] = useState<string>("");
  const [translationPathPattern, setTranslationPathPattern] = useState<string>("");

  useEffect(() => {
    onLocalesChange?.({ primary: primaryLocale, secondary: secondaryLocale });
  }, [primaryLocale, secondaryLocale]);

  const handleTransform = () => {
    setError("");
    
    if (!sourceJson.trim()) {
      setError("Please enter source JSON");
      return;
    }

    if (!localMarket.trim()) {
      setError("Please enter local market code");
      return;
    }

    if (!aggregationProperty.trim()) {
      setError("Please enter aggregation property name");
      return;
    }

    if (aggregationMethod === 'id') {
      if (!primaryAggregator.trim() || !secondaryAggregator.trim()) {
        setError("Please enter both translation aggregators");
        return;
      }
    } else {
      if (!sourcePathPattern.trim() || !translationPathPattern.trim()) {
        setError("Please enter both source and translation path patterns");
        return;
      }
    }

    try {
      JSON.parse(sourceJson);
      onTransform(
        sourceJson,
        primaryAggregator,
        secondaryAggregator,
        localMarket,
        aggregationMethod,
        aggregationProperty,
        sourcePathPattern || undefined,
        translationPathPattern || undefined
      );
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
            <Label className="text-sm font-medium">Contentful Locales</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Primary Locale</Label>
                <Select value={primaryLocale} onValueChange={(v) => setPrimaryLocale(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select primary locale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">en</SelectItem>
                    <SelectItem value="pt">pt</SelectItem>
                    <SelectItem value="sq-AL">sq-AL</SelectItem>
                    <SelectItem value="ie">ie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Secondary Locale</Label>
                <Select value={secondaryLocale} onValueChange={(v) => setSecondaryLocale(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select secondary locale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">en</SelectItem>
                    <SelectItem value="pt">pt</SelectItem>
                    <SelectItem value="sq-AL">sq-AL</SelectItem>
                    <SelectItem value="ie">ie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aggregationProperty" className="text-sm font-medium">
              Aggregation Property
            </Label>
            <Input
              id="aggregationProperty"
              placeholder="e.g., id, buttonID"
              value={aggregationProperty}
              onChange={(e) => setAggregationProperty(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {aggregationMethod === 'id' ? (
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
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Path Patterns</Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Source Path Pattern</Label>
                  <Input
                    placeholder="e.g., /content/.../*/mobile/*/..."
                    value={sourcePathPattern}
                    onChange={(e) => setSourcePathPattern(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Translation Path Pattern</Label>
                  <Input
                    placeholder="e.g., /content/.../*/mobile/*/..."
                    value={translationPathPattern}
                    onChange={(e) => setTranslationPathPattern(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Aggregation Method
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="aggregationMethod"
                  value="id"
                  checked={aggregationMethod === 'id'}
                  onChange={(e) => setAggregationMethod(e.target.value as 'id' | 'path')}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">By ID</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="aggregationMethod"
                  value="path"
                  checked={aggregationMethod === 'path'}
                  onChange={(e) => setAggregationMethod(e.target.value as 'id' | 'path')}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">By Path</span>
              </label>
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
