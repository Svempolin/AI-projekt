import { useState, useEffect, useRef } from 'react'
import { auth, db, storage } from '../firebase'
import { signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { updateProfile } from 'firebase/auth'
import SellExternalModal from '../components/SellExternalModal'
import ImageCarousel from '../components/ImageCarousel'

const POPULAR_BRANDS = [
  'Zara', 'H&M', '& Other Stories', 'Arket', 'COS', 'Weekday', 'Monki',
  'Mango', 'Bershka', 'Pull & Bear', 'ACNE Studios', 'Ganni', 'Totême',
  'Filippa K', 'Tiger of Sweden', 'Hope', 'Our Legacy', 'Jacquemus',
  'The Frankie Shop', 'Reformation', 'Sandro', 'Isabel Marant', 'A.P.C.',
  "Levi's", 'Nike', 'Adidas', 'New Balance', 'Gucci', 'Prada', 'Saint Laurent',
]

// Hårdkodade trendkort — enkelt att byta ut mot API senare
const TRENDING = [
  {
    id: 1,
    colors: 'Beige · Camel · Off-white',
    style: 'Quiet Luxury',
    material: 'Kashmir, Merinoull',
    link: 'https://www.toteme-studio.com',
    brand: 'Totême',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80',
  },
  {
    id: 2,
    colors: 'Rust · Moss · Chocolate',
    style: 'Cottagecore / Earth tones',
    material: 'Linne, Bomull',
    link: 'https://www.ganni.com',
    brand: 'Ganni',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
  },
  {
    id: 3,
    colors: 'Svart · Mörkgrå · Navy',
    style: 'Minimalism / Architectural',
    material: 'Ull, Läder',
    link: 'https://www.hope-sthlm.com',
    brand: 'Hope Stockholm',
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80',
  },
]

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

export default function Dashboard({ user, onNavigate }) {
  const [profile, setProfile]             = useState(null)
  const [uploading, setUploading]         = useState(false)
  const [progress, setProgress]           = useState(0)
  const [wardrobeItems, setWardrobeItems] = useState([])
  const [collages, setCollages]           = useState([])
  const [editingBio, setEditingBio]       = useState(false)
  const [bioText, setBioText]             = useState('')
  const [savingBio, setSavingBio]         = useState(false)
  const [favBrands, setFavBrands]         = useState([])
  const [customBrand, setCustomBrand]     = useState('')
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [showAllBrandSection, setShowAllBrandSection] = useState(false)
  const [selectedSaleItem, setSelectedSaleItem] = useState(null)
  const [sellExternal, setSellExternal]         = useState(null)
  const [windowWidth, setWindowWidth]           = useState(window.innerWidth)
  const [followerCount, setFollowerCount]       = useState(0)
  const fileRef = useRef()

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isMobile = windowWidth < 640
  const isTablet = windowWidth < 900

  // Hämta följarantal
  useEffect(() => {
    getDocs(query(collection(db, 'follows'), where('followingId', '==', user.uid)))
      .then(snap => setFollowerCount(snap.size))
      .catch(() => {})
  }, [user.uid])

  useEffect(() => {
    getDoc(doc(db, 'users', user.uid)).then(d => {
      if (d.exists()) {
        setProfile(d.data())
        setBioText(d.data().bio || '')
        setFavBrands(d.data().favBrands || [])
      }
    })
    getDocs(query(collection(db, 'wardrobeItems'), where('uid', '==', user.uid)))
      .then(snap => setWardrobeItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    getDocs(query(collection(db, 'savedCollages'), where('uid', '==', user.uid)))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        // Sortera nyast först, visa max 8
        all.sort((a, b) => (b.savedAt?.seconds ?? 0) - (a.savedAt?.seconds ?? 0))
        setCollages(all.slice(0, 2))
      })
  }, [user.uid])

  const firstName    = profile?.firstName || ''
  const lastName     = profile?.lastName  || ''
  const fullName     = [firstName, lastName].filter(Boolean).join(' ') || user.displayName || user.email
  const avatar       = profile?.photoURL || user.photoURL
  const forSaleItems = wardrobeItems.filter(i => i.forSale)
  const handle       = `@${user.email?.split('@')[0]}`

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true); setProgress(0)
    const storageRef = ref(storage, `profilePhotos/${user.uid}/avatar`)
    const task = uploadBytesResumable(storageRef, file)
    task.on('state_changed',
      snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      err  => { console.error(err); setUploading(false) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        await updateDoc(doc(db, 'users', user.uid), { photoURL: url })
        await updateProfile(user, { photoURL: url })
        setProfile(p => ({ ...p, photoURL: url }))
        setUploading(false)
      }
    )
  }

  const saveBio = async () => {
    setSavingBio(true)
    await updateDoc(doc(db, 'users', user.uid), { bio: bioText })
    setProfile(p => ({ ...p, bio: bioText }))
    setEditingBio(false)
    setSavingBio(false)
  }

  const toggleBrand = async (brand) => {
    const updated = favBrands.includes(brand) ? favBrands.filter(b => b !== brand) : [...favBrands, brand]
    setFavBrands(updated)
    await updateDoc(doc(db, 'users', user.uid), { favBrands: updated })
  }

  const addCustomBrand = async () => {
    const trimmed = customBrand.trim()
    if (!trimmed || favBrands.includes(trimmed)) return
    const updated = [...favBrands, trimmed]
    setFavBrands(updated)
    setCustomBrand('')
    await updateDoc(doc(db, 'users', user.uid), { favBrands: updated })
  }

  const removeFromSale = async (item) => {
    await updateDoc(doc(db, 'wardrobeItems', item.id), { forSale: false, salePrice: null })
    setWardrobeItems(prev => prev.map(i => i.id === item.id ? { ...i, forSale: false, salePrice: null } : i))
    setSelectedSaleItem(null)
  }

  const deleteItem = async (item) => {
    if (!window.confirm(`Ta bort "${item.brand || item.category}"? Det går inte att ångra.`)) return
    await deleteDoc(doc(db, 'wardrobeItems', item.id))
    try {
      const match = item.photoURL?.match(/\/o\/(.+?)(\?|$)/)
      if (match) await deleteObject(ref(storage, decodeURIComponent(match[1])))
    } catch { /* ignore */ }
    setWardrobeItems(prev => prev.filter(i => i.id !== item.id))
    setSelectedSaleItem(null)
  }

  const NAV_LINKS = [
    { label: 'Min garderob',  page: 'wardrobe' },
    { label: 'Mina säljer',   page: 'fleamarket' },
    { label: 'Planeraren',    page: 'planner' },
    { label: 'Kollage',       page: 'collections' },
  ]

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#fafafa', fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* ── Top navigation ── */}
      <nav style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', flexShrink:0, zIndex:200 }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto', padding:`0 ${isMobile ? '16px' : '24px'}`, height:'52px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
          {/* Logo */}
          <button onClick={() => onNavigate('home')}
            style={{ background:'none', border:'none', cursor:'pointer', fontWeight:'900', fontSize:'15px', letterSpacing:'0.1em', color:'#111', flexShrink:0 }}>
            WARDROBE
          </button>

          {/* Nav links — döljs på mobil */}
          {!isMobile && (
            <div style={{ display:'flex', gap:'2px', alignItems:'center' }}>
              {NAV_LINKS.map(n => (
                <button key={n.page} onClick={() => onNavigate(n.page)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:'8px 12px', fontSize:'12px', fontWeight:'600', letterSpacing:'0.04em', color:'#555', borderRadius:'6px', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background='none'}>
                  {n.label}
                </button>
              ))}
            </div>
          )}

          {/* Right: avatar + logout */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
            <div style={{ width:'30px', height:'30px', borderRadius:'50%', overflow:'hidden', background:'#e2e4e9', flexShrink:0, cursor:'pointer' }}
              onClick={() => fileRef.current.click()}>
              {avatar
                ? <img src={avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', color:'#1a1a2e' }}>{fullName.charAt(0).toUpperCase()}</div>
              }
            </div>
            <button onClick={() => signOut(auth)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#999', fontWeight:'600', letterSpacing:'0.04em' }}>
              {isMobile ? '↩' : 'Logga ut'}
            </button>
          </div>
        </div>

        {/* Mobil-nav: horisontell scrollbar under huvudraden */}
        {isMobile && (
          <div style={{ display:'flex', overflowX:'auto', gap:'0', borderTop:'1px solid #f5f5f5', scrollbarWidth:'none' }}>
            {NAV_LINKS.map(n => (
              <button key={n.page} onClick={() => onNavigate(n.page)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 16px', fontSize:'11px', fontWeight:'700', letterSpacing:'0.05em', color:'#555', whiteSpace:'nowrap', flexShrink:0 }}>
                {n.label.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </nav>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:`0 ${isMobile ? '16px' : '24px'} 80px` }}>

        {/* ── Profilhuvud ── */}
        <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? '16px' : '32px', padding: isMobile ? '28px 0 24px' : '40px 0 32px', borderBottom:'1px solid #e8e8e8', marginBottom: isMobile ? '28px' : '40px', textAlign: isMobile ? 'center' : 'left' }}>

          {/* Avatar */}
          <div style={{ flexShrink:0, position:'relative' }}>
            <div style={{ width: isMobile ? '80px' : '96px', height: isMobile ? '80px' : '96px', borderRadius:'50%', overflow:'hidden', background:'#e2e4e9', display:'flex', alignItems:'center', justifyContent:'center', fontSize: isMobile ? '28px' : '36px', fontWeight:'700', color:'#1a1a2e', border:'3px solid #fff', boxShadow:'0 2px 12px rgba(0,0,0,0.1)' }}>
              {avatar
                ? <img src={avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : fullName.charAt(0).toUpperCase()}
            </div>
            <button onClick={() => fileRef.current.click()}
              style={{ position:'absolute', bottom:'2px', right:'2px', width:'26px', height:'26px', borderRadius:'50%', background:'#1a1a2e', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <CameraIcon/>
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display:'none' }} onChange={handlePhotoChange}/>
          </div>

          {/* Info */}
          <div style={{ flex:1, minWidth:0, width: isMobile ? '100%' : 'auto' }}>
            <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight:'900', color:'#111', margin:'0 0 2px', letterSpacing:'-0.02em' }}>{fullName}</h1>
            <p style={{ fontSize:'13px', color:'#aaa', margin:'0 0 10px', letterSpacing:'0.02em' }}>{handle}</p>

            {/* Bio */}
            {editingBio ? (
              <div style={{ marginBottom:'14px' }}>
                <textarea value={bioText} onChange={e => setBioText(e.target.value)}
                  placeholder="Berätta lite om din stil…" rows={2} autoFocus
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #1a1a2e', borderRadius:'8px', fontSize:'14px', resize:'none', outline:'none', boxSizing:'border-box', fontFamily:'inherit', lineHeight:'1.5' }}/>
                <div style={{ display:'flex', gap:'8px', marginTop:'8px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                  <button onClick={saveBio} disabled={savingBio}
                    style={{ padding:'7px 16px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                    {savingBio ? '…' : 'SPARA'}
                  </button>
                  <button onClick={() => { setEditingBio(false); setBioText(profile?.bio || '') }}
                    style={{ padding:'7px 12px', background:'none', color:'#aaa', border:'1px solid #e0e0e0', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'16px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                <p style={{ margin:0, fontSize:'14px', color: profile?.bio ? '#555' : '#ccc', fontStyle: profile?.bio ? 'normal' : 'italic', lineHeight:'1.6' }}>
                  {profile?.bio || 'Lägg till en bio…'}
                </p>
                <button onClick={() => setEditingBio(true)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', padding:'2px', flexShrink:0, marginTop:'2px' }}>
                  <EditIcon/>
                </button>
              </div>
            )}

            {/* Stats */}
            <div style={{ display:'flex', gap: isMobile ? '20px' : '28px', justifyContent: isMobile ? 'center' : 'flex-start', marginBottom:'16px' }}>
              {[
                { label:'Plagg',   value: wardrobeItems.filter(i => !i.forSale).length },
                { label:'Säljer',  value: forSaleItems.length },
                { label:'Outfits', value: collages.length },
                { label:'Följare', value: followerCount },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight:'800', color:'#111' }}>{s.value}</div>
                  <div style={{ fontSize:'10px', color:'#aaa', letterSpacing:'0.06em', fontWeight:'600' }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* CTA-knappar */}
            <div style={{ display:'flex', gap:'8px', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap:'wrap' }}>
              <button onClick={() => onNavigate('upload')}
                style={{ padding:'10px 20px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'800', letterSpacing:'0.06em', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                LÄGG TILL PLAGG
              </button>
              <button onClick={() => onNavigate('collage')}
                style={{ padding:'10px 20px', background:'#fff', color:'#1a1a2e', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'12px', fontWeight:'800', letterSpacing:'0.06em', cursor:'pointer' }}>
                NYTT KOLLAGE
              </button>
            </div>
          </div>
        </div>

        {uploading && (
          <div style={{ marginBottom:'16px' }}>
            <div style={{ background:'#f0f0f0', borderRadius:'99px', height:'3px', overflow:'hidden' }}>
              <div style={{ width:`${progress}%`, height:'100%', background:'#1a1a2e', transition:'width 0.3s' }}/>
            </div>
          </div>
        )}

        {/* ── Current Trending ── */}
        <section style={{ marginBottom:'48px' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:'12px', marginBottom:'20px' }}>
            <h2 style={{ fontSize:'16px', fontWeight:'900', color:'#111', margin:0, letterSpacing:'0.04em' }}>CURRENT TRENDING</h2>
            {!isMobile && <span style={{ fontSize:'12px', color:'#bbb' }}>Vad som händer i mode just nu</span>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
            {TRENDING.map(t => (
              <div key={t.id} style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', background:'#fff', border:'1px solid #f0f0f0', overflow:'hidden' }}>
                {/* Bild — överst på mobil, höger på desktop */}
                {isMobile && (
                  <div style={{ height:'160px', overflow:'hidden', background:'#f5f5f5' }}>
                    <img src={t.image} alt={t.style} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none'; e.target.parentNode.style.background='#f0ede8' }}/>
                  </div>
                )}
                <div style={{ flex:1, padding: isMobile ? '16px' : '20px 24px' }}>
                  <div style={{ fontSize:'10px', color:'#bbb', letterSpacing:'0.1em', fontWeight:'700', marginBottom:'4px' }}>COLORS</div>
                  <div style={{ fontSize:'13px', color:'#777', marginBottom:'8px' }}>{t.colors}</div>
                  <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight:'800', color:'#111', marginBottom:'2px' }}>{t.style}</div>
                  <div style={{ fontSize:'12px', color:'#999', marginBottom:'14px' }}>{t.material}</div>
                  <a href={t.link} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:'11px', color:'#1a1a2e', fontWeight:'700', letterSpacing:'0.06em', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'4px', borderBottom:'1.5px solid #1a1a2e', paddingBottom:'1px' }}>
                    TILL {t.brand.toUpperCase()} →
                  </a>
                </div>
                {!isMobile && (
                  <div style={{ width:'180px', height:'120px', flexShrink:0, overflow:'hidden', background:'#f5f5f5' }}>
                    <img src={t.image} alt={t.style} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none'; e.target.parentNode.style.background='#f0ede8' }}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Dina senaste outfits ── */}
        <section style={{ marginBottom:'48px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:'12px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:'900', color:'#111', margin:0, letterSpacing:'0.04em' }}>DINA SENASTE OUTFITS</h2>
              <button onClick={() => onNavigate('collections')}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#aaa', fontWeight:'600', padding:0, textDecoration:'underline', textUnderlineOffset:'3px' }}>
                se alla
              </button>
            </div>
            <button onClick={() => onNavigate('collage')}
              style={{ padding:'8px 16px', background:'none', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'11px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer', color:'#555' }}>
              + NYTT KOLLAGE
            </button>
          </div>

          {collages.length === 0 ? (
            <div style={{ background:'#fff', border:'1.5px dashed #e0e0e0', borderRadius:'12px', padding:'48px 24px', textAlign:'center' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>🖼</div>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#333', marginBottom:'6px' }}>Inga kollage än</div>
              <div style={{ fontSize:'12px', color:'#bbb', marginBottom:'20px' }}>Kombinera dina plagg och spara outfits</div>
              <button onClick={() => onNavigate('collage')}
                style={{ padding:'10px 24px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer' }}>
                SKAPA KOLLAGE
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap:'8px' }}>
              {collages.map(c => (
                <div key={c.id} onClick={() => onNavigate('collections')}
                  style={{ position:'relative', aspectRatio:'1/1', background:'#f5f5f5', borderRadius:'4px', overflow:'hidden', cursor:'pointer' }}>
                  {c.thumbnail
                    ? <img src={c.thumbnail} alt={c.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.3s' }}
                        onMouseEnter={e => e.currentTarget.style.transform='scale(1.04)'}
                        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}/>
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px' }}>🖼</div>
                  }
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'10px 12px', background:'linear-gradient(transparent, rgba(0,0,0,0.55))' }}>
                    <div style={{ fontSize:'11px', color:'#fff', fontWeight:'700', letterSpacing:'0.04em' }}>
                      {c.name || 'Outfit'}
                    </div>
                  </div>
                </div>
              ))}
              {/* + kort */}
              <div onClick={() => onNavigate('collage')}
                style={{ aspectRatio:'1/1', background:'#fff', border:'2px dashed #e0e0e0', borderRadius:'4px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', cursor:'pointer', color:'#ccc' }}>
                <span style={{ fontSize:'32px', lineHeight:1 }}>+</span>
                <span style={{ fontSize:'11px', fontWeight:'700', letterSpacing:'0.06em' }}>NYTT</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Till Salu ── */}
        {forSaleItems.length > 0 && (
          <section style={{ marginBottom:'48px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:'12px' }}>
                <h2 style={{ fontSize:'16px', fontWeight:'900', color:'#111', margin:0, letterSpacing:'0.04em' }}>TILL SALU</h2>
                <span style={{ fontSize:'12px', color:'#bbb' }}>{forSaleItems.length} plagg</span>
              </div>
              <button onClick={() => onNavigate('fleamarket')}
                style={{ padding:'8px 16px', background:'none', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'11px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer', color:'#555' }}>
                SE FLEA MARKET
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))', gap:'8px' }}>
              {forSaleItems.map(item => (
                <div key={item.id} onClick={() => setSelectedSaleItem(item)}
                  style={{ position:'relative', aspectRatio:'3/4', background:'#f5f5f5', borderRadius:'4px', overflow:'hidden', cursor:'pointer' }}>
                  {item.photoURL
                    ? <img src={item.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.3s' }}
                        onMouseEnter={e => e.currentTarget.style.transform='scale(1.04)'}
                        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}/>
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px' }}>👗</div>
                  }
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(transparent 55%, rgba(0,0,0,0.65))', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'10px' }}>
                    {item.brand && <div style={{ fontSize:'11px', color:'#fff', fontWeight:'700' }}>{item.brand}</div>}
                    {item.size && <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.75)' }}>Stl {item.size}</div>}
                    <div style={{ fontSize:'13px', color:'#fff', fontWeight:'800' }}>{item.salePrice} kr</div>
                  </div>
                  <div style={{ position:'absolute', top:'8px', left:'8px', background:'#16a34a', color:'#fff', fontSize:'8px', fontWeight:'800', letterSpacing:'0.06em', padding:'2px 6px', borderRadius:'3px' }}>SÄLJES</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Favoritvarumärken ── */}
        <section style={{ marginBottom:'48px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:'12px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:'900', color:'#111', margin:0, letterSpacing:'0.04em' }}>FAVORITVARUMÄRKEN</h2>
              <span style={{ fontSize:'12px', color:'#bbb' }}>Används för att hitta folk med liknande stil</span>
            </div>
            <button onClick={() => setShowAllBrandSection(s => !s)}
              style={{ padding:'8px 16px', background:'none', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'11px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer', color:'#555' }}>
              {showAllBrandSection ? 'STÄNG' : 'ÄNDRA'}
            </button>
          </div>

          {/* Valda märken – alltid synliga */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom: showAllBrandSection ? '20px' : '0' }}>
            {favBrands.length > 0 ? favBrands.map(brand => (
              <button key={brand} onClick={() => showAllBrandSection && toggleBrand(brand)}
                style={{ padding:'6px 14px', borderRadius:'20px', background:'#1a1a2e', color:'#fff', border:'none', fontSize:'12px', fontWeight:'600', cursor: showAllBrandSection ? 'pointer' : 'default', display:'flex', alignItems:'center', gap:'5px' }}>
                {brand} {showAllBrandSection && <span style={{ opacity:0.6, fontSize:'13px' }}>×</span>}
              </button>
            )) : (
              <p style={{ fontSize:'13px', color:'#bbb', margin:0 }}>Inga favoritvarumärken än — tryck "ÄNDRA" för att lägga till.</p>
            )}
          </div>

          {/* Redigeringsläge */}
          {showAllBrandSection && (
            <div style={{ background:'#fff', border:'1.5px solid #f0f0f0', borderRadius:'12px', padding:'20px' }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'16px' }}>
                {(showAllBrands ? POPULAR_BRANDS : POPULAR_BRANDS.slice(0, 15))
                  .filter(b => !favBrands.includes(b))
                  .map(brand => (
                    <button key={brand} onClick={() => toggleBrand(brand)}
                      style={{ padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', cursor:'pointer', border:'1.5px solid #e8e8e8', background:'#fafafa', color:'#555', transition:'all 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#1a1a2e'; e.currentTarget.style.color='#1a1a2e' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#e8e8e8'; e.currentTarget.style.color='#555' }}>
                      {brand}
                    </button>
                  ))}
                <button onClick={() => setShowAllBrands(s => !s)}
                  style={{ padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', cursor:'pointer', border:'1.5px dashed #ddd', background:'transparent', color:'#aaa' }}>
                  {showAllBrands ? '↑ Färre' : `+${POPULAR_BRANDS.filter(b => !favBrands.includes(b)).length - 15} fler`}
                </button>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <input value={customBrand} onChange={e => setCustomBrand(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomBrand()}
                  placeholder="Lägg till eget märke…"
                  style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e8e8e8', borderRadius:'8px', fontSize:'13px', outline:'none', fontFamily:'inherit' }}/>
                <button onClick={addCustomBrand} disabled={!customBrand.trim()}
                  style={{ padding:'9px 16px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'700', cursor:'pointer', opacity: !customBrand.trim() ? 0.3 : 1 }}>
                  + LÄGG TILL
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Garderoben i siffror ── */}
        <section style={{ marginBottom:'40px' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:'10px', marginBottom:'16px' }}>
            <h2 style={{ fontSize:'13px', fontWeight:'800', letterSpacing:'0.08em', color:'#111' }}>GARDEROBEN I SIFFROR</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap:'12px' }}>
            {[
              { emoji:'👗', label:'Plagg totalt', value: wardrobeItems.length },
              { emoji:'🏷️', label:'Till salu', value: forSaleItems.length },
              { emoji:'🖼️', label:'Kollage sparade', value: collages.length },
              { emoji:'💰', label:'Potentiellt värde', value: forSaleItems.reduce((s, i) => s + (Number(i.salePrice)||0), 0) + ' kr' },
            ].map(stat => (
              <div key={stat.label} style={{ background:'#fff', border:'1.5px solid #f0f0f0', borderRadius:'14px', padding:'20px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>{stat.emoji}</div>
                <div style={{ fontSize:'22px', fontWeight:'800', color:'#111', marginBottom:'4px' }}>{stat.value}</div>
                <div style={{ fontSize:'11px', color:'#aaa', fontWeight:'600', letterSpacing:'0.04em' }}>{stat.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <div style={{ textAlign:'center', paddingTop:'32px', borderTop:'1px solid #f0f0f0' }}>
          <div style={{ fontSize:'11px', color:'#ddd', marginBottom:'12px' }}>{user.email}</div>
          <button onClick={() => signOut(auth)}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#ccc', fontWeight:'600', textDecoration:'underline' }}>
            Logga ut
          </button>
        </div>

      </div>
      </div>

      {/* ── Modaler ── */}
      {sellExternal && (
        <SellExternalModal item={sellExternal} onClose={() => setSellExternal(null)}/>
      )}

      {selectedSaleItem && (
        <div onClick={() => setSelectedSaleItem(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:'16px', maxWidth:'360px', width:'100%', overflow:'hidden' }}>
            {(selectedSaleItem.photos?.length > 0 || selectedSaleItem.photoURL) && (
              <div style={{ aspectRatio:'3/4', maxHeight:'320px', overflow:'hidden' }}>
                <ImageCarousel
                  photos={selectedSaleItem.photos?.length ? selectedSaleItem.photos : [selectedSaleItem.photoURL]}
                  style={{ height:'100%' }}
                />
              </div>
            )}
            <div style={{ padding:'20px' }}>
              <div style={{ marginBottom:'16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                  <span style={{ background:'#16a34a', color:'#fff', fontSize:'9px', fontWeight:'800', letterSpacing:'0.08em', padding:'3px 8px', borderRadius:'4px' }}>SÄLJES</span>
                  <span style={{ fontSize:'18px', fontWeight:'800', color:'#111' }}>{selectedSaleItem.salePrice} kr</span>
                  {selectedSaleItem.size && <span style={{ background:'#f0f0f0', color:'#555', fontSize:'11px', fontWeight:'700', padding:'2px 8px', borderRadius:'6px' }}>Stl {selectedSaleItem.size}</span>}
                </div>
                {selectedSaleItem.brand && <div style={{ fontSize:'15px', fontWeight:'700', color:'#333' }}>{selectedSaleItem.brand}</div>}
                {selectedSaleItem.category && <div style={{ fontSize:'12px', color:'#aaa', marginTop:'2px' }}>{selectedSaleItem.category}</div>}
                {selectedSaleItem.fit && <div style={{ fontSize:'12px', color:'#888', marginTop:'4px' }}>{selectedSaleItem.fit}</div>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <button onClick={() => { setSelectedSaleItem(null); setSellExternal(selectedSaleItem) }}
                  style={{ width:'100%', padding:'13px', background:'#f0fdf4', color:'#16a34a', border:'1.5px solid #86efac', borderRadius:'10px', fontSize:'13px', fontWeight:'800', letterSpacing:'0.05em', cursor:'pointer' }}>
                  ♻️ SÄLJ PÅ TRADERA / VINTED / EBAY…
                </button>
                <button onClick={() => removeFromSale(selectedSaleItem)}
                  style={{ width:'100%', padding:'12px', background:'#fff', color:'#555', border:'1.5px solid #e0e0e0', borderRadius:'10px', fontSize:'12px', fontWeight:'700', letterSpacing:'0.05em', cursor:'pointer' }}>
                  ↩ TA BORT FRÅN FLEA MARKET
                </button>
                <button onClick={() => deleteItem(selectedSaleItem)}
                  style={{ width:'100%', padding:'12px', background:'#fff', color:'#dc2626', border:'1.5px solid #fecaca', borderRadius:'10px', fontSize:'12px', fontWeight:'700', letterSpacing:'0.05em', cursor:'pointer' }}>
                  🗑 RADERA PLAGG
                </button>
                <button onClick={() => setSelectedSaleItem(null)}
                  style={{ width:'100%', padding:'11px', background:'#111', color:'#fff', border:'none', borderRadius:'10px', fontSize:'12px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer', marginTop:'4px' }}>
                  STÄNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
