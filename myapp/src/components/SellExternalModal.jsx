import { useState } from 'react'
import { storage } from '../firebase'
import { ref, getBlob } from 'firebase/storage'

const PLATFORMS = [
  { name: 'Tradera',   url: 'https://www.tradera.com/sell',                    emoji: '🇸🇪', color: '#e84d4d' },
  { name: 'Vinted',    url: 'https://www.vinted.se/sell',                      emoji: '🟢', color: '#09B1A7' },
  { name: 'eBay',      url: 'https://www.ebay.com/sell',                       emoji: '🛒', color: '#e53238' },
  { name: 'Vestiaire', url: 'https://vestiairecollective.com/sell/',            emoji: '👜', color: '#4d4d4d' },
  { name: 'Poshmark',  url: 'https://poshmark.com/sell',                       emoji: '🌸', color: '#d1486a' },
]

function generateListingText(item) {
  const lines = []
  const category = item.category?.split(' |')[0] || 'Plagg'
  const brand    = item.brand     || ''
  const color    = item.color     || ''
  const price    = item.salePrice || ''
  const season   = item.season    || ''
  const store    = item.store     || ''
  const size     = item.size      || ''
  const fit      = item.fit       || ''

  // Rubrik
  const titleParts = [brand, category, color, size ? `Stl ${size}` : ''].filter(Boolean)
  lines.push(`📦 ${titleParts.join(' – ')}`)
  lines.push('')

  // Beskrivning
  lines.push(`Säljer en ${color ? color.toLowerCase() + ' ' : ''}${category.toLowerCase()}${brand ? ' från ' + brand : ''}.`)
  if (size)   lines.push(`📏 Storlek: ${size}${fit ? ` (${fit.toLowerCase()})` : ''}`)
  if (season) lines.push(`Perfekt för ${season.toLowerCase()}.`)
  if (store)  lines.push(`Köpt hos ${store}.`)
  lines.push('Bra skick.')
  lines.push('')

  // Pris
  if (price) lines.push(`💰 Pris: ${price} kr (frakt tillkommer)`)
  lines.push('')

  // Standardtext
  lines.push('Betalning via Swish. Frågor är välkomna! 😊')
  lines.push('Inga returer.')

  return lines.join('\n')
}

export default function SellExternalModal({ item, onClose }) {
  const [copied, setCopied]       = useState(false)
  const [downloading, setDownloading] = useState(false)

  const listingText = generateListingText(item)

  const copyText = () => {
    navigator.clipboard.writeText(listingText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadImage = async () => {
    if (!item.photoURL) return
    setDownloading(true)
    try {
      const match = item.photoURL.match(/\/o\/(.+?)(\?|$)/)
      let blob
      if (match) {
        blob = await getBlob(ref(storage, decodeURIComponent(match[1])))
      } else {
        const res = await fetch(item.photoURL)
        blob = await res.blob()
      }
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href     = url
      link.download = `${item.brand || 'plagg'}-${item.category || 'kläder'}.jpg`.replace(/\s+/g, '-').toLowerCase()
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
    setDownloading(false)
  }

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'540px', maxHeight:'90vh', overflow:'auto' }}>

        {/* Header */}
        <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:'800', fontSize:'16px', letterSpacing:'0.05em' }}>SÄLJ EXTERNT ♻️</div>
            <div style={{ fontSize:'12px', color:'#aaa', marginTop:'3px' }}>
              {item.brand ? `${item.brand} · ` : ''}{item.category?.split(' |')[0]}
              {item.salePrice ? ` · ${item.salePrice} kr` : ''}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'22px', color:'#aaa', lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:'20px' }}>

          {/* Bild + snabbinfo */}
          <div style={{ display:'flex', gap:'16px', marginBottom:'20px' }}>
            {item.photoURL && (
              <div style={{ width:'80px', height:'107px', borderRadius:'10px', overflow:'hidden', flexShrink:0 }}>
                <img src={item.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              </div>
            )}
            <div style={{ flex:1 }}>
              <p style={{ margin:'0 0 12px', fontSize:'13px', color:'#555', lineHeight:'1.5' }}>
                Vi har genererat en färdig annonstext åt dig. Kopiera texten, ladda ner bilden och öppna din valda plattform — klart!
              </p>
              <button onClick={downloadImage} disabled={downloading || !item.photoURL}
                style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', background:'#f7f8fa', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'12px', fontWeight:'700', cursor:'pointer', color:'#333' }}>
                {downloading ? '⏳ Laddar ner…' : '🖼️ Ladda ner bild'}
              </button>
            </div>
          </div>

          {/* Annonstext */}
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:'700', color:'#aaa', letterSpacing:'0.07em', marginBottom:'8px' }}>ANNONSTEXT</div>
            <div style={{ background:'#f7f8fa', borderRadius:'10px', padding:'14px 16px', border:'1.5px solid #e8e8e8', position:'relative' }}>
              <pre style={{ margin:0, fontSize:'13px', color:'#333', lineHeight:'1.7', whiteSpace:'pre-wrap', fontFamily:'inherit' }}>
                {listingText}
              </pre>
            </div>
            <button onClick={copyText}
              style={{ marginTop:'10px', width:'100%', padding:'11px', background: copied ? '#16a34a' : '#1a1a2e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', transition:'background 0.2s', letterSpacing:'0.05em' }}>
              {copied ? '✓ KOPIERAD!' : '📋 KOPIERA ANNONSTEXT'}
            </button>
          </div>

          {/* Plattformar */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:'700', color:'#aaa', letterSpacing:'0.07em', marginBottom:'10px' }}>ÖPPNA PLATTFORM</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {PLATFORMS.map(p => (
                <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', background:'#fafafa', border:'1.5px solid #e8e8e8', borderRadius:'10px', textDecoration:'none', color:'#222', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.background = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.background = '#fafafa' }}>
                  <span style={{ fontSize:'20px' }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:'700' }}>{p.name}</div>
                    <div style={{ fontSize:'10px', color:'#aaa' }}>Öppna →</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <p style={{ marginTop:'16px', fontSize:'11px', color:'#bbb', textAlign:'center', lineHeight:'1.5' }}>
            Klistra in annonstexten och ladda upp bilden direkt på plattformen.
          </p>
        </div>
      </div>
    </div>
  )
}
