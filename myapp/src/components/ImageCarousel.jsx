import { useState, useRef } from 'react'

export default function ImageCarousel({ photos = [], style = {}, objectFit = 'cover' }) {
  const [idx, setIdx] = useState(0)
  const touchStart = useRef(null)

  if (!photos.length) return null

  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx(i => (i + 1) % photos.length)

  const onTouchStart = e => { touchStart.current = e.touches[0].clientX }
  const onTouchEnd   = e => {
    if (touchStart.current === null) return
    const diff = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev()
    touchStart.current = null
  }

  return (
    <div style={{ position:'relative', width:'100%', ...style }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* Bild */}
      <img
        src={photos[idx]}
        alt=""
        style={{ width:'100%', height:'100%', objectFit, display:'block', userSelect:'none' }}
        draggable={false}
      />

      {/* Pilar – bara om fler än 1 bild */}
      {photos.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); prev() }}
            style={{
              position:'absolute', left:'8px', top:'50%', transform:'translateY(-50%)',
              width:'30px', height:'30px', borderRadius:'50%',
              background:'rgba(0,0,0,0.45)', color:'#fff', border:'none',
              cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center',
              lineHeight:1,
            }}>‹</button>
          <button onClick={e => { e.stopPropagation(); next() }}
            style={{
              position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)',
              width:'30px', height:'30px', borderRadius:'50%',
              background:'rgba(0,0,0,0.45)', color:'#fff', border:'none',
              cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center',
              lineHeight:1,
            }}>›</button>
        </>
      )}

      {/* Prickar */}
      {photos.length > 1 && (
        <div style={{
          position:'absolute', bottom:'10px', left:0, right:0,
          display:'flex', justifyContent:'center', gap:'5px',
        }}>
          {photos.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i) }}
              style={{
                width: i === idx ? '18px' : '6px', height:'6px',
                borderRadius:'3px', border:'none', cursor:'pointer', padding:0,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)',
                transition:'all 0.2s',
              }}/>
          ))}
        </div>
      )}
    </div>
  )
}
