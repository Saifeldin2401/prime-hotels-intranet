interface ModuleTourModalProps {
  isOpen: boolean
  onClose: () => void
  moduleTitle: string
  moduleDescription: string
  highlights: string[]
  onStartTour?: () => void
}
