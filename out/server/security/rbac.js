// Rank indicates privilege floor. Marketing == Agent.
const rank = {
    admin: 5,
    manager: 4,
    marketing: 2,
    agent: 2,
    lender: 1,
    referrer: 1,
    viewer: 0
};
export function requireRole(min) {
    const needs = Array.isArray(min) ? min : [min];
    return (req, res, next) => {
        const user = req.user;
        // If no user is found, return 401 instead of defaulting to admin
        if (!user) {
            return res.status(401).json({ error: "authentication_required" });
        }
        const effective = (user.roleEffective ?? user.role);
        const userRank = rank[effective] ?? -1;
        const ok = needs.some(r => {
            // If a specific role name is listed, allow exact match OR higher rank
            if (r in rank)
                return userRank >= (rank[r] ?? 99);
            return false;
        });
        if (!ok)
            return res.status(403).json({ error: "forbidden", role: effective, required: needs });
        next();
    };
}
// Convenience: allow any of listed roles regardless of rank ordering
export function requireAnyRole(roles) {
    return (req, res, next) => {
        const user = req.user;
        // If no user is found, return 401 instead of defaulting to viewer
        if (!user) {
            return res.status(401).json({ error: "authentication_required" });
        }
        const effective = (user.roleEffective ?? user.role);
        if (!roles.includes(effective)) {
            return res.status(403).json({ error: "forbidden", role: effective, required: roles });
        }
        next();
    };
}
