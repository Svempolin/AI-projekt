import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import LoginPage       from './pages/LoginPage'
import SignupPage      from './pages/SignupPage'
import Dashboard       from './pages/Dashboard'
import WardrobePage    from './pages/WardrobePage'
import UploadPage      from './pages/UploadPage'
import CollagePage     from './pages/CollagePage'
import CollectionsPage from './pages/CollectionsPage'

export default function App() {
  const [authUser, setAuthUser]       = useState(undefined)
  const [page, setPage]               = useState('login')
  const [appPage, setAppPage]         = useState('wardrobe')
  const [loadedCollage, setLoadedCollage] = useState(null) // kollage öppnat från samlingar

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthUser(u ?? null)
      if (u) setAppPage('wardrobe')
    })
    return unsub
  }, [])

  const navigate = (page) => {
    setAppPage(page)
    if (page !== 'collage') setLoadedCollage(null)
  }

  // Öppna ett sparat kollage i redigeraren
  const openCollage = (collage) => {
    setLoadedCollage(collage)
    setAppPage('collage')
  }

  if (authUser === undefined) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', background:'#fff', fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ width:'36px', height:'36px', border:'3px solid #e2e4e9', borderTopColor:'#111', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!authUser) {
    if (page === 'signup') return <SignupPage onGo={setPage}/>
    return <LoginPage onGo={setPage}/>
  }

  if (appPage === 'profile')     return <Dashboard        user={authUser} onNavigate={navigate}/>
  if (appPage === 'upload')      return <UploadPage       user={authUser} onNavigate={navigate}/>
  if (appPage === 'collage')     return <CollagePage      user={authUser} onNavigate={navigate} loadedCollage={loadedCollage}/>
  if (appPage === 'collections') return <CollectionsPage  user={authUser} onNavigate={navigate} onOpenCollage={openCollage}/>
  return                                <WardrobePage     user={authUser} onNavigate={navigate}/>
}
