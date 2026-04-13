import { useState, useRef } from 'react'
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
  const [photo, setPhoto]         = useState(null)
  const [preview, setPreview]     = useState(null)
  const [originalPhoto, setOriginalPhoto] = useState(null)
  const [originalPreview, setOriginalPreview] = useState(null)
  const [form, setForm]           = useState({ category:'', color:'', brand:'', season:'', price:'', store:'' })
  const [loading, setLoading]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [done, setDone]           = useState(false)
  const [removing, setRemoving]     = useState(false)
  const [removingStatus, setRemovingStatus] = useState('') // 'loading' | 'processing' | 'ready'
  const [modelProgress, setModelProgress]   = useState(0)
  const [bgRemoved, setBgRemoved]   = useState(false)
  const [bgError, setBgError]       = useState(null)
  const fileRef                   = useRef()

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const loadPhoto = file => {
    if (!file?.type.startsWith('image/')) return
    setPhoto(file)
    setOriginalPhoto(file)
    setBgRemoved(false)
    setBgError(null)
    const r = new FileReader()
    r.onload = ev => {
      setPreview(ev.target.result)
      setOriginalPreview(ev.target.result)
    }
    r.readAsDataURL(file)
  }

  const handleRemoveBg = async () => {
    if (!photo) return
    setBgError(null)
    setRemoving(true)
    setModelProgress(0)

    try {
      let blob = null

      // ── Steg 1: Prova Clipdrop (snabb, ingen nedladdning) ──────────
      const clipdropKey = import.meta.env.VITE_CLIPDROP_API_KEY
      if (clipdropKey && clipdropKey !== 'din_nyckel_här') {
        try {
          setRemovingStatus('clipdrop')
          const formData = new FormData()
          formData.append('image_file', photo, photo.name)
          const res = await fetch('https://clipdrop-api.co/remove-background/v1', {
            method: 'POST',
            headers: { 'x-api-key': clipdropKey },
            body: formData,
          })
          if (res.ok) {
            blob = await res.blob()
          } else {
            console.warn('Clipdrop misslyckades (kanske slut på krediter), byter till lokal AI…')
          }
        } catch {
          console.warn('Clipdrop ej tillgänglig, byter till lokal AI…')
        }
      }

      // ── Steg 2: Fallback – lokal AI i webbläsaren (gratis, obegränsat) ──
      if (!blob) {
        setRemovingStatus('loading')
        blob = await removeBackground(photo, (status, progress) => {
          setRemovingStatus(status)
          if (progress !== undefined) setModelProgress(progress)
        })
      }

      const url     = URL.createObjectURL(blob)
      const newFile = new File([blob], 'no-bg.png', { type: 'image/png' })
      setPhoto(newFile)
      setPreview(url)
      setBgRemoved(true)

    } catch (err) {
      console.error('Bakgrundsbortagning:', err)
      setBgError('general')
    } finally {
      setRemoving(false)
      setRemovingStatus('')
    }
  }

  const revertBg = () => {
    setPhoto(originalPhoto)
    setPreview(originalPreview)
    setBgRemoved(false)
    setBgError(null)
  }

  const submit = async e => {
    e.preventDefault()
    if (!photo || !form.category) return
    setLoading(true); setProgress(0)

    const storageRef = ref(storage, `wardrobeItems/${user.uid}/${Date.now()}_${photo.name}`)
    const task = uploadBytesResumable(storageRef, photo)

    task.on('state_changed',
      snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      err  => { console.error(err); setLoading(false) },
      async () => {
        const photoURL = await getDownloadURL(task.snapshot.ref)
        await addDoc(collection(db, 'wardrobeItems'), {
          uid:       user.uid,
          photoURL,
          category:  form.category,
          color:     form.color,
          brand:     form.brand,
          season:    form.season,
          price:     form.price,
          store:     form.store,
          createdAt: serverTimestamp(),
        })
        setDone(true); setLoading(false)
      }
    )
  }

  const reset = () => {
    setDone(false); setPhoto(null); setPreview(null)
    setOriginalPhoto(null); setOriginalPreview(null)
    setBgRemoved(false); setBgError(null)
    setForm({ category:'', color:'', brand:'', season:'', price:'', store:'' })
  }

  // ── Success ────────────────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', fontFamily:"'Inter','Segoe UI',sans-serif", padding:'24px' }}>
      <div style={{ fontSize:'56px' }}>✅</div>
      <h2 style={{ fontSize:'20px', fontWeight:'700', color:'#111' }}>Plagget är sparat!</h2>
      <p style={{ fontSize:'14px', color:'#999', textAlign:'center' }}>Det syns nu i din garderob under {form.category}.</p>
      <div style={{ display:'flex', gap:'12px', marginTop:'8px' }}>
        <button onClick={reset}
          style={{ padding:'12px 20px', background:'#fff', border:'1px solid #111', fontSize:'13px', fontWeight:'600', letterSpacing:'0.05em', cursor:'pointer' }}>
          + LÄGG TILL FLER
        </button>
        <button onClick={() => onNavigate('wardrobe')}
          style={{ padding:'12px 20px', background:'#111', color:'#fff', border:'none', fontSize:'13px', fontWeight:'600', letterSpacing:'0.05em', cursor:'pointer' }}>
          SE GARDEROB
        </button>
      </div>
    </div>
  )

  const inputStyle  = { padding:'12px', border:'1px solid #e2e4e9', fontSize:'14px', color:'#111', width:'100%', background:'#fafafa', appearance:'none' }
  const labelStyle  = { fontSize:'11px', color:'#999', letterSpacing:'0.06em', fontWeight:'600', marginBottom:'6px', display:'block' }

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'#fff', borderBottom:'1px solid #e8e8e8' }}>
        <div style={{ maxWidth:'600px', margin:'0 auto', padding:'0 16px', height:'52px', display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => onNavigate('wardrobe')}
            style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', color:'#111' }}>
            <BackIcon/>
          </button>
          <span style={{ fontWeight:'700', fontSize:'14px', letterSpacing:'0.08em' }}>LÄGG TILL PLAGG</span>
        </div>
      </div>

      <div style={{ maxWidth:'600px', margin:'0 auto', padding:'24px 16px' }}>
        <form onSubmit={submit}>

          {/* Foto-area */}
          <div onClick={() => fileRef.current.click()}
            onDrop={e => { e.preventDefault(); loadPhoto(e.dataTransfer.files[0]) }}
            onDragOver={e => e.preventDefault()}
            style={{ aspectRatio:'3/4', maxHeight:'420px', backgroundColor: bgRemoved ? '#e8e8e8' : '#f5f5f5', backgroundImage: bgRemoved ? 'repeating-conic-gradient(#ccc 0% 25%, #e8e8e8 0% 50%)' : 'none', backgroundSize: bgRemoved ? '20px 20px' : 'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', marginBottom:'12px', overflow:'hidden', position:'relative' }}>
            {preview
              ? <img src={preview} alt="" style={{ width:'100%', height:'100%', objectFit: bgRemoved ? 'contain' : 'cover' }}/>
              : <><CameraIcon/><div style={{ marginTop:'12px', fontSize:'13px', color:'#999', textAlign:'center', letterSpacing:'0.04em' }}>TRYCK FÖR ATT FOTOGRAFERA<br/><span style={{ fontSize:'11px' }}>eller dra &amp; släpp en bild</span></div></>
            }
            {preview && (
              <div style={{ position:'absolute', bottom:'12px', left:0, right:0, textAlign:'center' }}>
                <span style={{ background:'rgba(0,0,0,0.6)', color:'#fff', padding:'6px 14px', fontSize:'11px', letterSpacing:'0.06em' }}>BYTA FOTO</span>
              </div>
            )}
            {removing && (
              <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.95)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', padding:'24px' }}>
                <div style={{ width:'44px', height:'44px', border:'3px solid #e0e0e0', borderTopColor:'#111', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

                <div style={{ fontSize:'13px', color:'#111', fontWeight:'700', letterSpacing:'0.05em', textAlign:'center' }}>
                  {removingStatus === 'clipdrop'   && 'TAR BORT BAKGRUND…'}
                  {removingStatus === 'processing' && 'AI ANALYSERAR BILDEN…'}
                  {(removingStatus === 'loading' || removingStatus === '') && 'LADDAR AI-MODELL…'}
                </div>

                {removingStatus === 'clipdrop' && (
                  <div style={{ fontSize:'11px', color:'#999' }}>Tar 2–3 sekunder ⚡</div>
                )}
                {removingStatus === 'loading' && (
                  <>
                    <div style={{ width:'200px', background:'#f0f0f0', height:'4px', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ width:`${modelProgress}%`, height:'100%', background:'#111', transition:'width 0.3s' }}/>
                    </div>
                    <div style={{ fontSize:'11px', color:'#999', textAlign:'center', maxWidth:'240px' }}>
                      {modelProgress < 5
                        ? 'Laddar ner AI-modell (~175 MB) – bara första gången'
                        : `${modelProgress}% – sparas i webbläsaren, aldrig igen`}
                    </div>
                  </>
                )}
                {removingStatus === 'processing' && (
                  <div style={{ fontSize:'11px', color:'#999' }}>Tar 5–15 sekunder</div>
                )}
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ display:'none' }} onChange={e => loadPhoto(e.target.files[0])}/>

          {/* Remove BG knapp */}
          {preview && !bgRemoved && (
            <button type="button" onClick={handleRemoveBg} disabled={removing}
              style={{ width:'100%', padding:'13px', background: removing ? '#f5f5f5' : '#fff', color: removing ? '#bbb' : '#111', border:'2px solid #111', fontSize:'13px', fontWeight:'700', letterSpacing:'0.08em', cursor: removing ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'8px' }}>
              ✨ {removing ? 'BEARBETAR…' : 'TA BORT BAKGRUND (AI)'}
            </button>
          )}

          {/* Bakgrund borttagen */}
          {bgRemoved && (
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

          {/* Felmeddelanden */}
          {bgError === 'general' && (
            <div style={{ marginBottom:'12px', padding:'12px 14px', background:'#fff5f5', border:'1px solid #fca5a5', fontSize:'12px', color:'#b91c1c' }}>
              Bakgrundsbortagning misslyckades. Kontrollera att @huggingface/transformers är installerat och försök igen.
            </div>
          )}

          {/* Formulär */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px', marginTop:'8px' }}>
            <div>
              <label style={labelStyle}>KATEGORI *</label>
              <select name="category" value={form.category} onChange={handle} required style={inputStyle}>
                <option value="">Välj kategori…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div><label style={labelStyle}>PRIS (KR)</label><input style={inputStyle} type="number" name="price" placeholder="499" value={form.price} onChange={handle}/></div>
              <div><label style={labelStyle}>KÖPT HOS</label><input style={inputStyle} type="text" name="store" placeholder="Zara, ASOS…" value={form.store} onChange={handle}/></div>
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

          <button type="submit" disabled={loading || !photo || !form.category}
            style={{ marginTop:'24px', width:'100%', padding:'15px', background: (!photo || !form.category) ? '#ccc' : '#111', color:'#fff', border:'none', fontSize:'13px', fontWeight:'700', letterSpacing:'0.08em', cursor: (!photo || !form.category) ? 'not-allowed' : 'pointer' }}>
            {loading ? `LADDAR UPP… ${progress}%` : 'SPARA PLAGG'}
          </button>
          <p style={{ fontSize:'12px', color:'#bbb', textAlign:'center', marginTop:'8px' }}>* Foto och kategori är obligatoriska</p>
        </form>
      </div>
    </div>
  )
}
