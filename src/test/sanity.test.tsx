import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

describe('Sanity Test', () => {
    it('should pass', () => {
        render(<div data-testid="test-div">Hello PRIME</div>)
        expect(screen.getByTestId('test-div')).toHaveTextContent('Hello PRIME')
    })
})
