import { motion } from 'motion/react'
import { Target, Users, Zap } from 'lucide-react'

function FadeIn({ children, delay = 0, y = 24, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function HowItWorks() {
  const steps = [
    {
      icon: Target,
      step: 'Step 01',
      title: 'Pick Your Focus & Goals',
      description:
        'Select whether you are prepping for Finals, mastering LeetCode, grinding for GATE/GRE, or building projects.',
    },
    {
      icon: Users,
      step: 'Step 02',
      title: 'Instant Peer Matching',
      description:
        'Our AI matcher surfaces live study squads aligned with your subject, study pace, timezone, and exam goals.',
    },
    {
      icon: Zap,
      step: 'Step 03',
      title: 'Enter Live AI Study Rooms',
      description:
        'Study together with built-in in-app video calls, real-time collaborative whiteboards, synchronized Pomodoro streaks, and our 7-engine AI Academic Studio.',
    },
  ]

  return (
    <section id="how-it-works" className="relative z-10 w-full py-20 px-6 max-w-7xl mx-auto">

      {/* Section Header */}
      <FadeIn delay={0}>
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-transparent border border-emerald-600/40 px-3 py-1 rounded-full">
            Simple & Effective
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950 mt-3">
            How StudySquad Works
          </h2>
          <p className="text-neutral-700 mt-2 text-base">
            Stop studying alone in isolation. Connect with high-intent peers in 3 easy steps.
          </p>
        </div>
      </FadeIn>

      {/* Step Cards — staggered slide up */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((item, idx) => {
          const Icon = item.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: 0.6,
                delay: idx * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="p-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/80 hover:bg-white transition-all shadow-md hover:shadow-xl group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-800 group-hover:bg-[#1C2E1E] group-hover:text-white transition-all mb-6 shadow-xs">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 tracking-wider">
                {item.step}
              </span>
              <h3 className="text-xl font-bold text-neutral-950 mt-2 mb-3">
                {item.title}
              </h3>
              <p className="text-sm text-neutral-800 leading-relaxed font-medium">
                {item.description}
              </p>
            </motion.div>
          )
        })}
      </div>

    </section>
  )
}
