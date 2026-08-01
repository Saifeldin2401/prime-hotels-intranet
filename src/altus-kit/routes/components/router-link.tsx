import { forwardRef } from 'react'
import { Link as RouterLinkBase } from 'react-router-dom'
import type { To } from 'react-router-dom'

type RouterLinkProps = Omit<React.ComponentProps<typeof RouterLinkBase>, 'to'> & {
  to?: To
  href?: string
}

export const RouterLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(
  ({ href, to, ...other }, ref) => (
    <RouterLinkBase ref={ref} to={to ?? href ?? '#'} {...other} />
  )
)

RouterLink.displayName = 'RouterLink'
