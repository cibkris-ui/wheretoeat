import { Router } from "express";
import { googlePlacesService } from "../services/googlePlaces";

const router = Router();

router.get("/configured", async (_req, res) => {
  res.json({ configured: googlePlacesService.isConfigured() });
});

router.get("/search", async (req, res) => {
  try {
    if (!googlePlacesService.isConfigured()) {
      return res.status(503).json({ message: "Google Places API not configured" });
    }

    const query = req.query.q as string;
    const location = req.query.location as string | undefined;

    if (!query) return res.status(400).json({ message: "Query parameter 'q' is required" });

    const results = await googlePlacesService.searchPlaces(query, location);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:placeId", async (req, res) => {
  try {
    if (!googlePlacesService.isConfigured()) {
      return res.status(503).json({ message: "Google Places API not configured" });
    }

    const { placeId } = req.params;
    const details = await googlePlacesService.getPlaceDetails(placeId);

    if (!details) return res.status(404).json({ message: "Place not found" });

    res.json(details);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
