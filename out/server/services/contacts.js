// server/services/contacts.ts
export const canonicalEmail = (raw = '') => {
    const e = (raw || '').trim().toLowerCase();
    if (!e)
        return '';
    const [local, domain] = e.split('@');
    if (!domain)
        return '';
    // Gmail: collapse dots and strip +tag
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        return `${local.split('+')[0].replace(/\./g, '')}@gmail.com`;
    }
    return `${local}@${domain}`;
};
export function mergeContactsFromApplications(apps) {
    const groups = new Map();
    for (const a of apps) {
        const em = canonicalEmail(a.contactEmail);
        if (!em)
            continue;
        if (!groups.has(em))
            groups.set(em, []);
        groups.get(em).push(a);
    }
    const merged = [];
    for (const [email, arr] of groups) {
        // pick best/most recent name & phone
        const mostRecent = [...arr].sort((a, b) => +new Date(b.updatedAt || b.createdAt || 0) - +new Date(a.updatedAt || a.createdAt || 0))[0];
        const name = mostRecent?.contactName || 'Name Not Set';
        // prefer a non-empty mobile/phone
        const phones = Array.from(new Set(arr.flatMap(a => [a.mobile, a.phone].filter(Boolean))));
        const phone = phones[0] || '';
        // most-frequent company label
        const companyCounts = arr.reduce((m, a) => {
            const key = (a.businessName || '').trim();
            if (!key)
                return m;
            m.set(key, (m.get(key) || 0) + 1);
            return m;
        }, new Map());
        const company = [...companyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        merged.push({
            id: `contact:${email}`,
            email,
            name,
            phone,
            company,
            applications: arr.map(a => a.id),
            applicationsCount: arr.length,
            // handy for UI/filters
            latestAmount: mostRecent?.amount ?? 0,
            lastUpdated: mostRecent?.updatedAt || mostRecent?.createdAt || null,
        });
    }
    return merged.sort((a, b) => (b.lastUpdated ? +new Date(b.lastUpdated) : 0) - (a.lastUpdated ? +new Date(a.lastUpdated) : 0));
}
