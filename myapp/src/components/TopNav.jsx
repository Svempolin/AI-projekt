import { useState, useEffect, useRef } from 'react'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { useLang } from '../context/LanguageContext'

const FlagSE = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: '2px', display: 'block' }}>
    <rect width="20" height="14" fill="#006AA7"/>
    <rect x="5" width="3" height="14" fill="#FECC02"/>
    <rect y="5.5" width="20" height="3" fill="#FECC02"/>
  </svg>
)
const FlagUK = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" style={{ borderRadius: '2px', display: 'block' }}>
    <rect width="20" height="14" fill="#012169"/>
    <path d="M0,0 L20,14 M20,0 L0,14" stroke="#fff" strokeWidth="3"/>
    <path d="M0,0 L20,14 M20,0 L0,14" stroke="#C8102E" strokeWidth="1.8"/>
    <path d="M10,0 V14 M0,7 H20" stroke="#fff" strokeWidth="4"/>
    <path d="M10,0 V14 M0,7 H20" stroke="#C8102E" strokeWidth="2.5"/>
  </svg>
)
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

export default function TopNav({ currentPage, onNavigate, user }) {
  const { lang, toggleLang, t } = useLang()
  const [panelOpen, setPanelOpen]         = useState(false)
  const [wardrobeOpen, setWardrobeOpen]   = useState(false)
  const panelRef    = useRef(null)
  const wardrobeRef = useRef(null)

  const getActive = (page) => {
    if (page === 'wardrobe') return currentPage === 'wardrobe' || currentPage === 'manage' || currentPage === 'collections'
    return currentPage === page
  }

  // Close profile panel on outside click
  useEffect(() => {
    if (!panelOpen) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [panelOpen])

  // Close wardrobe dropdown on outside click
  useEffect(() => {
    if (!wardrobeOpen) return
    const handler = (e) => {
      if (wardrobeRef.current && !wardrobeRef.current.contains(e.target)) setWardrobeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [wardrobeOpen])

  const handleLogout = async () => {
    setPanelOpen(false)
    await signOut(auth)
  }

  const initial = user?.displayName?.charAt(0)?.toUpperCase() || '?'

  return (
    <>
      {/* ── Top bar ── */}
      <div style={{
        height: '52px',
        background: '#fff',
        borderBottom: '1px solid #ebebeb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        flexShrink: 0,
        zIndex: 200,
        position: 'relative',
      }}>
        {/* Brand */}
        <button onClick={() => onNavigate('wardrobe')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize: '14px', letterSpacing: '0.12em', color: '#111', marginRight: '36px', padding: 0, fontFamily: 'inherit' }}>
          WARDROBE
        </button>

        {/* Nav items */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', gap: '4px' }}>

          {/* Hem */}
          <NavBtn label={t('home')} active={currentPage === 'home'} onClick={() => onNavigate('home')}/>

          {/* Garderob — dropdown */}
          <div ref={wardrobeRef} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
            <button
              onClick={() => setWardrobeOpen(v => !v)}
              style={{
                background: 'none', border: 'none',
                borderBottom: getActive('wardrobe') ? '2px solid #111' : '2px solid transparent',
                cursor: 'pointer', padding: '0 12px',
                fontSize: '12px', fontWeight: getActive('wardrobe') ? '700' : '500',
                color: getActive('wardrobe') ? '#111' : '#999',
                letterSpacing: '0.04em', transition: 'all 0.15s',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
              {t('wardrobe')}
              <ChevronDown/>
            </button>

            {/* Garderob dropdown menu */}
            {wardrobeOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0,
                background: '#fff', border: '1px solid #e8e8e8',
                borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                minWidth: '200px', zIndex: 400, overflow: 'hidden',
                marginTop: '4px',
              }}>
                <DropItem
                  label={lang === 'sv' ? 'Din garderob' : 'Your wardrobe'}
                  sub={lang === 'sv' ? 'Styla och bläddra bland dina kläder' : 'Style and browse your clothes'}
                  onClick={() => { setWardrobeOpen(false); onNavigate('wardrobe') }}
                  active={currentPage === 'wardrobe'}
                  icon={<HangerIcon/>}
                />
                <div style={{ height: '1px', background: '#f0f0f0' }}/>
                <DropItem
                  label={lang === 'sv' ? 'Hantera garderob' : 'Manage wardrobe'}
                  sub={lang === 'sv' ? 'Lägg till, redigera och ta bort plagg' : 'Add, edit and remove items'}
                  onClick={() => { setWardrobeOpen(false); onNavigate('manage') }}
                  active={currentPage === 'manage'}
                  icon={<GridIcon/>}
                />
                <div style={{ height: '1px', background: '#f0f0f0' }}/>
                <DropItem
                  label={lang === 'sv' ? 'Kollage & samlingar' : 'Collages & collections'}
                  sub={lang === 'sv' ? 'Dina sparade kollage och outfits' : 'Your saved collages and outfits'}
                  onClick={() => { setWardrobeOpen(false); onNavigate('collections') }}
                  active={currentPage === 'collections'}
                  icon={<FolderIcon/>}
                />
              </div>
            )}
          </div>

          {/* Flöde */}
          <NavBtn label={t('feed')} active={currentPage === 'fleamarket'} onClick={() => onNavigate('fleamarket')}/>

          {/* Planera */}
          <NavBtn label={t('plan')} active={currentPage === 'planner'} onClick={() => onNavigate('planner')}/>
        </div>

        <div style={{ flex: 1 }}/>

        {/* Profile avatar + chevron — clearly a dropdown trigger */}
        <button
          onClick={() => setPanelOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: panelOpen ? '#f0f0f0' : 'none',
            border: '1.5px solid #e0e0e0',
            borderRadius: '20px',
            padding: '3px 8px 3px 4px',
            cursor: 'pointer',
            transition: 'background 0.15s',
            color: '#555',
          }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            background: panelOpen ? '#111' : '#e8e8e8',
            color: panelOpen ? '#fff' : '#555',
            fontSize: '11px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>
            {initial}
          </div>
          <ChevronDown/>
        </button>
      </div>

      {/* ── Overlay ── */}
      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 299 }}
        />
      )}

      {/* ── Side panel from right ── */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '260px',
          background: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>

        {/* Profile header */}
        <div style={{ padding: '32px 24px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#111', color: '#fff', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
            {initial}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>
            {user?.displayName || user?.email?.split('@')[0] || 'Användare'}
          </div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{user?.email}</div>
        </div>

        {/* Menu items */}
        <div style={{ flex: 1, padding: '12px 0' }}>
          <PanelItem
            onClick={() => { setPanelOpen(false); onNavigate('fleamarket') }}
            label={t('myFleaMarket')}
            icon={<TagIcon/>}
          />
          <PanelItem
            onClick={() => { setPanelOpen(false); onNavigate('profile') }}
            label={t('myProfile')}
            icon={<PersonIcon/>}
          />
        </div>

        {/* Language toggle */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: '#aaa', textTransform: 'uppercase', marginBottom: '10px' }}>
            {lang === 'sv' ? 'Språk' : 'Language'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { if (lang !== 'sv') toggleLang() }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '12px', fontWeight: '700',
                background: lang === 'sv' ? '#111' : '#f5f5f5',
                color: lang === 'sv' ? '#fff' : '#888',
                border: 'none',
                transition: 'all 0.15s',
              }}>
              <FlagSE/> SV
            </button>
            <button
              onClick={() => { if (lang !== 'en') toggleLang() }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '12px', fontWeight: '700',
                background: lang === 'en' ? '#111' : '#f5f5f5',
                color: lang === 'en' ? '#fff' : '#888',
                border: 'none',
                transition: 'all 0.15s',
              }}>
              <FlagUK/> EN
            </button>
          </div>
        </div>

        {/* Logout */}
        <div style={{ padding: '16px 24px' }}>
          <button onClick={handleLogout}
            style={{ width: '100%', padding: '11px', background: 'none', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#e11d48', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff5f7'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            {t('logout')}
          </button>
        </div>
      </div>
    </>
  )
}

function PanelItem({ onClick, label, icon }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 24px', background: hover ? '#f8f8f8' : 'none',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: '13px', fontWeight: '600', color: '#111',
        textAlign: 'left', transition: 'background 0.1s',
      }}>
      <span style={{ color: '#888' }}>{icon}</span>
      {label}
    </button>
  )
}

function NavBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none',
      borderBottom: active ? '2px solid #111' : '2px solid transparent',
      cursor: 'pointer', padding: '0 16px',
      fontSize: '12px', fontWeight: active ? '700' : '500',
      color: active ? '#111' : '#999',
      letterSpacing: '0.04em', transition: 'all 0.15s',
      fontFamily: 'inherit', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function DropItem({ label, sub, onClick, active, icon }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '12px 16px', background: hover ? '#f8f8f8' : active ? '#fafafa' : '#fff',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        transition: 'background 0.1s',
      }}>
      <span style={{ color: '#888', marginTop: '1px', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111', marginBottom: '1px' }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#aaa' }}>{sub}</div>
      </div>
    </button>
  )
}

const FolderIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const HangerIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H7v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V10h3.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
  </svg>
)
const GridIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const TagIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
