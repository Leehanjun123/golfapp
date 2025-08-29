import { useState, useCallback } from 'react';
import { SwingAnalysisService } from '../services/swing-analysis.service';
import { SwingAnalysisResult, ProGolfer } from '../types';

/**
 * Custom hook for swing analysis logic
 * Separates business logic from UI components
 */
export const useSwingAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SwingAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeSwing = useCallback(async (
    mediaUri: string,
    mediaType: 'image' | 'video',
    proGolferId: string
  ) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await SwingAnalysisService.compareWithPro({
        mediaUri,
        mediaType,
        proGolferId,
      });
      
      setResult(analysisResult);
      return analysisResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    result,
    error,
    analyzeSwing,
    resetAnalysis,
  };
};