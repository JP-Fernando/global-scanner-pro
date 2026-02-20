export const SECTOR_TAXONOMY = [
  // -------------------------------------------------------------------------
  // 1. ENERGY (Energía)
  // -------------------------------------------------------------------------
  {
    sectorId: 100,
    name: "Energy",
    // Mappings: Captura petróleo, gas, renovables y servicios energéticos
    mappings: ["energy", "oil & gas", "oil", "gas", "coal", "fuels", "energy equipment", "consumable fuels"],
    industries: [
      { industryId: 110, name: "Energy Equipment & Services" },
      { industryId: 120, name: "Oil, Gas & Consumable Fuels" }
    ]
  },

  // -------------------------------------------------------------------------
  // 2. MATERIALS (Materiales Básicos)
  // -------------------------------------------------------------------------
  {
    sectorId: 200,
    name: "Materials",
    // Mappings: Yahoo suele usar "Basic Materials". Incluimos minería, químicos y metales.
    mappings: ["basic materials", "materials", "chemicals", "mining", "metals", "steel", "gold", "aluminum", "construction materials", "packaging"],
    industries: [
      { industryId: 210, name: "Chemicals" },
      { industryId: 220, name: "Construction Materials" },
      { industryId: 230, name: "Metals & Mining" },
      { industryId: 240, name: "Containers & Packaging" }
    ]
  },

  // -------------------------------------------------------------------------
  // 3. INDUSTRIALS (Industria)
  // -------------------------------------------------------------------------
  {
    sectorId: 300,
    name: "Industrials",
    // Mappings: Muy amplio. Incluye defensa, aerolíneas, construcción y maquinaria.
    mappings: ["industrials", "industrial goods", "aerospace", "defense", "transportation", "airlines", "machinery", "construction", "commercial services", "freight", "logistics"],
    industries: [
      { industryId: 310, name: "Aerospace & Defense" },
      { industryId: 320, name: "Building Products" },
      { industryId: 330, name: "Commercial Services" },
      { industryId: 340, name: "Machinery" },
      { industryId: 350, name: "Transportation (Airlines/Rail/Marine)" }
    ]
  },

  // -------------------------------------------------------------------------
  // 4. CONSUMER DISCRETIONARY (Consumo Cíclico / Discrecional)
  // -------------------------------------------------------------------------
  {
    sectorId: 400,
    name: "Consumer Discretionary",
    // CRÍTICO: Yahoo usa "Consumer Cyclical". Incluye autos, lujo, hoteles y retail no esencial.
    mappings: ["consumer discretionary", "consumer cyclical", "automotive", "automobiles", "luxury", "hotels", "restaurants", "leisure", "textiles", "apparel", "retail - discretionary"],
    industries: [
      { industryId: 410, name: "Automobiles & Components" },
      { industryId: 420, name: "Consumer Durables & Apparel" },
      { industryId: 430, name: "Hotels, Restaurants & Leisure" },
      { industryId: 440, name: "Retailing (Amazon/Alibaba type)" }
    ]
  },

  // -------------------------------------------------------------------------
  // 5. CONSUMER STAPLES (Consumo Defensivo / Básico)
  // -------------------------------------------------------------------------
  {
    sectorId: 500,
    name: "Consumer Staples",
    // CRÍTICO: Yahoo usa "Consumer Defensive". Comida, bebida, tabaco, productos hogar.
    mappings: ["consumer staples", "consumer defensive", "food", "beverages", "tobacco", "household", "personal products", "supermarkets", "hypermarkets"],
    industries: [
      { industryId: 510, name: "Beverages" },
      { industryId: 520, name: "Food Products" },
      { industryId: 530, name: "Tobacco" },
      { industryId: 540, name: "Household & Personal Products" }
    ]
  },

  // -------------------------------------------------------------------------
  // 6. HEALTH CARE (Salud)
  // -------------------------------------------------------------------------
  {
    sectorId: 600,
    name: "Health Care",
    // Mappings: Farmacéuticas, biotecnología y equipos médicos.
    mappings: ["health care", "healthcare", "biotechnology", "biotech", "pharmaceuticals", "pharma", "medical devices", "life sciences"],
    industries: [
      { industryId: 610, name: "Health Care Equipment & Supplies" },
      { industryId: 620, name: "Health Care Providers & Services" },
      { industryId: 630, name: "Biotechnology" },
      { industryId: 640, name: "Pharmaceuticals" }
    ]
  },

  // -------------------------------------------------------------------------
  // 7. FINANCIALS (Financiero)
  // -------------------------------------------------------------------------
  {
    sectorId: 700,
    name: "Financials",
    // Mappings: Yahoo usa "Financial Services". Bancos, seguros, gestión de activos.
    mappings: ["financials", "financial services", "banking", "banks", "insurance", "capital markets", "asset management", "credit services", "investment banking"],
    industries: [
      { industryId: 710, name: "Banks" },
      { industryId: 720, name: "Capital Markets" },
      { industryId: 730, name: "Insurance" },
      { industryId: 740, name: "Diversified Financial Services" }
    ]
  },

  // -------------------------------------------------------------------------
  // 8. INFORMATION TECHNOLOGY (Tecnología)
  // -------------------------------------------------------------------------
  {
    sectorId: 800,
    name: "Information Technology",
    // Mappings: Software, hardware, chips.
    // OJO: Google/Meta NO suelen estar aquí (son Comm Services), pero Microsoft/Apple sí.
    mappings: ["information technology", "technology", "tech", "software", "hardware", "semiconductors", "semis", "it services", "electronic equipment"],
    industries: [
      { industryId: 810, name: "Software" },
      { industryId: 820, name: "Hardware, Storage & Peripherals" },
      { industryId: 830, name: "Semiconductors & Equipment" },
      { industryId: 840, name: "IT Services" }
    ]
  },

  // -------------------------------------------------------------------------
  // 9. COMMUNICATION SERVICES (Servicios de Comunicación)
  // -------------------------------------------------------------------------
  {
    sectorId: 900,
    name: "Communication Services",
    // Mappings: Antes "Telecom". Ahora incluye Google, Meta, Netflix, Disney.
    mappings: ["communication services", "telecommunication services", "telecom", "media", "entertainment", "interactive media", "wireless"],
    industries: [
      { industryId: 910, name: "Telecommunication Services" },
      { industryId: 920, name: "Media & Entertainment" },
      { industryId: 930, name: "Interactive Media & Services" }
    ]
  },

  // -------------------------------------------------------------------------
  // 10. UTILITIES (Servicios Públicos)
  // -------------------------------------------------------------------------
  {
    sectorId: 1000,
    name: "Utilities",
    // Mappings: Electricidad, agua, gas regulado.
    mappings: ["utilities", "electric utilities", "water utilities", "gas utilities", "independent power", "renewables"],
    industries: [
      { industryId: 1010, name: "Electric Utilities" },
      { industryId: 1020, name: "Gas Utilities" },
      { industryId: 1030, name: "Water Utilities" },
      { industryId: 1040, name: "Multi-Utilities" }
    ]
  },

  // -------------------------------------------------------------------------
  // 11. REAL ESTATE (Inmobiliario)
  // -------------------------------------------------------------------------
  {
    sectorId: 1100,
    name: "Real Estate",
    // Mappings: REITs (SOCIMIs) y promotoras.
    mappings: ["real estate", "reit", "equity real estate investment trusts", "real estate management"],
    industries: [
      { industryId: 1110, name: "Equity REITs" },
      { industryId: 1120, name: "Real Estate Management & Development" }
    ]
  }
];

