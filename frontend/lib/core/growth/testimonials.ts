/**
 * Testimonials repository.
 *
 * Trust rules enforced here:
 *  - Nothing is auto-published from an anonymous form submission; a human adds it.
 *  - `sample: true` marks illustrative demo content, which the UI labels and which
 *    is excluded from structured data.
 *  - Validation rejects empty/duplicated quotes and unsupported rating values.
 */
import { getStore, newId, persist, audit } from '../db/store';
import type { Testimonial, TestimonialStatus } from '../types';
import { sanitiseText } from './forms';

export type TestimonialInput = {
  name: string;
  role: string;
  organisation: string;
  quote: string;
  imageUrl?: string | null;
  rating?: number | null;
  status?: TestimonialStatus;
};

export const MAX_QUOTE = 600;

const SAFE_IMAGE = /^(https:\/\/[^\s]+|\/[^\s]*)$/;

export function validateTestimonial(input: Partial<TestimonialInput>): { ok: true; value: Required<Omit<TestimonialInput, 'status'>> & { status: TestimonialStatus } } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = sanitiseText(input.name, { maxLength: 80, singleLine: true });
  const role = sanitiseText(input.role, { maxLength: 80, singleLine: true });
  const organisation = sanitiseText(input.organisation, { maxLength: 120, singleLine: true });
  const quote = sanitiseText(input.quote, { maxLength: MAX_QUOTE });
  const imageUrl = sanitiseText(input.imageUrl ?? '', { maxLength: 500, singleLine: true });
  const rating = input.rating === null || input.rating === undefined || input.rating === ('' as unknown) ? null : Number(input.rating);
  const status: TestimonialStatus = ['draft', 'published', 'hidden'].includes(String(input.status)) ? (input.status as TestimonialStatus) : 'draft';

  if (name.length < 2) errors.name = 'Name is required (2–80 characters).';
  if (role.length < 2) errors.role = 'Role is required (for example "Performance Analyst").';
  if (organisation.length < 2) errors.organisation = 'Organisation is required.';
  if (quote.length < 30) errors.quote = 'Quote must be at least 30 characters.';
  if (imageUrl && !SAFE_IMAGE.test(imageUrl)) errors.imageUrl = 'Image must be an https URL or a site-relative path.';
  if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) errors.rating = 'Rating must be between 1 and 5.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, role, organisation, quote, imageUrl: imageUrl || null, rating: rating === null ? null : Math.round(rating), status },
  };
}

/** Published testimonials for the public page. Sample rows are included but flagged. */
export function listPublishedTestimonials(): Testimonial[] {
  return getStore().testimonials
    .filter((t) => t.status === 'published')
    .sort((a, b) => Number(a.sample) - Number(b.sample) || b.updatedAt.localeCompare(a.updatedAt));
}

/** Everything, for the admin panel. */
export function listAllTestimonials(): Testimonial[] {
  return [...getStore().testimonials].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createTestimonial(input: Partial<TestimonialInput>, actor: string): { ok: true; testimonial: Testimonial } | { ok: false; errors: Record<string, string> } {
  const parsed = validateTestimonial(input);
  if (!parsed.ok) return parsed;
  const store = getStore();
  const duplicate = store.testimonials.find((t) => t.quote.toLowerCase() === parsed.value.quote.toLowerCase());
  if (duplicate) return { ok: false, errors: { quote: 'An identical quote already exists.' } };
  const now = new Date().toISOString();
  const testimonial: Testimonial = {
    id: newId('tst'),
    ...parsed.value,
    // Anything created by a human through the admin panel is real by definition;
    // sample flags are never applied to new records.
    sample: false,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
  };
  store.testimonials.unshift(testimonial);
  persist(store);
  audit({ actor, action: 'testimonial_created', entity: 'testimonial', entityId: testimonial.id, detail: `Status ${testimonial.status}` });
  return { ok: true, testimonial };
}

export function updateTestimonial(id: string, patch: Partial<TestimonialInput>, actor: string): { ok: true; testimonial: Testimonial } | { ok: false; errors: Record<string, string>; status?: number } {
  const store = getStore();
  const existing = store.testimonials.find((t) => t.id === id);
  if (!existing) return { ok: false, errors: { id: 'Testimonial not found.' }, status: 404 };
  const parsed = validateTestimonial({
    name: patch.name ?? existing.name,
    role: patch.role ?? existing.role,
    organisation: patch.organisation ?? existing.organisation,
    quote: patch.quote ?? existing.quote,
    imageUrl: patch.imageUrl === undefined ? existing.imageUrl : patch.imageUrl,
    rating: patch.rating === undefined ? existing.rating : patch.rating,
    status: patch.status ?? existing.status,
  });
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  Object.assign(existing, parsed.value, { updatedAt: new Date().toISOString() });
  persist(store);
  audit({ actor, action: 'testimonial_updated', entity: 'testimonial', entityId: id, detail: `Status ${existing.status}` });
  return { ok: true, testimonial: existing };
}

export function deleteTestimonial(id: string, actor: string): { ok: boolean } {
  const store = getStore();
  const index = store.testimonials.findIndex((t) => t.id === id);
  if (index === -1) return { ok: false };
  const [removed] = store.testimonials.splice(index, 1);
  persist(store);
  audit({ actor, action: 'testimonial_deleted', entity: 'testimonial', entityId: id, detail: removed.name });
  return { ok: true };
}

/** Removes every seeded sample testimonial (used once real ones are added). */
export function purgeSampleTestimonials(actor: string): { removed: number } {
  const store = getStore();
  const before = store.testimonials.length;
  store.testimonials = store.testimonials.filter((t) => !t.sample);
  persist(store);
  const removed = before - store.testimonials.length;
  audit({ actor, action: 'testimonial_samples_purged', entity: 'testimonial', entityId: 'all', detail: `${removed} sample rows removed` });
  return { removed };
}

export const testimonialStats = () => {
  const all = getStore().testimonials;
  return {
    total: all.length,
    published: all.filter((t) => t.status === 'published' && !t.sample).length,
    sample: all.filter((t) => t.sample).length,
    draft: all.filter((t) => t.status === 'draft').length,
    hidden: all.filter((t) => t.status === 'hidden').length,
  };
};
