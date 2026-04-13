import { useState, useRef } from 'react'
import { auth, db, storage } from '../firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { s, errMsg } from '../styles'

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#bbb"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

export default function SignupPage({ onGo }) {
  const [form, setForm]       = useState({ firstName:'', lastName:'', email:'', pw:'' })
  const [photo, setPhoto]     = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [err, setErr]         = useState('')
  const fileRef               = useRef()

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const loadPhoto = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setPhoto(file)
    const r = new FileReader()
    r.onload = ev => setPreview(ev.target.result)
    r.readAsDataURL(file)
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setLoading(true); setProgress(0)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.pw)
      const uid  = cred.user.uid
      let photoURL = ''

      if (photo) {
        const storageRef = ref(storage, `profilePhotos/${uid}/avatar`)
        const task = uploadBytesResumable(storageRef, photo)
        await new Promise((res, rej) => {
          task.on('state_changed',
            snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
            rej,
            async () => { photoURL = await getDownloadURL(task.snapshot.ref); res() }
          )
        })
      }

      await updateProfile(cred.user, {
        displayName: `${form.firstName} ${form.lastName}`,
        photoURL: photoURL || null,
      })

      await setDoc(doc(db, 'users', uid), {
        firstName:  form.firstName,
        lastName:   form.lastName,
        email:      form.email,
        photoURL:   photoURL,
        createdAt:  serverTimestamp(),
      })

    } catch(ex) {
      setErr(errMsg(ex.code))
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={{ ...s.card, maxWidth:'440px', padding:'36px 32px' }}>
        <div style={s.logo}><div style={s.logoMark}>M</div><span style={s.appName}>MyApp</span></div>
        <h1 style={s.h1}>Skapa konto</h1>
        <p style={s.sub}>Kom igång på bara några sekunder</p>

        {err && <div style={s.err}>{err}</div>}

        <form onSubmit={submit} style={s.form}>
          {/* Profilbild */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
            <div
              onClick={() => fileRef.current.click()}
              onDrop={e => { e.preventDefault(); setDragging(false); loadPhoto(e.dataTransfer.files[0]) }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              style={{
                width:'100px', height:'100px', borderRadius:'50%',
                border:`2px dashed ${dragging ? '#1a1a2e' : '#d0d3db'}`,
                background: dragging ? '#f0f0f8' : '#fafafa',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', overflow:'hidden', transition:'all 0.2s',
              }}>
              {preview
                ? <img src={preview} alt="Profilbild" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <CameraIcon/>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="user"
              style={{ display:'none' }} onChange={e => loadPhoto(e.target.files[0])}/>
            <div style={{ textAlign:'center' }}>
              <span style={{ fontSize:'13px', fontWeight:'500', color:'#333' }}>Profilbild</span><br/>
              <span style={{ fontSize:'12px', color:'#aaa' }}>Tryck · dra &amp; släpp · eller ta en selfie</span>
            </div>
            {preview && (
              <button type="button" style={{ ...s.link, color:'#c00', fontSize:'12px' }}
                onClick={() => { setPhoto(null); setPreview(null) }}>
                Ta bort
              </button>
            )}
          </div>

          {/* Namn */}
          <div style={s.row}>
            <div style={s.fg}>
              <label style={s.label}>Förnamn</label>
              <input style={s.input} type="text" name="firstName" placeholder="Jane"
                value={form.firstName} onChange={handle} required/>
            </div>
            <div style={s.fg}>
              <label style={s.label}>Efternamn</label>
              <input style={s.input} type="text" name="lastName" placeholder="Doe"
                value={form.lastName} onChange={handle} required/>
            </div>
          </div>

          {/* E-post */}
          <div style={s.fg}>
            <label style={s.label}>E-post</label>
            <input style={s.input} type="email" name="email" placeholder="jane@example.com"
              value={form.email} onChange={handle} required/>
          </div>

          {/* Lösenord */}
          <div style={s.fg}>
            <label style={s.label}>Lösenord</label>
            <div style={s.pwWrap}>
              <input style={{ ...s.input, paddingRight:'44px' }}
                type={showPw ? 'text' : 'password'} name="pw" placeholder="Minst 6 tecken"
                value={form.pw} onChange={handle} required minLength={6}/>
              <button type="button" style={s.eyeBtn} onClick={() => setShowPw(v => !v)}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Uppladdningsprogress */}
          {loading && photo && (
            <div style={{ background:'#f0f0f0', borderRadius:'99px', height:'6px', overflow:'hidden' }}>
              <div style={{ width:`${progress}%`, height:'100%', background:'#1a1a2e', transition:'width 0.3s' }}/>
            </div>
          )}

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? <><span className="spinner"/> &nbsp;Skapar konto…</> : 'Skapa konto'}
          </button>
        </form>

        <p style={s.bottom}>
          Har du redan ett konto?{' '}
          <button style={s.link} onClick={() => onGo('login')}>Logga in</button>
        </p>
      </div>
    </div>
  )
}
