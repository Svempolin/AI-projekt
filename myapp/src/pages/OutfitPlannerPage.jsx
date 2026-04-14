import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore'

const isMobileDevice = () => window.innerWidth < 768

const DAYS_SV = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
const DAYS_SHORT = ['MÅN', 'TIS', 'ONS', 'TOR', 'FRE', 'LÖR', 'SÖN']

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// Returnerar ISO-datumstring (YYYY-MM-DD) för måndagen i nuvarande vecka
function getMondayOfWeek(offset = 0) {
  const now = new Date()
  const day = now.getDay() // 0=sön, 1=mån, ...
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function OutfitPlannerPage({ user, onNavigate }) {
  const [weekOffset, setWeekOffset]   = useState(0)
  const [plans, setPlans]             = useState({}) // { 'YYYY-MM-DD': { items, worn, wornItems } }
  const [wardrobe, setWardrobe]       = useState([])
  const [pickingFor, setPickingFor]   = useState(null)   // date string — planning mode
  const [loggingFor, setLoggingFor]   = useState(null)   // date string — log worn mode
  const [loading, setLoading]         = useState(true)
  const [saveError, setSaveError]     = useState(null)
  const [saving, setSaving]           = useState(false)

  const monday    = getMondayOfWeek(weekOffset)
  const weekDates = getWeekDates(monday)
  const todayStr  = formatDate(new Date())

  // Ladda garderob
  useEffect(() => {
    getDocs(query(collection(db, 'wardrobeItems'), where('uid', '==', user.uid)))
      .then(snap => setWardrobe(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => !i.forSale)))
      .catch(err => console.error('Kunde inte ladda garderob:', err))
  }, [user.uid])

  // Ladda veckoplaner för aktuell vecka
  useEffect(() => {
    const dates = getWeekDates(getMondayOfWeek(weekOffset))
    const load = async () => {
      setLoading(true)
      try {
        const newPlans = {}
        await Promise.all(dates.map(async date => {
          const dateStr = formatDate(date)
          const snap = await getDoc(doc(db, 'outfitPlans', `${user.uid}_${dateStr}`))
          if (snap.exists()) newPlans[dateStr] = snap.data()
        }))
        setPlans(newPlans)
      } catch (err) {
        console.error('Kunde inte ladda outfitplaner:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [weekOffset, user.uid])

  const savePlan = async (dateStr, items) => {
    const existing = plans[dateStr] || {}
    const data = {
      uid: user.uid,
      date: dateStr,
      items,
      updatedAt: new Date().toISOString(),
      ...(existing.worn !== undefined && { worn: existing.worn }),
      ...(existing.wornItems !== undefined && { wornItems: existing.wornItems }),
    }
    // Uppdatera lokalt direkt (optimistic)
    setPlans(p => ({ ...p, [dateStr]: { ...p[dateStr], items } }))
    setSaving(true)
    setSaveError(null)
    try {
      await setDoc(doc(db, 'outfitPlans', `${user.uid}_${dateStr}`), data)
    } catch (err) {
      console.error('Kunde inte spara plan:', err)
      setSaveError('Kunde inte spara — kontrollera anslutningen')
      // Återställ lokal state vid fel
      setPlans(p => ({ ...p, [dateStr]: existing }))
    } finally {
      setSaving(false)
    }
  }

  const markWorn = async (dateStr, wornItems) => {
    const existing = plans[dateStr] || {}
    const data = { uid: user.uid, date: dateStr,
      items: existing.items || [],
      worn: true, wornItems,
      wornAt: new Date().toISOString(),
      updatedAt: new Date().toISOString() }
    await setDoc(doc(db, 'outfitPlans', `${user.uid}_${dateStr}`), data)
    setPlans(p => ({ ...p, [dateStr]: { ...p[dateStr], worn: true, wornItems } }))
  }

  const toggleItem = (dateStr, item) => {
    const current = (plans[dateStr]?.items) || []
    const exists  = current.find(i => i.id === item.id)
    const updated = exists ? current.filter(i => i.id !== item.id) : [...current, item]
    savePlan(dateStr, updated)
  }

  const toggleWornItem = (dateStr, item) => {
    const current = (plans[dateStr]?.wornItems) || (plans[dateStr]?.items) || []
    const exists  = current.find(i => i.id === item.id)
    const updated = exists ? current.filter(i => i.id !== item.id) : [...current, item]
    markWorn(dateStr, updated)
  }

  const clearDay = (dateStr) => {
    savePlan(dateStr, [])
  }

  const planItems   = dateStr => plans[dateStr]?.items    || []
  const wornItems   = dateStr => plans[dateStr]?.wornItems ?? plans[dateStr]?.items ?? []
  const isWorn      = dateStr => plans[dateStr]?.worn === true
  const pickingItems  = planItems(pickingFor)
  const loggingItems  = wornItems(loggingFor)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f7f8fa', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* Topbar — only show back arrow on mobile */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, zIndex: 100 }}>
        {isMobileDevice() && (
          <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111', display: 'flex', alignItems: 'center' }}>
            <BackIcon/>
          </button>
        )}
        <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Planera veckan</span>
        <div style={{ flex: 1 }}/>
        {saving && (
          <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.04em' }}>Sparar…</span>
        )}
        {saveError && (
          <span style={{ fontSize: '11px', color: '#e53e3e', fontWeight: '600', maxWidth: '220px' }}>
            ⚠ {saveError}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* Veckonavigering */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button onClick={() => setWeekOffset(w => w - 1)}
            style={{ background: '#fff', border: '1.5px solid #e8e8e8', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            ← Förra veckan
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.06em', color: '#111' }}>
              {weekOffset === 0 ? 'DENNA VECKA' : weekOffset === 1 ? 'NÄSTA VECKA' : weekOffset === -1 ? 'FÖRRA VECKAN' : `VECKA ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
            </div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
              {formatDate(weekDates[0])} – {formatDate(weekDates[6])}
            </div>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)}
            style={{ background: '#fff', border: '1.5px solid #e8e8e8', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            Nästa vecka →
          </button>
        </div>

        {/* Dagskort */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '48px', fontSize: '13px' }}>Laddar…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {weekDates.map((date, i) => {
              const dateStr  = formatDate(date)
              const isToday  = dateStr === todayStr
              const items    = planItems(dateStr)
              const worn     = isWorn(dateStr)
              const wornItms = wornItems(dateStr)
              const isPast   = date < new Date() && !isToday

              return (
                <div key={dateStr}
                  style={{
                    background: isToday ? '#f5f2ec' : '#fff',
                    border: isToday ? '2px solid #111' : '1.5px solid #e8e8e8',
                    borderRadius: '14px',
                    padding: '16px',
                    boxShadow: isToday ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
                    opacity: isPast ? 0.65 : 1,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: items.length > 0 ? '12px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isToday ? '#111' : '#f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: isToday ? 'rgba(255,255,255,0.6)' : '#aaa', letterSpacing: '0.06em' }}>{DAYS_SHORT[i]}</span>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: isToday ? '#fff' : '#111', lineHeight: 1.1 }}>{date.getDate()}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>{DAYS_SV[i]}</div>
                        {isToday && <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>Idag</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {/* Past: worn-knappar */}
                      {isPast && items.length > 0 && !worn && (
                        <>
                          <button onClick={() => markWorn(dateStr, items)}
                            style={{ padding: '6px 12px', borderRadius: '8px', background: 'none', border: '1px solid #d0d0d0', color: '#555', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                            ✓ Jag bar detta
                          </button>
                          <button onClick={() => setLoggingFor(dateStr)}
                            style={{ padding: '6px 12px', borderRadius: '8px', background: 'none', border: '1px solid #d0d0d0', color: '#555', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                            Jag bar annat
                          </button>
                        </>
                      )}
                      {isPast && items.length === 0 && !worn && (
                        <button onClick={() => setLoggingFor(dateStr)}
                          style={{ padding: '6px 12px', borderRadius: '8px', background: 'none', border: '1px solid #d0d0d0', color: '#888', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                          + Logga outfit
                        </button>
                      )}
                      {/* Worn badge */}
                      {worn && (
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#888', letterSpacing: '0.06em', padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                          BURET ✓
                        </span>
                      )}
                      {/* Planning buttons */}
                      {items.length > 0 && (
                        <button onClick={() => clearDay(dateStr)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#bbb', fontWeight: '600', padding: '4px 0' }}>
                          Rensa
                        </button>
                      )}
                      {!isPast && (
                        <button onClick={() => setPickingFor(dateStr)}
                          style={{ padding: '7px 14px', borderRadius: '8px', background: '#111', color: '#fff', border: 'none', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', cursor: 'pointer' }}>
                          {items.length > 0 ? 'Ändra' : '+ Outfit'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Valda / burna plagg */}
                  {(worn ? wornItms : items).length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(worn ? wornItms : items).map(item => (
                        <div key={item.id} style={{ width: '52px', height: '70px', borderRadius: '6px', overflow: 'hidden', background: '#f0ede8', flexShrink: 0, position: 'relative' }}>
                          {item.photoURL
                            ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                            : <div style={{ width: '100%', height: '100%', background: '#eee' }}/>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>

      {/* ── Worn-logg modal ── */}
      {loggingFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '15px' }}>
                  {DAYS_SV[weekDates.findIndex(d => formatDate(d) === loggingFor)]} — vad bar du?
                </div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                  {loggingItems.length} plagg valda
                </div>
              </div>
              <button onClick={() => setLoggingFor(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <CloseIcon/>
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
              {wardrobe.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '40px', fontSize: '13px' }}>Inga plagg i garderoben</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                  {wardrobe.map(item => {
                    const selected = loggingItems.some(i => i.id === item.id)
                    return (
                      <div key={item.id} onClick={() => toggleWornItem(loggingFor, item)}
                        style={{ aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden', position: 'relative', cursor: 'pointer',
                          outline: selected ? '3px solid #111' : '2px solid transparent', outlineOffset: '2px', transition: 'outline 0.1s' }}>
                        {item.photoURL
                          ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                          : <div style={{ width: '100%', height: '100%', background: '#f0f0f0' }}/>
                        }
                        {selected && (
                          <div style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700' }}>✓</div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))' }}>
                          <div style={{ fontSize: '8px', color: '#fff', fontWeight: '700', letterSpacing: '0.04em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {item.category?.split(' |')[0].toUpperCase()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
              <button onClick={() => setLoggingFor(null)}
                style={{ width: '100%', padding: '14px', background: '#111', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', letterSpacing: '0.06em', cursor: 'pointer' }}>
                SPARA LOGG — {loggingItems.length} PLAGG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Picker-modal ── */}
      {pickingFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '0.06em' }}>
                  {DAYS_SV[weekDates.findIndex(d => formatDate(d) === pickingFor)]}
                </div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                  {pickingItems.length} plagg valda — tryck för att lägga till/ta bort
                </div>
              </div>
              <button onClick={() => setPickingFor(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center' }}>
                <CloseIcon/>
              </button>
            </div>

            {/* Garderob-grid */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
              {wardrobe.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '40px', fontSize: '13px' }}>
                  Inga plagg i garderoben ännu
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                  {wardrobe.map(item => {
                    const selected = pickingItems.some(i => i.id === item.id)
                    return (
                      <div key={item.id} onClick={() => toggleItem(pickingFor, item)}
                        style={{
                          aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden',
                          position: 'relative', cursor: 'pointer',
                          outline: selected ? '3px solid #1a1a2e' : '2px solid transparent',
                          outlineOffset: '2px', transition: 'outline 0.1s',
                        }}>
                        {item.photoURL
                          ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                          : <div style={{ width: '100%', height: '100%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👗</div>
                        }
                        {selected && (
                          <div style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700' }}>✓</div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))' }}>
                          <div style={{ fontSize: '8px', color: '#fff', fontWeight: '700', letterSpacing: '0.04em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {item.category?.split(' |')[0].toUpperCase()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
              <button onClick={() => setPickingFor(null)}
                style={{ width: '100%', padding: '14px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', letterSpacing: '0.06em', cursor: 'pointer' }}>
                KLAR — {pickingItems.length} PLAGG SPARADE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
