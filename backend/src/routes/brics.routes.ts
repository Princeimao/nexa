import { Router } from "express";
import { BricsInvestmentService } from "../services/bricsInvestmentService.js";

export const bricsRouter = Router();

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;

/** Macro-economic picture (GDP, trade balance, surplus, demand index). */
bricsRouter.get("/macro", async (req, res) => {
  try {
    const data = await BricsInvestmentService.getMacro(
      str(req.query.country),
      num(req.query.year),
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** Cross-border investment flows (FDI / BRI / ODA) with aggregates. */
bricsRouter.get("/investment", async (req, res) => {
  try {
    const data = await BricsInvestmentService.getInvestmentFlows({
      country: str(req.query.country),
      year: num(req.query.year),
      sector: str(req.query.sector),
      instrument: str(req.query.instrument),
      limit: num(req.query.limit),
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** Bilateral goods trade between BRICS countries. */
bricsRouter.get("/trade", async (req, res) => {
  try {
    const data = await BricsInvestmentService.getTrade({
      country: str(req.query.country),
      year: num(req.query.year),
      category: str(req.query.category),
      limit: num(req.query.limit),
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** How BRICS investment converts into physical infrastructure + jobs. */
bricsRouter.get("/infrastructure-impact", async (req, res) => {
  try {
    const data = await BricsInvestmentService.getInfrastructureImpact({
      country: str(req.query.country),
      year: num(req.query.year),
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** Surplus vs public demand: what % of demand can be fulfilled. */
bricsRouter.get("/demand-fulfilment", async (req, res) => {
  try {
    const data = await BricsInvestmentService.getDemandFulfilment({
      country: str(req.query.country),
      year: num(req.query.year),
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/** One-call payload for the investment dashboard page. */
bricsRouter.get("/summary", async (req, res) => {
  try {
    const data = await BricsInvestmentService.getSummary(
      str(req.query.country),
      num(req.query.year),
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
