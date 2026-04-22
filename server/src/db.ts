import { Database } from "bun:sqlite";

const db = new Database("slide-ai.db", { create: true });

// Enable WAL mode for better concurrent reads
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS presentations (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    slide_count INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS slides (
    id TEXT PRIMARY KEY,
    presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    slide_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    image_prompt TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

export interface PresentationRow {
  id: string;
  prompt: string;
  slide_count: number;
  created_at: number;
}

export interface SlideRow {
  id: string;
  presentation_id: string;
  slide_number: number;
  title: string;
  subtitle: string;
  description: string;
  image_url: string | null;
  image_prompt: string;
  created_at: number;
}

export function getAllPresentations(): PresentationRow[] {
  return db.query("SELECT * FROM presentations ORDER BY created_at DESC").all() as PresentationRow[];
}

export function getPresentationById(id: string): PresentationRow | null {
  return db.query("SELECT * FROM presentations WHERE id = ?").get(id) as PresentationRow | null;
}

export function getSlidesByPresentationId(presentationId: string): SlideRow[] {
  return db.query("SELECT * FROM slides WHERE presentation_id = ? ORDER BY slide_number").all(presentationId) as SlideRow[];
}

export function insertPresentation(presentation: Omit<PresentationRow, "created_at">): void {
  db.query("INSERT INTO presentations (id, prompt, slide_count, created_at) VALUES (?, ?, ?, ?)")
    .run(presentation.id, presentation.prompt, presentation.slide_count, Date.now());
}

export function insertSlide(slide: Omit<SlideRow, "created_at">): void {
  db.query("INSERT INTO slides (id, presentation_id, slide_number, title, subtitle, description, image_url, image_prompt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(slide.id, slide.presentation_id, slide.slide_number, slide.title, slide.subtitle, slide.description, slide.image_url, slide.image_prompt, Date.now());
}

export function updateSlideImage(slideId: string, imageUrl: string): void {
  db.query("UPDATE slides SET image_url = ? WHERE id = ?")
    .run(imageUrl, slideId);
}

export function deletePresentation(id: string): void {
  db.query("DELETE FROM presentations WHERE id = ?").run(id);
}

export default db;
