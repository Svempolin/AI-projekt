import { useState, useEffect } from 'react'
import { useLang } from '../context/LanguageContext'

const TABS = [
  {
    page: 'home',
    key: 'home',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill={active ? '#111' : 'none'} stroke={active ? '#111' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    page: 'wardrobe',
    key: 'wardrobe',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={active ? '#111' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H7v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V10h3.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
      </svg>
    ),
  },
  {
    page: 'fleamarket',
    key: 'feed',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={active ? '#111' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
  },
  {
    page: 'planner',
    key: 'plan',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={active ? '#111' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    page: 'profile',
    key: 'myProfile',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={active ? '#111' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export default function BottomNav({ currentPage, onNavigate }) {
  const { t } = useLang()
  const [visible, setVisible] = useState(window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setVisible(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!visible) return null

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: '64px',
      background: '#fff',
      borderTop: '1px solid #e8e8e8',
      display: 'flex',
      zIndex: 500,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {TABS.map(tab => {
        const active = currentPage === tab.page || (tab.page === 'wardrobe' && currentPage === 'manage')
        return (
          <button key={tab.page} onClick={() => onNavigate(tab.page)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 4px',
              position: 'relative',
            }}>
            {active && (
              <div style={{
                position: 'absolute',
                top: 0, left: '20%', right: '20%',
                height: '2px',
                background: '#111',
                borderRadius: '0 0 2px 2px',
              }}/>
            )}
            {tab.icon(active)}
            <span style={{
              fontSize: '10px',
              fontWeight: active ? '700' : '500',
              color: active ? '#111' : '#aaa',
              letterSpacing: '0.03em',
            }}>
              {t(tab.key)}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
