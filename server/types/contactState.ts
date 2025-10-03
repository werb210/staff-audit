export const ContactStates = ['new', 'in_progress', 'connected'] as const;
export type ContactState = typeof ContactStates[number];

export const AudienceSegments = ['lender', 'referrer', 'evangelist', 'client'] as const;
export type AudienceSegment = typeof AudienceSegments[number];

export function isContactState(x: any): x is ContactState {
  return typeof x === 'string' && (ContactStates as readonly string[]).includes(x);
}

export function isAudienceSegment(x: any): x is AudienceSegment {
  return typeof x === 'string' && (AudienceSegments as readonly string[]).includes(x);
}