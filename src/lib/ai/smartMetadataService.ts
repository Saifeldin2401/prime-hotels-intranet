/**
 * Smart Metadata & Document Organization Service
 * 
 * Provides intelligent AI-powered metadata formatting, auto-titling,
 * executive description generation, standardized document numbering,
 * department/folder detection, and tagging for hotel intranet documents.
 */

import { aiClient } from './client';
import { z } from 'zod';
import type { ConfidentialityLevel } from '@/components/documents/DocumentMetadataForm';

export interface SmartMetadataResult {
  title: string;
  description: string;
  documentNumber: string;
  confidentiality: ConfidentialityLevel;
  tags: string[];
  suggestedDepartment?: string;
  expiryDate?: Date;
}

const SmartMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  documentNumber: z.string(),
  confidentiality: z.enum(['public', 'internal', 'confidential', 'restricted']),
  tags: z.array(z.string()),
  suggestedDepartment: z.string().optional(),
});

/**
 * Intelligent local heuristics for instant zero-latency cleanup & generation
 */
export function generateSmartMetadataHeuristic(rawInput: {
  title?: string;
  description?: string;
  fileName?: string;
  content?: string;
}): SmartMetadataResult {
  const raw = (rawInput.title || rawInput.fileName || 'Untitled Document')
    .replace(/\.[^/.]+$/, '') // remove extension
    .trim();

  // 1. Clean Title (remove kebab-case, snake_case, camelCase, double spaces)
  let cleanTitle = raw
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize words nicely
  cleanTitle = cleanTitle
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase();
      if (['and', '&', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'the', 'a', 'an'].includes(lower)) {
        return lower === '&' ? '&' : lower;
      }
      if (['sop', 'vip', 'hr', 'it', 'haccp', 'f&b', 'pos', 'pms', 'ota', 'cctv'].includes(lower)) {
        return lower.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  // Standardize naming if title doesn't end with Policy / SOP / Procedure
  const lowerTitle = cleanTitle.toLowerCase();
  let categoryPrefix = 'DOC';
  let dept = 'General';
  let confidentiality: ConfidentialityLevel = 'internal';
  const tags: string[] = ['Standard Operating Procedure'];

  if (lowerTitle.includes('lost') && lowerTitle.includes('found')) {
    categoryPrefix = 'SOP-HK';
    dept = 'Housekeeping';
    cleanTitle = cleanTitle.includes('Policy') || cleanTitle.includes('SOP') 
      ? cleanTitle 
      : `${cleanTitle} & Guest Property Policy`;
    tags.push('Lost & Found', 'Housekeeping', 'Guest Services', 'Valuables');
  } else if (lowerTitle.includes('turndown') || lowerTitle.includes('cleaning') || lowerTitle.includes('linen')) {
    categoryPrefix = 'SOP-HK';
    dept = 'Housekeeping';
    tags.push('Housekeeping', 'Room Standards', 'Hygiene');
  } else if (lowerTitle.includes('front') || lowerTitle.includes('check in') || lowerTitle.includes('concierge') || lowerTitle.includes('reception')) {
    categoryPrefix = 'SOP-FO';
    dept = 'Front Office';
    tags.push('Front Desk', 'Guest Relations', 'Check-In');
  } else if (lowerTitle.includes('food') || lowerTitle.includes('beverage') || lowerTitle.includes('kitchen') || lowerTitle.includes('bar') || lowerTitle.includes('restaurant')) {
    categoryPrefix = 'SOP-FB';
    dept = 'Food & Beverage';
    tags.push('F&B', 'Food Safety', 'Kitchen Standards');
  } else if (lowerTitle.includes('security') || lowerTitle.includes('cctv') || lowerTitle.includes('fire') || lowerTitle.includes('emergency')) {
    categoryPrefix = 'POL-SEC';
    dept = 'Security';
    confidentiality = 'restricted';
    tags.push('Security', 'Safety', 'Emergency Response');
  } else if (lowerTitle.includes('hr') || lowerTitle.includes('grooming') || lowerTitle.includes('employee') || lowerTitle.includes('leave') || lowerTitle.includes('salary')) {
    categoryPrefix = 'POL-HR';
    dept = 'Human Resources';
    confidentiality = 'confidential';
    tags.push('Human Resources', 'Code of Conduct', 'Staff Policy');
  } else if (lowerTitle.includes('finance') || lowerTitle.includes('cash') || lowerTitle.includes('audit') || lowerTitle.includes('invoice')) {
    categoryPrefix = 'POL-FIN';
    dept = 'Finance';
    confidentiality = 'confidential';
    tags.push('Finance', 'Accounting', 'Internal Audit');
  } else {
    tags.push('Operations', 'Compliance');
  }

  // 2. Generate Professional Description
  const description =
    rawInput.description && rawInput.description.length > 20 && !rawInput.description.toLowerCase().includes('create a structured')
      ? rawInput.description
      : `Official hotel standard operating procedure establishing standardized workflows, mandatory compliance standards, and operational guidelines for ${cleanTitle.toLowerCase()} across hotel properties.`;

  // 3. Generate Standardized Document Number
  const currentYear = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const documentNumber = `${categoryPrefix}-${currentYear}-${randomSuffix}`;

  // 4. Expiry Date (Default 1 year from now for annual policy audit)
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  return {
    title: cleanTitle,
    description,
    documentNumber,
    confidentiality,
    tags: Array.from(new Set(tags)),
    suggestedDepartment: dept,
    expiryDate,
  };
}

/**
 * AI-Powered Document Metadata Beautifier & Organizer
 */
export async function generateSmartDocumentMetadata(input: {
  title?: string;
  description?: string;
  fileName?: string;
  content?: string;
}): Promise<SmartMetadataResult> {
  const heuristicFallback = generateSmartMetadataHeuristic(input);

  try {
    const rawTitle = input.title || input.fileName || '';
    const rawDesc = input.description || '';
    const rawContent = input.content ? input.content.slice(0, 1500) : '';

    const prompt = `You are a corporate hotel operations and document management governance AI for a luxury hotel chain in Saudi Arabia.
Analyze the following document information and generate clean, standardized metadata:

Raw Title / Filename: "${rawTitle}"
Current Description: "${rawDesc}"
Snippet/Context: "${rawContent}"

Requirements:
1. "title": Clean, elegant, human-readable corporate title (no hyphens/underscores/file extensions). Format properly (e.g. "Lost & Found and Guest Valuables Policy" or "VIP Turndown Service Standard Operating Procedure").
2. "description": A concise, executive-level operational summary (2-3 sentences) explaining the purpose and operational scope of this document.
3. "documentNumber": A standard hotel document code format (e.g. "SOP-HK-2026-1042", "POL-SEC-2026-0819", "SOP-FO-2026-0312", "POL-HR-2026-0045").
4. "confidentiality": One of "public", "internal", "confidential", "restricted".
5. "tags": 3 to 5 relevant hotel operational tags (e.g. ["SOP", "Housekeeping", "Lost & Found", "Forbes Standards"]).
6. "suggestedDepartment": Suggested hotel department (e.g. "Housekeeping", "Front Office", "Security", "Food & Beverage", "Human Resources", "Finance").

Respond ONLY in valid JSON matching this schema.`;

    const res = await aiClient.executeStructured(prompt, SmartMetadataSchema, {
      model: 'gemini-2.5-flash', // Free Tier High-Speed Model
      task: 'summary',
      temperature: 0.2,
      maxTokens: 500,
    });

    if (res.data && res.data.title) {
      return {
        title: res.data.title,
        description: res.data.description,
        documentNumber: res.data.documentNumber || heuristicFallback.documentNumber,
        confidentiality: res.data.confidentiality || heuristicFallback.confidentiality,
        tags: res.data.tags?.length ? res.data.tags : heuristicFallback.tags,
        suggestedDepartment: res.data.suggestedDepartment || heuristicFallback.suggestedDepartment,
        expiryDate: heuristicFallback.expiryDate,
      };
    }

    return heuristicFallback;
  } catch (error) {
    console.warn('AI smart metadata generation fallback to local heuristic:', error);
    return heuristicFallback;
  }
}
