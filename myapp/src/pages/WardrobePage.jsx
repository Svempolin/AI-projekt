import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { signOut } from 'firebase/auth'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'

const CATEGORIES = [
  'Alla', 'Blazers', 'Dresses', 'Shirts | Blouses', 'Tops',
  'T-Shirts | Tanks', 'Co-ord Sets', 'Jeans', 'Pants', 'Skirts',
  'Shorts | Skorts', 'Swimwear', 'Jackets | Trenches', 'Knitwear',
  'Cardigans | Sweaters', 'Suede | Leather', 'Sweatshirts | Sweatpants',
  'Halters', 'Bodysuits', 'Lingerie', 'Accessories', 'Shoes'
]

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
  const [items, setItems]     = useState([])
  const [active, setActive]   = useState('Alla')
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState(null)

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

  const filtered = active === 'Alla' ? items : items.filter(i => i.category === active)

  const selectCategory = (cat) => {
    setActive(cat)
    setMenuOpen(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Inter','Segoe UI',sans-serif" }}>

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
        <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontWeight:'800', fontSize:'16px', letterSpacing:'0.08em' }}>KATEGORIER</span>
          <button onClick={() => setMenuOpen(false)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#111', display:'flex', alignItems:'center' }}>
            <CloseIcon/>
          </button>
        </div>

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
      <div style={{ position:'sticky', top:0, zIndex:100, background:'#fff', borderBottom:'1px solid #e8e8e8' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', padding:'0 16px', height:'52px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* Hamburger + title */}
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <button onClick={() => setMenuOpen(true)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#111', display:'flex', alignItems:'center', padding:'4px' }}>
              <MenuIcon/>
            </button>
            <span style={{ fontWeight:'800', fontSize:'16px', letterSpacing:'0.08em' }}>WARDROBE</span>
          </div>

          {/* Right actions */}
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <button onClick={() => onNavigate('collections')}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'#fff', color:'#111', border:'1px solid #e2e4e9', fontSize:'12px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer' }}>
              📁 SAMLINGAR
            </button>
            <button onClick={() => onNavigate('collage')}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'#fff', color:'#111', border:'1px solid #111', fontSize:'12px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer' }}>
              🖼 KOLLAGE
            </button>
            <button onClick={() => onNavigate('upload')}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer' }}>
              <PlusIcon/> LÄGG TILL
            </button>
            <button onClick={() => onNavigate('profile')}
              style={{ display:'flex', alignItems:'center', padding:'8px', background:'#fff', border:'1px solid #e2e4e9', cursor:'pointer', color:'#444' }}>
              <UserIcon/>
            </button>
          </div>
        </div>

        {/* Aktiv kategori-indikator */}
        <div style={{ borderTop:'1px solid #f0f0f0', padding:'10px 16px', display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'12px', color:'#999', letterSpacing:'0.04em' }}>
            {active === 'Alla' ? 'ALLA KATEGORIER' : active.toUpperCase()}
          </span>
          <span style={{ fontSize:'12px', color:'#ccc' }}>·</span>
          <span style={{ fontSize:'12px', color:'#999' }}>{filtered.length} PLAGG</span>
          {active !== 'Alla' && (
            <button onClick={() => setActive('Alla')}
              style={{ marginLeft:'auto', fontSize:'11px', color:'#999', background:'none', border:'1px solid #e8e8e8', padding:'3px 10px', cursor:'pointer', letterSpacing:'0.04em' }}>
              RENSA FILTER
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'0' }}>

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
              <div key={item.id} onClick={() => setSelected(item)}
                style={{ cursor:'pointer', background:'#f5f5f5', aspectRatio:'3/4', position:'relative', overflow:'hidden' }}>
                {item.photoURL
                  ? <img src={item.photoURL} alt={item.category}
                      style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s' }}
                      onMouseEnter={e => e.currentTarget.style.transform='scale(1.04)'}
                      onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}/>
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px' }}>👗</div>
                }
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

      {/* ── Detail modal ── */}
      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', maxWidth:'380px', width:'100%', overflow:'hidden' }}>
            {selected.photoURL && (
              <img src={selected.photoURL} alt="" style={{ width:'100%', aspectRatio:'3/4', objectFit:'cover', display:'block' }}/>
            )}
            <div style={{ padding:'20px' }}>
              <div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.08em', marginBottom:'4px' }}>{selected.category?.toUpperCase()}</div>
              {selected.brand && <div style={{ fontSize:'18px', fontWeight:'700', color:'#111', marginBottom:'14px' }}>{selected.brand}</div>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                {selected.color  && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>FÄRG</div><div style={{ fontSize:'14px', fontWeight:'600' }}>{selected.color}</div></div>}
                {selected.season && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>SÄSONG</div><div style={{ fontSize:'14px', fontWeight:'600' }}>{selected.season}</div></div>}
                {selected.price  && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>PRIS</div><div style={{ fontSize:'14px', fontWeight:'600' }}>{selected.price} kr</div></div>}
                {selected.store  && <div><div style={{ fontSize:'10px', color:'#999', letterSpacing:'0.06em', marginBottom:'3px' }}>KÖPT HOS</div><div style={{ fontSize:'14px', fontWeight:'600' }}>{selected.store}</div></div>}
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
