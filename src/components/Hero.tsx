import { Shuffle } from "lucide-react";

const Hero = () => {
  return (
    <div className="relative bg-gradient-hero py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
      <div className="relative max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-white/10 backdrop-blur-sm">
          <Shuffle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
          AEM To Contentful Merger
        </h1>
        <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
          Transform and migrate your content with intelligent aggregation and filtering
        </p>
      </div>
    </div>
  );
};

export default Hero;
