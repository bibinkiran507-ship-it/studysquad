export default function BackgroundVideo({ className = '', style = {} }) {
  return (
    <div
      style={style}
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`}
    >
      <video
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover object-right"
      />
    </div>
  );
}
