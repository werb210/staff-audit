export const ContactStates = ['new', 'in_progress', 'connected'];
export const AudienceSegments = ['lender', 'referrer', 'evangelist', 'client'];
export function isContactState(x) {
    return typeof x === 'string' && ContactStates.includes(x);
}
export function isAudienceSegment(x) {
    return typeof x === 'string' && AudienceSegments.includes(x);
}
