import type { Locale } from "./i18n-config";

export type PlaceCategory = "airport" | "station" | "district" | "landmark";

export interface Place {
  id: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  name: Record<Locale, string>;
  /** Short descriptor, e.g. the nearest metro station. */
  hint: Record<Locale, string>;
}

/**
 * Popular pickup and drop-off points across Montreal and the surrounding
 * region. Coordinates are approximate and used for fare estimation and the
 * illustrative trip map.
 */
export const PLACES: Place[] = [
  {
    id: "yul",
    category: "airport",
    lat: 45.4706,
    lng: -73.7408,
    name: { en: "Trudeau Airport (YUL)", fr: "Aéroport Trudeau (YUL)" },
    hint: { en: "Dorval · Arrivals level", fr: "Dorval · Niveau arrivées" },
  },
  {
    id: "downtown",
    category: "district",
    lat: 45.5017,
    lng: -73.5673,
    name: { en: "Downtown (René-Lévesque)", fr: "Centre-ville (René-Lévesque)" },
    hint: { en: "McGill metro", fr: "Métro McGill" },
  },
  {
    id: "old-montreal",
    category: "district",
    lat: 45.5075,
    lng: -73.5541,
    name: { en: "Old Montreal", fr: "Vieux-Montréal" },
    hint: { en: "Place Jacques-Cartier", fr: "Place Jacques-Cartier" },
  },
  {
    id: "old-port",
    category: "landmark",
    lat: 45.5088,
    lng: -73.546,
    name: { en: "Old Port", fr: "Vieux-Port" },
    hint: { en: "Quai de l'Horloge", fr: "Quai de l'Horloge" },
  },
  {
    id: "plateau",
    category: "district",
    lat: 45.5231,
    lng: -73.5807,
    name: { en: "Le Plateau", fr: "Le Plateau" },
    hint: { en: "Mont-Royal & Saint-Laurent", fr: "Mont-Royal & Saint-Laurent" },
  },
  {
    id: "mile-end",
    category: "district",
    lat: 45.5234,
    lng: -73.6025,
    name: { en: "Mile End", fr: "Mile End" },
    hint: { en: "Laurier metro", fr: "Métro Laurier" },
  },
  {
    id: "mount-royal",
    category: "landmark",
    lat: 45.5074,
    lng: -73.5867,
    name: { en: "Mount Royal Lookout", fr: "Belvédère du Mont-Royal" },
    hint: { en: "Chemin Olmsted", fr: "Chemin Olmsted" },
  },
  {
    id: "mcgill",
    category: "landmark",
    lat: 45.504,
    lng: -73.577,
    name: { en: "McGill University", fr: "Université McGill" },
    hint: { en: "McGill metro", fr: "Métro McGill" },
  },
  {
    id: "concordia",
    category: "landmark",
    lat: 45.496,
    lng: -73.571,
    name: { en: "Concordia University", fr: "Université Concordia" },
    hint: { en: "Guy-Concordia metro", fr: "Métro Guy-Concordia" },
  },
  {
    id: "bell-centre",
    category: "landmark",
    lat: 45.4961,
    lng: -73.5694,
    name: { en: "Bell Centre", fr: "Centre Bell" },
    hint: { en: "Bonaventure metro", fr: "Métro Bonaventure" },
  },
  {
    id: "palais-congres",
    category: "landmark",
    lat: 45.5028,
    lng: -73.555,
    name: { en: "Palais des congrès", fr: "Palais des congrès" },
    hint: { en: "Place-d'Armes metro", fr: "Métro Place-d'Armes" },
  },
  {
    id: "gare-centrale",
    category: "station",
    lat: 45.4995,
    lng: -73.5665,
    name: { en: "Central Station", fr: "Gare Centrale" },
    hint: { en: "VIA Rail & Exo trains", fr: "Trains VIA Rail & Exo" },
  },
  {
    id: "berri-uqam",
    category: "station",
    lat: 45.5153,
    lng: -73.561,
    name: { en: "Berri-UQAM", fr: "Berri-UQAM" },
    hint: { en: "Green, Orange & Blue lines", fr: "Lignes verte, orange et bleue" },
  },
  {
    id: "jean-talon",
    category: "landmark",
    lat: 45.5363,
    lng: -73.6134,
    name: { en: "Jean-Talon Market", fr: "Marché Jean-Talon" },
    hint: { en: "Jean-Talon metro", fr: "Métro Jean-Talon" },
  },
  {
    id: "little-italy",
    category: "district",
    lat: 45.5372,
    lng: -73.6173,
    name: { en: "Little Italy", fr: "Petite-Italie" },
    hint: { en: "Jean-Talon & Casgrain", fr: "Jean-Talon & Casgrain" },
  },
  {
    id: "lionel-groulx",
    category: "station",
    lat: 45.4823,
    lng: -73.5797,
    name: { en: "Lionel-Groulx", fr: "Lionel-Groulx" },
    hint: { en: "Orange & Green lines", fr: "Lignes orange et verte" },
  },
  {
    id: "griffintown",
    category: "district",
    lat: 45.489,
    lng: -73.556,
    name: { en: "Griffintown", fr: "Griffintown" },
    hint: { en: "Quays of the Old Port", fr: "Quais du Vieux-Port" },
  },
  {
    id: "verdun",
    category: "district",
    lat: 45.4541,
    lng: -73.5664,
    name: { en: "Verdun", fr: "Verdun" },
    hint: { en: "De l'Église metro", fr: "Métro De l'Église" },
  },
  {
    id: "hochelaga",
    category: "district",
    lat: 45.554,
    lng: -73.536,
    name: { en: "Hochelaga-Maisonneuve", fr: "Hochelaga-Maisonneuve" },
    hint: { en: "Pie-IX metro", fr: "Métro Pie-IX" },
  },
  {
    id: "parc-jean-drapeau",
    category: "landmark",
    lat: 45.513,
    lng: -73.53,
    name: { en: "Parc Jean-Drapeau", fr: "Parc Jean-Drapeau" },
    hint: { en: "Sainte-Hélène Island", fr: "Île Sainte-Hélène" },
  },
  {
    id: "angrignon",
    category: "station",
    lat: 45.4465,
    lng: -73.6037,
    name: { en: "Angrignon", fr: "Angrignon" },
    hint: { en: "Green line · Parc Angrignon", fr: "Ligne verte · Parc Angrignon" },
  },
  {
    id: "lasalle",
    category: "district",
    lat: 45.4265,
    lng: -73.605,
    name: { en: "LaSalle", fr: "LaSalle" },
    hint: { en: "De L'Église & Lapierre", fr: "De L'Église & Lapierre" },
  },
  {
    id: "laval-centre",
    category: "district",
    lat: 45.5567,
    lng: -73.7519,
    name: { en: "Laval Centre", fr: "Centre de Laval" },
    hint: { en: "Montmorency metro", fr: "Métro Montmorency" },
  },
  {
    id: "dix30",
    category: "landmark",
    lat: 45.454,
    lng: -73.456,
    name: { en: "Quartier DIX30 (Brossard)", fr: "Quartier DIX30 (Brossard)" },
    hint: { en: "South Shore", fr: "Rive-Sud" },
  },
];

const byId = new Map(PLACES.map((place) => [place.id, place]));

export function getPlace(id: string): Place | undefined {
  return byId.get(id);
}

export function placeName(place: Place, locale: Locale): string {
  return place.name[locale];
}

export function categoryPlaces(category: PlaceCategory): Place[] {
  return PLACES.filter((place) => place.category === category);
}
