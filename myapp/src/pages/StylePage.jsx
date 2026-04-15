import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '../firebase'
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'

const CATEGORIES = [
  'Alla', 'Blazers', 'Dresses', 'Shirts | Blouses', 'Tops',
  'T-Shirts | Tanks', 'Co-ord Sets', 'Jeans', 'Pants', 'Skirts',
  'Shorts | Skorts', 'Jackets | Trenches', 'Knitwear',
  'Cardigans | Sweaters', 'Shoes', 'Accessories',
]

const BACKGROUNDS = [
  { label: 'Kräm',  value: '#faf8f5' },
  { label: 'Vit',   value: '#ffffff' },
  { label: 'Beige', value: '#f5f0e8' },
  { label: 'Grå',   value: '#f0f0f0' },
  { label: 'Dusty', value: '#f2e0da' },
  { label: 'Svart', value: '#1a1a1a' },
]


// ── Item card in the browse panel ──
function ItemCard({ item, onDragStart, onClick }) {
  const [hovered, setHovered] = useState(false)
  const photo = item.photos?.length ? item.photos[0] : item.photoURL

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'grab', borderRadius: '10px', overflow: 'hidden',
        background: '#fff', border: '1.5px solid #f0f0f0',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 6px 18px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}>

      <div style={{ aspectRatio: '3/4', background: '#f5f5f5', overflow: 'hidden', position: 'relative' }}>
        {photo
          ? <img src={photo} alt="" draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}/>
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>👗</div>
        }
        {hovered && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: 'rgba(255,255,255,0.96)', borderRadius: '6px', padding: '5px 10px', fontSize: '10px', fontWeight: '800', color: '#111', letterSpacing: '0.06em' }}>
              + LÄGG TILL
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#111', marginBottom: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {item.brand || '–'}
        </div>
        <div style={{ fontSize: '10px', color: '#bbb', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {item.category?.split(' |')[0]}{item.size ? ` · Stl ${item.size}` : ''}
        </div>
      </div>
    </div>
  )
}

