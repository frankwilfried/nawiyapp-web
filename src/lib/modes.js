// Modes de transport : libellé, icône et couleur (texte blanc lisible, contraste ≥ 4.5:1)
export const MODES = {
  taxi_collectif: { label: 'Taxi collectif', icon: 'users', color: '#0F7A5A' },
  moto_taxi:      { label: 'Moto-taxi',      icon: 'bike',  color: '#854F0B' },
  minibus:        { label: 'Minibus',        icon: 'bus',   color: '#185FA5' },
};

export const modeOf = (transport) => MODES[transport] || { label: 'Transport', icon: 'route', color: '#545454' };
