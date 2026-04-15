/**
 * PixelAvatar - shared pixel art avatar SVG used across bot cards and panels.
 */

interface Props {
  color: string
  size?: number
}

export default function PixelAvatar({ color, size = 20 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x="3" y="0" width="4" height="3" fill={color} />
      <rect x="2" y="3" width="6" height="4" fill={color} />
      <rect x="2" y="7" width="2" height="3" fill={color} />
      <rect x="6" y="7" width="2" height="3" fill={color} />
    </svg>
  )
}
