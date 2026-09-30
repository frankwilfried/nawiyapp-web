// Icône et libellé associés au type de lieu (nœuds du graphe ou résultats Google)
const PLACE_ICONS = {
  quartier: 'home', marche: 'store', universite: 'school',
  carrefour: 'signpost', transport: 'bus',
};
export const placeIcon = (type) => PLACE_ICONS[type] || 'pin';

export const PLACE_TYPE_LABELS = {
  quartier: 'Quartier', marche: 'Marché', universite: 'Université',
  carrefour: 'Carrefour', transport: 'Gare / arrêt', lieu: 'Lieu', autre: 'Lieu',
};
