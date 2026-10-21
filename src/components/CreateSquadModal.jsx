import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Plus, Sparkles, ExternalLink } from 'lucide-react'

export default function CreateSquadModal({ isOpen, onClose, onCreateSquad }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('Competitive Coding')
  const [platform, setPlatform] = useState('Google Meet')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [schedule, setSchedule] = useState('Mon, Wed @ 7:00 PM EST')
  const [maxMembers, setMaxMembers] = useState(5)
  const [description, setDescription] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !subject.trim()) return

    const defaultMeetingUrl =
      platform === 'Google Meet'
        ? 'https://meet.google.com/new'
        : platform === 'Zoom'
        ? 'https://zoom.us/join'
        : 'https://discord.com';

    const squadData = {
      name: name.trim(),
      subject: subject.trim(),
      category,
      platform,
      meetingUrl: meetingUrl.trim() || defaultMeetingUrl,
      schedule,
      maxMembers: Number(maxMembers),
      description: description.trim() || 'Collaborative study sessions and problem solving.',
    }

    onCreateSquad(squadData)
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Community Builder
              </span>
              <h3 className="text-xl font-bold text-neutral-900 mt-1">
                Create a New Study Squad
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-200/70 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                Squad Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., LeetCode 150 Hardcore Grind"
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Subject / Curriculum
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Java OOPs, Python Data Science, Deep Learning PyTorch, CBSE 12th"
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
                >
                  <option>Artificial Intelligence</option>
                  <option>Python & Data Science</option>
                  <option>Java Programming</option>
                  <option>Competitive Coding</option>
                  <option>Engineering & Tech</option>
                  <option>CBSE 12th Boards</option>
                  <option>CBSE & ICSE Boards</option>
                  <option>State Board / Matric</option>
                  <option>Arts & Humanities</option>
                  <option>Commerce & Business</option>
                  <option>GRE / GATE / GMAT</option>
                  <option>Finals & Midterms</option>
                  <option>Daily Accountability</option>
                  <option>Research & Thesis</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Meeting Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
                >
                  <option>Google Meet</option>
                  <option>Discord</option>
                  <option>Zoom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Max Member Spots
                </label>
                <input
                  type="number"
                  min="2"
                  max="12"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                  {platform} Meeting Link
                </label>
                {platform === 'Google Meet' && (
                  <a
                    href="https://meet.new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Instant Google Meet (meet.new)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {platform === 'Zoom' && (
                  <a
                    href="https://zoom.us/start"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Start Zoom meeting</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder={
                  platform === 'Google Meet'
                    ? 'https://meet.google.com/abc-defg-hij'
                    : platform === 'Zoom'
                    ? 'https://zoom.us/j/1234567890'
                    : 'https://discord.gg/your-invite'
                }
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20 font-mono text-xs sm:text-sm"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Real members will click one button to enter your live video/audio study session.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                Meeting Schedule
              </label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="e.g., Daily @ 8:00 PM EST"
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                Description & Expectations
              </label>
              <textarea
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What topics will you cover? What study pace do you expect?"
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20 resize-none"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#1C2E1E] hover:bg-[#2C482F] text-white px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Launch Squad</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
