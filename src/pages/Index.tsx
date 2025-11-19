import { useState } from "react";
import Hero from "@/components/Hero";
import JsonInput from "@/components/JsonInput";
import JsonOutput from "@/components/JsonOutput";
import SchemaInput from "@/components/SchemaInput";
import MigrationCards from "@/components/MigrationCards";
import { transformJson } from "@/utils/jsonTransformer";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [output, setOutput] = useState("");
  const [schemaJson, setSchemaJson] = useState("");
  const [locales, setLocales] = useState<{ primary: string; secondary: string } | undefined>(undefined);
  const { toast } = useToast();

  const handleTransform = (
    sourceJson: string,
    primaryAggregator: string,
    secondaryAggregator: string,
    localMarket: string,
    aggregationMethod: 'id' | 'path',
    aggregationProperty: string,
    sourcePathPattern?: string,
    translationPathPattern?: string
  ) => {
    try {
      const transformed = transformJson(
        sourceJson,
        primaryAggregator,
        secondaryAggregator,
        localMarket,
        aggregationMethod,
        aggregationProperty,
        sourcePathPattern,
        translationPathPattern
      );
      setOutput(transformed);
      toast({
        title: "Success!",
        description: "JSON transformed successfully",
      });
    } catch (error) {
      toast({
        title: "Transformation Error",
        description: error instanceof Error ? error.message : "Failed to transform JSON",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-280px)]">
          <JsonInput onTransform={handleTransform} onLocalesChange={setLocales} />
          <JsonOutput output={output} />
          <SchemaInput value={schemaJson} onChange={setSchemaJson} />
          <MigrationCards output={output} schemaJson={schemaJson} locales={locales} />
        </div>
      </div>
    </div>
  );
};

export default Index;
