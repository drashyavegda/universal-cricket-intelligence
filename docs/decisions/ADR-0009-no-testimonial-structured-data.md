# ADR-0009 — No Review/AggregateRating structured data for testimonials

* Status: Accepted
* Date: 2026-11-09

## Context
Testimonials can be marked up with `Review`/`AggregateRating` schema. In this build the only quotes
are labelled sample content, and self-published reviews for one's own product are not eligible for
review rich results anyway.

## Decision
Emit no review structured data. Render testimonials as plain, verifiable HTML with a visible
"Sample" badge on demo rows, and state on the page when no verified testimonial exists.

## Consequences
* No risk of a manual action for misleading markup.
* No star ratings in search results — a deliberate trade of a cosmetic win for accuracy.
* When a real quote is added, it is still HTML-only until someone revisits this ADR.

## Alternatives considered
* Marking up sample rows — rejected outright: fabricating endorsements.
* Ratings derived from feedback form scores — rejected: unverified, and not what the reviewers gave.
