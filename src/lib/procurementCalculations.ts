export interface LineItemInput {
    item_description: string
    quantity: number
    unit_price: number
}

export interface ProcurementCalculationResult {
    subtotal: number
    vatAmount: number
    grandTotal: number
    itemTotals: number[]
}

export const KSA_VAT_RATE = 0.15 // 15% Standard KSA VAT

export function calculatePoTotals(items: LineItemInput[], vatRate = KSA_VAT_RATE): ProcurementCalculationResult {
    if (!items || items.length === 0) {
        return {
            subtotal: 0,
            vatAmount: 0,
            grandTotal: 0,
            itemTotals: [],
        }
    }

    const itemTotals = items.map((item) => {
        const qty = Math.max(0, Number(item.quantity) || 0)
        const price = Math.max(0, Number(item.unit_price) || 0)
        return Number((qty * price).toFixed(2))
    })

    const subtotal = Number(itemTotals.reduce((sum, current) => sum + current, 0).toFixed(2))
    const vatAmount = Number((subtotal * vatRate).toFixed(2))
    const grandTotal = Number((subtotal + vatAmount).toFixed(2))

    return {
        subtotal,
        vatAmount,
        grandTotal,
        itemTotals,
    }
}
