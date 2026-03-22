import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Sanity Test', () => {
    it('should pass', () => {
        const { getByTestId } = render(<div data-testid="test-div">Hello PRIME</div>)
        expect(getByTestId('test-div')).toHaveTextContent('Hello PRIME')
    })
})
