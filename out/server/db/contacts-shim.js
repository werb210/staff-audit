export const contacts = {
    async findByPhone(phone) {
        if (!phone)
            return { id: null, name: null };
        // demo match
        const cleanPhone = phone.replace(/\D/g, "");
        return {
            id: "contact-" + cleanPhone,
            name: `Contact ${phone}`,
            phone: phone
        };
    },
    async create({ phone, name }) {
        const cleanPhone = phone.replace(/\D/g, "");
        return {
            id: "contact-" + cleanPhone,
            phone,
            name: name ?? `Contact ${phone}`
        };
    }
};
