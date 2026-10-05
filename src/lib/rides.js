// Affichage des courses du passager (historique, reçus)
export const RIDE_STATUS = {
  completed: 'Terminée', cancelled: 'Annulée', pending: 'En recherche', accepted: 'Chauffeur en route', in_progress: 'En cours',
};
export const rideDate = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const rideTotal = (r) => (r.status === 'cancelled'
  ? r.cancellation_fee
  : (r.final_price || r.proposed_price) + (r.fee_included || 0) + (r.tip_fcfa || 0));
