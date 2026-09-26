import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { colors } from '@/ui/tokens/colors'
import { typography } from '@/ui/tokens/typography'
import { shape } from '@/ui/tokens/shape'
import { Button } from '@/ui/primitives/Button'
import { StatusPill } from '@/ui/primitives/StatusPill'
import { ConfirmDialog } from '@/ui/primitives/ConfirmDialog'
import { QueryState } from '@/ui/primitives/QueryState'
import { HorizontalBarChart, DonutChart, SparklineChart } from '@/ui/components/Chart'

describe('Phase 6: Design System Tokens & Primitives', () => {
  describe('Color Tokens', () => {
    it('defines all 11 semantic tokens for light theme', () => {
      expect(colors.light.ink).toBe('#15212E')
      expect(colors.light.inkSecondary).toBe('#3B4754')
      expect(colors.light.muted).toBe('#667080')
      expect(colors.light.border).toBe('#DDDBD4')
      expect(colors.light.background).toBe('#F6F6F3')
      expect(colors.light.surface).toBe('#FFFFFF')
      expect(colors.light.brass).toBe('#86672C')
      expect(colors.light.success).toBe('#2C6A4B')
      expect(colors.light.warning).toBe('#A85A14')
      expect(colors.light.danger).toBe('#A5302A')
      expect(colors.light.info).toBe('#46637A')
    })

    it('defines corresponding dark theme tokens', () => {
      expect(colors.dark.ink).toBe('#F0F3F7')
      expect(colors.dark.background).toBe('#101419')
      expect(colors.dark.surface).toBe('#18202A')
      expect(colors.dark.brass).toBe('#D4AA55')
      expect(colors.dark.success).toBe('#48A375')
      expect(colors.dark.warning).toBe('#DCA038')
      expect(colors.dark.danger).toBe('#E25850')
    })
  })

  describe('Typography & Shape Tokens', () => {
    it('defines the Altus families and full typographic scale', () => {
      expect(typography.fontFamilies.sans).toContain('DM Sans')
      expect(typography.fontFamilies.sans).toContain('IBM Plex Sans Arabic')
      expect(typography.fontFamilies.editorial).toContain('Cormorant Garamond')
      expect(typography.fontFamilies.mono).toContain('IBM Plex Mono')

      expect(typography.scale.display.size).toBe('32px')
      expect(typography.scale.h1.size).toBe('24px')
      expect(typography.scale.h2.size).toBe('18px')
      expect(typography.scale.body.size).toBe('15px')
      expect(typography.scale.label.size).toBe('12px')
      expect(typography.scale.data.size).toBe('13px')
    })

    it('enforces touch targets >= 44px and brass focus ring', () => {
      expect(shape.touchTarget.minHeight).toBe('min-h-[44px]')
      expect(shape.focusRing).toContain('ring-ds-accent')
    })
  })

  describe('Button Primitive', () => {
    it('renders with 44px min-height and proper variant classes', () => {
      const { rerender } = render(<Button variant="primary">Submit</Button>)
      const btn = screen.getByRole('button', { name: 'Submit' })
      expect(btn).toHaveClass('min-h-[44px]')
      expect(btn).toHaveClass('rounded-[6px]')

      rerender(<Button variant="destructive">Delete</Button>)
      expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-ds-danger')
    })

    it('shows loading spinner and disables when isLoading is true', () => {
      render(<Button isLoading>Saving</Button>)
      const btn = screen.getByRole('button')
      expect(btn).toBeDisabled()
      expect(btn.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('StatusPill Primitive', () => {
    it('renders semantic statuses correctly', () => {
      const { rerender } = render(<StatusPill variant="success" label="Passed" />)
      expect(screen.getByText('Passed')).toBeInTheDocument()

      rerender(<StatusPill variant="danger" label="Failed" />)
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })
  })

  describe('ConfirmDialog Primitive', () => {
    it('locks confirmation button until exact string is typed', () => {
      const onConfirm = vi.fn()
      const onClose = vi.fn()

      const { rerender } = render(
        <ConfirmDialog
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          title="Delete Course"
          description="Are you sure?"
          confirmString="CONFIRM"
        />
      )

      const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
      expect(confirmBtn).toBeDisabled()

      const input = screen.getByPlaceholderText('CONFIRM')
      act(() => {
        fireEvent.change(input, { target: { value: 'WRONG' } })
      })
      expect(confirmBtn).toBeDisabled()

      act(() => {
        fireEvent.change(input, { target: { value: 'CONFIRM' } })
      })
      expect(confirmBtn).not.toBeDisabled()

      act(() => {
        fireEvent.click(confirmBtn)
      })
      expect(onConfirm).toHaveBeenCalled()
    })
  })

  describe('QueryState Primitive', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(
        <QueryState isLoading={true}>
          <div>Loaded Content</div>
        </QueryState>
      )
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByText('Loaded Content')).not.toBeInTheDocument()
    })

    it('renders error alert with retry button when error occurs', () => {
      const onRetry = vi.fn()
      render(
        <QueryState error="Failed to fetch" onRetry={onRetry}>
          <div>Loaded Content</div>
        </QueryState>
      )
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument()

      const retryBtn = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(retryBtn)
      expect(onRetry).toHaveBeenCalled()
    })

    it('renders empty state when isEmpty is true', () => {
      render(
        <QueryState isEmpty={true} emptyTitle="Nothing here">
          <div>Loaded Content</div>
        </QueryState>
      )
      expect(screen.getByText('Nothing here')).toBeInTheDocument()
      expect(screen.queryByText('Loaded Content')).not.toBeInTheDocument()
    })

    it('renders forbidden state when isForbidden is true', () => {
      render(
        <QueryState isForbidden={true}>
          <div>Loaded Content</div>
        </QueryState>
      )
      expect(screen.getByText('Access Restricted')).toBeInTheDocument()
    })

    it('renders children when state is ready', () => {
      render(
        <QueryState>
          <div>Loaded Content</div>
        </QueryState>
      )
      expect(screen.getByText('Loaded Content')).toBeInTheDocument()
    })
  })

  describe('Chart Components', () => {
    it('renders HorizontalBarChart items and percentages', () => {
      render(
        <HorizontalBarChart
          items={[
            { label: 'Front Office', value: 85, maxValue: 100, variant: 'success' },
            { label: 'Housekeeping', value: 60, maxValue: 100, variant: 'accent' },
          ]}
        />
      )
      expect(screen.getByText('Front Office')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument()
      expect(screen.getByText('Housekeeping')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
    })

    it('renders DonutChart with segments, center label, and center value', () => {
      render(
        <DonutChart
          segments={[
            { label: 'Completed', value: 40, color: '#2C6A4B' },
            { label: 'In Progress', value: 10, color: '#86672C' },
          ]}
          centerLabel="Total"
          centerValue="50"
        />
      )
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('renders SparklineChart polyline and handles short data arrays', () => {
      const { container, rerender } = render(<SparklineChart data={[10, 25, 15, 30]} />)
      const polyline = container.querySelector('polyline')
      expect(polyline).toBeInTheDocument()
      expect(polyline?.getAttribute('points')).toBeTruthy()

      // Empty or single item should render nothing
      rerender(<SparklineChart data={[10]} />)
      expect(container.querySelector('polyline')).toBeNull()
    })
  })
})
