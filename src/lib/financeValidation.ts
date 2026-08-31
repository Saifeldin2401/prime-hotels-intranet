export interface MatchValidationInput {
    poAmount: number
    invoiceAmount: number
    tolerancePercent?: number // Default 2% threshold allowed for minor shipping variance
}

export interface MatchValidationResult {
    isMatched: boolean
    varianceAmount: number
    variancePercent: number
    isFlagged: boolean
    message: string
}

export function validateThreeWayMatch(input: MatchValidationInput): MatchValidationResult {
    const { poAmount, invoiceAmount, tolerancePercent = 2.0 } = input
    const varianceAmount = Number((invoiceAmount - poAmount).toFixed(2))

    if (poAmount <= 0) {
        return {
            isMatched: false,
            varianceAmount,
            variancePercent: 100,
            isFlagged: true,
            message: 'PO amount must be greater than zero',
        }
    }

    const variancePercent = Number(((Math.abs(varianceAmount) / poAmount) * 100).toFixed(2))
    const isMatched = Math.abs(varianceAmount) === 0
    const isFlagged = variancePercent > tolerancePercent

    let message = 'Exact 3-way match confirmed'
    if (!isMatched) {
        if (isFlagged) {
            message = `Variance of ${variancePercent}% exceeds allowable ${tolerancePercent}% tolerance`
        } else {
            message = `Minor variance of ${variancePercent}% within allowable tolerance`
        }
    }

    return {
        isMatched,
        varianceAmount,
        variancePercent,
        isFlagged,
        message,
    }
}
