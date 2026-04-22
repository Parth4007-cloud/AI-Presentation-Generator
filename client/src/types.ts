export interface Slide {
  id: string;
  slideNumber: number;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  imagePrompt: string;
  isImageLoading: boolean;
}

export interface Presentation {
  id: string;
  prompt: string;
  slideCount: number;
  createdAt: number;
  slides: Slide[];
}

export interface PresentationListItem {
  id: string;
  prompt: string;
  slideCount: number;
  createdAt: number;
}

export interface GeneratePresentationRequest {
  prompt: string;
  slideCount?: number;
}