// ── Main StylePage ──
export default function StylePage({ user, onNavigate }) {
  const [items, setItems]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [active, setActive]                 = useState('Alla')
  const [search, setSearch]                 = useState('')
  const [canvasItems, setCanvasItems]       = useState([])
  const [selectedId, setSelectedId]         = useState(null)
  const [bg, setBg]                         = useState('#faf8f5')
  const [mobileTab, setMobileTab]           = useState('browse')
  const [showSaveModal, setShowSaveModal]   = useState(false)
  const [saveName, setSaveName]             = useState('')
  const [saving, setSaving]                 = useState(false)
  const [saveSuccess, setSaveSuccess]       = useState(false)
  const [windowWidth, setWindowWidth]       = useState(window.innerWidth)

  const canvasRef     = useRef()
  const dragItemRef   = useRef(null)
  const movingRef     = useRef(null)
  const moveOffsetRef = useRef({ x: 0, y: 0 })
  const zCounter      = useRef(1)

  const isMobile = windowWidth < 768

  // Window resize
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Fetch wardrobe
  useEffect(() => {
    const q = query(collection(db, 'wardrobeItems'), where('uid', '==', user.uid))
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user.uid])

  // Filtered items
  const filtered = items.filter(i => {
    const matchCat    = active === 'Alla' || i.category === active
    const matchSearch = !search || [i.brand, i.category, i.color].join(' ').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // ── Drop from left panel (desktop drag-and-drop) ──
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (!dragItemRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - 60
    const y = e.clientY - rect.top - 80
    setCanvasItems(prev => [...prev, {
      instanceId: `${dragItemRef.current.id}_${Date.now()}`,
      photoURL:   dragItemRef.current.photos?.length ? dragItemRef.current.photos[0] : dragItemRef.current.photoURL,
      brand:      dragItemRef.current.brand,
      category:   dragItemRef.current.category,
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: 130,
    }])
    dragItemRef.current = null
  }, [])

  // Smart position based on clothing category
  const getSmartPosition = useCallback((item, cw, ch) => {
    const cat = (item.category || '').toLowerCase()
    const sameCategory = canvasItems.filter(i => i.category === item.category).length
    const shift = sameCategory * 18

    if (cat.includes('shoe') || cat.includes('sko')) {
      return { x: cw / 2 - 50 + shift, y: ch * 0.74 + shift, width: 100 }
    }
    if (cat.includes('jean') || cat.includes('pant') || cat.includes('byxa') || cat.includes('shorts') || cat.includes('skort')) {
      return { x: cw / 2 - 65 + shift, y: ch * 0.50 + shift, width: 130 }
    }
    if (cat.includes('skirt') || cat.includes('kjol')) {
      return { x: cw / 2 - 65 + shift, y: ch * 0.50 + shift, width: 130 }
    }
    if (cat.includes('dress') || cat.includes('klänning')) {
      return { x: cw / 2 - 80 + shift, y: ch * 0.16 + shift, width: 160 }
    }
    if (cat.includes('co-ord')) {
      return { x: cw / 2 - 80 + shift, y: ch * 0.16 + shift, width: 160 }
    }
    if (cat.includes('jacket') || cat.includes('trench') || cat.includes('blazer')) {
      return { x: cw / 2 - 75 + shift, y: ch * 0.15 + shift, width: 150 }
    }
    if (cat.includes('cardigan') || cat.includes('knitwear') || cat.includes('sweater')) {
      return { x: cw / 2 - 65 + shift, y: ch * 0.18 + shift, width: 140 }
    }
    if (cat.includes('accessori') || cat.includes('bag') || cat.includes('väska')) {
      return { x: cw * 0.06 + shift, y: ch * 0.38 + shift, width: 85 }
    }
    // Default: tops, t-shirts, shirts, blouses etc.
    return { x: cw / 2 - 65 + shift, y: ch * 0.17 + shift, width: 130 }
  }, [canvasItems])

  // Click to add (works on both mobile and desktop)
  const addToCanvas = useCallback((item) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const cw   = rect?.width  || 320
    const ch   = rect?.height || 500
    const pos  = getSmartPosition(item, cw, ch)

    setCanvasItems(prev => [...prev, {
      instanceId: `${item.id}_${Date.now()}`,
      photoURL:   item.photos?.length ? item.photos[0] : item.photoURL,
      brand:      item.brand,
      category:   item.category,
      x: Math.max(0, Math.min(cw - pos.width, pos.x)),
      y: Math.max(0, pos.y),
      width: pos.width,
      z: ++zCounter.current,
    }])
    if (isMobile) setMobileTab('board')
  }, [canvasItems, isMobile, getSmartPosition])

  // ── Move canvas items ──
  const startMove = useCallback((e, instanceId) => {
    e.stopPropagation()
    setSelectedId(instanceId)
    const item     = canvasItems.find(i => i.instanceId === instanceId)
    if (!item || !canvasRef.current) return
    const rect     = canvasRef.current.getBoundingClientRect()
    const clientX  = e.touches ? e.touches[0].clientX : e.clientX
    const clientY  = e.touches ? e.touches[0].clientY : e.clientY
    movingRef.current     = instanceId
    moveOffsetRef.current = { x: clientX - rect.left - item.x, y: clientY - rect.top - item.y }
    // Lyft plagget överst vid klick/drag
    const newZ = ++zCounter.current
    setCanvasItems(prev => prev.map(i =>
      i.instanceId === instanceId ? { ...i, z: newZ } : i
    ))
  }, [canvasItems])

  const onPointerMove = useCallback((e) => {
    if (!movingRef.current || !canvasRef.current) return
    const rect    = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left - moveOffsetRef.current.x
    const y = clientY - rect.top  - moveOffsetRef.current.y
    setCanvasItems(prev => prev.map(i =>
      i.instanceId === movingRef.current ? { ...i, x: Math.max(0, x), y: Math.max(0, y) } : i
    ))
  }, [])

  const onPointerUp = useCallback(() => { movingRef.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup',   onPointerUp)
    window.addEventListener('touchmove', onPointerMove, { passive: false })
    window.addEventListener('touchend',  onPointerUp)
    return () => {
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup',   onPointerUp)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('touchend',  onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  // Resize item
  const resize = (instanceId, delta) => {
    setCanvasItems(prev => prev.map(i =>
      i.instanceId === instanceId ? { ...i, width: Math.max(60, Math.min(320, i.width + delta)) } : i
    ))
  }

  // Delete from canvas
  const deleteCanvasItem = (instanceId) => {
    setCanvasItems(prev => prev.filter(i => i.instanceId !== instanceId))
    setSelectedId(null)
  }

  // ── Save outfit ──
  const handleSave = async () => {
    if (!saveName.trim() || canvasItems.length === 0) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'savedCollages'), {
        uid:            user.uid,
        name:           saveName.trim(),
        collectionName: 'Outfits',
        items:          canvasItems,
        bg,
        thumbnail:      canvasItems[0]?.photoURL || null,
        savedAt:        serverTimestamp(),
        createdAt:      serverTimestamp(),
      })
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setShowSaveModal(false)
        setSaveName('')
      }, 1500)
    } catch (err) {
      console.error('Save error:', err)
    }
    setSaving(false)
  }

  const canSave = canvasItems.length > 0

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: "'Inter','Segoe UI',sans-serif" }}
      onClick={() => setSelectedId(null)}>

      {/* ── Topbar ── */}
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 16px', height: '48px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 100 }}>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: '300px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Sök plagg…"
            style={{ width: '100%', padding: '7px 12px', border: '1.5px solid #ececec', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', background: '#fafafa', boxSizing: 'border-box' }}/>
        </div>

        <div style={{ flex: 1 }}/>

        {/* Mobile only: Hantera-knapp */}
        {isMobile && (
          <button onClick={() => onNavigate('manage')}
            style={{ padding: '6px 12px', background: 'none', border: '1px solid #e8e8e8', borderRadius: '8px', fontSize: '11px', color: '#888', cursor: 'pointer', fontWeight: '600', letterSpacing: '0.04em', flexShrink: 0 }}>
            Hantera
          </button>
        )}

        {/* Clear canvas */}
        {canvasItems.length > 0 && (
          <button onClick={() => { setCanvasItems([]); setSelectedId(null) }}
            style={{ padding: '6px 12px', background: 'none', border: '1px solid #e8e8e8', borderRadius: '8px', fontSize: '11px', color: '#999', cursor: 'pointer', fontWeight: '600', flexShrink: 0 }}>
            Rensa
          </button>
        )}

        {/* Save button */}
        <button onClick={() => canSave && setShowSaveModal(true)} disabled={!canSave}
          style={{ padding: '7px 16px', background: canSave ? '#111' : '#e8e8e8', color: canSave ? '#fff' : '#bbb', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '800', letterSpacing: '0.05em', cursor: canSave ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.15s' }}>
          {isMobile ? 'Spara' : 'Spara outfit'}
        </button>
      </div>

      {/* ── Mobile tab switcher ── */}
      {isMobile && (
        <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid #e8e8e8', background: '#fff' }}>
          {[
            { key: 'browse', label: 'GARDEROB' },
            { key: 'board',  label: `KOLLAGE${canvasItems.length > 0 ? ` (${canvasItems.length})` : ''}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setMobileTab(tab.key)}
              style={{ flex: 1, padding: '12px 8px', background: 'none', border: 'none', borderBottom: mobileTab === tab.key ? '2px solid #111' : '2px solid transparent', fontWeight: '800', fontSize: '11px', letterSpacing: '0.06em', color: mobileTab === tab.key ? '#111' : '#bbb', cursor: 'pointer', transition: 'all 0.15s' }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main content: split panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ═══ LEFT: Wardrobe browser ═══ */}
        {(!isMobile || mobileTab === 'browse') && (
          <div style={{ width: isMobile ? '100%' : '40%', display: 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid #ececec', background: '#fff' }}>

            {/* Category tabs */}
            <div style={{ flexShrink: 0, overflowX: 'auto', display: 'flex', borderBottom: '1px solid #f0f0f0', scrollbarWidth: 'none', padding: '0 8px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActive(cat)}
                  style={{
                    padding: '10px 12px', background: 'none', border: 'none',
                    borderBottom: active === cat ? '2px solid #111' : '2px solid transparent',
                    fontWeight: active === cat ? '800' : '500',
                    fontSize: '11px', letterSpacing: '0.04em',
                    color: active === cat ? '#111' : '#aaa',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all 0.15s',
                  }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Items count */}
            <div style={{ flexShrink: 0, padding: '8px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', color: '#ccc', fontWeight: '600', letterSpacing: '0.06em' }}>
                {filtered.length} PLAGG
              </span>
              <button onClick={() => onNavigate('upload')}
                style={{ background: '#111', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', cursor: 'pointer' }}>
                + LÄGG TILL PLAGG
              </button>
            </div>

            {/* Items grid */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 10px 80px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#ddd', fontSize: '13px' }}>Laddar…</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>👗</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginBottom: '6px' }}>
                    {items.length === 0 ? 'Din garderob är tom' : 'Inga plagg matchar'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '16px' }}>
                    {items.length === 0 ? 'Lägg till dina kläder för att börja' : 'Prova en annan kategori'}
                  </div>
                  {items.length === 0 && (
                    <button onClick={() => onNavigate('manage')}
                      style={{ padding: '10px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.05em' }}>
                      + LÄGG TILL PLAGG
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {filtered.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onDragStart={() => { dragItemRef.current = item }}
                      onClick={() => addToCanvas(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ RIGHT: Style board / canvas ═══ */}
        {(!isMobile || mobileTab === 'board') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Canvas toolbar */}
            <div style={{ flexShrink: 0, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', color: canvasItems.length === 0 ? '#ddd' : '#555' }}>
                {canvasItems.length === 0
                  ? (isMobile ? 'TRYCK PÅ ETT PLAGG FÖR ATT LÄGGA TILL' : 'KLICKA ELLER DRA PLAGG FRÅN GARDEROBEN')
                  : `${canvasItems.length} PLAGG · KLICKA FÖR ATT VÄLJA`
                }
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Background swatches */}
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {BACKGROUNDS.map(b => (
                    <button key={b.value} onClick={e => { e.stopPropagation(); setBg(b.value) }} title={b.label}
                      style={{ width: '16px', height: '16px', borderRadius: '50%', background: b.value, border: bg === b.value ? '2px solid #333' : '1.5px solid #ddd', cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'transform 0.1s', transform: bg === b.value ? 'scale(1.25)' : 'scale(1)' }}/>
                  ))}
                </div>
              </div>
            </div>

            {/* The canvas */}
            <div
              ref={canvasRef}
              style={{ flex: 1, position: 'relative', background: bg, overflow: 'hidden', cursor: 'default' }}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}>

              {/* Empty state hint */}
              {canvasItems.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: '12px' }}>
                  <div style={{ fontSize: '48px', opacity: 0.2 }}>🎨</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#bbb', letterSpacing: '0.08em', textAlign: 'center', maxWidth: '200px', lineHeight: 1.5 }}>
                    {isMobile ? 'GÅ TILL GARDEROB OCH TRYCK PÅ ETT PLAGG' : 'KLICKA PÅ ETT PLAGG ELLER DRA HIT DET'}
                  </div>
                </div>
              )}

              {/* Placed items */}
              {canvasItems.map((item) => {
                const isSelected = selectedId === item.instanceId
                return (
                  <div
                    key={item.instanceId}
                    style={{
                      position: 'absolute',
                      left: item.x, top: item.y,
                      width: item.width,
                      cursor: isSelected ? 'move' : 'pointer',
                      userSelect: 'none',
                      zIndex: item.z || 1,
                      filter: isSelected
                        ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.28))'
                        : 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))',
                      transition: movingRef.current === item.instanceId ? 'none' : 'filter 0.15s',
                    }}
                    onClick={e => { e.stopPropagation(); setSelectedId(item.instanceId) }}
                    onMouseDown={e => startMove(e, item.instanceId)}
                    onTouchStart={e => { e.preventDefault(); startMove(e, item.instanceId) }}>

                    {/* Image */}
                    <img
                      src={item.photoURL}
                      alt={item.brand || item.category}
                      draggable={false}
                      style={{ width: '100%', display: 'block', pointerEvents: 'none', borderRadius: '6px' }}/>

                    {/* Selection ring */}
                    {isSelected && (
                      <div style={{ position: 'absolute', inset: '-3px', border: '2.5px solid #6366f1', borderRadius: '8px', pointerEvents: 'none' }}/>
                    )}

                    {/* Delete button — visas bara när plagget är valt */}
                    {isSelected && <button
                      onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                      onClick={e => { e.stopPropagation(); deleteCanvasItem(item.instanceId) }}
                      style={{
                        position: 'absolute', top: '-9px', right: '-9px',
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: '#111', color: '#fff',
                        border: '2px solid #fff',
                        cursor: 'pointer', fontSize: '13px', fontWeight: '900',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 30, padding: 0, lineHeight: 1,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                      }}>
                      ×
                    </button>}

                    {/* Resize buttons — visas vid val */}
                    {isSelected && (
                      <div style={{ position: 'absolute', bottom: '-28px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', zIndex: 30 }}>
                        <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); resize(item.instanceId, -15) }}
                          style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          −
                        </button>
                        <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); resize(item.instanceId, 15) }}
                          style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          +
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Save modal ── */}
      {showSaveModal && (
        <div onClick={() => setShowSaveModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px', padding: '28px', maxWidth: '340px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '900', letterSpacing: '0.04em' }}>SPARA OUTFIT</h3>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#aaa' }}>{canvasItems.length} plagg · sparas i "Outfits"</p>

            <input
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Ge outfiten ett namn…"
              autoFocus
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '16px' }}/>

            {saveSuccess ? (
              <div style={{ textAlign: 'center', padding: '12px', fontSize: '22px' }}>✅ Outfit sparad!</div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowSaveModal(false)}
                  style={{ flex: 1, padding: '13px', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  Avbryt
                </button>
                <button onClick={handleSave} disabled={!saveName.trim() || saving}
                  style={{ flex: 2, padding: '13px', background: saveName.trim() ? '#111' : '#e0e0e0', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: saveName.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.05em' }}>
                  {saving ? 'SPARAR…' : 'SPARA'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
