# GA4 event catalogue

Eight events, all consent-gated, all parameter-allow-listed in `lib/client/analytics.ts`. If an event
is not in this table it must not be sent — the client drops unlisted parameter keys rather than
forwarding them.

| Event | When | Allowed params | Never send |
| --- | --- | --- | --- |
| `form_submitted` | public contact form accepted | `topic`, `hasOrganisation` | name, email, message, IP |
| `form_failed` | form rejected (client or server) | `reason` (`validation`, `rate_limited`, `captcha`, `network`) | field values |
| `faq_opened` | an FAQ answer expands | `category`, `index` | — |
| `dataset_uploaded` | upload accepted | `fileType`, `rowBucket` (`<100`, `<1k`, `<10k`, `10k+`) | file name, contents |
| `report_generated` | report built | `reportKind`, `qualityBucket` (`<60`, `<80`, `80+`) | report title, players |
| `report_exported` | export downloaded | `format`, `reportKind` | file name |
| `sign_in` | successful sign-in | `method` (`password`, `totp`), `role` | email, user id |
| `sign_out` | sign-out | `reason` (`manual`, `expired`) | — |

## Measurement rules

* No event fires before consent; declining or DNT sets nothing.
* No user IDs, no cross-site identifiers, no enhanced measurement except page views.
* Counts are bucketed at the client so a report cannot leak a single player's presence.
* Server-side events are deliberately not sent: the BFF has no consent context.
* `analytics/metrics.py` reads an export of these events; unknown event names are reported as errors
  rather than counted.

## Adding an event

1. Add it to the allow-list in `lib/client/analytics.ts` (`EVENTS` + `PARAMS`).
2. Add a row here with the "never send" column filled in — if you cannot name what must not be sent,
   the event is not designed yet.
3. Add a unit test asserting that unlisted params are stripped.
4. Update `docs/growth` copy and the privacy policy if the data category is new.
