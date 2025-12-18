import { motion } from 'framer-motion'

interface HeroTextProps {
    text: string
    className?: string
    delay?: number
    stagger?: number
}

export function HeroText({ text, className, delay = 0, stagger = 0.03 }: HeroTextProps) {
    const words = text.split(" ")

    const containerDev = {
        hidden: { opacity: 0 },
        visible: (i: number = 1) => ({
            opacity: 1,
            transition: { staggerChildren: stagger, delayChildren: delay * i },
        }),
    }

    const child = {
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                damping: 12,
                stiffness: 100,
            },
        },
        hidden: {
            opacity: 0,
            y: 20,
            transition: {
                damping: 12,
                stiffness: 100,
            },
        },
    }

    return (
        <motion.div
            style={{ overflow: "hidden", display: "flex", flexWrap: "wrap", gap: "0.25em" }}
            variants={containerDev}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {words.map((word, index) => (
                <motion.span variants={child} key={index} className="inline-block whitespace-nowrap">
                    {word}
                </motion.span>
            ))}
        </motion.div>
    )
}
