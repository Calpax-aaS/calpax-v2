import React from 'react'
import { Document, Image, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { calculerDevisMasse } from '@/lib/vol/devis-masse'
import { formatDateFr } from '@/lib/format'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FicheVolPassager = {
  prenom: string
  nom: string
  age: number | null
  poids: number
  pmr: boolean
  billetReference: string
}

export type FicheVolData = {
  exploitant: {
    name: string
    frDecNumber: string
    logoUrl: string | null
  }
  vol: {
    date: Date
    creneau: 'MATIN' | 'SOIR'
    lieuDecollage: string | null
    equipier: string | null
    vehicule: string | null
    configGaz: string | null
    qteGaz: number | null
    decoLieu: string | null
    decoHeure: Date | null
    atterLieu: string | null
    atterHeure: Date | null
    gasConso: number | null
    anomalies: string | null
  }
  ballon: {
    nom: string
    immatriculation: string
    volumeM3: number
    peseeAVide: number
    performanceChart: Record<string, number>
    configGaz: string
  }
  pilote: {
    prenom: string
    nom: string
    licenceBfcl: string
    poids: number
  }
  passagers: readonly FicheVolPassager[]
  temperatureCelsius: number
  isPve: boolean
  archivedAt: Date | null
  meteo?: {
    hours: {
      time: string
      wind10m: { speed: number; direction: number }
      wind80m: { speed: number; direction: number }
      wind120m: { speed: number; direction: number }
      wind180m: { speed: number; direction: number }
      temperature: number
      cloudCover: number
      precipitationProb: number
    }[]
    summary: {
      maxWindKt: number
      maxWindAltitude: string
      level: string
      avgTemperature: number
    }
    seuilVent: number
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 30,
    color: '#1a1a1a',
  },
  // Header
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  headerSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerMeta: {
    fontSize: 9,
    color: '#555',
  },
  headerLogo: {
    width: 60,
    height: 60,
    objectFit: 'contain' as const,
  },
  headerLeft: {
    flex: 1,
  },
  // Sections
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 4,
  },
  // Key-value rows
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    width: 120,
    fontFamily: 'Helvetica-Bold',
    color: '#444',
  },
  value: {
    flex: 1,
  },
  // Table
  table: {
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    color: '#fff',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
    fontSize: 8,
  },
  tableCell: {
    fontSize: 8,
  },
  colN: { width: 20 },
  colNom: { flex: 2 },
  colAge: { width: 35 },
  colPoids: { width: 45 },
  colPmr: { width: 30 },
  // Devis de masse
  devisTable: {
    marginBottom: 6,
  },
  devisRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  devisLabel: {
    flex: 2,
  },
  devisValue: {
    width: 60,
    textAlign: 'right',
  },
  devisTotalRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 3,
    backgroundColor: '#e8e8e8',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  devisTotalLabel: {
    flex: 2,
    fontFamily: 'Helvetica-Bold',
  },
  devisTotalValue: {
    width: 60,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  // Conformity badge
  badgeOk: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#2e7d32',
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    alignSelf: 'flex-start',
  },
  badgeKo: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#c62828',
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    alignSelf: 'flex-start',
  },
  // Blank lines for signatures
  blankLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    marginBottom: 12,
    marginTop: 4,
    height: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 7,
    color: '#888',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    paddingTop: 4,
  },
  // Page 2 post-vol
  postVolRow: {
    marginBottom: 14,
  },
  postVolLabel: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  filledValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  // Page 3 placeholder
  meteoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    color: '#888',
    fontSize: 12,
  },
  // Page 3 meteo banner
  meteoBanner: {
    backgroundColor: '#1e3a5f',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  meteoBannerTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
    marginBottom: 3,
  },
  meteoBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meteoBannerMeta: {
    fontSize: 8,
    color: '#cce0ff',
  },
  meteoBannerLevel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
  },
  // Meteo table columns
  colMeteoTime: { width: 36 },
  colMeteoWind: { flex: 1 },
  colMeteoOat: { width: 30 },
  colMeteoCloud: { width: 40 },
  colMeteoPrec: { width: 35 },
  meteoFooter: {
    marginTop: 6,
    fontSize: 7,
    color: '#888',
    fontFamily: 'Helvetica-Oblique',
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDatetime(d: Date): string {
  return `${formatDateFr(d)} ${formatTime(d)}`
}

function pdfWindBg(speed: number, seuil: number): string {
  if (speed > seuil + 5) return '#fecaca' // red-200
  if (speed >= seuil) return '#fef3c7' // amber-100
  return '#ffffff'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PageFooter({ exploitant }: { exploitant: FicheVolData['exploitant'] }) {
  return (
    <Text style={styles.footer} fixed>
      {exploitant.name} — {exploitant.frDecNumber} — Document généré par Calpax
    </Text>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Page 1 — Fiche de vol / PVE cover
// ---------------------------------------------------------------------------

function Page1({ data }: { data: FicheVolData }) {
  const { exploitant, vol, ballon, pilote, passagers, temperatureCelsius, isPve } = data

  const devis = calculerDevisMasse({
    ballon: {
      peseeAVide: ballon.peseeAVide,
      performanceChart: ballon.performanceChart,
      configGaz: ballon.configGaz,
    },
    pilotePoids: pilote.poids,
    passagers: passagers.map((p) => ({ poids: p.poids })),
    temperatureCelsius,
    qteGaz: vol.qteGaz ?? 0,
  })

  const docTitle = "PROCÈS-VERBAL D'ENVOL (PVE)"

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {exploitant.logoUrl && <Image src={exploitant.logoUrl} style={styles.headerLogo} />}
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{docTitle}</Text>
            <View style={styles.headerSubRow}>
              <Text style={styles.headerMeta}>
                {exploitant.name} — {exploitant.frDecNumber}
              </Text>
              <Text style={styles.headerMeta}>
                {formatDateFr(vol.date)} — {vol.creneau}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Ballon */}
      <View style={styles.section}>
        <SectionTitle>BALLON</SectionTitle>
        <KV label="Désignation" value={ballon.nom} />
        <KV label="Immatriculation" value={ballon.immatriculation} />
        <KV label="Volume" value={`${ballon.volumeM3} m³`} />
        <KV label="Config gaz" value={ballon.configGaz} />
      </View>

      {/* Equipage */}
      <View style={styles.section}>
        <SectionTitle>ÉQUIPAGE ET LOGISTIQUE</SectionTitle>
        <KV
          label="Commandant de bord"
          value={`${pilote.prenom} ${pilote.nom} — ${pilote.licenceBfcl}`}
        />
        <KV label="Équipier" value={vol.equipier ?? '—'} />
        <KV label="Véhicule" value={vol.vehicule ?? '—'} />
        <KV label="Lieu de décollage" value={vol.lieuDecollage ?? '—'} />
        <KV label="Gaz embarqués" value={vol.qteGaz !== null ? `${vol.qteGaz} kg` : '—'} />
      </View>

      {/* Passagers */}
      <View style={styles.section}>
        <SectionTitle>{`PASSAGERS (${passagers.length})`}</SectionTitle>
        {passagers.length === 0 ? (
          <Text style={{ color: '#888', fontSize: 8 }}>Aucun passager enregistré</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colN]}>N</Text>
              <Text style={[styles.tableHeaderCell, styles.colNom]}>Nom / Prenom</Text>
              <Text style={[styles.tableHeaderCell, styles.colAge]}>Age</Text>
              <Text style={[styles.tableHeaderCell, styles.colPoids]}>Poids (kg)</Text>
              <Text style={[styles.tableHeaderCell, styles.colPmr]}>PMR</Text>
            </View>
            {passagers.map((p, i) => (
              <View
                key={p.billetReference + i}
                style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, styles.colN]}>{i + 1}</Text>
                <Text style={[styles.tableCell, styles.colNom]}>
                  {p.nom} {p.prenom}
                </Text>
                <Text style={[styles.tableCell, styles.colAge]}>{p.age}</Text>
                <Text style={[styles.tableCell, styles.colPoids]}>{p.poids}</Text>
                <Text style={[styles.tableCell, styles.colPmr]}>{p.pmr ? 'Oui' : 'Non'}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Devis de masse */}
      <View style={styles.section}>
        <SectionTitle>{`DEVIS DE MASSE — Temp. ref. ${devis.temperatureUtilisee}\u00B0C`}</SectionTitle>
        <View style={styles.devisTable}>
          <View style={styles.devisRow}>
            <Text style={styles.devisLabel}>Pesée à vide ballon</Text>
            <Text style={styles.devisValue}>{devis.poidsAVide} kg</Text>
          </View>
          <View style={styles.devisRow}>
            <Text style={styles.devisLabel}>Gaz ({ballon.configGaz})</Text>
            <Text style={styles.devisValue}>{devis.poidsGaz} kg</Text>
          </View>
          <View style={styles.devisRow}>
            <Text style={styles.devisLabel}>
              Pilote ({pilote.prenom} {pilote.nom})
            </Text>
            <Text style={styles.devisValue}>{devis.poidsPilote} kg</Text>
          </View>
          <View style={styles.devisRow}>
            <Text style={styles.devisLabel}>Passagers ({passagers.length} pers.)</Text>
            <Text style={styles.devisValue}>{devis.poidsPassagers} kg</Text>
          </View>
          <View style={styles.devisTotalRow}>
            <Text style={styles.devisTotalLabel}>CHARGE EMBARQUEE</Text>
            <Text style={styles.devisTotalValue}>{devis.chargeEmbarquee} kg</Text>
          </View>
          <View style={styles.devisRow}>
            <Text style={styles.devisLabel}>Charge utile max a {devis.temperatureUtilisee}°C</Text>
            <Text style={styles.devisValue}>{devis.chargeUtileMax} kg</Text>
          </View>
          <View style={styles.devisRow}>
            <Text style={styles.devisLabel}>Marge restante</Text>
            <Text style={styles.devisValue}>{devis.margeRestante} kg</Text>
          </View>
        </View>
        <Text style={devis.estSurcharge ? styles.badgeKo : styles.badgeOk}>
          {devis.estSurcharge ? 'SURCHARGE' : 'CONFORME'}
        </Text>
      </View>

      <PageFooter exploitant={exploitant} />
    </Page>
  )
}

// ---------------------------------------------------------------------------
// Page 2 — VISA CDB (post-vol)
// ---------------------------------------------------------------------------

function Page2({ data }: { data: FicheVolData }) {
  const { exploitant, vol, pilote, isPve, archivedAt } = data

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VISA COMMANDANT DE BORD</Text>
        <View style={styles.headerSubRow}>
          <Text style={styles.headerMeta}>
            {exploitant.name} — {exploitant.frDecNumber}
          </Text>
          <Text style={styles.headerMeta}>{formatDateFr(vol.date)}</Text>
        </View>
      </View>

      {/* Decollage */}
      <View style={styles.section}>
        <SectionTitle>DÉCOLLAGE</SectionTitle>
        <View style={styles.postVolRow}>
          <Text style={styles.postVolLabel}>Lieu de décollage :</Text>
          {isPve && vol.decoLieu ? (
            <Text style={styles.filledValue}>{vol.decoLieu}</Text>
          ) : (
            <View style={styles.blankLine} />
          )}
        </View>
        <View style={styles.postVolRow}>
          <Text style={styles.postVolLabel}>Heure de décollage :</Text>
          {isPve && vol.decoHeure ? (
            <Text style={styles.filledValue}>{formatTime(vol.decoHeure)}</Text>
          ) : (
            <View style={styles.blankLine} />
          )}
        </View>
      </View>

      {/* Atterrissage */}
      <View style={styles.section}>
        <SectionTitle>ATTERRISSAGE</SectionTitle>
        <View style={styles.postVolRow}>
          <Text style={styles.postVolLabel}>{"Lieu d'atterrissage :"}</Text>
          {isPve && vol.atterLieu ? (
            <Text style={styles.filledValue}>{vol.atterLieu}</Text>
          ) : (
            <View style={styles.blankLine} />
          )}
        </View>
        <View style={styles.postVolRow}>
          <Text style={styles.postVolLabel}>{"Heure d'atterrissage :"}</Text>
          {isPve && vol.atterHeure ? (
            <Text style={styles.filledValue}>{formatTime(vol.atterHeure)}</Text>
          ) : (
            <View style={styles.blankLine} />
          )}
        </View>
      </View>

      {/* Gaz consommes */}
      <View style={styles.section}>
        <SectionTitle>GAZ CONSOMMÉS</SectionTitle>
        <View style={styles.postVolRow}>
          <Text style={styles.postVolLabel}>Quantité consommée (kg) :</Text>
          {isPve && vol.gasConso !== null ? (
            <Text style={styles.filledValue}>{vol.gasConso} kg</Text>
          ) : (
            <View style={styles.blankLine} />
          )}
        </View>
      </View>

      {/* Anomalies */}
      <View style={styles.section}>
        <SectionTitle>ANOMALIES / OBSERVATIONS</SectionTitle>
        <View style={{ marginTop: 4, marginBottom: 4 }}>
          {isPve && vol.anomalies ? (
            <Text>{vol.anomalies}</Text>
          ) : (
            <>
              <View style={styles.blankLine} />
              <View style={styles.blankLine} />
              <View style={styles.blankLine} />
            </>
          )}
        </View>
      </View>

      {/* Signature CDB */}
      <View style={styles.section}>
        <SectionTitle>SIGNATURE COMMANDANT DE BORD</SectionTitle>
        <View style={styles.row}>
          <Text style={styles.label}>
            {pilote.prenom} {pilote.nom} — {pilote.licenceBfcl}
          </Text>
        </View>
        <View style={[styles.blankLine, { marginTop: 20 }]} />
        <Text style={{ fontSize: 7, color: '#888' }}>Signature du CDB</Text>
      </View>

      {/* Footer or archive timestamp */}
      {isPve && archivedAt ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 8, color: '#555' }}>
            PVE archive le : {formatDatetime(archivedAt)}
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 8, color: '#888', fontFamily: 'Helvetica-Oblique' }}>
            À remplir par le CDB après le vol
          </Text>
        </View>
      )}

      <PageFooter exploitant={exploitant} />
    </Page>
  )
}

