import { useState, useEffect } from 'react'
import { auth, db, storage } from '../firebase'
import { signOut } from 'firebase/auth'
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import SellExternalModal from '../components/SellExternalModal'
import ImageCarousel from '../components/ImageCarousel'

const CATEGORIES = [
  'Alla', 'Blazers', 'Dresses', 'Shirts | Blouses', 'Tops',
  'T-Shirts | Tanks', 'Co-ord Sets', 'Jeans', 'Pants', 'Skirts',
  'Shorts | Skorts', 'Swimwear', 'Jackets | Trenches', 'Knitwear',
  'Cardigans | Sweaters', 'Suede | Leather', 'Sweatshirts | Sweatpants',
  'Halters', 'Bodysuits', 'Lingerie', 'Accessories', 'Shoes'
]

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
)
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6"  y1="6" x2="18" y2="18"/>
  </svg>
)
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5"  y1="12" x2="19" y2="12"/>
  </svg>
)
const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

export default function WardrobePage({ user, onNavigate }) {
  const [items, setItems]       = useState([])
  const [active, setActive]     = useState('Alla')
  const [loading, setLoading]   = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const isMobile = windowWidth < 768
  const [selected, setSelected] = useState(null)
  const [hoveredId, setHoveredId]   = useState(null)
  const [salePrice, setSalePrice]   = useState('')
  const [savingSale, setSavingSale] = useState(false)
  const [sellExternal, setSellExternal] = useState(null) // item att sälja externt

  useEffect(() => {
    const q = query(
      collection(db, 'wardrobeItems'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user.uid])

  const filtered = (active === 'Alla' ? items : items.filter(i => i.category === active))

  const deleteItem = async (e, item) => {
    e.stopPropagation()
    if (!window.confirm(`Ta bort "${item.brand || item.category}"? Det går inte att ångra.`)) return
    // Delete from Firestore
    await deleteDoc(doc(db, 'wardrobeItems', item.id))
    // Try to delete from Storage too (if path can be extracted)
    try {
      const match = item.photoURL?.match(/\/o\/(.+?)(\?|$)/)
      if (match) await deleteObject(ref(storage, decodeURIComponent(match[1])))
    } catch { /* ignore if already gone */ }
    if (selected?.id === item.id) setSelected(null)
  }

  const markForSale = async () => {
    if (!selected || !salePrice) return
    setSavingSale(true)
    await updateDoc(doc(db, 'wardrobeItems', selected.id), {
      forSale: true,
      salePrice: Number(salePrice),
      sellerName: user.displayName || user.email?.split('@')[0] || 'Okänd',
    })
    setSelected(s => ({ ...s, forSale: true, salePrice: Number(salePrice) }))
    setSavingSale(false)
  }

  const removeFromSale = async () => {
    if (!selected) return
    await updateDoc(doc(db, 'wardrobeItems', selected.id), {
      forSale: false,
      salePrice: null,
    })
    setSelected(s => ({ ...s, forSale: false, salePrice: null }))
    setSalePrice('')
  }

  // Öppna modal och fyll i befintligt pris om det finns
  const openDetail = (item) => {
    setSelected(item)
    setSalePrice(item.salePrice ? String(item.salePrice) : '')
  }

  const selectCategory = (cat) => {
    setActive(cat)
    setMenuOpen(false)
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#fff', fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* ── Hamburger drawer overlay ── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:400 }}
        />
      )}

      {/* ── Slide-out drawer ── */}
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, width:'280px',
        background:'#fff', zIndex:500, transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', flexDirection:'column', boxShadow: menuOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none'
      }}>
        {/* Drawer header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontWeight:'800', fontSize:'14px', letterSpacing:'0.1em' }}>KATEGORIER</span>
          <button onClick={() => setMenuOpen(false)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#111', display:'flex', alignItems:'center' }}>
            <CloseIcon/>
          </button>
        </div>
        {/* Back to wardrobe – only in mobile drawer */}
        <button onClick={() => { setMenuOpen(false); onNavigate('wardrobe') }}
          style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'14px 20px', background:'none', border:'none', borderBottom:'1px solid #f0f0f0', cursor:'pointer', fontSize:'12px', fontWeight:'700', color:'#888', letterSpacing:'0.04em', textAlign:'left' }}>
          ← TILLBAKA TILL GARDEROBEN
        </button>

        {/* Category list */}
        <div style={{ overflowY:'auto', flex:1, padding:'8px 0' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => selectCategory(cat)}
              style={{
                display:'block', width:'100%', textAlign:'left',
                padding:'14px 24px', background:'none', border:'none', cursor:'pointer',
                fontSize:'13px', fontWeight: active === cat ? '700' : '500',
                letterSpacing:'0.06em', color: active === cat ? '#111' : '#666',
                borderLeft: active === cat ? '3px solid #111' : '3px solid transparent',
                transition:'all 0.15s',
              }}>
              {cat.toUpperCase()}
              {active === cat && items.filter(i => cat === 'Alla' ? true : i.category === cat).length > 0 && (
                <span style={{ marginLeft:'8px', fontSize:'11px', color:'#999', fontWeight:'400' }}>
                  ({cat === 'Alla' ? items.length : items.filter(i => i.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Drawer footer – lägg till plagg */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid #e8e8e8' }}>
          <button onClick={() => { setMenuOpen(false); onNavigate('upload') }}
            style={{ width:'100%', padding:'14px', background:'#111', color:'#fff', border:'none', fontSize:'13px', fontWeight:'700', letterSpacing:'0.08em', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
            <PlusIcon/> LÄGG TILL PLAGG
          </button>
        </div>
      </div>

      {/* ── Top bar ── */}
      <div style={{ flexShrink:0, zIndex:100, background:'#fff', borderBottom:'1px solid #e8e8e8' }}>
        <div style={{ padding:'0 20px', height:'52px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>

          {/* LEFT: hamburger (mobile) + title */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth:0 }}>
            {isMobile && (
              <button onClick={() => setMenuOpen(true)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#111', display:'flex', alignItems:'center', padding:'4px', flexShrink:0 }}>
                <MenuIcon/>
              </button>
            )}
            <span style={{ fontWeight:'800', fontSize: isMobile ? '13px' : '12px', letterSpacing:'0.1em', color:'#111', whiteSpace:'nowrap', textTransform:'uppercase' }}>
              {isMobile ? 'Hantera garderob' : 'Hantera garderob'}
            </span>
          </div>

          {/* RIGHT: actions */}
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexShrink:0 }}>
            {!isMobile && (
              <>
                <button onClick={() => onNavigate('collections')}
                  style={{ padding:'7px 14px', background:'#fff', color:'#555', border:'1px solid #e8e8e8', borderRadius:'8px', fontSize:'12px', fontWeight:'700', letterSpacing:'0.05em', cursor:'pointer' }}>
                  KOLLAGE
                </button>
                <button onClick={() => onNavigate('collage')}
                  style={{ padding:'7px 14px', background:'#fff', color:'#555', border:'1px solid #e8e8e8', borderRadius:'8px', fontSize:'12px', fontWeight:'700', letterSpacing:'0.05em', cursor:'pointer' }}>
                  KOLLAGE
                </button>
              </>
            )}
            <button onClick={() => onNavigate('upload')}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#111', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'800', letterSpacing:'0.06em', cursor:'pointer' }}>
              <PlusIcon/> {isMobile ? '' : 'LÄGG TILL'}
            </button>
          </div>
        </div>

        {/* Category filter bar — desktop always visible, mobile hidden (in sidebar) */}
        {!isMobile && (
          <div style={{ borderTop:'1px solid #f0f0f0', display:'flex', alignItems:'center', padding:'0 20px', gap:'4px', overflowX:'auto', scrollbarWidth:'none' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActive(cat)}
                style={{
                  padding:'10px 14px', background:'none', border:'none', borderBottom: active === cat ? '2px solid #111' : '2px solid transparent',
                  fontWeight: active === cat ? '800' : '500', fontSize:'11px', letterSpacing:'0.04em',
                  color: active === cat ? '#111' : '#aaa', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
                }}>
                {cat}
              </button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:'11px', color:'#ccc', whiteSpace:'nowrap', paddingLeft:'16px' }}>
              {filtered.length} plagg
            </span>
          </div>
        )}

        {/* Mobile: current category indicator */}
        {isMobile && (
          <div style={{ borderTop:'1px solid #f0f0f0', padding:'8px 16px', display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'11px', color:'#999', letterSpacing:'0.04em' }}>
              {active === 'Alla' ? 'ALLA KATEGORIER' : active.toUpperCase()} · {filtered.length} plagg
            </span>
            {active !== 'Alla' && (
              <button onClick={() => setActive('Alla')}
                style={{ marginLeft:'auto', fontSize:'10px', color:'#999', background:'none', border:'1px solid #e8e8e8', borderRadius:'6px', padding:'3px 8px', cursor:'pointer' }}>
                ✕ rensa
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'0 0 80px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', padding:'80px', color:'#999', fontSize:'13px', letterSpacing:'0.06em' }}>
            LADDAR GARDEROB…
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'80px 24px' }}>
            <div style={{ fontSize:'56px', marginBottom:'16px' }}>👗</div>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#111', marginBottom:'8px', letterSpacing:'0.04em' }}>
              {active === 'Alla' ? 'DIN GARDEROB ÄR TOM' : `INGA PLAGG I ${active.toUpperCase()}`}
            </div>
            <div style={{ fontSize:'13px', color:'#999', marginBottom:'28px' }}>
              Fotografera och lägg till dina kläder
            </div>
            <button onClick={() => onNavigate('upload')}
              style={{ padding:'14px 28px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:'700', letterSpacing:'0.08em', cursor:'pointer' }}>
              + LÄGG TILL PLAGG
            </button>
          </div>
        )}

        {/* Grid – responsivt */}
        {!loading && filtered.length > 0 && (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',
            gap:'2px'
          }}>
            {filtered.map(item => (
              <div key={item.id}
                onClick={() => openDetail(item)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor:'pointer', background:'#f5f5f5', aspectRatio:'3/4', position:'relative', overflow:'hidden' }}>
                {item.photoURL
                  ? <img src={item.photoURL} alt={item.category}
                      style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s',
                        transform: hoveredId === item.id ? 'scale(1.04)' : 'scale(1)' }}/>
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px' }}>👗</div>
                }
                {/* Soptunna */}
                <button
                  onClick={e => deleteItem(e, item)}
                  title="Ta bort plagg"
                  style={{
                    position:'absolute', top:'8px', right:'8px',
                    width:'30px', height:'30px', borderRadius:'50%',
                    background:'rgba(0,0,0,0.5)', color:'#fff',
                    border:'none', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'background 0.15s', zIndex:10,
                  }}
                  onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background='rgba(220,38,38,0.9)' }}
                  onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.background='rgba(0,0,0,0.5)' }}
                >
                  <TrashIcon/>
                </button>
                {/* Sälj externt ♻️ – alltid synlig */}
                <button
                  onClick={e => { e.stopPropagation(); setSellExternal(item) }}
                  title="Sälj på Tradera / Vinted / eBay…"
                  style={{
                    position:'absolute', top:'8px', right:'46px',
                    width:'30px', height:'30px', borderRadius:'50%',
                    background:'rgba(22,163,74,0.75)', color:'#fff',
                    border:'none', cursor:'pointer', fontSize:'14px',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'background 0.15s', zIndex:10,
                  }}
                  onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background='rgba(22,163,74,1)' }}
                  onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.background='rgba(22,163,74,0.75)' }}
                >
                  ♻️
                </button>
                {/* TILL SALU stämpel */}
                {item.forSale && (
                  <>
                    {/* Halvtransparent overlay */}
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.18)', pointerEvents:'none', zIndex:2 }}/>
                    {/* Diagonal ribbon */}
                    <div style={{
                      position:'absolute', top:0, left:0, right:0, bottom:0,
                      overflow:'hidden', pointerEvents:'none', zIndex:3,
                    }}>
                      <div style={{
                        position:'absolute',
                        top:'28px', left:'-32px',
                        width:'140px',
                        background:'#e11d48',
                        color:'#fff',
                        fontSize:'9px',
                        fontWeight:'800',
                        letterSpacing:'0.12em',
                        textAlign:'center',
                        padding:'5px 0',
                        transform:'rotate(-45deg)',
                        boxShadow:'0 2px 6px rgba(0,0,0,0.25)',
                      }}>
                        TILL SALU
                      </div>
                    </div>
                    {/* Prisbadge */}
                    {item.salePrice && (
                      <div style={{
                        position:'absolute', bottom:'42px', right:'8px',
                        background:'#e11d48', color:'#fff',
                        fontSize:'11px', fontWeight:'800',
                        padding:'3px 8px', borderRadius:'3px',
                        zIndex:4, letterSpacing:'0.04em',
                        boxShadow:'0 1px 4px rgba(0,0,0,0.3)',
                      }}>
                        {item.salePrice} kr
                      </div>
                    )}
                  </>
                )}
                <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'10px 10px 8px', background:'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
                  <div style={{ fontSize:'10px', color:'#fff', fontWeight:'700', letterSpacing:'0.06em' }}>
                    {item.category?.toUpperCase()}
                  </div>
                  {item.brand && (
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.75)', marginTop:'1px' }}>{item.brand}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* ── Detail modal ── */}
      {sellExternal && (
        <SellExternalModal item={sellExternal} onClose={() => setSellExternal(null)}/>
      )}

      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', maxWidth:'380px', width:'100%', overflow:'hidden' }}>
            {/* Karusell med alla bilder */}
            {(selected.photos?.length > 0 || selected.photoURL) && (
              <div style={{ aspectRatio:'3/4', overflow:'hidden' }}>
                <ImageCarousel
                  photos={selected.photos?.length ? selected.photos : [selected.photoURL]}
                  style={{ height:'100%' }}
                />
              </div>
            )}
            <div style={{ padding:'20px' }}>
              <div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.08em', marginBottom:'4px' }}>{selected.category?.toUpperCase()}</div>
              {selected.brand && <div style={{ fontSize:'18px', fontWeight:'700', color:'#111', marginBottom:'14px' }}>{selected.brand}</div>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                {selected.color  && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>FÄRG</div><div style={{ fontSize:'14px', fontWeight:'600' }}>{selected.color}</div></div>}
                {selected.size   && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>STORLEK</div><div style={{ fontSize:'14px', fontWeight:'600' }}>{selected.size}</div></div>}
                {selected.fit    && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>PASSFORM</div><div style={{ fontSize:'13px', fontWeight:'600' }}>{selected.fit}</div></div>}
                {selected.season && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>SÄSONG</div><div style={{ fontSize:'14px', fontWeight:'600' }}>{selected.season}</div></div>}
                {selected.price  && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>PRIS</div><div style={{ fontSize:'14px', fontWeight:'600' }}>{selected.price} kr</div></div>}
                {selected.store  && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>KÖPT HOS</div><div style={{ fontSize:'14px', fontWeight:'600' }}>{selected.store}</div></div>}
              </div>
              {/* ── Sälj-sektion ── */}
              <div style={{ borderTop:'1px solid #f0f0f0', paddingTop:'16px', marginBottom:'16px' }}>
                <div style={{ fontSize:'11px', fontWeight:'700', letterSpacing:'0.08em', color:'#999', marginBottom:'10px' }}>
                  FLEA MARKET
                </div>
                {selected.forSale ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                      <span style={{ background:'#16a34a', color:'#fff', fontSize:'10px', fontWeight:'800', letterSpacing:'0.06em', padding:'4px 10px', borderRadius:'2px' }}>
                        SÄLJES
                      </span>
                      <span style={{ fontSize:'14px', fontWeight:'700' }}>{selected.salePrice} kr</span>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <input
                        type="number"
                        value={salePrice}
                        onChange={e => setSalePrice(e.target.value)}
                        placeholder="Ändra pris"
                        style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e0e0e0', fontSize:'14px', borderRadius:'2px', outline:'none' }}
                      />
                      <button onClick={markForSale} disabled={!salePrice || savingSale}
                        style={{ padding:'9px 14px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:'700', cursor:'pointer', opacity: !salePrice ? 0.4 : 1 }}>
                        UPPDATERA
                      </button>
                    </div>
                    {/* Sälj externt */}
                    <button onClick={() => setSellExternal(selected)}
                      style={{ marginTop:'8px', width:'100%', padding:'10px', background:'#f0fdf4', color:'#16a34a', border:'1.5px solid #86efac', fontSize:'12px', fontWeight:'700', letterSpacing:'0.05em', cursor:'pointer', borderRadius:'2px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                      ♻️ SÄLJ PÅ TRADERA / VINTED / EBAY…
                    </button>
                    <button onClick={removeFromSale}
                      style={{ marginTop:'6px', width:'100%', padding:'9px', background:'#fff', color:'#999', border:'1px solid #e0e0e0', fontSize:'11px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer' }}>
                      TA BORT FRÅN FLEA MARKET
                    </button>
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:'8px' }}>
                    <input
                      type="number"
                      value={salePrice}
                      onChange={e => setSalePrice(e.target.value)}
                      placeholder="Pris i kr"
                      style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e0e0e0', fontSize:'14px', borderRadius:'2px', outline:'none' }}
                    />
                    <button onClick={markForSale} disabled={!salePrice || savingSale}
                      style={{ padding:'9px 16px', background:'#16a34a', color:'#fff', border:'none', fontSize:'12px', fontWeight:'700', cursor:'pointer', opacity: !salePrice ? 0.4 : 1 }}>
                      {savingSale ? '…' : 'SÄLJ'}
                    </button>
                  </div>
                )}
              </div>

              <button onClick={() => setSelected(null)}
                style={{ width:'100%', padding:'13px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:'700', letterSpacing:'0.08em', cursor:'pointer' }}>
                STÄNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