/**
 * Normaliza el string del proveedor de datos a tu ID interno
 */
 export function getSectorId(providerString: string | null | undefined): number {
   if (!providerString) return 999;

   // 1. Limpieza: minúsculas, quitar espacios extra
   const normalized = providerString.trim().toLowerCase();

   // 2. Búsqueda exacta por nombre
   const exactMatch = SECTOR_TAXONOMY.find(s => s.name.toLowerCase() === normalized);
   if (exactMatch) return exactMatch.sectorId;

   // 3. Búsqueda por mappings (incluye coincidencias parciales)
   // Ejemplo: Si la API devuelve "Technology Services", encontrará "technology" en los mappings
   const mappingMatch = SECTOR_TAXONOMY.find(s =>
     s.mappings.some(m => normalized.includes(m))
   );

   return mappingMatch ? mappingMatch.sectorId : 999;
 }

/**
 * Calcula métricas agregadas del sector (para detectar anomalías relativas)
 * @param {Array} assets - Array completo de activos ya escaneados
 */
interface AssetForSectorStats {
  sectorId?: number;
  volume?: number;
  indicators?: { rsi?: number; [key: string]: unknown };
}

interface SectorStatEntry {
  volSum: number;
  rsiSum: number;
  count: number;
  avgVolume?: number;
  avgRsi?: number;
}

export function calculateSectorStats(
  assets: AssetForSectorStats[]
): Record<string, SectorStatEntry> {
  const sectorStats: Record<string, SectorStatEntry> = {};

  // 1. Agrupar y sumar
  assets.forEach(asset => {
    const sId = String(asset.sectorId || 999);
    if (!sectorStats[sId]) sectorStats[sId] = { volSum: 0, rsiSum: 0, count: 0 };

    sectorStats[sId].volSum += asset.volume || 0;
    sectorStats[sId].rsiSum += (asset.indicators?.rsi ?? 50);
    sectorStats[sId].count++;
  });

  // 2. Calcular promedios
  Object.keys(sectorStats).forEach(key => {
    const s = sectorStats[key];
    s.avgVolume = s.volSum / s.count;
    s.avgRsi = s.rsiSum / s.count;
  });

  return sectorStats;
}