// ---------------------------------------------------------------------------
// Page 3 — Meteo placeholder
// ---------------------------------------------------------------------------

function Page3({ data }: { data: FicheVolData }) {
  const { exploitant, vol, meteo } = data

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MÉTÉO</Text>
        <View style={styles.headerSubRow}>
          <Text style={styles.headerMeta}>
            {exploitant.name} — {exploitant.frDecNumber}
          </Text>
          <Text style={styles.headerMeta}>{formatDateFr(vol.date)}</Text>
        </View>
      </View>

      {meteo ? (
        <>
          {/* Banner */}
          <View style={styles.meteoBanner}>
            <Text style={styles.meteoBannerTitle}>
              MÉTÉO — {formatDateFr(vol.date)} — {vol.creneau}
            </Text>
            <View style={styles.meteoBannerRow}>
              <Text style={styles.meteoBannerMeta}>
                Vent max: {meteo.summary.maxWindKt} km/h ({meteo.summary.maxWindAltitude}) | OAT
                moy: {meteo.summary.avgTemperature}°C
              </Text>
              <Text style={styles.meteoBannerLevel}>{meteo.summary.level}</Text>
            </View>
          </View>

          {/* Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colMeteoTime]}>Heure</Text>
              <Text style={[styles.tableHeaderCell, styles.colMeteoWind]}>Vent 10m</Text>
              <Text style={[styles.tableHeaderCell, styles.colMeteoWind]}>Vent 80m</Text>
              <Text style={[styles.tableHeaderCell, styles.colMeteoWind]}>Vent 120m</Text>
              <Text style={[styles.tableHeaderCell, styles.colMeteoWind]}>Vent 180m</Text>
              <Text style={[styles.tableHeaderCell, styles.colMeteoOat]}>OAT</Text>
              <Text style={[styles.tableHeaderCell, styles.colMeteoCloud]}>Nébulosité</Text>
              <Text style={[styles.tableHeaderCell, styles.colMeteoPrec]}>Précip.</Text>
            </View>
            {meteo.hours.map((h, i) => (
              <View key={h.time} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, styles.colMeteoTime]}>{h.time}</Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colMeteoWind,
                    { backgroundColor: pdfWindBg(h.wind10m.speed, meteo.seuilVent) },
                  ]}
                >
                  {h.wind10m.speed} km/h {h.wind10m.direction}°
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colMeteoWind,
                    { backgroundColor: pdfWindBg(h.wind80m.speed, meteo.seuilVent) },
                  ]}
                >
                  {h.wind80m.speed} km/h {h.wind80m.direction}°
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colMeteoWind,
                    { backgroundColor: pdfWindBg(h.wind120m.speed, meteo.seuilVent) },
                  ]}
                >
                  {h.wind120m.speed} km/h {h.wind120m.direction}°
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colMeteoWind,
                    { backgroundColor: pdfWindBg(h.wind180m.speed, meteo.seuilVent) },
                  ]}
                >
                  {h.wind180m.speed} km/h {h.wind180m.direction}°
                </Text>
                <Text style={[styles.tableCell, styles.colMeteoOat]}>{h.temperature}°C</Text>
                <Text style={[styles.tableCell, styles.colMeteoCloud]}>{h.cloudCover}%</Text>
                <Text style={[styles.tableCell, styles.colMeteoPrec]}>{h.precipitationProb}%</Text>
              </View>
            ))}
          </View>

          <Text style={styles.meteoFooter}>Source: Open-Meteo.com</Text>
        </>
      ) : (
        <View style={styles.meteoPlaceholder}>
          <Text>Page météo — sera générée par le module météo (Pw)</Text>
        </View>
      )}

      <PageFooter exploitant={exploitant} />
    </Page>
  )
}

// ---------------------------------------------------------------------------
// Main document
// ---------------------------------------------------------------------------

export function FicheVolDocument({ data }: { data: FicheVolData }) {
  return (
    <Document
      title={`Procès-Verbal d'Envol — ${data.ballon.immatriculation} — ${data.vol.date.toISOString().slice(0, 10)}`}
      author={data.exploitant.name}
      creator="Calpax"
      producer="Calpax"
    >
      <Page1 data={data} />
      <Page2 data={data} />
      <Page3 data={data} />
    </Document>
  )
}
