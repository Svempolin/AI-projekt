import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const FolderIcon = ({ size = 32 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>
)

export default function CollectionsPage({ user, onNavigate, onOpenCollage }) {
  const [allCollages, setAllCollages] = useState([])
  const [loading, setLoading]         = useState(true)
  const [openFolder, setOpenFolder]   = useState(null) // collectionName
  const [preview, setPreview]         = useState(null) // single collage object

  useEffect(() => {
    getDocs(query(collection(db, 'savedCollages'), where('uid', '==', user.uid)))
      .then(snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        // Sort by createdAt desc (client side)
        docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setAllCollages(docs)
        setLoading(false)
      })
  }, [user.uid])

  // Group by collectionName
  const grouped = allCollages.reduce((acc, c) => {
    const key = c.collectionName || 'Osorterade'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  const folderNames = Object.keys(grouped).sort()

  const deleteCollage = async (id) => {
    if (!window.confirm('Ta bort detta kollage?')) return
    await deleteDoc(doc(db, 'savedCollages', id))
    setAllCollages(p => p.filter(c => c.id !== id))
    if (preview?.id === id) setPreview(null)
  }

  // ── Preview modal ────────────────────────────────────────────────
  if (preview) {
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', fontFamily:"'Inter','Segoe UI',sans-serif", background:'#fff' }}>
        <div style={{ borderBottom:'1px solid #e8e8e8', padding:'0 16px', height:'52px', display:'flex', alignItems:'center', gap:'12px', flexShrink:0 }}>
          <button onClick={() => setPreview(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#111', display:'flex', alignItems:'center' }}>
            <BackIcon/>
          </button>
          <span style={{ fontWeight:'800', fontSize:'15px', letterSpacing:'0.08em' }}>{preview.name}</span>
          <span style={{ fontSize:'12px', color:'#aaa', marginLeft:'4px' }}>— {preview.collectionName}</span>
          <div style={{ flex:1 }}/>
          <button onClick={() => onOpenCollage(preview)} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:'700', letterSpacing:'0.07em', cursor:'pointer' }}>
            REDIGERA
          </button>
          <button onClick={() => deleteCollage(preview.id)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 14px', background:'#fff', color:'#ff3b30', border:'1.5px solid #ff3b30', fontSize:'12px', fontWeight:'700', letterSpacing:'0.07em', cursor:'pointer' }}>
            <TrashIcon/> TA BORT
          </button>
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#e8e8e8', padding:'32px' }}>
          <img src={preview.thumbnail} alt={preview.name} style={{ maxWidth:'600px', maxHeight:'600px', width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}/>
        </div>
      </div>
    )
  }

  // ── Folder open – show collages ──────────────────────────────────
  if (openFolder) {
    const collages = grouped[openFolder] || []
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', fontFamily:"'Inter','Segoe UI',sans-serif", background:'#fff' }}>
        <div style={{ borderBottom:'1px solid #e8e8e8', padding:'0 16px', height:'52px', display:'flex', alignItems:'center', gap:'12px', flexShrink:0 }}>
          <button onClick={() => setOpenFolder(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#111', display:'flex', alignItems:'center' }}>
            <BackIcon/>
          </button>
          <span style={{ fontWeight:'800', fontSize:'15px', letterSpacing:'0.08em' }}>{openFolder.toUpperCase()}</span>
          <span style={{ fontSize:'12px', color:'#aaa' }}>{collages.length} {collages.length === 1 ? 'kollage' : 'kollage'}</span>
          <div style={{ flex:1 }}/>
          <button onClick={() => onNavigate('collage')}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 14px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:'700', letterSpacing:'0.07em', cursor:'pointer' }}>
            <PlusIcon/> NYTT KOLLAGE
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>
          {collages.length === 0 ? (
            <div style={{ textAlign:'center', color:'#ccc', marginTop:'60px', fontSize:'14px' }}>Inga kollage i denna samling</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'16px' }}>
              {collages.map(c => (
                <div key={c.id} style={{ cursor:'pointer', borderRadius:'2px', overflow:'hidden', background:'#f5f5f5', boxShadow:'0 2px 12px rgba(0,0,0,0.08)', transition:'transform 0.15s', position:'relative' }}
                  onClick={() => setPreview(c)}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  {c.thumbnail
                    ? <img src={c.thumbnail} alt={c.name} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }}/>
                    : <div style={{ width:'100%', aspectRatio:'1', background: c.bg || '#f5f0e8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px' }}>👗</div>
                  }
                  <div style={{ padding:'10px 12px' }}>
                    <div style={{ fontWeight:'700', fontSize:'13px', letterSpacing:'0.03em', color:'#111', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize:'11px', color:'#aaa', marginTop:'2px' }}>
                      {c.createdAt?.seconds
                        ? new Date(c.createdAt.seconds * 1000).toLocaleDateString('sv-SE')
                        : ''}
                    </div>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteCollage(c.id) }}
                    style={{ position:'absolute', top:'8px', right:'8px', width:'26px', height:'26px', borderRadius:'50%', background:'rgba(0,0,0,0.5)', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                    <TrashIcon/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Folder list ──────────────────────────────────────────────────
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', fontFamily:"'Inter','Segoe UI',sans-serif", background:'#fff' }}>
      <div style={{ borderBottom:'1px solid #e8e8e8', padding:'0 16px', height:'52px', display:'flex', alignItems:'center', gap:'12px', flexShrink:0 }}>
        <button onClick={() => onNavigate('wardrobe')} style={{ background:'none', border:'none', cursor:'pointer', color:'#111', display:'flex', alignItems:'center' }}>
          <BackIcon/>
        </button>
        <span style={{ fontWeight:'800', fontSize:'15px', letterSpacing:'0.08em' }}>MINA KOLLAGE</span>
        <div style={{ flex:1 }}/>
        <button onClick={() => onNavigate('collage')}
          style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 14px', background:'#111', color:'#fff', border:'none', fontSize:'12px', fontWeight:'700', letterSpacing:'0.07em', cursor:'pointer' }}>
          <PlusIcon/> NYTT KOLLAGE
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'32px 32px 80px' }}>
        {loading ? (
          <div style={{ textAlign:'center', color:'#ccc', marginTop:'60px' }}>Laddar…</div>
        ) : folderNames.length === 0 ? (
          <div style={{ textAlign:'center', marginTop:'80px' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>📁</div>
            <div style={{ fontWeight:'700', fontSize:'16px', letterSpacing:'0.06em', color:'#333', marginBottom:'8px' }}>Inga kollage än</div>
            <div style={{ fontSize:'13px', color:'#aaa', marginBottom:'24px' }}>Bygg ett kollage och spara det!</div>
            <button onClick={() => onNavigate('collage')}
              style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'12px 20px', background:'#111', color:'#fff', border:'none', fontSize:'13px', fontWeight:'700', letterSpacing:'0.06em', cursor:'pointer' }}>
              <PlusIcon/> SKAPA KOLLAGE
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'20px', maxWidth:'900px' }}>
            {folderNames.map(name => {
              const collages   = grouped[name]
              const coverThumb = collages.find(c => c.thumbnail)?.thumbnail
              return (
                <div key={name} onClick={() => setOpenFolder(name)}
                  style={{ cursor:'pointer', borderRadius:'4px', overflow:'hidden', background:'#fafafa', border:'1px solid #eee', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                  {/* Folder thumbnail */}
                  <div style={{ aspectRatio:'1', background: coverThumb ? 'transparent' : '#f0ede8', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
                    {coverThumb
                      ? <img src={coverThumb} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <FolderIcon size={48}/>
                    }
                    {/* Overlay count */}
                    <div style={{ position:'absolute', bottom:'8px', right:'8px', background:'rgba(0,0,0,0.55)', color:'#fff', fontSize:'11px', fontWeight:'700', padding:'3px 8px', borderRadius:'20px' }}>
                      {collages.length}
                    </div>
                  </div>
                  <div style={{ padding:'12px' }}>
                    <div style={{ fontWeight:'800', fontSize:'13px', letterSpacing:'0.04em', color:'#111', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{name}</div>
                    <div style={{ fontSize:'11px', color:'#aaa', marginTop:'2px' }}>{collages.length} {collages.length === 1 ? 'kollage' : 'kollage'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
