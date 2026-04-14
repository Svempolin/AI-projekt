import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

const todayLong = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })

// SVG icons — clean line icons, no emojis
const IconHanger = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H7v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V10h3.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
  </svg>
)
const IconTag = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconGrid = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const IconFolder = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconUser = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconArrow = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

/* ── Mini seller collage card for HomePage (horisontell scroll) ── */
function HomeSellerCard({ seller, onClick }) {
  const [a, b, c] = seller.items

  const Img = ({ item, style }) => (
    <div style={{ borderRadius: '6px', overflow: 'hidden', background: '#e8e5e0', ...style }}>
      {item?.photoURL
        ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: '100%', height: '100%', background: '#e0ddd6' }}/>
      }
    </div>
  )

  return (
    <div onClick={onClick} style={{ flexShrink: 0, width: 'calc((100% - 20px) / 3)', minWidth: '160px', maxWidth: '200px', background: '#fff', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #ebe9e4', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.09)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

      {/* Kollage: stor vänster + två staplade höger */}
      <div style={{ display: 'flex', gap: '3px', padding: '7px 7px 3px', height: '120px' }}>
        <Img item={a} style={{ flex: '1 0 58%', height: '100%' }}/>
        <div style={{ flex: '1 0 38%', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <Img item={b} style={{ flex: 1 }}/>
          <Img item={c} style={{ flex: 1 }}/>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '6px 9px 8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#bbb8b0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '800', flexShrink: 0 }}>
          {seller.name.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#333', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{seller.name}</span>
        <span style={{ fontSize: '9px', color: '#ccc', fontWeight: '500', marginLeft: 'auto', flexShrink: 0 }}>{seller.items.length}st</span>
      </div>
    </div>
  )
}

export default function HomePage({ user, onNavigate }) {
  const firstName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || ''

  const [todayItems, setTodayItems]     = useState(null)
  const [sellerGroups, setSellerGroups] = useState([])
  const [myForSale, setMyForSale]       = useState([])
  const [totalLikes, setTotalLikes]     = useState(0)
  const [profilePhoto, setProfilePhoto] = useState(user.photoURL || null)
  const todayStr = formatDate(new Date())

  // Hämta profilbild från Firestore (kan vara uppdaterad sedan auth)
  useEffect(() => {
    getDoc(doc(db, 'users', user.uid))
      .then(d => { if (d.exists() && d.data().photoURL) setProfilePhoto(d.data().photoURL) })
      .catch(() => {})
  }, [user.uid])

  useEffect(() => {
    getDoc(doc(db, 'outfitPlans', `${user.uid}_${todayStr}`))
      .then(snap => setTodayItems(snap.exists() ? (snap.data().items || []) : []))
  }, [user.uid, todayStr])

  // Load for-sale items, group by seller (exclude own)
  useEffect(() => {
    getDocs(query(collection(db, 'wardrobeItems'), where('forSale', '==', true), limit(40)))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.uid !== user.uid)
        // Group by seller
        const grouped = Object.values(
          all.reduce((acc, item) => {
            const key = item.uid
            if (!acc[key]) acc[key] = { uid: key, name: item.sellerName || 'Okänd', items: [] }
            acc[key].items.push(item)
            return acc
          }, {})
        ).map(s => ({
          ...s,
          items: [...s.items].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        }))
        setSellerGroups(grouped)
      })
      .catch(() => setSellerGroups([]))
  }, [user.uid])

  // My own items for sale + likes count
  useEffect(() => {
    getDocs(query(collection(db, 'wardrobeItems'), where('uid', '==', user.uid), where('forSale', '==', true)))
      .then(snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        setMyForSale(items)
        // Fetch total likes on my items
        if (items.length > 0) {
          const ids = items.map(i => i.id)
          getDocs(query(collection(db, 'likes'), where('itemId', 'in', ids.slice(0, 10))))
            .then(likeSnap => setTotalLikes(likeSnap.size))
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [user.uid])

  const tiles = [
    { icon: <IconHanger/>, title: `${firstName}s garderob`, desc: 'Bläddra och styla dina kläder', page: 'wardrobe', featured: true },
    { icon: <IconTag/>,    title: 'Flea market',    desc: 'Sälj och köp second hand',       page: 'fleamarket' },
    { icon: <IconCalendar/>,title: 'Planera veckan',desc: 'Välj outfit för varje dag',       page: 'planner' },
    { icon: <IconGrid/>,   title: 'Nytt kollage',   desc: 'Bygg en outfit på canvas',        page: 'collage' },
    { icon: <IconFolder/>, title: 'Kollage & samlingar', desc: 'Dina sparade kollage och outfits', page: 'collections' },
    { icon: <IconUser/>,   title: 'Min profil',     desc: 'Inställningar och statistik',    page: 'profile' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f9f8f6', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* Compact topbar — hidden on desktop since TopNav handles it */}
      <div style={{ background: '#f9f8f6', padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #ebe9e4' }}>
        <span style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {todayLong}
        </span>
        <button onClick={() => onNavigate('profile')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#888', fontWeight: '500', letterSpacing: '0.02em' }}>
          {user.displayName || user.email?.split('@')[0]}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px 80px' }}>

          {/* Navigation tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '40px' }}>
            {tiles.map((tile, idx) => {
              const featured = tile.featured
              return (
                <button key={tile.page + idx}
                  onClick={() => onNavigate(tile.page)}
                  style={{
                    gridColumn: featured ? '1 / -1' : 'auto',
                    background: featured ? '#111' : '#fff',
                    color: featured ? '#fff' : '#111',
                    border: featured ? 'none' : '1px solid #e8e5e0',
                    borderRadius: '12px',
                    padding: featured ? '24px 22px' : '16px 18px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: featured ? 'flex-start' : 'center',
                    flexDirection: featured ? 'column' : 'row',
                    gap: featured ? '16px' : '14px',
                    transition: 'opacity 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>

                  {featured ? (
                    /* Featured tile — profilbild till vänster */
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '18px' }}>
                      {/* Profilbild */}
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                        {profilePhoto
                          ? <img src={profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                          : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '800', color: '#fff' }}>
                              {firstName.charAt(0).toUpperCase()}
                            </div>
                        }
                      </div>
                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '4px', textTransform: 'uppercase' }}>{tile.title}</div>
                        <div style={{ fontSize: '11px', opacity: 0.5, fontWeight: '400' }}>{tile.desc}</div>
                      </div>
                      <span style={{ opacity: 0.3, flexShrink: 0 }}><IconArrow/></span>
                    </div>
                  ) : (
                    <>
                      <span style={{ opacity: 0.4, flexShrink: 0 }}>{tile.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '3px', textTransform: 'uppercase' }}>{tile.title}</div>
                        <div style={{ fontSize: '11px', opacity: 0.5, fontWeight: '400', letterSpacing: '0.01em' }}>{tile.desc}</div>
                      </div>
                      <span style={{ opacity: 0.3, flexShrink: 0 }}><IconArrow/></span>
                    </>
                  )}
                </button>
              )
            })}
          </div>

          {/* Today's outfit */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 onClick={() => onNavigate('planner')} style={{ margin: 0, fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: '#111', textTransform: 'uppercase', cursor: 'pointer' }}>
                Dagens outfit
              </h2>
              <button onClick={() => onNavigate('planner')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#bbb', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Planera <IconArrow/>
              </button>
            </div>

            {todayItems === null ? (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e8e5e0', padding: '28px', textAlign: 'center', color: '#ccc', fontSize: '12px' }}>
                Laddar…
              </div>
            ) : todayItems.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px dashed #ddd8d0', padding: '28px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => onNavigate('planner')}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#bbb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Inget planerat för idag</div>
                <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>Klicka för att planera</div>
              </div>
            ) : (
              <div onClick={() => onNavigate('planner')} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e8e5e0', padding: '14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {todayItems.map(item => (
                    <div key={item.id} style={{ flexShrink: 0, width: '80px', borderRadius: '8px', overflow: 'hidden', background: '#f5f5f3' }}>
                      <div style={{ aspectRatio: '3/4' }}>
                        {item.photoURL
                          ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                          : <div style={{ width: '100%', height: '100%', background: '#eee' }}/>
                        }
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => onNavigate('planner')}
                  style={{ marginTop: '10px', width: '100%', padding: '8px', background: '#f5f5f3', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#888', cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Ändra outfit
                </button>
              </div>
            )}
          </div>

          {/* Flea market feed — seller collage cards */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 onClick={() => onNavigate('fleamarket')} style={{ margin: 0, fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: '#111', textTransform: 'uppercase', cursor: 'pointer' }}>
                Flea market
              </h2>
              <button onClick={() => onNavigate('fleamarket')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#bbb', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Se alla <IconArrow/>
              </button>
            </div>

            {sellerGroups.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px dashed #ddd8d0', padding: '28px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#bbb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Inga plagg till salu ännu</div>
                <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>Andras plagg dyker upp när community:t växer</div>
              </div>
            ) : (
              /* 3 kort sida vid sida, svep för fler */
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {sellerGroups.map(seller => (
                  <HomeSellerCard key={seller.uid} seller={seller} onClick={() => onNavigate('fleamarket')}/>
                ))}
              </div>
            )}
          </div>

          {/* Min flea market */}
          {myForSale.length > 0 && (
            <div style={{ marginTop: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 onClick={() => onNavigate('fleamarket')} style={{ margin: 0, fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: '#111', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Min flea market
                </h2>
                <button onClick={() => onNavigate('fleamarket')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#bbb', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Se alla <IconArrow/>
                </button>
              </div>

              <div onClick={() => onNavigate('fleamarket')} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e8e5e0', padding: '14px', cursor: 'pointer' }}>
                {totalLikes > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', padding: '8px 12px', background: '#fff5f7', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#e11d48" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#e11d48' }}>
                      {totalLikes} {totalLikes === 1 ? 'person gillar' : 'personer gillar'} dina plagg
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {myForSale.slice(0, 4).map(item => (
                    <div key={item.id} style={{ flexShrink: 0, width: '80px', borderRadius: '8px', overflow: 'hidden', background: '#f5f5f3', position: 'relative' }}>
                      <div style={{ aspectRatio: '3/4' }}>
                        {item.photoURL
                          ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                          : <div style={{ width: '100%', height: '100%', background: '#eee' }}/>
                        }
                      </div>
                      {item.salePrice && (
                        <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px' }}>
                          {item.salePrice} kr
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '10px', fontSize: '11px', color: '#bbb', fontWeight: '500', textAlign: 'center' }}>
                  {myForSale.length} plagg till salu
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
