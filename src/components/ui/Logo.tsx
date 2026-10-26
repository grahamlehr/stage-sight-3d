import React from 'react';

export interface LogoProps {
  /**
   * 'icon': 1:1 square icon focusing on the 3D cyclone ribbon mark (viewBox: 240 5 544 544).
   * 'full': 16:9 master wide artwork with framing (viewBox: 0 0 1024 571).
   */
  variant?: 'icon' | 'full';
  className?: string;
  withText?: boolean;
  textClassName?: string;
  badge?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'icon',
  className = 'w-6 h-6',
  withText = false,
  textClassName = 'text-sm font-extrabold',
  badge,
  onClick,
}) => {
  const isIcon = variant === 'icon';
  const viewBox = isIcon ? '240 5 544 544' : '0 0 1024 571';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 select-none ${onClick ? 'cursor-pointer' : ''}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        className={`${className} shrink-0 transition-transform duration-200`}
        fill="none"
      >
        <defs>
          <linearGradient id="logoTopArchGrad" x1="256" y1="140" x2="768" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1b45a8" />
            <stop offset="12%" stopColor="#1856bc" />
            <stop offset="28%" stopColor="#1475c4" />
            <stop offset="45%" stopColor="#11a0d6" />
            <stop offset="62%" stopColor="#0ccbe7" />
            <stop offset="80%" stopColor="#08ddf1" />
            <stop offset="100%" stopColor="#04ebfa" />
          </linearGradient>

          <linearGradient id="logoCyanGrad1" x1="256" y1="167" x2="416" y2="167" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00e5f7" />
            <stop offset="100%" stopColor="#09d7ee" />
          </linearGradient>

          <linearGradient id="logoCyanGrad2" x1="416" y1="220" x2="674" y2="220" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#09d7ee" />
            <stop offset="100%" stopColor="#05e0f6" />
          </linearGradient>

          <linearGradient id="logoGlowFold1" x1="522" y1="288" x2="660" y2="260" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00cbf2" stopOpacity="0.2" />
            <stop offset="35%" stopColor="#80ecff" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          <linearGradient id="logoT2Grad" x1="385" y1="330" x2="492" y2="330" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#193daf" />
            <stop offset="50%" stopColor="#155ebc" />
            <stop offset="100%" stopColor="#1080ce" />
          </linearGradient>

          <linearGradient id="logoCyanGrad3" x1="385" y1="346" x2="492" y2="346" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00e5f7" />
            <stop offset="100%" stopColor="#0cc8eb" />
          </linearGradient>

          <linearGradient id="logoGlowFold2" x1="491" y1="425" x2="586" y2="386" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00cef4" stopOpacity="0.2" />
            <stop offset="40%" stopColor="#80ecff" stopOpacity="0.8" />
            <stop offset="85%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          <linearGradient id="logoT4Grad" x1="461" y1="450" x2="586" y2="440" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1080ce" />
            <stop offset="40%" stopColor="#15b7e6" />
            <stop offset="80%" stopColor="#183ead" />
            <stop offset="100%" stopColor="#183ead" />
          </linearGradient>
        </defs>

        {/* TOP BACKGROUND ARCH */}
        <path d="M 256 107 Q 512 73.2 768 107 L 768 226 Q 512 126 256 226 Z" fill="url(#logoTopArchGrad)" />

        {/* TIER 1 */}
        <g id="logo-tier-1">
          <polygon points="256,227 416,182 522,288" fill="#173fb0" />
          <polygon points="256,107 256,227 416,182" fill="url(#logoCyanGrad1)" />
          <polygon points="416,182 522,288 606,277 674,260 674,257" fill="url(#logoCyanGrad2)" />
          <polygon points="674,257 674,340 566,302 606,277 674,260" fill="#06e5f7" />
          <polygon points="522,288 606,277 674,260 674,274 566,302" fill="url(#logoGlowFold1)" opacity="0.92" />
          <polygon points="522,288 606,277 674,260 674,264 606,280 522,291" fill="#ffffff" opacity="0.95" />
          <polygon points="256,107 416,182 674,257 674,261 416,186.5 256,112.5" fill="#ffffff" />
        </g>

        {/* TIER 2 */}
        <g id="logo-tier-2">
          <polygon points="566,302 674,340 492,352" fill="#193daf" />
          <polygon points="522,288 606,277 566,302 492,352 385,309" fill="url(#logoT2Grad)" />
        </g>

        {/* TIER 3 */}
        <g id="logo-tier-3">
          <polygon points="385,383 492,352 491,425" fill="#184db7" />
          <polygon points="385,309 385,383 492,352" fill="url(#logoCyanGrad3)" />
          <polygon points="492,352 491,425 546,405 586,386" fill="#09d3e9" />
          <polygon points="586,386 586,440 536,414 491,425 546,405" fill="#10dcf7" />
          <polygon points="491,425 546,405 586,386 586,400 536,414" fill="url(#logoGlowFold2)" opacity="0.92" />
          <polygon points="491,425 546,405 586,386 586,389.5 546,408 491,428" fill="#ffffff" opacity="0.95" />
          <polygon points="385,309 492,352 586,386 586,389.5 492,356 385,313.5" fill="#ffffff" />
        </g>

        {/* TIER 4 */}
        <g id="logo-tier-4">
          <polygon points="586,440 498,469 491,425" fill="#183ead" />
          <polygon points="491,425 498,469 461,437" fill="url(#logoT4Grad)" />
        </g>

        {/* TIER 5 */}
        <g id="logo-tier-5">
          <polygon points="461,437 461,481 482,460" fill="#0bd3f4" />
          <polygon points="461,481 482,460 498,469" fill="#183ead" />
          <polygon points="461,437.5 461,441.5 485,459.5 517,481 485,458" fill="#ffffff" />
        </g>
      </svg>

      {withText && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`tracking-tight text-ink ${textClassName}`}>StageSight 3D</span>
          {badge && (
            <span className="tag tag-outline">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
