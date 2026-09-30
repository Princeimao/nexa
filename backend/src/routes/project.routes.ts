import { Router } from 'express';
import { DbService } from '../database/dbService.js';
import { SectorCategory } from '../types/index.js';

export const projectRouter = Router();

projectRouter.get('/', async (req, res) => {
  try {
    const filters = {
      district: req.query.district as string,
      state: req.query.state as string,
      sector: req.query.sector as SectorCategory,
      status: req.query.status as string,
      country: req.query.country as string,
    };
    const list = await DbService.getProjects(filters);
    res.json({ success: true, total: list.length, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
