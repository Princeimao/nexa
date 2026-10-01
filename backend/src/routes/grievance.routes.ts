import { Router } from 'express';
import { DbService } from '../database/dbService.js';
import { GrievanceStatus, SectorCategory, SeverityLevel } from '../types/index.js';

export const grievanceRouter = Router();

grievanceRouter.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category as SectorCategory,
      severity: req.query.severity as SeverityLevel,
      status: req.query.status as GrievanceStatus,
      state: req.query.state as string,
      district: req.query.district as string,
      search: req.query.search as string,
      country: req.query.country as string,
    };
    const list = await DbService.getGrievances(filters);
    res.json({ success: true, total: list.length, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

grievanceRouter.post('/', async (req, res) => {
  try {
    const added = await DbService.createGrievance(req.body);
    res.status(201).json({ success: true, data: added });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const handleStatusUpdate = async (req: any, res: any) => {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});
    const { status } = body;
    const updated = await DbService.updateGrievanceStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Grievance not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

grievanceRouter.patch('/:id/status', handleStatusUpdate);
// POST alias: PATCH is never a CORS-simple request, so browsers always
// preflight it. The POST alias lets the frontend use a preflight-free call.
grievanceRouter.post('/:id/status', handleStatusUpdate);
