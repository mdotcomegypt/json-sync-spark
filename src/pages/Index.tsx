import { useState } from "react";
import Hero from "@/components/Hero";
import JsonInput from "@/components/JsonInput";
import JsonOutput from "@/components/JsonOutput";
import { transformJson } from "@/utils/jsonTransformer";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [output, setOutput] = useState("");
  const { toast } = useToast();

  const handleTransform = (
    sourceJson: string,
    primaryAggregator: string,
    secondaryAggregator: string,
    localMarket: string,
    aggregationMethod: 'id' | 'path',
    aggregationProperty: string
  ) => {
    try {
      const transformed = transformJson(
        sourceJson,
        primaryAggregator,
        secondaryAggregator,
        localMarket,
        aggregationMethod,
        aggregationProperty
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-280px)]">
          <JsonInput onTransform={handleTransform} />
          <JsonOutput output={output} />
        </div>
      </div>
    </div>
  );
};

export default Index;
