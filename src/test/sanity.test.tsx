import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

describe('Sanity Test', () => {
    it('should pass', () => {
        const { getByTestId } = render(<div data-testid="test-div">Hello PRIME</div>)
        expect(getByTestId('test-div')).toHaveTextContent('Hello PRIME')
    })
})
