import { Router } from 'express';
import { PolicyAiService } from '../services/policyAiService.js';

export const policyAiRouter = Router();

const handleAnalyze = async (req: any, res: any) => {
  try {
    const { query, conversationHistory, country, filterState, filterDistrict, filterSector } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    const response = await PolicyAiService.analyzeQuery({
      query,
      conversationHistory,
      country,
      filterState,
      filterDistrict,
      filterSector,
    });
    res.json({ success: true, data: response });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Canonical endpoint used by the frontend: POST /api/ai/policy-analyst/analyze
policyAiRouter.post('/analyze', handleAnalyze);
// Alias: POST /api/ai/policy-analyst (frontend legacy call)
policyAiRouter.post('/', handleAnalyze);
