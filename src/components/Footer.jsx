import React from 'react';
import { motion } from 'motion/react';

export default function Footer() {
  return (
    <footer className="relative z-10 w-full py-10 px-6 max-w-7xl mx-auto mt-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 gap-4"
      >
        <p className="select-none">
          &copy; 2026 StudySquad&reg;. Built for collaborative learners everywhere.
        </p>
        <div className="flex items-center gap-4 text-neutral-600">
          <a href="#spade-hero" className="hover:text-black transition-colors">
            Back to Top
          </a>
          <span className="opacity-40">&bull;</span>
          <a href="#how-it-works" className="hover:text-black transition-colors">
            How It Works
          </a>
          <span className="opacity-40">&bull;</span>
          <a href="#squads-section" className="hover:text-black transition-colors">
            Browse Squads
          </a>
        </div>
      </motion.div>
    </footer>
  );
}
