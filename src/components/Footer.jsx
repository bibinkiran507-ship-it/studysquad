import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Share2, Copy, Check } from 'lucide-react';
import { openLegalPolicy } from './LegalPolicyModal';

const SITE_URL = 'https://studysquadai.com';
const SHARE_MESSAGE =
  '🔥 Check out StudySquad AI — Live multiplayer study rooms with 24/7 AI tutor, 3D flashcards, whiteboard & Lo-Fi focus beats:';

export default function Footer() {
  const [copied, setCopied] = useState(false);

  const handleShare = (platform) => {
    const encodedUrl = encodeURIComponent(SITE_URL);
    const encodedFull = encodeURIComponent(`${SHARE_MESSAGE} ${SITE_URL}`);
    const encodedTitle = encodeURIComponent(SHARE_MESSAGE);

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodedFull}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodedFull}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank', 'noopener,noreferrer');
    } else if (platform === 'native' && navigator.share) {
      navigator
        .share({
          title: 'StudySquad AI — Collaborative Study Platform',
          text: SHARE_MESSAGE,
          url: SITE_URL,
        })
        .catch(() => {});
    }
  };

  const handleCopySiteLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${SHARE_MESSAGE}\n${SITE_URL}`);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <footer className="relative z-10 w-full py-10 px-6 max-w-7xl mx-auto mt-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col gap-5 border-t border-black/10 pt-6"
      >
        {/* 1-Click Social Share Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/[0.04] border border-black/10 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
            <Share2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Invite Friends &amp; Share StudySquad:</span>
          </div>
          <div className="flex items-center flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => handleShare('whatsapp')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => handleShare('telegram')}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Telegram
            </button>
            <button
              type="button"
              onClick={() => handleShare('facebook')}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Facebook
            </button>
            <button
              type="button"
              onClick={() => handleShare('twitter')}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              X (Twitter)
            </button>
            <button
              type="button"
              onClick={() => handleShare('linkedin')}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              LinkedIn
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                type="button"
                onClick={() => handleShare('native')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                More Apps
              </button>
            )}
            <button
              type="button"
              onClick={handleCopySiteLink}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 border border-black/15 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-600" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

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
