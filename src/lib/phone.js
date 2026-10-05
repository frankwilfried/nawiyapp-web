/** +237690123456 → « +237 6 90 12 34 56 » (laisse les autres formats tels quels). */
export const prettyPhone = (p) => (p ? String(p).replace(/^\+237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '+237 $1 $2 $3 $4 $5') : p);
