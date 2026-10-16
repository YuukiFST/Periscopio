import { shortTextLabelsPt } from "./pt-short-text-labels.ts";

type ValueLabels = Readonly<Record<string, string>>;

const overallRatingPt: ValueLabels = {
  FLAWLESS: "Impecável",
  TIER_0: "Tier 0",
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
  TIER_4: "Tier 4",
  UNRATED: "Sem nota",
};

const connectionPt: ValueLabels = {
  유선: "Com fio",
  무선: "Sem fio",
  유무선: "Com e sem fio",
};

const switchMechanismPt: ValueLabels = {
  광축: "Óptico",
  기계식: "Mecânico",
  멤브레인: "Membrana",
  무접점: "Capacitivo",
  자석축: "Magnético",
};

const noneConfirmedPt = "Não tem";

/**
 * Portuguese label per field key and raw EyeJoker value, for ENUM values and
 * for the repeated short texts in Korean. Fields whose values are proper names
 * or numbers (sensor, MCU, polling rate) have no entry: their `en` label reads
 * the same in Portuguese.
 */
export const valueLabelsPt: Readonly<Record<string, ValueLabels>> = {
  status: {
    unreleased: "Não lançado",
    proposed: "Sugerido",
    purchased: "Comprado",
    arrived: "Recebido",
    testing: "Em teste",
    earlyAccess: "Prévia",
    reviewed: "Publicado",
  },
  driverSupportStatus: {
    notAvailable: "Sem software oficial",
    notRequired: "Não precisa de software",
  },
  saleStatus: {
    unreleased: "Não lançado",
    FOR_SALE: "À venda",
    DISCONTINUED: "Descontinuado",
  },
  eyejokerRating: {
    ANTICIPATING: "Aguardado",
    HIGHLY_RECOMMENDED: "Muito recomendado",
    RECOMMENDED: "Recomendado",
    MILD_RECOMMENDATION: "Recomendação fraca",
    NO_RECOMMENDATION: "Não recomendado",
  },
  overallRatingMouse: overallRatingPt,
  overallRatingKeyboard: overallRatingPt,
  overallRatingMonitor: overallRatingPt,

  housingMouse: { 대칭: "Simétrico", 비대칭: "Assimétrico" },
  mouseConnection: connectionPt,
  mouseMaterial: {
    POLYMER: "Plástico",
    MAGNESIUM_ALLOY: "Liga de magnésio",
    ALUMINUM: "Alumínio",
    CARBON_FIBER: "Fibra de carbono",
    COMPOSITE: "Compósito",
    OTHER: "Outro",
  },
  holeBody: {
    yes: "Sim",
    no: "Não",
    yesBottom: "Só embaixo",
    yesModel: "Depende do modelo",
  },
  port: {
    usbTypeC: "USB-C",
    일체형: "Cabo fixo",
    microusb: "Micro USB",
    배터리: "Bateria",
    마그네틱: "Magnético",
  },
  sensorLodMode: { single: "Valor fixo", options: "Valores selecionáveis", range: "Faixa" },

  connectionType: connectionPt,
  keyboardLayout: {
    "60%": "60%",
    "65%": "65%",
    "75%": "75%",
    "96%": "96%",
    etc: "Outro",
    full: "Completo",
    tkl: "TKL",
  },
  keyboardMechanism: switchMechanismPt,
  measuredSwitchType: switchMechanismPt,
  profile: {
    cherryProfile: "Perfil Cherry",
    lowProfile: "Perfil baixo",
    oemProfile: "Perfil OEM",
  },
  led: { false: "Não", part: "Parcial", rgb: "RGB", true: "Sim" },
  housingKeyboard: {
    aluminum: "Alumínio",
    custom: "Personalizada",
    mixed: "Mista",
    other: "Outro",
    plastic: "Plástico",
  },
  mounting: {
    bottom: "Bottom mount",
    gasket: "Gasket",
    leafspring: "Leaf spring",
    oring: "O-ring",
    sandwitch: "Sanduíche",
    top: "Top mount",
    tray: "Tray mount",
  },
  connectionOption: {
    Battery: "Bateria",
    fixedCable: "Cabo fixo",
    ps2: "PS/2",
    usbMicroB: "Micro-USB",
    usbMiniB: "Mini-USB",
    usbTypeC: "USB-C",
  },
  keycap: {
    absDoubleShot: "ABS double-shot",
    pbtDoubleShot: "PBT double-shot",
    pbtDyeSub: "PBT dye-sub",
  },
  stabilizer: {
    cherryPcbMount: "Cherry, preso na placa",
    cherryPlateMount: "Cherry, preso na plate",
    cherryPlatePcbMount: "Cherry, preso na plate e na placa",
    hybridPlateMount: "Híbrido, preso na plate",
  },

  adaptiveSync: {
    gsync: "G-SYNC",
    freesync: "FreeSync",
    none: "Nenhuma",
    gsyncPulsar: "G-SYNC Pulsar",
    gsyncCompatible: "Compatível com G-SYNC",
    freeSyncPremiumPro: "FreeSync Premium Pro",
    freeSyncPremium: "FreeSync Premium",
    gSyncUltimate: "G-SYNC Ultimate",
    gsyncCompatibleVerify: "Compatível com G-SYNC (certificado)",
  },
  displayStreamCompression: {
    noneConfirmed: noneConfirmedPt,
    supported: "Suportado",
    requiredForMaxMode: "Necessário no modo máximo",
    modeDependent: "Depende do modo",
  },
  kvmType: {
    noneConfirmed: noneConfirmedPt,
    usbBPlusUsbC: "KVM USB-B + USB-C",
    dualUsbC: "KVM com dois USB-C",
    thunderboltKvm: "KVM Thunderbolt",
    manualUsbSwitch: "Troca manual de USB",
    unknownTopology: "KVM sem ligação confirmada",
  },
  audioReturnChannel: { arc: "ARC", earc: "eARC", noneConfirmed: noneConfirmedPt },
  multiViewSupport: { pbp: "PbP", pip: "PiP", quadPbp: "PbP em 4", noneConfirmed: noneConfirmedPt },
  localDimmingType: {
    globalDimming: "Escurecimento global",
    edgeLocalDimming: "Local dimming nas bordas",
    fald: "FALD",
    miniLed: "Mini LED",
  },
  standType: {
    included: "Suporte incluso",
    notIncluded: "Sem suporte",
    optional: "Suporte vendido à parte",
    armOnly: "Só braço articulado",
  },
  standAdjustments: {
    tilt: "Inclinação",
    height: "Altura",
    swivel: "Giro lateral",
    pivot: "Pivô",
    rotationBothWays: "Pivô nos dois sentidos",
    cableManagement: "Organizador de cabos",
  },
  vesaMountPattern: {
    noneConfirmed: noneConfirmedPt,
    vesa75x75: "75×75",
    vesa100x100: "100×100",
    vesa200x100: "200×100",
    vesa200x200: "200×200",
    adapterRequired: "Precisa de adaptador",
    custom: "Padrão próprio",
  },
  screenCoating: {
    glossy: "Brilhante",
    semiGlossy: "Semibrilhante",
    semiMatte: "Semifosco",
    matteAntiGlare: "Fosco antirreflexo",
    heavyMatteAntiGlare: "Fosco antirreflexo forte",
    etchedGlass: "Vidro gravado",
    antiReflection: "Antirreflexo",
    nonglare: "Antiofuscante",
  },
  vrrFlickerGrade: { none: "Quase nenhuma", minor: "Leve", moderate: "Moderada", severe: "Forte" },
  textClarityGrade: { excellent: "Excelente", good: "Boa", fair: "Regular", poor: "Ruim" },

  ...shortTextLabelsPt,
};
