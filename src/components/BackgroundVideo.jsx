import { useEffect, useRef } from 'react';

export default function BackgroundVideo({ className = '', style = {}, paused = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncPlayback = () => {
      if (paused || document.hidden) {
        if (!video.paused) {
          video.pause();
        }
      } else if (video.paused) {
        video.play().catch(() => {
          // Ignore autoplay restriction before user interaction
        });
      }
    };

    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      document.removeEventListener('visibilitychange', syncPlayback);
    };
  }, [paused]);

  return (
    <div
      style={style}
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#e9ebe6] ${className}`}
    >
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-cover object-right"
      />
    </div>
  );
}
