import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SchemaInputProps {
  value: string;
  onChange: (value: string) => void;
}

const SchemaInput = ({ value, onChange }: SchemaInputProps) => {
  const [error, setError] = useState("");

  useEffect(() => {
    if (!value.trim()) {
      setError("");
      return;
    }
    try {
      JSON.parse(value);
      setError("");
    } catch {
      setError("Invalid JSON format");
    }
  }, [value]);

  return (
    <Card className="h-full flex flex-col shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">Migration Schema</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="schemaJson" className="text-sm font-medium">
            Schema JSON
          </Label>
          <Textarea
            id="schemaJson"
            placeholder='Paste your migration schema JSON here...'
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-sm min-h-[300px] resize-none bg-code-bg text-code-foreground border-border"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SchemaInput;
