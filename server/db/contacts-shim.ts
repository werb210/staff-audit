export const contacts = {
  async findByPhone(phone: string) {
    if (!phone) return { id: null, name: null };
    // demo match
    const cleanPhone = phone.replace(/\D/g, "");
    return { 
      id: "contact-" + cleanPhone, 
      name: `Contact ${phone}`,
      phone: phone
    };
  },
  async create({ phone, name }: { phone: string; name?: string }) {
    const cleanPhone = phone.replace(/\D/g, "");
    return { 
      id: "contact-" + cleanPhone, 
      phone, 
      name: name ?? `Contact ${phone}` 
    };
  }
};