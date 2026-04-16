// Clinical Filter Taxonomy Data Structure
export interface TreatmentService {
  id: string;
  name: string;
}

export interface ClinicalDiscipline {
  id: string;
  name: string;
  treatmentServices: TreatmentService[];
}

export interface ClinicalSection {
  id: string;
  name: string;
  shortName: string;
  clinicalDisciplines: ClinicalDiscipline[];
}

export const filterTaxonomy: ClinicalSection[] = [
  {
    id: "om",
    name: "Oral Medicine",
    shortName: "OM",
    clinicalDisciplines: [
      {
        id: "om-od",
        name: "Oral Diagnosis",
        treatmentServices: [
          { id: "om-od-1", name: "Oral Diagnosis" },
          { id: "om-od-2", name: "Special Case" },
        ],
      },
      {
        id: "om-os",
        name: "Oral Surgery",
        treatmentServices: [
          { id: "om-os-1", name: "Extraction" },
          { id: "om-os-2", name: "Flap Surgery" },
          { id: "om-os-3", name: "Odontectomy" },
        ],
      },
      {
        id: "om-perio",
        name: "Periodontics",
        treatmentServices: [
          { id: "om-perio-1", name: "Scaling & Polishing" },
          { id: "om-perio-2", name: "Scaling & Polishing Recall" },
          { id: "om-perio-3", name: "Non-Surgical Root Planing" },
          { id: "om-perio-4", name: "Non-Surgical Root Planing Recall" },
        ],
      },
      {
        id: "om-endo",
        name: "Endodontics",
        treatmentServices: [
          { id: "om-endo-1", name: "Root Canal Treatment" },
        ],
      },
    ],
  },
  {
    id: "op",
    name: "Operative Dentistry",
    shortName: "OP",
    clinicalDisciplines: [
      {
        id: "op-resto",
        name: "Restorative Dentistry",
        treatmentServices: [
          { id: "op-resto-1", name: "Pit & Fissure Sealant" },
          { id: "op-resto-2", name: "Composite Restoration" },
          { id: "op-resto-3", name: "Glass Ionomer Restoration" },
          { id: "op-resto-4", name: "Direct Onlay" },
          { id: "op-resto-5", name: "Indirect Onlay" },
        ],
      },
      {
        id: "op-fpd",
        name: "Fixed Partial Dentures",
        treatmentServices: [
          { id: "op-fpd-1", name: "Crown" },
          { id: "op-fpd-2", name: "Bridge" },
          { id: "op-fpd-3", name: "Post & Core Crown" },
          { id: "op-fpd-4", name: "Post & Core Bridge" },
        ],
      },
      {
        id: "op-pedo",
        name: "Pediatric Dentistry",
        treatmentServices: [
          { id: "op-pedo-1", name: "Scaling & Polishing + Topical Fluoride Application" },
          { id: "op-pedo-2", name: "Pedo Pit & Fissure Sealant" },
          { id: "op-pedo-3", name: "Pedo Extraction" },
          { id: "op-pedo-4", name: "Pedo Restoration" },
          { id: "op-pedo-5", name: "Pedo Pulp Therapy" },
          { id: "op-pedo-6", name: "Space Maintainer" },
        ],
      },
      {
        id: "op-ug-ortho",
        name: "Undergraduate Orthodontics",
        treatmentServices: [
          { id: "op-ug-ortho-1", name: "Preventive Orthodontics" },
          { id: "op-ug-ortho-2", name: "Interceptive Orthodontics" },
        ],
      },
    ],
  },
  {
    id: "prostho",
    name: "Prosthodontics",
    shortName: "Prostho",
    clinicalDisciplines: [
      {
        id: "prostho-direct",
        name: "Prosthodontics",
        treatmentServices: [
          { id: "prostho-rpd", name: "Removable Partial Dentures - Removable Partial Dentures" },
          { id: "prostho-sd", name: "Single Partial Denture - Removable Partial Denture" },
          { id: "prostho-cd", name: "Complete Dentures" },
        ],
      },
    ],
  },
  {
    id: "ortho",
    name: "Postgraduate Orthodontics",
    shortName: "Ortho",
    clinicalDisciplines: [
      {
        id: "ortho-corrective",
        name: "Corrective Orthodontics",
        treatmentServices: [],
      },
    ],
  },
  {
    id: "any",
    name: "Any Clinical Section",
    shortName: "Any",
    clinicalDisciplines: [
      {
        id: "any-others",
        name: "Others",
        treatmentServices: [],
      },
    ],
  },
];
