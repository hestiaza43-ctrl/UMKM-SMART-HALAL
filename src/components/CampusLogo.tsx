export function CampusLogo({className = 'w-10 h-10'}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#FFFFFF" />
      <path
        d="M32 8L52 16V30C52 42.7 43.5 53.6 32 57C20.5 53.6 12 42.7 12 30V16L32 8Z"
        fill="#075C3B"
      />
      <path
        d="M32 12.5L47.5 18.8V30C47.5 40.3 40.7 49.2 32 52.3C23.3 49.2 16.5 40.3 16.5 30V18.8L32 12.5Z"
        fill="#168B50"
      />
      <path
        d="M23 24H41V27.5H23V24ZM25 30H39V39.5C39 41.4 35.9 43.2 32 44.5C28.1 43.2 25 41.4 25 39.5V30Z"
        fill="#FFFFFF"
        opacity="0.2"
      />
      <path
        d="M24.5 32.5L29.5 37.5L40 26.5"
        stroke="#FFFFFF"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HalalSealIcon({
  className = 'w-10 h-10',
  fill = '#FFFFFF',
  checkColor = '#168B50',
}: {
  className?: string;
  fill?: string;
  checkColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 3L28.8 6.4L34.7 5.9L36.9 11.4L42.3 13.7L41.8 19.6L45.2 24.4L41.8 29.2L42.3 35.1L36.9 37.4L34.7 42.9L28.8 42.4L24 45.8L19.2 42.4L13.3 42.9L11.1 37.4L5.7 35.1L6.2 29.2L2.8 24.4L6.2 19.6L5.7 13.7L11.1 11.4L13.3 5.9L19.2 6.4L24 3Z"
        fill={fill}
      />
      <path
        d="M16.5 24.5L21.5 29.5L32 19"
        stroke={checkColor}
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
