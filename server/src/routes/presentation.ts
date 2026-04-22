import { Router, type Request, type Response } from "express";
import { generateObject, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
  insertPresentation,
  insertSlide,
  updateSlideImage,
  getAllPresentations,
  getPresentationById,
  getSlidesByPresentationId,
  deletePresentation,
  type PresentationRow,
  type SlideRow,
} from "../db.js";

const router = Router();

// --- Helpers ---

function mapSlideRow(row: SlideRow) {
  return {
    id: row.id,
    slideNumber: row.slide_number,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    imageUrl: row.image_url || "",
    imagePrompt: row.image_prompt,
    isImageLoading: !row.image_url,
  };
}

function mapPresentationRow(presentation: PresentationRow, slides: SlideRow[]) {
  return {
    id: presentation.id,
    prompt: presentation.prompt,
    slideCount: presentation.slide_count,
    createdAt: presentation.created_at,
    slides: slides.map(mapSlideRow),
  };
}

// --- Routes ---

// GET /api/presentations
router.get("/presentations", (_req: Request, res: Response) => {
  const presentations = getAllPresentations();
  const result = presentations.map((p) => ({
    id: p.id,
    prompt: p.prompt,
    slideCount: p.slide_count,
    createdAt: p.created_at,
  }));
  res.json(result);
});

// GET /api/presentations/:id
router.get("/presentations/:id", (req: Request, res: Response) => {
  const presentation = getPresentationById(req.params.id);
  if (!presentation) {
    res.status(404).json({ error: "Presentation not found" });
    return;
  }
  const slides = getSlidesByPresentationId(presentation.id);
  res.json(mapPresentationRow(presentation, slides));
});

// POST /api/presentations
router.post("/presentations", async (req: Request, res: Response) => {
  const { prompt, slideCount } = req.body;

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const count = slideCount || 5;

  try {
    // Generate slide content (without image generation)
    const slideSchema = z.array(
      z.object({
        title: z.string(),
        subtitle: z.string(),
        description: z.string(),
        colorScheme: z.string().describe("Suggested color scheme for the slide background (hex code or color name)"),
      })
    );

    const { object: slidesData } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: slideSchema,
      prompt: `Generate a ${count}-slide presentation deck for the following topic: "${prompt}".
For each slide provide:
- A high-level title (uppercase)
- A short subtitle
- A 2-3 sentence description
- A color scheme for the slide background (use professional presentation colors like navy blue, emerald green, deep purple, etc.)

Make the content engaging and professional.`,
    });

    const presentationId = crypto.randomUUID();
    const presentation: Omit<PresentationRow, "created_at"> = {
      id: presentationId,
      prompt,
      slide_count: count,
    };

    insertPresentation(presentation);

    const slides = slidesData.map((item, index) => {
      const slideId = crypto.randomUUID();
      const slide: Omit<SlideRow, "created_at"> = {
        id: slideId,
        presentation_id: presentationId,
        slide_number: index + 1,
        title: item.title.toUpperCase(),
        subtitle: item.subtitle,
        description: item.description,
        image_url: null,
        image_prompt: item.colorScheme, // Store color scheme instead of image prompt
      };
      insertSlide(slide);
      return slide as SlideRow;
    });

    const savedSlides = getSlidesByPresentationId(presentationId);
    res.json(mapPresentationRow({ ...presentation, created_at: Date.now() }, savedSlides));
  } catch (error) {
    console.error("Error generating presentation:", error);
    res.status(500).json({ error: "Failed to generate presentation" });
  }
});

// DELETE /api/presentations/:id
router.delete("/presentations/:id", (req: Request, res: Response) => {
  deletePresentation(req.params.id);
  res.json({ success: true });
});

export default router;
