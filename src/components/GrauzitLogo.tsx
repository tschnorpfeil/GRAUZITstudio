export function GrauzitLogo({ className = 'h-14 md:h-16' }: { className?: string; showText?: boolean }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/grauzit-logo.png"
        alt="GRAUZIT Logo"
        className="h-full w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
      />
    </div>
  )
}
