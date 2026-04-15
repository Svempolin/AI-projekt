import { useState, useRef, useEffect } from 'react'
import { db, storage } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { removeBackground } from '../utils/backgroundRemoval'

const CATEGORIES = [
  'Blazers', 'Dresses', 'Shirts | Blouses', 'Tops',
  'T-Shirts | Tanks', 'Co-ord Sets', 'Jeans', 'Pants', 'Skirts',
  'Shorts | Skorts', 'Swimwear', 'Jackets | Trenches', 'Knitwear',
  'Cardigans | Sweaters', 'Suede | Leather', 'Sweatshirts | Sweatpants',
  'Halters', 'Bodysuits', 'Lingerie', 'Accessories', 'Shoes'
]
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const MAX_PHOTOS = 5

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const CameraIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

export default function UploadPage({ user, onNavigate }) {
  // photos = [{file, preview, bgRemoved, originalFile, originalPreview}]
  const [photos, setPhotos]       = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [form, setForm]           = useState({ category:'', color:'', brand:'', season:'', price:'', store:'', size:'', fit:'' })
  const [loading, setLoading]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [done, setDone]           = useState(false)
  const [removing, setRemoving]   = useState(false)
  const [removingStatus, setRemovingStatus] = useState('')
  const [modelProgress, setModelProgress]   = useState(0)
  const [bgError, setBgError]     = useState(null)

  const mainFileRef = useRef()
  const addFileRef  = useRef()
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const isMobile = windowWidth < 768

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const activePhoto = photos[activeIdx] ?? null

  // Lägg till en eller flera filer
  const addFiles = (files) => {
    const toAdd = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (photos.length + toAdd.length >= MAX_PHOTOS) break
      const preview = URL.createObjectURL(file)
      toAdd.push({ file, preview, bgRemoved: false, originalFile: file, originalPreview: preview })
    }
    if (!toAdd.length) return
    setPhotos(prev => {
      const updated = [...prev, ...toAdd]
      setActiveIdx(prev.length) // välj den första nya
      return updated
    })
  }

  const loadFirstPhoto = (file) => {
    if (!file?.type.startsWith('image/')) return
    const preview = URL.createObjectURL(file)
    const entry = { file, preview, bgRemoved: false, originalFile: file, originalPreview: preview }
    setPhotos([entry])
    setActiveIdx(0)
    setBgError(null)
  }

  const removePhoto = (e, idx) => {
    e.stopPropagation()
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      setActiveIdx(i => Math.min(i, Math.max(0, updated.length - 1)))
      return updated
    })
  }

  // Ta bort bakgrund på aktiv bild
  const handleRemoveBg = async () => {
    if (!activePhoto) return
    setBgError(null)
    setRemoving(true)
    setModelProgress(0)

    try {
      let blob = null
      const clipdropKey = import.meta.env.VITE_CLIPDROP_API_KEY
      if (clipdropKey && clipdropKey !== 'din_nyckel_här') {
        try {
          setRemovingStatus('clipdrop')
          const fd = new FormData()
          fd.append('image_file', activePhoto.file, activePhoto.file.name)
          const res = await fetch('https://clipdrop-api.co/remove-background/v1', {
            method:'POST', headers:{ 'x-api-key': clipdropKey }, body: fd,
          })
          if (res.ok) blob = await res.blob()
          else console.warn('Clipdrop misslyckades')
        } catch { console.warn('Clipdrop ej tillgänglig') }
      }

      if (!blob) {
        setRemovingStatus('loading')
        blob = await removeBackground(activePhoto.file, (status, prog) => {
          setRemovingStatus(status)
          if (prog !== undefined) setModelProgress(prog)
        })
      }

      const url     = URL.createObjectURL(blob)
      const newFile = new File([blob], 'no-bg.png', { type: 'image/png' })
      setPhotos(prev => prev.map((p, i) =>
        i === activeIdx ? { ...p, file: newFile, preview: url, bgRemoved: true } : p
      ))
    } catch (err) {
      console.error('Bakgrundsbortagning:', err)
      setBgError('general')
    } finally {
      setRemoving(false)
      setRemovingStatus('')
    }
  }

  const revertBg = () => {
    setPhotos(prev => prev.map((p, i) =>
      i === activeIdx ? { ...p, file: p.originalFile, preview: p.originalPreview, bgRemoved: false } : p
    ))
    setBgError(null)
  }

  const submit = async e => {
    e.preventDefault()
    if (!photos.length || !form.category) return
    setLoading(true); setProgress(0)

    try {
      const uploadedUrls = []
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i]
        const storageRef = ref(storage, `wardrobeItems/${user.uid}/${Date.now()}_${i}_${p.file.name}`)
        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, p.file)
          task.on('state_changed',
            snap => {
              const pct = ((i + snap.bytesTransferred / snap.totalBytes) / photos.length) * 100
              setProgress(Math.round(pct))
            },
            reject,
            async () => {
              uploadedUrls.push(await getDownloadURL(task.snapshot.ref))
              resolve()
            }
          )
        })
      }

      await addDoc(collection(db, 'wardrobeItems'), {
        uid:       user.uid,
        photoURL:  uploadedUrls[0],        // bakåtkompatibilitet
        photos:    uploadedUrls,           // alla bilder
        category:  form.category,
        color:     form.color,
        brand:     form.brand,
        season:    form.season,
        price:     form.price,
        store:     form.store,
        size:      form.size,
        fit:       form.fit,
        createdAt: serverTimestamp(),
      })
      setDone(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setDone(false); setPhotos([]); setActiveIdx(0)
    setBgError(null)
    setForm({ category:'', color:'', brand:'', season:'', price:'', store:'', size:'', fit:'' })
  }

  // ── Success ──────────────────────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'Inter','Segoe UI',sans-serif", padding:'32px 24px', boxSizing:'border-box', width:'100%' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', width:'100%', maxWidth:'320px' }}>
        {/* Professionell check-ikon istället för emoji */}
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'#111', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 style={{ fontSize:'22px', fontWeight:'800', color:'#111', margin:0, textAlign:'center', letterSpacing:'-0.01em' }}>Plagget är sparat!</h2>
        <p style={{ fontSize:'14px', color:'#999', textAlign:'center', margin:0, lineHeight:'1.5' }}>Det syns nu i din garderob under {form.category}.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'12px', width:'100%' }}>
          <button onClick={() => onNavigate('wardrobe')}
            style={{ width:'100%', padding:'14px', background:'#111', color:'#fff', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'800', letterSpacing:'0.06em', cursor:'pointer' }}>
            SE GARDEROB
          </button>
          <button onClick={reset}
            style={{ width:'100%', padding:'14px', background:'#fff', color:'#111', border:'1.5px solid #e0e0e0', borderRadius:'10px', fontSize:'13px', fontWeight:'700', letterSpacing:'0.05em', cursor:'pointer' }}>
            + LÄGG TILL FLER
          </button>
        </div>
      </div>
    </div>
  )

  const inputStyle = { padding:'12px', border:'1px solid #e2e4e9', fontSize:'14px', color:'#111', width:'100%', background:'#fafafa', appearance:'none', boxSizing:'border-box' }
  const labelStyle = { fontSize:'11px', color:'#999', letterSpacing:'0.06em', fontWeight:'600', marginBottom:'6px', display:'block' }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#fff', fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* Topbar */}
      <div style={{ flexShrink:0, zIndex:100, background:'#fff', borderBottom:'1px solid #e8e8e8' }}>
        <div style={{ maxWidth:'600px', margin:'0 auto', padding:'0 16px', height:'52px', display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => onNavigate('wardrobe')}
            style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', color:'#111' }}>
            <BackIcon/>
          </button>
          <span style={{ fontWeight:'700', fontSize:'14px', letterSpacing:'0.08em' }}>LÄGG TILL PLAGG</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
      <div style={{ maxWidth:'600px', margin:'0 auto', padding: isMobile ? '20px 20px 100px' : '24px 32px 80px' }}>
        <form onSubmit={submit}>

          {/* ── Huvud-fotoarea ── */}
          <div
            onClick={() => photos.length === 0 && mainFileRef.current.click()}
            onDrop={e => { e.preventDefault(); photos.length === 0 ? loadFirstPhoto(e.dataTransfer.files[0]) : addFiles(e.dataTransfer.files) }}
            onDragOver={e => e.preventDefault()}
            style={{
              aspectRatio: isMobile ? '1/1' : '3/4',
              maxHeight: isMobile ? '320px' : '420px',
              width: '100%',
              backgroundColor: activePhoto?.bgRemoved ? '#e8e8e8' : '#f5f5f5',
              backgroundImage: activePhoto?.bgRemoved ? 'repeating-conic-gradient(#ccc 0% 25%, #e8e8e8 0% 50%)' : 'none',
              backgroundSize: activePhoto?.bgRemoved ? '20px 20px' : 'auto',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              cursor: photos.length === 0 ? 'pointer' : 'default',
              marginBottom:'10px', overflow:'hidden', position:'relative',
              borderRadius: isMobile ? '12px' : '0',
            }}>

            {activePhoto ? (
              <img src={activePhoto.preview} alt=""
                style={{ width:'100%', height:'100%', objectFit: activePhoto.bgRemoved ? 'contain' : 'cover', display:'block' }}/>
            ) : (
              <>
                <CameraIcon/>
                <div style={{ marginTop:'12px', fontSize:'13px', color:'#999', textAlign:'center', letterSpacing:'0.04em' }}>
                  {isMobile ? 'TRYCK FÖR ATT VÄLJA BILD' : 'TRYCK FÖR ATT FOTOGRAFERA'}<br/>
                  {!isMobile && <span style={{ fontSize:'11px' }}>eller dra &amp; släpp en bild</span>}
                </div>
              </>
            )}

            {/* Bildräknare badge */}
            {photos.length > 1 && (
              <div style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(0,0,0,0.6)', color:'#fff', fontSize:'11px', fontWeight:'700', padding:'3px 9px', borderRadius:'12px' }}>
                {activeIdx + 1}/{photos.length}
              </div>
            )}

            {/* AI-laddare overlay */}
            {removing && (
              <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.95)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', padding:'24px' }}>
                <div style={{ width:'44px', height:'44px', border:'3px solid #e0e0e0', borderTopColor:'#111', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                <div style={{ fontSize:'13px', color:'#111', fontWeight:'700', letterSpacing:'0.05em', textAlign:'center' }}>
                  {removingStatus === 'clipdrop'   && 'TAR BORT BAKGRUND…'}
                  {removingStatus === 'processing' && 'AI ANALYSERAR BILDEN…'}
                  {(removingStatus === 'loading' || removingStatus === '') && 'LADDAR AI-MODELL…'}
                </div>
                {removingStatus === 'loading' && (
                  <>
                    <div style={{ width:'200px', background:'#f0f0f0', height:'4px', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ width:`${modelProgress}%`, height:'100%', background:'#111', transition:'width 0.3s' }}/>
                    </div>
                    <div style={{ fontSize:'11px', color:'#999', textAlign:'center', maxWidth:'240px' }}>
                      {modelProgress < 5 ? 'Laddar ner AI-modell (~175 MB) – bara första gången' : `${modelProgress}% – sparas i webbläsaren`}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Bildstrip ── */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'12px', alignItems:'center' }}>
            {photos.map((p, i) => (
              <div key={i} onClick={() => setActiveIdx(i)}
                style={{
                  position:'relative', width:'60px', height:'80px', flexShrink:0,
                  borderRadius:'4px', overflow:'hidden', cursor:'pointer',
                  border: i === activeIdx ? '2px solid #111' : '2px solid transparent',
                  background:'#f5f5f5',
                }}>
                <img src={p.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                {/* Ta bort-knapp */}
                <button onClick={e => removePhoto(e, i)}
                  style={{
                    position:'absolute', top:'2px', right:'2px',
                    width:'18px', height:'18px', borderRadius:'50%',
                    background:'rgba(0,0,0,0.65)', color:'#fff',
                    border:'none', cursor:'pointer', fontSize:'10px',
                    display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1,
                  }}>×</button>
              </div>
            ))}

            {/* + Lägg till bild */}
            {photos.length < MAX_PHOTOS && photos.length > 0 && (
              <button type="button" onClick={() => addFileRef.current.click()}
                style={{
                  width:'60px', height:'80px', flexShrink:0, borderRadius:'4px',
                  border:'2px dashed #d0d0d0', background:'#fafafa',
                  cursor:'pointer', display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', gap:'3px', color:'#bbb',
                }}>
                <span style={{ fontSize:'20px', lineHeight:1 }}>+</span>
                <span style={{ fontSize:'9px', letterSpacing:'0.04em', fontWeight:'600' }}>BILD</span>
              </button>
            )}
          </div>

          {/* Dolda file inputs */}
          <input ref={mainFileRef} type="file" accept="image/*"
            style={{ display:'none' }} onChange={e => loadFirstPhoto(e.target.files[0])}/>
          <input ref={addFileRef} type="file" accept="image/*" multiple
            style={{ display:'none' }} onChange={e => addFiles(e.target.files)}/>

          {/* ── Ta bort bakgrund – för aktiv bild ── */}
          {activePhoto && !activePhoto.bgRemoved && (
            <button type="button" onClick={handleRemoveBg} disabled={removing}
              style={{ width:'100%', padding:'13px', background: removing ? '#f5f5f5' : '#fff', color: removing ? '#bbb' : '#111', border:'2px solid #111', fontSize:'13px', fontWeight:'700', letterSpacing:'0.08em', cursor: removing ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'8px' }}>
              {removing ? 'BEARBETAR…' : 'TA BORT BAKGRUND'}
            </button>
          )}

          {activePhoto?.bgRemoved && (
            <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
              <div style={{ flex:1, padding:'12px 14px', background:'#f0fff4', border:'1px solid #b2f0c8', fontSize:'12px', color:'#1a7a3a', fontWeight:'700', letterSpacing:'0.04em', display:'flex', alignItems:'center', gap:'6px' }}>
                ✅ BAKGRUND BORTTAGEN
              </div>
              <button type="button" onClick={revertBg}
                style={{ padding:'12px 16px', background:'#fff', color:'#999', border:'1px solid #e0e0e0', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}>
                ↩ ÅNGRA
              </button>
            </div>
          )}

          {bgError === 'general' && (
            <div style={{ marginBottom:'12px', padding:'12px 14px', background:'#fff5f5', border:'1px solid #fca5a5', fontSize:'12px', color:'#b91c1c' }}>
              Bakgrundsbortagning misslyckades. Försök igen.
            </div>
          )}

          {/* ── Formulär ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px', marginTop:'8px' }}>
            <div>
              <label style={labelStyle}>KATEGORI *</label>
              <select name="category" value={form.category} onChange={handle} required style={inputStyle}>
                <option value="">Välj kategori…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'12px' }}>
              <div><label style={labelStyle}>FÄRG</label><input style={inputStyle} type="text" name="color" placeholder="Svart, Beige…" value={form.color} onChange={handle}/></div>
              <div><label style={labelStyle}>MÄRKE</label><input style={inputStyle} type="text" name="brand" placeholder="Zara, H&M…" value={form.brand} onChange={handle}/></div>
            </div>
            <div>
              <label style={labelStyle}>SÄSONG</label>
              <select name="season" value={form.season} onChange={handle} style={inputStyle}>
                <option value="">Välj säsong…</option>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'12px' }}>
              <div><label style={labelStyle}>PRIS (KR)</label><input style={inputStyle} type="number" name="price" placeholder="499" value={form.price} onChange={handle}/></div>
              <div><label style={labelStyle}>KÖPT HOS</label><input style={inputStyle} type="text" name="store" placeholder="Zara, ASOS…" value={form.store} onChange={handle}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'12px' }}>
              <div>
                <label style={labelStyle}>STORLEK</label>
                <input style={inputStyle} type="text" name="size" placeholder="S, M, 38, 36/32…" value={form.size} onChange={handle}/>
              </div>
              <div>
                <label style={labelStyle}>PASSFORM</label>
                <select name="fit" value={form.fit} onChange={handle} style={inputStyle}>
                  <option value="">Välj…</option>
                  <option value="Stämmer i storleken">✅ Stämmer i storleken</option>
                  <option value="Liten i storleken">📏 Liten i storleken</option>
                  <option value="Stor i storleken">📐 Stor i storleken</option>
                </select>
              </div>
            </div>
          </div>

          {loading && (
            <div style={{ marginTop:'20px' }}>
              <div style={{ background:'#f0f0f0', height:'3px', overflow:'hidden' }}>
                <div style={{ width:`${progress}%`, height:'100%', background:'#111', transition:'width 0.3s' }}/>
              </div>
              <div style={{ fontSize:'12px', color:'#999', marginTop:'6px', textAlign:'center' }}>Laddar upp… {progress}%</div>
            </div>
          )}

          <button type="submit" disabled={loading || !photos.length || !form.category}
            style={{ marginTop:'24px', width:'100%', padding:'15px', background: (!photos.length || !form.category) ? '#ccc' : '#111', color:'#fff', border:'none', fontSize:'13px', fontWeight:'700', letterSpacing:'0.08em', cursor: (!photos.length || !form.category) ? 'not-allowed' : 'pointer' }}>
            {loading ? `LADDAR UPP… ${progress}%` : `SPARA PLAGG${photos.length > 1 ? ` (${photos.length} BILDER)` : ''}`}
          </button>
          <p style={{ fontSize:'12px', color:'#bbb', textAlign:'center', marginTop:'8px' }}>* Foto och kategori är obligatoriska · max {MAX_PHOTOS} bilder</p>
        </form>
      </div>
      </div>
    </div>
  )
}
