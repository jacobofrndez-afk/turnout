// English copy for the original Paris demo offers. Never translate live event names.
export const DEMO_OFFER_COPY = [
  { id: "o_q12_apero", before: { title: "Apéro d'avant-concert", description: "Planche charcuterie-fromage et deux verres de vin", price: "24 €" }, after: { title: "Wine & sharing board", description: "Charcuterie and cheese board with two glasses of wine", price: "24 €" } },
  { id: "o_q12_biere", before: { title: "Bières artisanales d'Île-de-France", description: "Trois brasseries franciliennes en pression", price: "7 €" }, after: { title: "Local craft beers", description: "Three breweries from the Paris region on tap", price: "7 €" } },
  { id: "o_q12_cocktail", before: { title: "Cocktail signature", description: "Spritz maison et cocktails sans alcool", price: "9 €" }, after: { title: "Signature cocktail", description: "House spritz and alcohol-free cocktails", price: "9 €" } },
  { id: "o_q12_tardif", before: { title: "Croque de minuit", description: "Croque-monsieur et frites jusqu'à 1 h", price: "12 €" }, after: { title: "Midnight croque-monsieur", description: "Croque-monsieur and fries served until 1 am", price: "12 €" } },
  { id: "o_q12_match", before: { title: "Soirée match", description: "Écran géant, pichets de bière, cacahuètes offertes", price: "18 € le pichet" }, after: { title: "Game night", description: "Big screen, beer pitchers and complimentary peanuts", price: "18 € per pitcher" } },
];

// Remove event assumptions from unchanged demo menu names, never from owner edits or saved campaigns.
export const DEMO_NEUTRAL_TITLES = [
  {merchantId:"m_penn_pour",offerId:"o_pp_happy",before:"Pre-show happy hour",after:"Happy hour for two"},
  {merchantId:"m_penn_pour",offerId:"o_pp_late",before:"After-show late plate",after:"Late-night burger & fries"},
  {merchantId:"m_quai_bercy",offerId:"o_q12_apero",before:"Pre-show aperitif",after:"Wine & sharing board"},
];
