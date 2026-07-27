import { useLocation, useNavigate } from 'react-router-dom'

export function usePathname() {
  return useLocation().pathname
}

export function useRouter() {
  const navigate = useNavigate()

  return {
    back: () => navigate(-1),
    forward: () => navigate(1),
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
  }
}
