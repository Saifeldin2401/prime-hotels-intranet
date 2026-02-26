/**
 * SectionLinkInjector
 * 
 * Injects copy-link buttons into article headings after content renders.
 * Uses a MutationObserver to handle dynamically rendered content.
 */

import { useEffect, useRef } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { SectionLinkButton } from './SectionLinkButton'

interface SectionLinkInjectorProps {
    containerRef: React.RefObject<HTMLElement>
    isActive: boolean
}

export function SectionLinkInjector({ containerRef, isActive }: SectionLinkInjectorProps) {
    const rootsRef = useRef<Map<Element, Root>>(new Map())

    useEffect(() => {
        if (!isActive || !containerRef.current) return

        const container = containerRef.current
        const roots = rootsRef.current

        // Function to add buttons to headings
        const addButtonsToHeadings = () => {
            const headings = container.querySelectorAll('h1, h2, h3, h4')

            headings.forEach((heading, index) => {
                // Skip if already processed
                if (heading.querySelector('.section-link-wrapper')) return

                // Ensure heading has an ID
                const id = heading.id || `section-${index}`
                if (!heading.id) {
                    heading.id = id
                }

                // Add group class for hover effects
                heading.classList.add('group')

                // Create container for the button
                const buttonContainer = document.createElement('span')
                buttonContainer.className = 'section-link-wrapper inline-flex items-center ml-2'

                // Append to heading
                heading.appendChild(buttonContainer)

                // Render React component
                const root = createRoot(buttonContainer)
                root.render(<SectionLinkButton sectionId={id} />)
                roots.set(heading, root)
            })
        }

        // Initial injection
        addButtonsToHeadings()

        // Set up MutationObserver for dynamically added content
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldUpdate = true
                    break
                }
            }
            if (shouldUpdate) {
                addButtonsToHeadings()
            }
        })

        observer.observe(container, {
            childList: true,
            subtree: true
        })

        return () => {
            observer.disconnect()
            // Defer unmount to avoid race condition with React's rendering cycle
            const rootsCopy = new Map(roots)
            roots.clear()
            setTimeout(() => {
                rootsCopy.forEach((root, element) => {
                    try {
                        root.unmount()
                    } catch {
                        // Ignore if already unmounted
                    }
                    const wrapper = element.querySelector('.section-link-wrapper')
                    if (wrapper) {
                        wrapper.remove()
                    }
                })
            }, 0)
        }
    }, [containerRef, isActive])

    return null
}

export default SectionLinkInjector
