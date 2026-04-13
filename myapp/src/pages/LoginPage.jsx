import { useState } from 'react'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { s, errMsg } from '../styles'

export default function LoginPage({ onGo }) {
  const [email, setEmail]   = useState('')
  const [pw, setPw]         = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState({ text:'', type:'' })

  const submit = async (e) => {
    e.preventDefault()
    setMsg({ text:'', type:'' }); setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, pw)
    } catch(ex) {
      setMsg({ text: errMsg(ex.code), type:'err' })
    } finally { setLoading(false) }
  }

  const resetPw = async () => {
    if (!email) { setMsg({ text:'Ange din e-post ovan först.', type:'err' }); return }
    try {
      await sendPasswordResetEmail(auth, email)
      setMsg({ text:'✉️ Återställningslänk skickad till ' + email, type:'ok' })
    } catch(ex) { setMsg({ text: errMsg(ex.code), type:'err' }) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}><div style={s.logoMark}>M</div><span style={s.appName}>MyApp</span></div>
        <h1 style={s.h1}>Welcome back</h1>
        <p style={s.sub}>Logga in på ditt konto</p>

        {msg.text && (
          <div style={msg.type === 'ok'
            ? { background:'#f0fff4', border:'1px solid #b2f0c8', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', color:'#1a7a3a', marginBottom:'4px' }
            : s.err}>
            {msg.text}
          </div>
        )}

        <form onSubmit={submit} style={s.form}>
          <div style={s.fg}>
            <label style={s.label}>E-post</label>
            <input style={s.input} type="email" placeholder="jane@example.com"
              value={email} onChange={e=>setEmail(e.target.value)} required/>
          </div>

          <div style={s.fg}>
            <div style={s.labelRow}>
              <label style={s.label}>Lösenord</label>
              <button type="button" style={s.forgotBtn} onClick={resetPw}>Glömt lösenord?</button>
            </div>
            <div style={s.pwWrap}>
              <input style={{...s.input, paddingRight:'44px'}}
                type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={pw} onChange={e=>setPw(e.target.value)} required/>
              <button type="button" style={s.eyeBtn} onClick={()=>setShowPw(v=>!v)}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? <span className="spinner"/> : 'Logga in'}
          </button>
        </form>

        <p style={s.bottom}>
          Inget konto?{' '}
          <button style={s.link} onClick={()=>onGo('signup')}>Skapa ett</button>
        </p>
      </div>
    </div>
  )
}
