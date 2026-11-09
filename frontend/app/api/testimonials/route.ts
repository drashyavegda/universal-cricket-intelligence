import { fail, guard, json, readBody, serverError } from '@/lib/api/helpers';
import {
  createTestimonial, deleteTestimonial, listAllTestimonials, listPublishedTestimonials,
  purgeSampleTestimonials, testimonialStats, updateTestimonial, type TestimonialInput,
} from '@/lib/core/growth/testimonials';

export const dynamic = 'force-dynamic';

/**
 * GET is public but returns published rows only. Full records (drafts, hidden,
 * creator metadata) require the owner-level "settings:security" permission.
 */
export async function GET(req: Request) {
  try {
    const scope = new URL(req.url).searchParams.get('scope');
    if (scope === 'all') {
      const g = guard('settings:security');
      if (!g.ok) return g.response;
      return json({ testimonials: listAllTestimonials(), stats: testimonialStats() });
    }
    return json({ testimonials: listPublishedTestimonials(), stats: testimonialStats() });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  const g = guard('settings:security');
  if (!g.ok) return g.response;
  try {
    const body = await readBody<Partial<TestimonialInput> & { purgeSamples?: boolean }>(req);
    if (body.purgeSamples) {
      const { removed } = purgeSampleTestimonials(g.ctx.user!.email);
      return json({ ok: true, removed, testimonials: listAllTestimonials(), stats: testimonialStats() });
    }
    const result = createTestimonial(body, g.ctx.user!.email);
    if (!result.ok) return fail('Please correct the highlighted fields.', 422, { errors: result.errors });
    return json({ ok: true, testimonial: result.testimonial, stats: testimonialStats() }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: Request) {
  const g = guard('settings:security');
  if (!g.ok) return g.response;
  try {
    const body = await readBody<{ id?: string } & Partial<TestimonialInput>>(req);
    if (!body.id) return fail('id is required', 400);
    const result = updateTestimonial(body.id, body, g.ctx.user!.email);
    if (!result.ok) return fail('Could not update the testimonial.', result.status ?? 422, { errors: result.errors });
    return json({ ok: true, testimonial: result.testimonial, stats: testimonialStats() });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: Request) {
  const g = guard('settings:security');
  if (!g.ok) return g.response;
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return fail('id query parameter is required', 400);
    const result = deleteTestimonial(id, g.ctx.user!.email);
    if (!result.ok) return fail('Testimonial not found.', 404);
    return json({ ok: true, testimonials: listAllTestimonials(), stats: testimonialStats() });
  } catch (error) {
    return serverError(error);
  }
}
