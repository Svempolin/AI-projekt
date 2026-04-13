import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '../firebase'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

const BACKGROUNDS = [
  { label: 'Vit',        value: '#ffffff' },
  { label: 'Beige',      value: '#f5f0e8' },
  { label: 'Grå',        value: '#f0f0f0' },
  { label: 'Svart',      value: '#1a1a1a' },
  { label: 'Kräm',       value: '#faf6f0' },
  { label: 'Dusty rose', value: '#f2e0da' },
]

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const SaveIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)
const FolderIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>
)

export default function CollagePage({ user, onNavigate, loadedCollage }) {
  const [wardrobe, setWardrobe]         = useState([])
  const [canvasItems, setCanvasItems]   = useState(loadedCollage?.items || [])
  const [bg, setBg]                     = useState(loadedCollage?.bg || '#f5f0e8')
  const [saving, setSaving]             = useState(false)
  const [selectedId, setSelectedId]     = useState(null)
  const [dropHighlight, setDropHighlight] = useState(false)

  // Save modal
  const [showModal, setShowModal]           = useState(false)
  const [modalName, setModalName]           = useState('')
  const [modalCollection, setModalCollection] = useState('')
  const [newCollection, setNewCollection]   = useState('')
  const [existingCollections, setExistingCollections] = useState([])
  const [savingToCloud, setSavingToCloud]   = useState(false)
  const [saveSuccess, setSaveSuccess]       = useState(false)

  const canvasRef   = useRef()
  const dragging    = useRef(null)
  const resizing    = useRef(null)

  // ── Load wardrobe ────────────────────────────────────────────────
  useEffect(() => {
    getDocs(query(collection(db, 'wardrobeItems'), where('uid', '==', user.uid)))
      .then(snap => setWardrobe(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  // ── Load existing collection names ───────────────────────────────
  useEffect(() => {
    getDocs(query(collection(db, 'savedCollages'), where('uid', '==', user.uid)))
      .then(snap => {
        const names = [...new Set(snap.docs.map(d => d.data().collectionName).filter(Boolean))]
        setExistingCollections(names)
      })
  }, [user.uid])

  // ── Sidebar → canvas drag (pointer events) ───────────────────────
  const onSidebarPointerDown = (e, item) => {
    e.preventDefault()
    const ghost = document.createElement('div')
    ghost.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999;
      width:80px; height:107px; border-radius:4px; overflow:hidden;
      box-shadow:0 8px 24px rgba(0,0,0,0.25); opacity:0.9;
      left:${e.clientX - 40}px; top:${e.clientY - 54}px;
    `
    const img = document.createElement('img')
    img.src = item.photoURL || ''
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;'
    ghost.appendChild(img)
    document.body.appendChild(ghost)

    const onMove = (ev) => {
      ghost.style.left = `${ev.clientX - 40}px`
      ghost.style.top  = `${ev.clientY - 54}px`
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const over = ev.clientX >= rect.left && ev.clientX <= rect.right &&
                     ev.clientY >= rect.top  && ev.clientY <= rect.bottom
        setDropHighlight(over)
      }
    }

    const onUp = (ev) => {
      document.body.removeChild(ghost)
      setDropHighlight(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const over = ev.clientX >= rect.left && ev.clientX <= rect.right &&
                   ev.clientY >= rect.top  && ev.clientY <= rect.bottom
      if (!over) return
      const x = ev.clientX - rect.left - 80
      const y = ev.clientY - rect.top  - 80
      const newItem = {
        uid: Date.now(), photoURL: item.photoURL,
        category: item.category, brand: item.brand,
        x: Math.max(0, x), y: Math.max(0, y), width: 160,
      }
      setCanvasItems(p => [...p, newItem])
      setSelectedId(newItem.uid)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Move items on canvas ──────────────────────────────────────────
  const onItemPointerDown = (e, id) => {
    e.stopPropagation()
    setSelectedId(id)
    const item = canvasItems.find(i => i.uid === id)
    dragging.current = { id, offsetX: e.clientX - item.x, offsetY: e.clientY - item.y }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup',   onPointerUp)
  }

  const onPointerMove = useCallback((e) => {
    if (dragging.current) {
      const { id, offsetX, offsetY } = dragging.current
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = Math.max(0, Math.min(e.clientX - offsetX, rect.width  - 40))
      const y = Math.max(0, Math.min(e.clientY - offsetY, rect.height - 40))
      setCanvasItems(p => p.map(i => i.uid === id ? { ...i, x, y } : i))
    }
    if (resizing.current) {
      const { id, startX, startW } = resizing.current
      const delta = e.clientX - startX
      const width = Math.max(60, Math.min(startW + delta, 400))
      setCanvasItems(p => p.map(i => i.uid === id ? { ...i, width } : i))
    }
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = null
    resizing.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup',   onPointerUp)
  }, [onPointerMove])

  const onResizePointerDown = (e, id) => {
    e.stopPropagation()
    const item = canvasItems.find(i => i.uid === id)
    resizing.current = { id, startX: e.clientX, startW: item.width }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup',   onPointerUp)
  }

  const removeItem = (uid) => {
    setCanvasItems(p => p.filter(i => i.uid !== uid))
    if (selectedId === uid) setSelectedId(null)
  }

  // ── Generate thumbnail ────────────────────────────────────────────
  const generateThumbnail = async () => {
    const canvasEl  = canvasRef.current
    const rect      = canvasEl.getBoundingClientRect()
    const size      = 240
    const offscreen = document.createElement('canvas')
    offscreen.width  = size
    offscreen.height = size
    const ctx   = offscreen.getContext('2d')
    const scale = size / rect.width
    ctx.scale(scale, scale)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, rect.width, rect.height)
    for (const item of canvasItems) {
      await new Promise(res => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const aspect = img.naturalHeight / img.naturalWidth
          ctx.drawImage(img, item.x, item.y, item.width, item.width * aspect)
          res()
        }
        img.onerror = res
        img.src = item.photoURL
      })
    }
    return offscreen.toDataURL('image/jpeg', 0.7)
  }

  // ── Save collage to Firestore ─────────────────────────────────────
  const handleSaveToCloud = async () => {
    const colName = modalCollection === '__new__' ? newCollection.trim() : modalCollection
    if (!colName) return
    setSavingToCloud(true)
    try {
      const thumbnail = await generateThumbnail()
      await addDoc(collection(db, 'savedCollages'), {
        uid:            user.uid,
        name:           modalName.trim() || `Kollage ${new Date().toLocaleDateString('sv-SE')}`,
        collectionName: colName,
        items:          canvasItems,
        bg,
        thumbnail,
        createdAt:      serverTimestamp(),
      })
      setSaveSuccess(true)
      if (!existingCollections.includes(colName)) {
        setExistingCollections(p => [...p, colName])
      }
      setTimeout(() => {
        setSaveSuccess(false)
        setShowModal(false)
        setModalName('')
        setModalCollection('')
        setNewCollection('')
      }, 1500)
    } catch (err) {
      console.error(err)
    }
    setSavingToCloud(false)
  }

  // ── Save collage as PNG download ──────────────────────────────────
  const saveCollage = async () => {
    setSaving(true)
    const canvasEl  = canvasRef.current
    const rect      = canvasEl.getBoundingClientRect()
    const scale     = 2
    const offscreen = document.createElement('canvas')
    offscreen.width  = rect.width  * scale
    offscreen.height = rect.height * scale
    const ctx = offscreen.getContext('2d')
    ctx.scale(scale, scale)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, rect.width, rect.height)
    for (const item of canvasItems) {
      await new Promise(res => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const aspect = img.naturalHeight / img.naturalWidth
          ctx.drawImage(img, item.x, item.y, item.width, item.width * aspect)
          res()
        }
        img.onerror = res
        img.src = item.photoURL
      })
    }
    const link = document.createElement('a')
    link.download = `kollage-${Date.now()}.png`
    link.href = offscreen.toDataURL('image/png')
    link.click()
    setSaving(false)
  }

  const canSave = canvasItems.length > 0

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', fontFamily:"'Inter','Segoe UI',sans-serif", background:'#fff' }}>

      {/* ── Topbar ── */}
      <div style={{ borderBottom:'1px solid #e8e8e8', padding:'0 16px', height:'52px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, gap:'8px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => onNavigate('wardrobe')}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#111', display:'flex', alignItems:'center' }}>
            <BackIcon/>
          </button>
          <span style={{ fontWeight:'800', fontSize:'15px', letterSpacing:'0.08em' }}>BYGGKOLLAGE</span>
        </div>

        {/* Bakgrundsfärger */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <span style={{ fontSize:'11px', color:'#999', letterSpacing:'0.05em', marginRight:'4px' }}>BAKGRUND</span>
          {BACKGROUNDS.map(b => (
            <button key={b.value} onClick={() => setBg(b.value)} title={b.label}
              style={{ width:'22px', height:'22px', borderRadius:'50%', background:b.value, border: bg === b.value ? '2px solid #111' : '2px solid #e0e0e0', cursor:'pointer', flexShrink:0 }}/>
          ))}
        </div>

        <div style={{ display:'flex', gap:'8px' }}>
          {/* Spara i samling */}
          <button onClick={() => { if (canSave) setShowModal(true) }} disabled={!canSave}
            style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 14px', background: canSave ? '#fff' : '#f5f5f5', color: canSave ? '#111' : '#bbb', border: canSave ? '1.5px solid #111' : '1.5px solid #e0e0e0', fontSize:'12px', fontWeight:'700', letterSpacing:'0.07em', cursor: canSave ? 'pointer' : 'not-allowed' }}>
            <FolderIcon/> SPARA I SAMLING
          </button>
          {/* Ladda ner PNG */}
          <button onClick={saveCollage} disabled={saving || !canSave}
            style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 14px', background: canSave ? '#111' : '#e0e0e0', color:'#fff', border:'none', fontSize:'12px', fontWeight:'700', letterSpacing:'0.07em', cursor: canSave ? 'pointer' : 'not-allowed' }}>
            <DownloadIcon/> {saving ? 'SPARAR…' : 'SPARA BILD'}
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{ width:'120px', borderRight:'1px solid #e8e8e8', overflowY:'auto', flexShrink:0, background:'#fafafa' }}>
          <div style={{ padding:'10px 8px 6px', fontSize:'10px', color:'#aaa', letterSpacing:'0.08em', fontWeight:'700' }}>GARDEROB</div>
          {wardrobe.length === 0 && (
            <div style={{ padding:'12px 8px', fontSize:'11px', color:'#ccc', textAlign:'center' }}>Inga plagg ännu</div>
          )}
          {wardrobe.map(item => (
            <div key={item.id}
              onPointerDown={e => onSidebarPointerDown(e, item)}
              title={`${item.category} – håll och dra till canvasen`}
              style={{ margin:'4px 6px', cursor:'grab', borderRadius:'2px', overflow:'hidden', aspectRatio:'3/4', background:'#f0f0f0', position:'relative', userSelect:'none', touchAction:'none' }}>
              {item.photoURL
                ? <img src={item.photoURL} alt="" draggable={false}
                    style={{ width:'100%', height:'100%', objectFit:'cover', pointerEvents:'none', userSelect:'none' }}/>
                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px' }}>👗</div>
              }
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'3px 4px', background:'rgba(0,0,0,0.4)' }}>
                <div style={{ fontSize:'8px', color:'#fff', letterSpacing:'0.04em', fontWeight:'600', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                  {item.category?.split(' |')[0].toUpperCase()}
                </div>
              </div>
            </div>
          ))}
          <div style={{ padding:'10px 6px', fontSize:'10px', color:'#ccc', textAlign:'center' }}>
            Dra plagg till canvasen →
          </div>

          {/* Mina samlingar länk */}
          <div style={{ borderTop:'1px solid #e8e8e8', marginTop:'8px', padding:'10px 6px' }}>
            <button onClick={() => onNavigate('collections')}
              style={{ width:'100%', background:'none', border:'none', cursor:'pointer', fontSize:'10px', color:'#999', letterSpacing:'0.05em', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', padding:'4px 0' }}>
              <FolderIcon/>
              MINA SAMLINGAR
            </button>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div style={{ flex:1, overflow:'auto', display:'flex', alignItems:'center', justifyContent:'center', background:'#e8e8e8', padding:'24px' }}>
          <div ref={canvasRef} onClick={() => setSelectedId(null)}
            style={{ position:'relative', width:'600px', height:'600px', background: bg, boxShadow:'0 4px 32px rgba(0,0,0,0.18)', outline: dropHighlight ? '3px dashed #555' : 'none', flexShrink:0, overflow:'hidden' }}>

            {canvasItems.length === 0 && (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none', gap:'10px' }}>
                <div style={{ fontSize:'40px' }}>👗</div>
                <div style={{ fontSize:'13px', color:'#bbb', letterSpacing:'0.06em', textAlign:'center' }}>
                  DRAGEN KLÄDER HIT<br/>
                  <span style={{ fontSize:'11px' }}>från sidopanelen</span>
                </div>
              </div>
            )}

            {canvasItems.map(item => {
              const isSelected = selectedId === item.uid
              return (
                <div key={item.uid} onPointerDown={e => onItemPointerDown(e, item.uid)}
                  style={{ position:'absolute', left: item.x, top: item.y, width: item.width, height: item.width * (4/3), cursor:'grab', outline: isSelected ? '2px solid #111' : 'none', outlineOffset:'2px', userSelect:'none', touchAction:'none' }}>
                  <img src={item.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', pointerEvents:'none', display:'block' }}/>
                  {isSelected && (
                    <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); removeItem(item.uid) }}
                      style={{ position:'absolute', top:'-10px', right:'-10px', width:'22px', height:'22px', borderRadius:'50%', background:'#ff3b30', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.2)', zIndex:10 }}>
                      <TrashIcon/>
                    </button>
                  )}
                  {isSelected && (
                    <div onPointerDown={e => { e.stopPropagation(); onResizePointerDown(e, item.uid) }}
                      style={{ position:'absolute', bottom:'-6px', right:'-6px', width:'14px', height:'14px', background:'#111', borderRadius:'2px', cursor:'se-resize', zIndex:10 }}/>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom hint ── */}
      <div style={{ borderTop:'1px solid #e8e8e8', padding:'8px 16px', fontSize:'11px', color:'#bbb', letterSpacing:'0.04em', display:'flex', gap:'24px', flexShrink:0 }}>
        <span>📌 Klicka på ett plagg för att markera det</span>
        <span>↔ Dra i det svarta hörnet för att ändra storlek</span>
        <span>🗑 Klicka på rött kryss för att ta bort</span>
        <span>💾 "Spara bild" laddar ner kollagen som PNG</span>
      </div>

      {/* ── Spara i samling – modal ── */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background:'#fff', width:'380px', borderRadius:'4px', padding:'28px', boxShadow:'0 12px 48px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>

            {saveSuccess ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ fontSize:'36px', marginBottom:'12px' }}>✅</div>
                <div style={{ fontWeight:'700', fontSize:'16px', letterSpacing:'0.05em' }}>Kollaget sparat!</div>
              </div>
            ) : (
              <>
                <h2 style={{ margin:'0 0 20px', fontWeight:'800', fontSize:'16px', letterSpacing:'0.06em' }}>SPARA I SAMLING</h2>

                {/* Kollagenamn */}
                <label style={{ display:'block', fontSize:'11px', color:'#999', letterSpacing:'0.06em', marginBottom:'6px' }}>KOLLAGENAMN (valfritt)</label>
                <input
                  value={modalName}
                  onChange={e => setModalName(e.target.value)}
                  placeholder={`Kollage ${new Date().toLocaleDateString('sv-SE')}`}
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e0e0e0', fontSize:'14px', marginBottom:'16px', borderRadius:'2px', boxSizing:'border-box', outline:'none' }}
                />

                {/* Välj samling */}
                <label style={{ display:'block', fontSize:'11px', color:'#999', letterSpacing:'0.06em', marginBottom:'6px' }}>SAMLING</label>
                <select
                  value={modalCollection}
                  onChange={e => setModalCollection(e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e0e0e0', fontSize:'14px', marginBottom:'12px', borderRadius:'2px', background:'#fff', boxSizing:'border-box', outline:'none' }}>
                  <option value="">– Välj samling –</option>
                  {existingCollections.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__">➕ Skapa ny samling</option>
                </select>

                {/* Ny samling */}
                {modalCollection === '__new__' && (
                  <input
                    value={newCollection}
                    onChange={e => setNewCollection(e.target.value)}
                    placeholder='T.ex. "Spanien 2026" eller "Bröllop Malin"'
                    autoFocus
                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #111', fontSize:'14px', marginBottom:'12px', borderRadius:'2px', boxSizing:'border-box', outline:'none' }}
                  />
                )}

                <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
                  <button onClick={() => setShowModal(false)}
                    style={{ flex:1, padding:'12px', background:'#fff', border:'1.5px solid #e0e0e0', fontSize:'13px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.05em' }}>
                    AVBRYT
                  </button>
                  <button
                    onClick={handleSaveToCloud}
                    disabled={savingToCloud || !modalCollection || (modalCollection === '__new__' && !newCollection.trim())}
                    style={{ flex:2, padding:'12px', background: (!modalCollection || (modalCollection === '__new__' && !newCollection.trim())) ? '#e0e0e0' : '#111', color:'#fff', border:'none', fontSize:'13px', fontWeight:'700', cursor:'pointer', letterSpacing:'0.05em' }}>
                    {savingToCloud ? 'SPARAR…' : 'SPARA'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
