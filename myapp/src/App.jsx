import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { LanguageProvider } from './context/LanguageContext'
import LoginPage          from './pages/LoginPage'
import SignupPage         from './pages/SignupPage'
import Dashboard          from './pages/Dashboard'
import StylePage          from './pages/StylePage'
import WardrobePage       from './pages/WardrobePage'
import UploadPage         from './pages/UploadPage'
import CollagePage        from './pages/CollagePage'
import CollectionsPage    from './pages/CollectionsPage'
import HomePage           from './pages/HomePage'
import OutfitPlannerPage  from './pages/OutfitPlannerPage'
import FleaMarketPage     from './pages/FleaMarketPage'
import BottomNav          from './components/BottomNav'
import TopNav             from './components/TopNav'

const NAV_PAGES = ['home', 'wardrobe', 'manage', 'fleamarket', 'planner', 'profile', 'collections', 'collage']

export default function App() {
  const [authUser, setAuthUser]           = useState(undefined)
  const [page, setPage]                   = useState('login')
  const [appPage, setAppPage]             = useState('home')
  const [loadedCollage, setLoadedCollage] = useState(null)
  const [windowWidth, setWindowWidth]     = useState(window.innerWidth)

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setAuthUser(u ?? null)
      if (u) setAppPage('home')
    })
    return unsub
  }, [])

  const navigate = (p) => {
    setAppPage(p)
    if (p !== 'collage') setLoadedCollage(null)
  }

  const openCollage = (collage) => {
    setLoadedCollage(collage)
    setAppPage('collage')
  }

  const isMobile = windowWidth < 768

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

  const showNav = NAV_PAGES.includes(appPage)

  // Render page component
  const renderPage = () => {
    if (appPage === 'wardrobe')    return <StylePage         user={authUser} onNavigate={navigate} isMobile={isMobile}/>
    if (appPage === 'manage')      return <WardrobePage      user={authUser} onNavigate={navigate}/>
    if (appPage === 'home')        return <HomePage          user={authUser} onNavigate={navigate}/>
    if (appPage === 'profile')     return <Dashboard         user={authUser} onNavigate={navigate}/>
    if (appPage === 'upload')      return <UploadPage        user={authUser} onNavigate={navigate}/>
    if (appPage === 'collage')     return <CollagePage       user={authUser} onNavigate={navigate} loadedCollage={loadedCollage}/>
    if (appPage === 'collections') return <CollectionsPage   user={authUser} onNavigate={navigate} onOpenCollage={openCollage}/>
    if (appPage === 'planner')     return <OutfitPlannerPage user={authUser} onNavigate={navigate}/>
    if (appPage === 'fleamarket')  return <FleaMarketPage    user={authUser} onNavigate={navigate}/>
    return                                <StylePage         user={authUser} onNavigate={navigate} isMobile={isMobile}/>
  }

  return (
    <LanguageProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
        {/* Desktop top nav */}
        {showNav && !isMobile && (
          <TopNav currentPage={appPage} onNavigate={navigate} user={authUser}/>
        )}

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderPage()}
        </div>

        {/* Mobile bottom nav via portal */}
        {showNav && isMobile && createPortal(
          <BottomNav currentPage={appPage} onNavigate={navigate}/>,
          document.body
        )}
      </div>
    </LanguageProvider>
  )
}
