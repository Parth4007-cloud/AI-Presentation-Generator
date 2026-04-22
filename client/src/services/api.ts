import type { Presentation, PresentationListItem, GeneratePresentationRequest } from '../types';

const API_BASE = '/api';

export async function getPresentations(): Promise<PresentationListItem[]> {
  const response = await fetch(`${API_BASE}/presentations`);
  if (!response.ok) throw new Error('Failed to fetch presentations');
  return response.json();
}

export async function getPresentation(id: string): Promise<Presentation> {
  const response = await fetch(`${API_BASE}/presentations/${id}`);
  if (!response.ok) throw new Error('Failed to fetch presentation');
  return response.json();
}

export async function generatePresentation(request: GeneratePresentationRequest): Promise<Presentation> {
  const response = await fetch(`${API_BASE}/presentations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to generate presentation');
  return response.json();
}

export async function regenerateSlideImage(presentationId: string, slideId: string): Promise<{ imageUrl: string }> {
  const response = await fetch(`${API_BASE}/presentations/${presentationId}/slides/${slideId}/regenerate-image`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to regenerate image');
  return response.json();
}

export async function deletePresentation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/presentations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete presentation');
}
