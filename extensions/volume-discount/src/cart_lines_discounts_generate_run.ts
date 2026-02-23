import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

type QuantityBreak = {
  minimum_quantity: number;
  price: number; // precio unitario deseado para ese tier
};

const MAX_ORDER_TOTAL = 100000;

export function cartLinesDiscountsGenerateRun(
  input: CartInput
): CartLinesDiscountsGenerateRunResult {
  if (!input.cart.lines.length) return { operations: [] };

  const operations: CartLinesDiscountsGenerateRunResult["operations"] = [];

  // 2) Aplicar precio por volumen por línea usando metafield pricing.quantity_breaks (JSON)
  for (const line of input.cart.lines) {
    const merchandise: any = line.merchandise;

    const mfValue: string | undefined =
      merchandise?.metafield?.value ?? merchandise?.metafield?.value?.toString?.();

    if (!mfValue) continue;

    let breaks: any[];
    try {
      const parsed = JSON.parse(mfValue);
      if (!Array.isArray(parsed)) continue;
      breaks = parsed;
    } catch {
      continue;
    }

    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    // Selecciona el tier más alto cuyo minimum_quantity <= qty
    let applicablePrice: number | null = null;

    for (const tier of breaks) {
      const minQty = Number(tier?.minimum_quantity);
      const price = Number(tier?.price); // <- soporta string o number

      if (Number.isFinite(minQty) && Number.isFinite(price) && qty >= minQty) {
        applicablePrice = price;
      }
    }

    if (applicablePrice == null) continue;

    // Precio actual unitario en el carrito
    const currentUnit = Number(line.cost.amountPerQuantity.amount);

    // Si ya está igual o más bajo, no hacemos nada
    if (!Number.isFinite(currentUnit) || currentUnit <= applicablePrice) continue;

    // Descuento por unidad = diferencia
    const discountPerUnit = currentUnit - applicablePrice;
    if (discountPerUnit <= 0) continue;

    operations.push({
      productDiscountsAdd: {
        candidates: [
          {
            message: `Precio por volumen aplicado: $${applicablePrice.toFixed(2)} c/u`,
            targets: [{ cartLine: { id: line.id } }],
            value: {
              fixedAmount: {
                amount: discountPerUnit.toFixed(2),
                appliesToEachItem: true,
              },
            },
          },
        ],
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    });
  }

  return { operations };
}