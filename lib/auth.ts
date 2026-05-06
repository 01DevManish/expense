export function verifyAdminPin(pin: string) {
  const v = process.env.ADMIN_PIN;
  if (!v) throw new Error("Missing ADMIN_PIN");
  return pin === v;
}

export function verifyShopPin(pin: string) {
  const v = process.env.SHOP_PIN;
  if (!v) throw new Error("Missing SHOP_PIN");
  return pin === v;
}
