export type ServiceType =
  | "hvac"
  | "pool"
  | "lawn"
  | "plumbing"
  | "roofing"
  | "electrical"
  | "general";

export interface QuoteFormData {
  serviceType: ServiceType | "";
  propertyAddress: string;
  squareFootage: string;
  stories: "1" | "2" | "3+" | "";
  yearBuilt: string;
  zipCode: string;
  jobDescription: string;
  photos: File[];
}

export type AutoFilledPropertyField =
  | "squareFootage"
  | "stories"
  | "yearBuilt"
  | "zipCode";

export interface ServiceOption {
  id: ServiceType;
  label: string;
  description: string;
  swflNote?: string;
}

export const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: "hvac",
    label: "HVAC",
    description: "AC, heating, ductwork",
    swflNote: "Humidity & salt air wear",
  },
  {
    id: "pool",
    label: "Pool",
    description: "Service, repair, equipment",
    swflNote: "#1 in Cape Coral",
  },
  {
    id: "lawn",
    label: "Lawn",
    description: "Landscaping, irrigation",
    swflNote: "Sandy soil & irrigation",
  },
  {
    id: "plumbing",
    label: "Plumbing",
    description: "Pipes, fixtures, water heaters",
    swflNote: "Hard water & slab leaks",
  },
  {
    id: "roofing",
    label: "Roofing",
    description: "Repair, replacement, inspection",
    swflNote: "Hurricane-rated systems",
  },
  {
    id: "electrical",
    label: "Electrical",
    description: "Panels, wiring, generators",
    swflNote: "Older 100A panels common",
  },
  {
    id: "general",
    label: "Other",
    description: "Handyman, pest, more",
  },
];

export const STORY_OPTIONS = [
  { value: "1" as const, label: "1 Story" },
  { value: "2" as const, label: "2 Stories" },
  { value: "3+" as const, label: "3+ Stories" },
];

export const INITIAL_FORM_DATA: QuoteFormData = {
  serviceType: "",
  propertyAddress: "",
  squareFootage: "",
  stories: "",
  yearBuilt: "",
  zipCode: "",
  jobDescription: "",
  photos: [],
};