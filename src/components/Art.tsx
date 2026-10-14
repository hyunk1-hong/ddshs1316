import type { Field } from '../../shared/types';
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 520 340" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id="hero-liquid"
          x1="240"
          y1="150"
          x2="360"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a7ca79" />
          <stop offset="1" stopColor="#6da97a" />
        </linearGradient>
        <linearGradient id="hero-glass" x1="270" y1="80" x2="420" y2="300">
          <stop stopColor="white" stopOpacity=".8" />
          <stop offset="1" stopColor="white" stopOpacity=".15" />
        </linearGradient>
      </defs>
      <circle cx="316" cy="178" r="135" fill="#d8e6d2" />
      <circle cx="316" cy="178" r="151" stroke="#bad0b4" strokeDasharray="3 8" />
      <ellipse cx="305" cy="297" rx="156" ry="14" fill="#b5c9ae" opacity=".3" />
      <g transform="rotate(-12 190 203)">
        <rect x="105" y="105" width="154" height="199" rx="12" fill="#83a594" />
        <rect
          x="111"
          y="99"
          width="154"
          height="199"
          rx="12"
          fill="#fafbf3"
          stroke="#83a594"
          strokeWidth="2"
        />
        <path
          d="M135 137h101M135 165h81M135 179h101M135 193h96M135 242h46"
          stroke="#c8d6bd"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M139 221l15-13 18 8 20-30 22 11 20-28"
          stroke="#e9a664"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="167" y="87" width="46" height="21" rx="5" fill="#285f47" />
        <circle cx="249" cy="264" r="18" fill="#e6eddc" />
        <path d="m241 264 6 6 12-13" stroke="#3a7654" strokeWidth="3" />
      </g>
      <path
        d="M298 79h68m-56 0v82l-66 104c-11 17-1 32 18 32h142c20 0 30-15 18-32l-67-104V79"
        fill="url(#hero-glass)"
        stroke="#396d58"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m277 214-31 53c-7 11-1 21 16 21h141c16 0 22-10 15-21l-31-53c-19-10-40 8-56 0s-35-9-54 0Z"
        fill="url(#hero-liquid)"
      />
      <path d="M313 110v47m-3 12-24 40" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <path d="M341 123h13m-13 17h13m-13 17h13m-13 17h13" stroke="#396d58" strokeWidth="2" />
      <circle cx="297" cy="248" r="7" fill="#dcecc3" />
      <circle cx="355" cy="263" r="10" fill="#c8dfac" />
      <circle cx="333" cy="234" r="5" fill="#dcecc3" />
      <circle cx="324" cy="191" r="4" fill="#8ab482" />
      <circle cx="338" cy="165" r="5" fill="#8ab482" />
      <g transform="translate(382 82)">
        <circle r="33" fill="#fafcf2" />
        <ellipse rx="26" ry="10" transform="rotate(35)" stroke="#a0b79b" strokeWidth="2" />
        <ellipse rx="26" ry="10" transform="rotate(-35)" stroke="#a0b79b" strokeWidth="2" />
        <circle r="5" fill="#e5a05e" />
      </g>
      <path
        d="M117 55v17m-8-8h17M442 221v17m-8-8h17"
        stroke="#7d9b79"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="167" cy="49" r="4" fill="#e7aa6c" />
      <circle cx="439" cy="164" r="4" fill="#e7aa6c" />
      <g transform="rotate(12 400 275)">
        <rect x="394" y="220" width="11" height="90" rx="5" fill="#e6a868" />
        <path d="m394 304 5 15 6-15" fill="#eedbcc" />
        <path d="m397 313 2 6 3-6" fill="#47614b" />
      </g>
    </svg>
  );
}
export function ExperimentArt({ field, id }: { field: Field; id: string }) {
  const prefix = `art-${id}`;
  return (
    <svg
      viewBox="0 0 400 230"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`experiment-art ${field}`}
    >
      <defs>
        <linearGradient id={prefix} x2="1" y2="1">
          <stop
            stopColor={
              field === 'chemistry'
                ? '#e6e0ee'
                : field === 'physics'
                  ? '#e5ebec'
                  : field === 'biology'
                    ? '#e4ebdb'
                    : '#e0e9ea'
            }
          />
          <stop
            offset="1"
            stopColor={
              field === 'chemistry'
                ? '#d6cbe3'
                : field === 'physics'
                  ? '#cedde1'
                  : field === 'biology'
                    ? '#cadbc1'
                    : '#cbdde2'
            }
          />
        </linearGradient>
      </defs>
      <rect width="400" height="230" fill={`url(#${prefix})`} />
      <circle cx="200" cy="115" r="85" fill="white" opacity=".22" />
      <ellipse cx="201" cy="197" rx="124" ry="9" fill="#486253" opacity=".1" />
      {field === 'chemistry' ? (
        <>
          <path
            d="M91 93h73l-8 101h-57Z"
            fill="#faf8fd"
            fillOpacity=".65"
            stroke="#8e7b9d"
            strokeWidth="2"
          />
          <path d="m95 135 4 58h57l5-58Z" fill="#c598bf" />
          <path
            d="M165 77h73l-8 117h-57Z"
            fill="#faf8fd"
            fillOpacity=".6"
            stroke="#8e7b9d"
            strokeWidth="2"
          />
          <path d="m169 122 4 71h57l5-71Z" fill="#afbdd6" />
          <path
            d="M239 105h73l-8 89h-57Z"
            fill="#faf8fd"
            fillOpacity=".6"
            stroke="#8e7b9d"
            strokeWidth="2"
          />
          <path d="m243 148 4 45h57l4-45Z" fill="#a5c5a6" />
          <path d="M188 55c-24-17-11-39 7-22 0-25 31-17 22 6 24-10 37 14 10 26Z" fill="#87668f" />
          <path d="m201 63 6 39" stroke="#88719a" strokeWidth="4" />
          <path
            d="M106 102v25m74-40v25m74 4v21"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      ) : field === 'physics' ? (
        <>
          <path
            d="M85 194h233M103 190V49h186v145M96 49h201"
            fill="none"
            stroke="#577384"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path d="m143 49 4 108m95-108-31 119" stroke="#668091" strokeWidth="2" />
          <circle cx="147" cy="165" r="17" fill="#e0a86e" />
          <circle cx="208" cy="181" r="19" fill="#789997" />
          <path d="M185 162a84 84 0 0 0 46 7" fill="none" stroke="#94a9b2" strokeDasharray="4 5" />
          <circle cx="306" cy="88" r="25" fill="#f4f6f0" />
          <path d="M306 71v18l10 6" stroke="#6e8997" strokeWidth="2" fill="none" />
          <circle cx="306" cy="88" r="2" fill="#6e8997" />
        </>
      ) : field === 'biology' ? (
        <>
          <path d="M127 131h146l-14 63H140Z" fill="#e6c19a" />
          <path d="M144 145h112l-8 39h-97Z" fill="#cea777" />
          <path
            d="M200 135V61m0 51-33-27m33 15 37-28"
            stroke="#62855d"
            strokeWidth="4"
            fill="none"
          />
          <path d="M198 83c-27-4-51-28-39-49 25 1 42 23 39 49Z" fill="#86a677" />
          <path d="M203 73c1-28 24-48 45-37-2 25-22 41-45 37Z" fill="#638d61" />
          <path d="M166 105c-24 1-41-13-41-33 25-3 42 12 41 33Z" fill="#a2b991" />
          <path d="M211 119c20 3 45-12 45-33-26-2-45 12-45 33Z" fill="#91ae7d" />
          <path
            d="M197 137q-6 25-29 36m33-36 27 38m-27-27-2 34"
            stroke="#896d4e"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="102" cy="67" r="16" fill="#e9c68f" />
          <path d="M97 64h10m-5-5v10" stroke="#b59056" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M62 193 140 94l58 77 60-95 83 117Z" fill="#a0b8a0" />
          <path d="m108 135 32-41 31 41-18-7-13 11-15-9Z" fill="#edf3e7" />
          <path d="m228 123 30-47 37 48-18-6-19 12-14-16Z" fill="#eff4ee" />
          <path d="M53 185q70-16 114 1t185-1v22H53Z" fill="#7fadb9" />
          <path
            d="M143 178q38-46 74-42t-2 25q-30 20 27 30"
            fill="none"
            stroke="#7fadb9"
            strokeWidth="13"
          />
          <circle cx="104" cy="62" r="18" fill="#eac38e" />
          <path
            d="M242 41c-12-17-37-8-35 8-19-3-27 24-6 29h89c20-4 14-29-4-26-3-24-34-30-44-11Z"
            fill="#f7faf5"
          />
        </>
      )}
      <circle cx="333" cy="37" r="3" fill="white" />
      <path d="M67 106v12m-6-6h12" stroke="white" strokeWidth="2" opacity=".8" />
    </svg>
  );
}
