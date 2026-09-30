import { Router } from 'express';
import { DbService } from '../database/dbService.js';
import { SectorCategory } from '../types/index.js';

export const analyticsRouter = Router();

analyticsRouter.get('/summary', async (req, res) => {
  try {
    const summary = await DbService.getSummaryMetrics(
      req.query.country as string,
    );
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

analyticsRouter.get('/map', async (req, res) => {
  try {
    const country = req.query.country as string;
    const state = req.query.state as string;
    const mapData = await DbService.getMapData(country, state);
    res.json({ success: true, data: mapData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

analyticsRouter.get('/hotspots', async (req, res) => {
  try {
    const hotspots = await DbService.getHotspots(
      req.query.country as string,
    );
    res.json({ success: true, data: hotspots });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const handleGaps = async (req: any, res: any) => {
  try {
    const state = req.query.state as string;
    const district = req.query.district as string;
    const sector = req.query.sector as SectorCategory;
    const country = req.query.country as string;
    const gaps = await DbService.getPlanGaps({ state, district, sector, country });
    res.json({ success: true, data: gaps });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

analyticsRouter.get('/gaps', handleGaps);
analyticsRouter.get('/plan-gaps', handleGaps);

analyticsRouter.get('/trends', async (req, res) => {
  try {
    const trends = await DbService.getTrends(req.query.country as string);
    res.json({ success: true, data: trends });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

analyticsRouter.get('/impact', async (req, res) => {
  try {
    const completed = await DbService.getProjects({
      status: 'COMPLETED',
      country: req.query.country as string,
    });
    res.json({ success: true, data: completed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
