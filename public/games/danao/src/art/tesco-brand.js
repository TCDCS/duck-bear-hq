const TESCO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 310">
  <rect width="1000" height="310" rx="22" fill="#ffffff"/>
  <text x="500" y="190" text-anchor="middle"
        font-family="Arial Black,Arial,sans-serif" font-size="190" font-weight="900"
        letter-spacing="8" fill="#ee1c25">TESCO</text>
  <g fill="#00539f">
    <path d="M100 230h130l-32 28H68z"/>
    <path d="M270 230h130l-32 28H238z"/>
    <path d="M440 230h130l-32 28H408z"/>
    <path d="M610 230h130l-32 28H578z"/>
    <path d="M780 230h130l-32 28H748z"/>
  </g>
</svg>`.trim();

export const TESCO_LOGO_DATA_URI =
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(TESCO_SVG);

export const TESCO_RED = '#ee1c25';
export const TESCO_BLUE = '#00539f';
