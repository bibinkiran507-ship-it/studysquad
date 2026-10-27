import { motion, AnimatePresence } from 'motion/react'
import { Check, ArrowRight } from 'lucide-react'

const PREP_OPTIONS = [
  'State Board / Matric',
  'CBSE 12th Boards',
  'CBSE & ICSE Boards',
  'Engineering & Tech',
  'Artificial Intelligence',
  'Python & Data Science',
  'Java Programming',
  'Competitive Coding',
  'Arts & Humanities',
  'Commerce & Business',
  'GRE / GATE / GMAT',
  'Finals & Midterms',
  'Daily Accountability',
  'Research & Thesis',
]

export default function ServicePills({
  selectedOptions,
  setSelectedOptions,
  onFindSquads,
}) {
  const toggleOption = (option) => {
    setSelectedOptions((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    )
  }

  return (
    <div className="w-full">
      {/* Prompt Title & Subtitle */}
      <h2 className="text-2xl font-medium tracking-tight mb-2 text-black">
        What are you prepping for?
      </h2>
      <p className="opacity-80 text-neutral-600 mb-6 text-base">
        Select all that apply to match with active student groups
      </p>

      {/* Multi-Select Pills Container (Purely Transparent Options) */}
      <div className="flex flex-wrap gap-2.5 sm:gap-3">
        {PREP_OPTIONS.map((option) => {
          const isSelected = selectedOptions.includes(option)
          return (
            <motion.button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              whileTap={{ scale: 0.97 }}
              className={`px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-medium cursor-pointer inline-flex items-center transition-all duration-200 select-none ${
                isSelected
                  ? 'bg-[#1C2E1E] text-white border border-[#1C2E1E] shadow-sm transform scale-[1.02]'
                  : 'bg-transparent text-black border border-neutral-400 hover:border-black hover:bg-black/5'
              }`}
            >
              <AnimatePresence>
                {isSelected && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="inline-flex items-center mr-2"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </motion.span>
                )}
              </AnimatePresence>
              <span>{option}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Contingent Feedback Status Banner (Purely Transparent with border) */}
      <div className="mt-7 min-h-[52px]">
        <AnimatePresence mode="wait">
          {selectedOptions.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="opacity-50 italic text-xs text-neutral-600 select-none"
            >
              Please click to select what you're prepping for above.
            </motion.p>
          ) : (
            <motion.div
              key="active"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="overflow-hidden"
            >
              <div className="bg-transparent border border-neutral-300 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-xl">
                <span className="text-sm sm:text-base text-black">
                  Ready to match for:{' '}
                  <strong className="font-semibold text-black">
                    {selectedOptions.join(', ')}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={onFindSquads}
                  className="bg-[#1C2E1E] hover:bg-[#2B432F] text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wider inline-flex items-center gap-1.5 transition-all self-start sm:self-center cursor-pointer group shadow-xs hover:shadow-sm active:scale-97"
                >
                  <span>Find Squads</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
