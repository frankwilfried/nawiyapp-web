/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nawiy: {
          green:  '#1D9E75', // tracés, accents décoratifs (pas de texte blanc dessus)
          600:    '#0F7A5A', // boutons et texte vert — contraste 5.3:1 avec le blanc
          dark:   '#0F3528',
          light:  '#E8F5EF',
        },
        // Palette neutre façon Uber pour les écrans de commande
        ink: {
          DEFAULT: '#000000',
          2:       '#545454', // texte secondaire — 7.6:1 sur blanc
          3:       '#6B6B6B', // texte tertiaire — 5.3:1 sur blanc
          fill:    '#EEEEEE', // fonds de champs et de lignes
          line:    '#E2E2E2', // séparateurs
        },
      },
      boxShadow: {
        float: '0 1px 2px rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15)',
        sheet: '0 -2px 10px rgba(0,0,0,.12)',
      },
    },
  },
  plugins: [],
}
