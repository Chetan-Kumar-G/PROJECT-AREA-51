import { useEffect, useRef, useState } from 'react'
import { audio, type AudioSettings } from '../audio/CosmicAudioEngine'
import { planetaryAudio } from '../audio/planetaryAudio'
import { PROFILES } from '../audio/acoustics'
import './audioSettings.css'

const CATEGORIES: { key: keyof Omit<AudioSettings, 'muted' | 'master'>; label: string; hint: string }[] = [
  { key: 'ambience', label: 'Environment', hint: 'Wind and dust where there is air' },
  { key: 'mechanical', label: 'Vehicles & equipment', hint: 'THEIA, the carrier, rockets, instruments' },
  { key: 'mission', label: 'Mission', hint: 'Replay events and radio' },
  { key: 'narration', label: 'Narration', hint: 'The spoken guide' },
  { key: 'cinematic', label: 'Cinematic', hint: 'Optional music (off unless you start it)' },
]

/**
 * SOUND — the app's one audio control (CosmicAudioEngine): a real master switch that every sound obeys, master and
 * category volumes, all remembered. It says when the browser is still waiting for a click before it may play sound,
 * and what can be heard where the camera is (no sound in a vacuum, thin air on Mars).
 */
export function AudioPlayer() {
  const [, setTick] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => audio.subscribe(() => setTick((x) => x + 1)), [])
  useEffect(() => {
    if (!open) return
    const iv = setInterval(() => setTick((x) => x + 1), 1000) // the "where you are" line follows the scene
    const out = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', out)
    return () => { clearInterval(iv); window.removeEventListener('mousedown', out) }
  }, [open])

  const S = audio.getSettings()
  const muted = S.muted
  const locked = audio.status() === 'locked'
  const playing = audio.getIsPlaying()
  const medium = planetaryAudio.stats.medium
  const owner = planetaryAudio.stats.owner()

  return (
    <div className="audio-player-widget" ref={ref}>
      <button className={'btn ghost audio-btn' + (muted ? ' muted' : '')} onClick={() => { void audio.unlock(); setOpen(!open) }}
        aria-label={`Sound settings: sound is ${muted ? 'off' : 'on'}`} aria-expanded={open} data-testid="sound-button" data-muted={muted ? 'true' : 'false'}>
        <span className="audio-icon" aria-hidden>{muted ? '🔇' : '🔊'}</span>
        <span className="audio-label">Sound {muted ? 'off' : 'on'}</span>
      </button>
      {open && (
        <div className="audio-popover sound-panel glass" role="dialog" aria-label="Sound settings" data-testid="sound-panel">
          <div className="sound-head">
            <b>Sound</b>
            <button className={'sound-switch' + (muted ? '' : ' on')} role="switch" aria-checked={!muted} onClick={() => { void audio.unlock(); audio.setMuted(!muted) }} data-testid="sound-toggle">
              <i />{muted ? 'Off' : 'On'}
            </button>
          </div>
          {locked && !muted && <p className="sound-note warn" data-testid="sound-locked">Your browser starts sound after your first click or key press.</p>}
          <label className="sound-row master">
            <span>Master</span>
            <input type="range" min={0} max={100} value={Math.round(S.master * 100)} disabled={muted} onChange={(e) => audio.setVolume(Number(e.target.value) / 100)} aria-label="Master volume" data-testid="vol-master" />
            <output>{Math.round(S.master * 100)}</output>
          </label>
          {CATEGORIES.map((c) => (
            <label key={c.key} className="sound-row" title={c.hint}>
              <span>{c.label}</span>
              <input type="range" min={0} max={100} value={Math.round(S[c.key] * 100)} disabled={muted} onChange={(e) => audio.setCategory(c.key, Number(e.target.value) / 100)} aria-label={`${c.label} volume`} data-testid={`vol-${c.key}`} />
              <output>{Math.round(S[c.key] * 100)}</output>
            </label>
          ))}
          <div className="sound-music">
            <button className="btn small ghost" onClick={() => { void audio.unlock(); audio.togglePlay() }} disabled={muted} data-testid="music-toggle">{playing ? '❚❚ Stop music' : '♪ Play music'}</button>
            {playing && <span className="muted small">{audio.getTrackInfo().title} · generated</span>}
          </div>
          <p className="sound-note" data-testid="sound-where">{owner ? PROFILES[medium].note : 'Sounds follow the place you explore: none in the vacuum of space or on the Moon outside, thin and quiet on Mars.'}</p>
          <p className="sound-note muted">All sounds are generated reconstructions, not NASA recordings.</p>
        </div>
      )}
    </div>
  )
}
