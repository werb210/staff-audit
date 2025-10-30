export const canonEmail = (e) => {
    if (!e)
        return '';
    let [local, domain] = e.trim().toLowerCase().split('@');
    if (!domain)
        return e.trim().toLowerCase();
    local = local.split('+')[0];
    if (domain === 'gmail.com' || domain === 'googlemail.com')
        local = local.replace(/\./g, '');
    return `${local}@${domain}`;
};
