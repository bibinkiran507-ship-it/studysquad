import React from 'react';
import { motion } from 'motion/react';
import { openLegalPolicy } from './LegalPolicyModal';

export default function Footer() {
  return (
    <footer className="relative z-10 w-full py-10 px-6 max-w-7xl mx-auto mt-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col gap-4 border-t border-black/10 pt-6"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 gap-4">
          <p className="select-none">
            &copy; {new Date().getFullYear()} StudySquad&reg;. Built for collaborative learners everywhere.
          </p>
          <div className="flex items-center flex-wrap justify-center gap-3 sm:gap-4 text-neutral-600">
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
        </div>

        <div className="flex items-center flex-wrap justify-center sm:justify-end gap-x-4 gap-y-1.5 text-[11px] text-neutral-500">
          <button
            type="button"
            onClick={() => openLegalPolicy('terms')}
            className="hover:text-black transition-colors cursor-pointer"
          >
            Terms &amp; Conditions
          </button>
          <span className="opacity-40">&bull;</span>
          <button
            type="button"
            onClick={() => openLegalPolicy('privacy')}
            className="hover:text-black transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <span className="opacity-40">&bull;</span>
          <button
            type="button"
            onClick={() => openLegalPolicy('refund')}
            className="hover:text-black transition-colors cursor-pointer"
          >
            Refund &amp; Cancellation Policy
          </button>
          <span className="opacity-40">&bull;</span>
          <button
            type="button"
            onClick={() => openLegalPolicy('contact')}
            className="hover:text-black transition-colors cursor-pointer"
          >
            Contact Us
          </button>
        </div>
      </motion.div>
    </footer>
  );
}
