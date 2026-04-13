import { useState, useEffect, useRef } from 'react'
import { auth, db, storage } from '../firebase'
import { signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { updateProfile } from 'firebase/auth'
import { s } from '../styles'

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

export default function Dashboard({ user, onNavigate }) {
  const [profile, setProfile]     = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const fileRef                   = useRef()

  useEffect(() => {
    getDoc(doc(db, 'users', user.uid)).then(d => {
      if (d.exists()) setProfile(d.data())
    })
  }, [user.uid])

  const firstName = profile?.firstName || ''
  const lastName  = profile?.lastName  || ''
  const fullName  = [firstName, lastName].filter(Boolean).join(' ') || user.displayName || user.email
  const avatar    = profile?.photoURL || user.photoURL

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

  return (
    <div style={{ minHeight:'100vh', background:'#f7f8fa', fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* Topbar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e4e9', padding:'0 24px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'30px', height:'30px', background:'#1a1a2e', color:'#fff', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'15px' }}>M</div>
          <span style={{ fontWeight:'700', fontSize:'16px', color:'#1a1a2e' }}>MyApp</span>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button
            style={{ padding:'8px 14px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}
            onClick={() => onNavigate('wardrobe')}>
            👗 Garderob
          </button>
          <button
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'#fff', border:'1px solid #e2e4e9', borderRadius:'8px', fontSize:'13px', fontWeight:'500', color:'#444', cursor:'pointer' }}
            onClick={() => signOut(auth)}>
            <LogoutIcon/> Logga ut
          </button>
        </div>
      </div>

      {/* Innehåll */}
      <div style={{ maxWidth:'600px', margin:'40px auto', padding:'0 24px' }}>

        {/* Profilkort */}
        <div style={{ background:'#fff', borderRadius:'16px', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', overflow:'hidden' }}>

          {/* Banner */}
          <div style={{ height:'120px', background:'linear-gradient(135deg, #1a1a2e 0%, #2d2d5e 100%)' }}/>

          {/* Avatar */}
          <div style={{ padding:'0 24px', marginTop:'-52px', marginBottom:'16px', display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
            <div style={{ position:'relative' }}>
              <div style={{ width:'100px', height:'100px', borderRadius:'50%', border:'4px solid #fff', overflow:'hidden', background:'#e2e4e9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'36px', fontWeight:'700', color:'#1a1a2e', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
                {avatar
                  ? <img src={avatar} alt="Profilbild" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : fullName.charAt(0).toUpperCase()}
              </div>
              {/* Kameraknapp */}
              <button
                onClick={() => fileRef.current.click()}
                style={{ position:'absolute', bottom:'2px', right:'2px', width:'28px', height:'28px', borderRadius:'50%', background:'#1a1a2e', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <CameraIcon/>
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="user"
                style={{ display:'none' }} onChange={handlePhotoChange}/>
            </div>
          </div>

          {/* Uppladdningsprogress */}
          {uploading && (
            <div style={{ padding:'0 24px 8px' }}>
              <div style={{ background:'#f0f0f0', borderRadius:'99px', height:'4px', overflow:'hidden' }}>
                <div style={{ width:`${progress}%`, height:'100%', background:'#1a1a2e', transition:'width 0.3s' }}/>
              </div>
              <span style={{ fontSize:'12px', color:'#aaa' }}>Laddar upp… {progress}%</span>
            </div>
          )}

          {/* Namn & info */}
          <div style={{ padding:'0 24px 24px' }}>
            <h2 style={{ fontSize:'22px', fontWeight:'700', color:'#111', margin:'0 0 4px' }}>{fullName}</h2>
            <p style={{ fontSize:'14px', color:'#888', margin:'0 0 20px' }}>{user.email}</p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              {[
                { label:'Förnamn',      value: firstName || '–' },
                { label:'Efternamn',    value: lastName  || '–' },
                { label:'Konto skapat', value: profile?.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || '–' },
                { label:'Status',       value: user.emailVerified ? '✅ Verifierad' : '⚠️ Ej verifierad' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding:'14px', background:'#f7f8fa', border:'1px solid #e2e4e9', borderRadius:'10px' }}>
                  <div style={{ fontSize:'11px', color:'#aaa', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
                  <div style={{ fontSize:'14px', fontWeight:'600', color:'#111' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info-ruta */}
        <div style={{ marginTop:'16px', padding:'14px 16px', background:'#f0f8ff', border:'1px solid #b3d9ff', borderRadius:'10px', fontSize:'13px', color:'#1a5fa8' }}>
          💡 Klicka på kameraikonen på profilbilden för att byta foto direkt. Fler fält tillkommer allt eftersom!
        </div>
      </div>
    </div>
  )
}
