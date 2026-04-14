import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import ImageCarousel from '../components/ImageCarousel'

const FollowIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    {filled
      ? <path d="M19 8l2 2 4-4" stroke="currentColor"/>
      : <><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></>
    }
  </svg>
)

/* ── Icons ── */
const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? '#e11d48' : 'none'} stroke={filled ? '#e11d48' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

export default function FleaMarketPage({ user, onNavigate }) {
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [searchUser, setSearchUser] = useState('')
  const [searchBrand, setSearchBrand] = useState('')
  const [liked, setLiked]             = useState({})
  const [likesLoaded, setLikesLoaded] = useState(false)
  const [following, setFollowing]     = useState({})
  const [selectedSeller, setSelectedSeller] = useState(null) // { uid, name, items }
  const [selectedItem, setSelectedItem] = useState(null)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isMobile = windowWidth < 768

  // Load for-sale items
  useEffect(() => {
    getDocs(query(collection(db, 'wardrobeItems'), where('forSale', '==', true)))
      .then(snap => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Load who this user follows
  useEffect(() => {
    getDocs(query(collection(db, 'follows'), where('followerId', '==', user.uid)))
      .then(snap => {
        const map = {}
        snap.docs.forEach(d => { map[d.data().followingId] = true })
        setFollowing(map)
      })
      .catch(() => {})
  }, [user.uid])

  // Load this user's saved likes from Firestore
  useEffect(() => {
    getDocs(query(collection(db, 'likes'), where('uid', '==', user.uid)))
      .then(snap => {
        const map = {}
        snap.docs.forEach(d => { map[d.data().itemId] = true })
        setLiked(map)
        setLikesLoaded(true)
      })
      .catch(() => setLikesLoaded(true))
  }, [user.uid])

  const toggleFollow = useCallback((sellerId, e) => {
    e?.stopPropagation()
    if (sellerId === user.uid) return // kan inte följa sig själv
    const isNowFollowing = !following[sellerId]
    setFollowing(prev => ({ ...prev, [sellerId]: isNowFollowing }))
    const followRef = doc(db, 'follows', `${user.uid}_${sellerId}`)
    if (isNowFollowing) {
      setDoc(followRef, { followerId: user.uid, followingId: sellerId, createdAt: serverTimestamp() })
        .catch(() => setFollowing(prev => ({ ...prev, [sellerId]: false })))
    } else {
      deleteDoc(followRef)
        .catch(() => setFollowing(prev => ({ ...prev, [sellerId]: true })))
    }
  }, [following, user.uid])

  const toggleLike = useCallback((id, e) => {
    e?.stopPropagation()
    const isNowLiked = !liked[id]
    // Optimistic update
    setLiked(prev => ({ ...prev, [id]: isNowLiked }))
    // Persist to Firestore
    const likeRef = doc(db, 'likes', `${user.uid}_${id}`)
    if (isNowLiked) {
      setDoc(likeRef, { uid: user.uid, itemId: id, createdAt: serverTimestamp() })
        .catch(() => setLiked(prev => ({ ...prev, [id]: false }))) // revert on error
    } else {
      deleteDoc(likeRef)
        .catch(() => setLiked(prev => ({ ...prev, [id]: true }))) // revert on error
    }
  }, [liked, user.uid])

  /* Group all items (incl. own) by seller */
  const filtered = items.filter(i => {
    const matchUser  = !searchUser  || (i.sellerName || '').toLowerCase().includes(searchUser.toLowerCase())
    const matchBrand = !searchBrand || (i.brand || '').toLowerCase().includes(searchBrand.toLowerCase())
    return matchUser && matchBrand
  })

  const sellerGroups = Object.values(
    filtered.reduce((acc, item) => {
      const key = item.uid
      if (!acc[key]) acc[key] = { uid: key, name: item.sellerName || 'Okänd', items: [], isOwn: item.uid === user.uid }
      acc[key].items.push(item)
      return acc
    }, {})
  ).map(seller => ({
    ...seller,
    // Sort by most recently added, newest first
    items: [...seller.items].sort((a, b) => {
      const ta = a.createdAt?.seconds ?? 0
      const tb = b.createdAt?.seconds ?? 0
      return tb - ta
    })
  }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f0ece2', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* ── Search header ── */}
      <div style={{ background: '#e8e2d4', borderBottom: '1px solid #d9d2c0', padding: '20px 20px 16px', flexShrink: 0 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '800', letterSpacing: '0.12em', color: '#4a4035', textTransform: 'uppercase' }}>
            The Flea Market
          </h1>

          {/* Search inputs */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#9a8f7e', letterSpacing: '0.08em', marginBottom: '5px', textTransform: 'uppercase' }}>Användare</div>
              <input value={searchUser} onChange={e => setSearchUser(e.target.value)}
                placeholder="Sök person…"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #c8c0aa', borderRadius: '6px', fontSize: '13px', background: '#faf8f4', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#333' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#9a8f7e', letterSpacing: '0.08em', marginBottom: '5px', textTransform: 'uppercase' }}>Märke</div>
              <input value={searchBrand} onChange={e => setSearchBrand(e.target.value)}
                placeholder="Sök märke…"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #c8c0aa', borderRadius: '6px', fontSize: '13px', background: '#faf8f4', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#333' }}
              />
            </div>
            <button
              onClick={() => { setSearchUser(''); setSearchBrand('') }}
              style={{ padding: '9px 20px', background: '#4a4035', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'flex-end' }}>
              SÖK
            </button>
          </div>
        </div>
      </div>

      {/* ── Feed ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '16px 12px 80px' : '24px 20px 40px' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9a8f7e', fontSize: '13px' }}>Laddar…</div>
          ) : sellerGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: '#9a8f7e' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>Inga plagg till salu just nu</div>
              <div style={{ fontSize: '12px' }}>Bjud in vänner så växer marknaden!</div>
            </div>
          ) : isMobile ? (
            /* ── MOBILE: collage cards ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sellerGroups.map(seller => (
                <SellerCollageCard
                  key={seller.uid}
                  seller={seller}
                  liked={liked}
                  onLike={toggleLike}
                  onOpen={() => setSelectedSeller(seller)}
                  isOwn={seller.isOwn}
                />
              ))}
            </div>
          ) : (
            /* ── DESKTOP: grouped feed ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
              {sellerGroups.map(seller => (
                <div key={seller.uid}>
                  {/* Seller header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: seller.isOwn ? '#111' : '#c8bfa8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', flexShrink: 0 }}>
                        {seller.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#4a4035', letterSpacing: '0.04em' }}>
                          {seller.name}
                          {seller.isOwn && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#111', color: '#fff', padding: '2px 6px', borderRadius: '3px', verticalAlign: 'middle', letterSpacing: '0.06em' }}>DU</span>}
                        </span>
                        <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9a8f7e' }}>{seller.items.length} plagg</span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedSeller(seller)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#9a8f7e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px', letterSpacing: '0.04em' }}>
                      Se alla <ChevronRight/>
                    </button>
                  </div>

                  {/* Item grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {seller.items.slice(0, 8).map(item => (
                      <DesktopItemCard key={item.id} item={item} liked={liked[item.id]} onLike={e => toggleLike(item.id, e)} onClick={() => setSelectedItem(item)}/>
                    ))}
                  </div>

                  <div style={{ height: '1px', background: '#d9d2c0', marginTop: '28px' }}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Seller modal (mobile tap-in + desktop "se alla") ── */}
      {selectedSeller && (
        <SellerModal
          seller={selectedSeller}
          user={user}
          liked={liked}
          onLike={toggleLike}
          isFollowing={!!following[selectedSeller.uid]}
          onFollow={e => toggleFollow(selectedSeller.uid, e)}
          onItemClick={setSelectedItem}
          onClose={() => setSelectedSeller(null)}
        />
      )}

      {/* ── Item detail modal ── */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          user={user}
          liked={liked[selectedItem.id]}
          onLike={e => toggleLike(selectedItem.id, e)}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}

/* ── Mobile collage card ── */
function SellerCollageCard({ seller, liked, onLike, onOpen, isOwn }) {
  const [a, b, c] = seller.items

  const Img = ({ item, style }) => (
    <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#c8c0a8', ...style }}>
      {item?.photoURL
        ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: '100%', height: '100%', background: '#c8c0a8' }}/>
      }
    </div>
  )

  return (
    <div onClick={onOpen} style={{ background: '#e0d9c8', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>

      {/* Kollage-layout: stor bild vänster + två staplade höger */}
      <div style={{ display: 'flex', gap: '4px', padding: '12px 12px 6px', height: '220px' }}>
        {/* Stor vänsterbild */}
        <Img item={a} style={{ flex: '1 0 58%', height: '100%' }}/>
        {/* Höger: två staplade */}
        <div style={{ flex: '1 0 38%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Img item={b} style={{ flex: 1 }}/>
          <Img item={c} style={{ flex: 1 }}/>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: isOwn ? '#111' : '#a89e88', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>
            {seller.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#4a4035', lineHeight: 1.2 }}>
              {seller.name}
              {isOwn && <span style={{ marginLeft: '5px', fontSize: '9px', background: '#111', color: '#fff', padding: '1px 5px', borderRadius: '3px', verticalAlign: 'middle' }}>DU</span>}
            </div>
            <div style={{ fontSize: '10px', color: '#9a8f7e' }}>{seller.items.length} plagg</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={e => { e.stopPropagation(); onLike(seller.uid, e) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: liked[seller.uid] ? '#e11d48' : '#9a8f7e', display: 'flex', padding: '4px' }}>
            <HeartIcon filled={liked[seller.uid]}/>
          </button>
          <div style={{ fontSize: '11px', color: '#9a8f7e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
            Se loppis <ChevronRight/>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Desktop item card ── */
function DesktopItemCard({ item, liked, onLike, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', background: '#faf8f4', position: 'relative', transition: 'transform 0.15s', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{ aspectRatio: '3/4', overflow: 'hidden', background: '#e8e2d4' }}>
        {item.photoURL
          ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
          : <div style={{ width: '100%', height: '100%', background: '#d8d0be' }}/>
        }
      </div>
      <button onClick={onLike}
        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
        <HeartIcon filled={liked}/>
      </button>
      <div style={{ padding: '8px 10px 10px' }}>
        {item.brand && <div style={{ fontSize: '11px', fontWeight: '700', color: '#4a4035', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.brand}</div>}
        <div style={{ fontSize: '10px', color: '#9a8f7e', marginBottom: '4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.category?.split(' |')[0]}</div>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#333' }}>{item.salePrice} kr</div>
      </div>
    </div>
  )
}

/* ── Seller detail modal ── */
function SellerModal({ seller, user, liked, onLike, isFollowing, onFollow, onItemClick, onClose }) {
  const [favBrands, setFavBrands] = useState([])
  const [sellerCollages, setSellerCollages] = useState([])

  useEffect(() => {
    // Fetch seller's favorite brands
    getDoc(doc(db, 'users', seller.uid))
      .then(d => { if (d.exists()) setFavBrands(d.data().favBrands || []) })
      .catch(() => {})
    // Fetch seller's saved collages (max 4)
    getDocs(query(collection(db, 'savedCollages'), where('uid', '==', seller.uid)))
      .then(snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setSellerCollages(docs.slice(0, 4))
      })
      .catch(() => {})
  }, [seller.uid])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#f0ece2', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '600px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: seller.isOwn ? '#111' : '#a89e88', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800' }}>
              {seller.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#4a4035' }}>
                {seller.name}
                {seller.isOwn && <span style={{ marginLeft: '6px', fontSize: '9px', background: '#111', color: '#fff', padding: '2px 6px', borderRadius: '3px', verticalAlign: 'middle' }}>DU</span>}
              </div>
              <div style={{ fontSize: '11px', color: '#9a8f7e' }}>{seller.items.length} plagg till salu</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Följ-knapp — döljs för egna profilen */}
            {!seller.isOwn && (
              <button onClick={onFollow}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '20px', border: 'none',
                  background: isFollowing ? '#111' : '#fff',
                  color: isFollowing ? '#fff' : '#4a4035',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  letterSpacing: '0.04em', transition: 'all 0.15s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                }}>
                <FollowIcon filled={isFollowing}/>
                {isFollowing ? 'Följer' : 'Följ'}
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a8f7e', display: 'flex' }}><CloseIcon/></button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>

          {/* Favoritvarumärken */}
          {favBrands.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#9a8f7e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Favoritvarumärken
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {favBrands.map(brand => (
                  <span key={brand} style={{ padding: '4px 10px', background: '#e8e2d4', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#4a4035' }}>
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Kollage */}
          {sellerCollages.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#9a8f7e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Outfits & kollage
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {sellerCollages.map(c => (
                  <div key={c.id} style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', background: '#e8e2d4' }}>
                    {c.thumbnail
                      ? <img src={c.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                      : <div style={{ width: '100%', height: '100%', background: '#d0c9b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#9a8f7e' }}>
                          {c.name || 'Outfit'}
                        </div>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plagg till salu */}
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#9a8f7e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Till salu
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {seller.items.map(item => (
              <div key={item.id} onClick={() => onItemClick(item)} style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', background: '#e8e2d4' }}>
                <div style={{ aspectRatio: '3/4' }}>
                  {item.photoURL
                    ? <img src={item.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                    : <div style={{ width: '100%', height: '100%', background: '#d0c9b8' }}/>
                  }
                </div>
                <div style={{ padding: '6px 8px 8px' }}>
                  {item.brand && <div style={{ fontSize: '10px', fontWeight: '700', color: '#4a4035', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.brand}</div>}
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#333' }}>{item.salePrice} kr</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Item detail modal ── */
function ItemDetailModal({ item, user, liked, onLike, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#faf8f4', borderRadius: '20px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflow: 'auto' }}>

        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e8e2d4' }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: '#4a4035', letterSpacing: '0.04em' }}>
            {item.brand || item.category?.split(' |')[0]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={onLike} style={{ background: 'none', border: 'none', cursor: 'pointer', color: liked ? '#e11d48' : '#9a8f7e', display: 'flex' }}>
              <HeartIcon filled={liked}/>
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a8f7e', display: 'flex' }}><CloseIcon/></button>
          </div>
        </div>

        {(item.photos?.length > 0 || item.photoURL) && (
          <div style={{ aspectRatio: '3/4', overflow: 'hidden', background: '#e8e2d4' }}>
            <ImageCarousel
              photos={item.photos?.length ? item.photos : [item.photoURL]}
              style={{ height: '100%' }}
            />
          </div>
        )}

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#9a8f7e', letterSpacing: '0.06em', marginBottom: '3px' }}>{item.category?.toUpperCase()}</div>
              {item.brand && <div style={{ fontSize: '20px', fontWeight: '800', color: '#111' }}>{item.brand}</div>}
              {item.color && <div style={{ fontSize: '13px', color: '#777', marginTop: '2px' }}>{item.color}</div>}
              {item.size && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <span style={{ background: '#e8e2d4', color: '#4a4035', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px' }}>
                    STL {item.size}
                  </span>
                </div>
              )}
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#4a4035' }}>{item.salePrice} kr</div>
          </div>

          {/* Seller */}
          <div style={{ background: '#e8e2d4', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#a89e88', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', flexShrink: 0 }}>
              {item.sellerName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#4a4035' }}>{item.sellerName || 'Okänd säljare'}</div>
              <div style={{ fontSize: '11px', color: '#9a8f7e' }}>Säljer detta plagg</div>
            </div>
          </div>

          {item.uid !== user.uid ? (
            <a href={`mailto:?subject=Intresserad av ${item.brand || item.category} (${item.salePrice} kr)&body=Hej! Jag såg att du säljer ${item.brand || 'plagget'} för ${item.salePrice} kr i Wardrobe-appen. Är det fortfarande tillgängligt?`}
              style={{ display: 'block', width: '100%', padding: '14px', background: '#4a4035', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', letterSpacing: '0.06em', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
              KONTAKTA SÄLJAREN
            </a>
          ) : (
            <div style={{ padding: '12px 16px', background: '#e8e2d4', borderRadius: '10px', fontSize: '12px', color: '#9a8f7e', textAlign: 'center', fontWeight: '600' }}>
              Det här är ditt eget plagg
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
