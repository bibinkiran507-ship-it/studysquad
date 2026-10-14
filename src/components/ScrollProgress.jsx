import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <>
      {/* Thin glowing scroll progress bar at top of viewport */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-[100] origin-left h-[3px]"
        style={{
          scaleX,
          background: 'linear-gradient(90deg, #1C2E1E 0%, #4D6D47 50%, #a8d5a2 100%)',
          boxShadow: '0 0 8px 1px rgba(77,109,71,0.6)',
        }}
      />
    </>
  )
}
