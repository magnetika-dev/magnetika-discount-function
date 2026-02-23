import { CartInput, CartValidationsGenerateRunResult } from "../generated/api";

const MAX_ORDER_TOTAL = 100000;

export function cartValidationsGenerateRun(
  input: CartInput
): CartValidationsGenerateRunResult {
  const errors: CartValidationsGenerateRunResult["errors"] = [];

  if (!input.cart?.lines?.length) return { errors };

  let projectedSubtotal = 0;

  for (const line of input.cart.lines) {
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const currentUnit = Number(line.cost.amountPerQuantity.amount);
    if (!Number.isFinite(currentUnit) || currentUnit <= 0) continue;

    // Default: si no hay breaks, usamos el precio actual
    let unitToUse = currentUnit;

    // Intentar leer breaks desde metafield
    const merchandise: any = line.merchandise;
    const mfValue: string | undefined =
      merchandise?.metafield?.value ?? merchandise?.metafield?.value?.toString?.();

    if (mfValue) {
      try {
        const parsed = JSON.parse(mfValue);
        if (Array.isArray(parsed)) {
          // Tier más alto con minimum_quantity <= qty
          let applicablePrice: number | null = null;

          for (const tier of parsed) {
            const minQty = Number(tier?.minimum_quantity);
            const price = Number(tier?.price);
            if (Number.isFinite(minQty) && Number.isFinite(price) && qty >= minQty) {
              applicablePrice = price;
            }
          }

          // Si hay precio aplicable y es menor al actual, usarlo
          if (applicablePrice != null && Number.isFinite(applicablePrice)) {
            unitToUse = Math.min(currentUnit, applicablePrice);
          }
        }
      } catch {
        // si falla parse, ignoramos y usamos currentUnit
      }
    }

    projectedSubtotal += unitToUse * qty;
  }

  // Bloqueo SOLO si el subtotal proyectado con volumen excede el máximo
  if (projectedSubtotal > MAX_ORDER_TOTAL) {
    errors.push({
      message:
        "Este pedido excede el límite permitido para compra en línea ($100,000). Por favor contacta a un asesor para cotización.",
      target: "cart",
    });
  }

  return { errors };
}