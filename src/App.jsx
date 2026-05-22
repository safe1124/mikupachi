import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Coins,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'

const BOARD_W = 360
const BOARD_H = 620
const BALL_R = 5.2
const MAX_ACTIVE_BALLS = 32
const BALL_VALUE_YEN = 4
const JACKPOT_VALUE_YEN = 16000
const JACKPOT_NAVEL_VALUE_YEN = 400
const START_POCKET = { x: 180, y: 398, r: 45 }
const BONUS_POCKETS = [
  { x: 76, y: 486, r: 22, payout: 3 },
  { x: 284, y: 486, r: 22, payout: 3 },
]
const ATTACKER = { x: 112, y: 516, w: 136, h: 34 }
const NUMBER_COLORS = {
  1: '#20dfd2',
  2: '#8af1ff',
  3: '#ff5aa7',
  4: '#ffd166',
  5: '#9dff74',
  6: '#a487ff',
  7: '#ffffff',
}
const JACKPOT_IMAGES = {
  1: '/jackpots/111.png',
  2: '/jackpots/222.png',
  3: '/jackpots/333.png',
  4: '/jackpots/444.png',
  5: '/jackpots/555.png',
  6: '/jackpots/666.png',
  7: '/jackpots/333.png',
}
const SPIN_NUMBER_IMAGES = {
  1: '/spin/num1.png',
  2: '/spin/num2.png',
  3: '/spin/num3.png',
  4: '/spin/num4.png',
  5: '/spin/num5.png',
  6: '/spin/num6.png',
  7: '/spin/num7.png',
}
const SPIN_EFFECT_IMAGES = ['/spin/effect-1.png', '/spin/effect-2.png', '/spin/effect-3.png']

const randomNumber = () => Math.floor(Math.random() * 7) + 1
const yenFormatter = new Intl.NumberFormat('ja-JP')
const formatYen = (value) => {
  const sign = value < 0 ? '-' : ''
  return `${sign}¥${yenFormatter.format(Math.abs(value))}`
}
const getModeLabel = (game) => {
  if (game.jackpot.active) return '大当たり'
  if (game.fever) return 'フィーバー'
  if (game.reach) return 'リーチ'
  return '通常'
}
const createSpinOverlay = () => ({
  active: false,
  reels: [1, 2, 3],
  locked: [false, false, false],
  result: null,
  reach: false,
  won: false,
  final: false,
  message: '待機',
  accentIndex: 0,
})

function buildPins() {
  const pins = []
  for (let row = 0; row < 12; row += 1) {
    const y = 108 + row * 31
    const startX = row % 2 === 0 ? 46 : 62
    for (let x = startX; x <= 314; x += 32) {
      const nearStart = Math.hypot(x - START_POCKET.x, y - START_POCKET.y) < 48
      const nearAttacker = x > ATTACKER.x - 14 && x < ATTACKER.x + ATTACKER.w + 14 && y > ATTACKER.y - 56
      const nearBumper =
        Math.hypot(x - 114, y - 236) < 42 ||
        Math.hypot(x - 246, y - 236) < 42 ||
        Math.hypot(x - 180, y - 304) < 46
      if (!nearStart && !nearAttacker && !nearBumper) {
        pins.push({ x, y, r: 3.8 })
      }
    }
  }
  return pins
}

const PINS = buildPins()
const BUMPERS = [
  { x: 114, y: 236, r: 20, number: 1 },
  { x: 246, y: 236, r: 20, number: 7 },
  { x: 180, y: 304, r: 23, number: 3 },
]

const createInitialGame = () => ({
  ammo: 125,
  shots: 0,
  captured: 0,
  payout: 0,
  jackpotNavelRevenue: 0,
  spins: 0,
  jackpots: 0,
  holds: 0,
  spinning: false,
  reels: [1, 2, 3],
  reach: false,
  fever: false,
  feverSpinsLeft: 0,
  spinOverlay: createSpinOverlay(),
  effect: '待機',
  log: ['ミクパチフィーバー 起動'],
  jackpotSplash: null,
  jackpot: {
    active: false,
    open: false,
    round: 0,
    maxRounds: 0,
    hits: 0,
    number: null,
    target: 0,
    earned: 0,
    shots: 0,
  },
})

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function mixLog(prev, next) {
  return [next, ...prev].slice(0, 5)
}

function MikuMark() {
  return (
    <svg className="mikuMark" viewBox="0 0 220 170" aria-hidden="true">
      <defs>
        <linearGradient id="hair" x1="0" x2="1">
          <stop stopColor="#22f0df" />
          <stop offset="1" stopColor="#0aa7b7" />
        </linearGradient>
        <linearGradient id="tie" y1="0" y2="1">
          <stop stopColor="#ff62ae" />
          <stop offset="1" stopColor="#f2d54b" />
        </linearGradient>
      </defs>
      <path
        d="M42 68C23 96 20 133 31 162c37-23 66-59 75-104C81 48 58 50 42 68z"
        fill="url(#hair)"
        opacity=".95"
      />
      <path
        d="M178 68c19 28 22 65 11 94-37-23-66-59-75-104 25-10 48-8 64 10z"
        fill="url(#hair)"
        opacity=".95"
      />
      <circle cx="110" cy="76" r="44" fill="#ffe6d9" />
      <path
        d="M64 72c8-52 82-66 103-15 11-6 20-14 28-25-49-40-118-39-165 3 9 17 20 29 34 37z"
        fill="url(#hair)"
      />
      <path d="M78 93c18 17 46 19 65 1" fill="none" stroke="#11242b" strokeWidth="6" strokeLinecap="round" />
      <path d="M79 67h24M119 67h24" stroke="#11242b" strokeWidth="6" strokeLinecap="round" />
      <path d="M92 124h36l15 43H77z" fill="#1b252c" />
      <path d="M103 124h15l9 43H94z" fill="url(#tie)" />
      <path
        d="M36 39h33M151 39h33"
        fill="none"
        stroke="#ff4fa4"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ReelPanel({ game }) {
  return (
    <section className={`reelPanel ${game.reach ? 'isReach' : ''} ${game.jackpot.active ? 'isJackpot' : ''}`}>
      <div className="reelMeta">
        <span>{game.fever ? `フィーバー ${game.feverSpinsLeft}` : '通常'}</span>
        <span>保留 {game.holds}/4</span>
      </div>
      <div className="reels" aria-label="図柄リール">
        {game.reels.map((value, index) => (
          <div
            className={`reel ${game.spinning ? 'spinning' : ''} ${value === 7 ? 'seven' : ''}`}
            style={{ '--num-color': NUMBER_COLORS[value] }}
            key={`${index}-${value}`}
          >
            {value}
          </div>
        ))}
      </div>
      <div className="numberStrip" aria-label="1から7の図柄">
        {[1, 2, 3, 4, 5, 6, 7].map((number) => (
          <span
            className={game.reels.includes(number) ? 'lit' : ''}
            style={{ '--num-color': NUMBER_COLORS[number] }}
            key={number}
          >
            {number}
          </span>
        ))}
      </div>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function BigEffect({ game }) {
  if (!game.jackpot.active && !game.reach) return null

  if (game.jackpot.active) {
    return (
      <div className="bigEffect jackpotEffect" aria-live="polite">
        <div className="pulseText">{game.jackpot.number === 7 ? '超大当たり' : '大当たり'}</div>
        <div className="roundText">
          第 {game.jackpot.round} ラウンド
        </div>
        <div className="roundText" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
          収穫 {formatYen(game.jackpot.earned)} / 使用玉 {game.jackpot.shots}
        </div>
        <div className="confetti">
          {Array.from({ length: 18 }).map((_, index) => (
            <i style={{ '--i': index }} key={index} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bigEffect reachEffect" aria-live="polite">
      <div className="pulseText">リーチ</div>
      <div className="roundText">最後の数字を待て</div>
    </div>
  )
}

function JackpotSplash({ splash }) {
  if (!splash) return null

  return (
    <div className="jackpotSplash" aria-live="assertive">
      <img src={splash.image} alt={`${splash.number}${splash.number}${splash.number} 大当たり`} />
    </div>
  )
}

function SpinOverlay({ overlay }) {
  if (!overlay?.active) return null

  const centerNumber = overlay.reels[1] ?? overlay.reels[0] ?? 1
  const resultText = overlay.result?.join('') ?? overlay.reels.join('')
  const headline = overlay.final
    ? overlay.won
      ? '大当たり'
      : 'ハズレ'
    : overlay.reach
      ? 'リーチ'
      : '図柄変動'
  const accentSrc = SPIN_EFFECT_IMAGES[overlay.accentIndex % SPIN_EFFECT_IMAGES.length]

  return (
    <div
      className={`spinOverlay ${overlay.reach ? 'isReach' : ''} ${overlay.final ? 'isFinal' : ''} ${
        overlay.won ? 'isWin' : ''
      }`}
      aria-live="assertive"
    >
      <img className="spinBackdrop" src={SPIN_NUMBER_IMAGES[centerNumber]} alt="" aria-hidden="true" />
      <div className="spinRays" aria-hidden="true" />
      <div className="spinStage">
        <div className="spinHeader">
          <span>{headline}</span>
          <strong>{overlay.message}</strong>
        </div>

        <div className="spinReelDeck" aria-label="抽選図柄">
          {overlay.reels.map((value, index) => (
            <div
              className={`spinCard ${overlay.locked[index] ? 'locked' : 'rolling'} ${
                overlay.final ? 'final' : ''
              }`}
              key={`${index}-${value}-${overlay.locked[index]}`}
              style={{ '--delay': `${index * 84}ms` }}
            >
              <img src={SPIN_NUMBER_IMAGES[value]} alt={`${value}図柄`} />
              <span>{overlay.locked[index] ? '停止' : '回転'}</span>
            </div>
          ))}
        </div>

        <div className="spinFooter">
          <span>{overlay.reach ? '最後の図柄을 待て' : '1 - 7 図柄抽選中'}</span>
          <b>{overlay.final ? resultText : '???'}</b>
        </div>
      </div>

      {overlay.reach && <img className="spinAccent" src={accentSrc} alt="" aria-hidden="true" />}
      {overlay.won && <img className="spinWinLogo" src={SPIN_EFFECT_IMAGES[1]} alt="大当たり" />}
    </div>
  )
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawBoard(ctx, balls, game, time) {
  ctx.clearRect(0, 0, BOARD_W, BOARD_H)

  const shimmer = (Math.sin(time / 450) + 1) / 2
  drawRoundRect(ctx, 12, 10, BOARD_W - 24, BOARD_H - 20, 28)
  ctx.fillStyle = 'rgba(7, 21, 27, 0.72)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = `rgba(35, 224, 212, ${0.42 + shimmer * 0.25})`
  ctx.stroke()

  ctx.save()
  ctx.globalAlpha = 0.72
  ctx.strokeStyle = '#0a151a'
  ctx.lineWidth = 22
  ctx.beginPath()
  ctx.moveTo(329, 560)
  ctx.quadraticCurveTo(342, 260, 325, 68)
  ctx.quadraticCurveTo(250, 28, 178, 31)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)'
  ctx.lineWidth = 15
  ctx.beginPath()
  ctx.moveTo(329, 560)
  ctx.quadraticCurveTo(342, 260, 325, 68)
  ctx.quadraticCurveTo(250, 28, 178, 31)
  ctx.stroke()
  ctx.strokeStyle = '#12343c'
  ctx.lineWidth = 11
  ctx.beginPath()
  ctx.moveTo(329, 560)
  ctx.quadraticCurveTo(342, 260, 325, 68)
  ctx.quadraticCurveTo(250, 28, 178, 31)
  ctx.stroke()
  ctx.strokeStyle = '#39eee2'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(329, 560)
  ctx.quadraticCurveTo(342, 260, 325, 68)
  ctx.quadraticCurveTo(250, 28, 178, 31)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.72)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(315, 552)
  ctx.quadraticCurveTo(326, 260, 314, 82)
  ctx.quadraticCurveTo(256, 48, 188, 49)
  ctx.stroke()
  ctx.fillStyle = `rgba(255, 209, 102, ${0.22 + shimmer * 0.18})`
  ctx.beginPath()
  ctx.arc(315, 73, 8 + shimmer * 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.16
  ctx.fillStyle = '#23e0d4'
  ctx.beginPath()
  ctx.ellipse(180, 230, 116, 174, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.font = '700 13px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)'
  ctx.fillText('ミクパ치', 180, 58)

  PINS.forEach((pin, index) => {
    const twinkle = (Math.sin(time / 260 + index) + 1) / 2
    ctx.beginPath()
    ctx.arc(pin.x, pin.y, pin.r + twinkle * 0.8, 0, Math.PI * 2)
    ctx.fillStyle = '#eafcff'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(pin.x, pin.y, pin.r + 3.8, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(32, 223, 210, ${0.08 + twinkle * 0.08})`
    ctx.fill()
  })

  BUMPERS.forEach((bumper) => {
    ctx.beginPath()
    ctx.arc(bumper.x, bumper.y, bumper.r + 9, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 79, 164, 0.13)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2)
    ctx.fillStyle = '#0f2d35'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = NUMBER_COLORS[bumper.number]
    ctx.stroke()
    ctx.fillStyle = NUMBER_COLORS[bumper.number]
    ctx.font = '800 20px system-ui, sans-serif'
    ctx.fillText(String(bumper.number), bumper.x, bumper.y + 1)
  })

  BONUS_POCKETS.forEach((pocket) => {
    ctx.beginPath()
    ctx.arc(pocket.x, pocket.y, pocket.r + 7, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 209, 102, 0.12)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(pocket.x, pocket.y, pocket.r, 0, Math.PI * 2)
    ctx.fillStyle = '#211b0d'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ffd166'
    ctx.stroke()
    ctx.fillStyle = '#ffd166'
    ctx.font = '800 12px system-ui, sans-serif'
    ctx.fillText('+3', pocket.x, pocket.y + 1)
  })

  ctx.beginPath()
  ctx.arc(START_POCKET.x, START_POCKET.y, START_POCKET.r + 9, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(35, 224, 212, 0.16)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(START_POCKET.x, START_POCKET.y, START_POCKET.r, 0, Math.PI * 2)
  ctx.fillStyle = '#09252d'
  ctx.fill()
  ctx.lineWidth = 3.5
  ctx.strokeStyle = game.spinning ? '#ff5aa7' : '#23e0d4'
  ctx.stroke()
  ctx.fillStyle = '#d9fffb'
  ctx.font = '800 10px system-ui, sans-serif'
  ctx.fillText('始動', START_POCKET.x, START_POCKET.y)

  const attackerGlow = game.jackpot.open ? 0.42 + shimmer * 0.2 : 0.08
  drawRoundRect(ctx, ATTACKER.x - 8, ATTACKER.y - 8, ATTACKER.w + 16, ATTACKER.h + 16, 14)
  ctx.fillStyle = `rgba(255, 90, 167, ${attackerGlow})`
  ctx.fill()
  drawRoundRect(ctx, ATTACKER.x, ATTACKER.y, ATTACKER.w, ATTACKER.h, 10)
  ctx.fillStyle = game.jackpot.open ? '#451531' : '#17242a'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = game.jackpot.open ? '#ff5aa7' : '#35545b'
  ctx.stroke()
  ctx.fillStyle = game.jackpot.open ? '#fff2f9' : '#7fa0a4'
  ctx.font = '900 12px system-ui, sans-serif'
  ctx.fillText(game.jackpot.open ? 'アタッカー +10' : 'アタッカー', 180, ATTACKER.y + 15)

  ctx.strokeStyle = 'rgba(255,255,255,.12)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(38, 548)
  ctx.lineTo(144, 585)
  ctx.moveTo(322, 548)
  ctx.lineTo(216, 585)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)'
  ctx.font = '700 10px system-ui, sans-serif'
  ctx.fillText('アウト', 180, 590)

  balls.forEach((ball) => {
    const gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 3, 1, ball.x, ball.y, ball.r + 4)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.45, '#c8ffff')
    gradient.addColorStop(1, '#0ea8b7')
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.r + 2.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(35, 224, 212, 0.14)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
    ctx.stroke()
  })
}

export default function App() {
  const canvasRef = useRef(null)
  const ballsRef = useRef([])
  const gameRef = useRef(createInitialGame())
  const callbacksRef = useRef({})
  const audioRef = useRef(null)
  const spinTimersRef = useRef([])
  const roundTimerRef = useRef(null)
  const splashTimerRef = useRef(null)
  const spinAudioRef = useRef(null)
  const jackpotAudioRef = useRef(null)
  const roundTransitionRef = useRef(false)
  const shotIntervalRef = useRef(null)
  const lastShotRef = useRef(0)
  const ballIdRef = useRef(1)
  const jackpotLogicRef = useRef({
    beginJackpot: null,
    endJackpot: null,
    closeRound: null,
  })
  const [game, setGame] = useState(() => createInitialGame())
  const [power, setPower] = useState(88)
  const [autoFire, setAutoFire] = useState(false)
  const [soundOn, setSoundOn] = useState(true)

  useEffect(() => {
    gameRef.current = game
  }, [game])

  useEffect(() => {
    [
      ...Object.values(JACKPOT_IMAGES),
      ...Object.values(SPIN_NUMBER_IMAGES),
      ...SPIN_EFFECT_IMAGES,
    ].forEach((src) => {
      const image = new Image()
      image.src = src
    })
  }, [])

  const playTone = useCallback(
    (kind) => {
      if (!soundOn) return
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      if (!audioRef.current) {
        audioRef.current = new AudioContext()
      }
      const ctx = audioRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const now = ctx.currentTime
      if (kind === 'jackpot') {
        const audio = new Audio('/jackpot_sound.mp3')
        audio.volume = 0.5
        audio.play().catch(e => console.error("Audio play failed:", e))
        return
      }

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const map = {
        shoot: [540, 0.035, 0.04],
        start: [880, 0.06, 0.05],
        win: [1240, 0.08, 0.08],
        miss: [220, 0.035, 0.035],
      }
      const [freq, volume, duration] = map[kind] || map.shoot
      osc.frequency.setValueAtTime(freq, now)
      osc.type = kind === 'win' ? 'triangle' : 'sine'
      gain.gain.setValueAtTime(volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + duration)
    },
    [soundOn],
  )

  const clearSpinTimers = useCallback(() => {
    spinTimersRef.current.forEach((timer) => {
      if (timer.type === 'interval') clearInterval(timer.id)
      else clearTimeout(timer.id)
    })
    spinTimersRef.current = []
  }, [])

  const pushTimer = useCallback((id, type = 'timeout') => {
    spinTimersRef.current.push({ id, type })
  }, [])

  const scheduleNextHeldSpin = useCallback(() => {
    window.setTimeout(() => {
      const current = gameRef.current
      if (current.holds > 0 && !current.spinning && !current.jackpot.active) {
        if (jackpotLogicRef.current.startSpin) {
            jackpotLogicRef.current.startSpin(true)
        }
      }
    }, 650)
  }, [])

  const endJackpot = useCallback(() => {
    window.clearTimeout(roundTimerRef.current)
    roundTransitionRef.current = false

    if (jackpotAudioRef.current) {
      jackpotAudioRef.current.pause()
      jackpotAudioRef.current.currentTime = 0
    }

    const willContinue = Math.random() < 0.39
    if (willContinue) {
      const winningNumber = randomNumber()
      if (jackpotLogicRef.current.beginJackpot) {
        jackpotLogicRef.current.beginJackpot(winningNumber)
      }
      return
    }

    setGame((prev) => ({
      ...prev,
      jackpot: {
        active: false,
        open: false,
        round: 0,
        maxRounds: 0,
        hits: 0,
        number: null,
        target: 0,
        earned: 0,
        shots: 0,
      },
      effect: `フィーバー残り ${prev.feverSpinsLeft}`,
      log: mixLog(prev.log, `大当たり終了 / フィーバー ${prev.feverSpinsLeft}回`),
    }))
    scheduleNextHeldSpin()
  }, [scheduleNextHeldSpin])

  const closeRound = useCallback(() => {
    if (roundTransitionRef.current) return
    roundTransitionRef.current = true
    window.clearTimeout(roundTimerRef.current)
    const current = gameRef.current
    if (!current.jackpot.active) return

    setGame((prev) => ({
      ...prev,
      jackpot: { ...prev.jackpot, open: false },
      effect: `第${prev.jackpot.round}ラウンド終了`,
    }))

    window.setTimeout(() => {
      const latest = gameRef.current
      if (!latest.jackpot.active) return
      roundTransitionRef.current = false
      setGame((prev) => ({
        ...prev,
        jackpot: {
          ...prev.jackpot,
          open: true,
          round: prev.jackpot.round + 1,
          hits: 0,
        },
        effect: `第${prev.jackpot.round + 1}ラウンド開始`,
      }))
      roundTimerRef.current = window.setTimeout(() => {
        if (jackpotLogicRef.current.closeRound) {
            jackpotLogicRef.current.closeRound()
        }
      }, 9500)
    }, 950)
  }, [])

  const beginJackpot = useCallback(
    (number) => {
      const maxRounds = number === 7 ? 10 : number >= 5 ? 7 : 5
      const target = 16000 + Math.floor(Math.random() * 48001)
      playTone('jackpot')

      if (soundOn) {
        if (jackpotAudioRef.current) {
          jackpotAudioRef.current.pause()
          jackpotAudioRef.current.currentTime = 0
        }
        jackpotAudioRef.current = new Audio('/jackpot_bgm.m4a')
        jackpotAudioRef.current.loop = true
        jackpotAudioRef.current.play().catch(e => console.error("Jackpot BGM play failed:", e))
      }

      window.clearTimeout(splashTimerRef.current)
      window.clearTimeout(roundTimerRef.current)
      roundTransitionRef.current = false
      setGame((prev) => ({
        ...prev,
        jackpots: prev.jackpots + 1,
        fever: true,
        feverSpinsLeft: number === 7 ? 32 : 18,
        effect: number === 7 ? '超大当たり' : '大当たり',
        jackpot: {
          active: true,
          open: true,
          round: 1,
          maxRounds,
          hits: 0,
          number,
          target,
          earned: 0,
          shots: 0,
        },
        jackpotSplash: {
          image: JACKPOT_IMAGES[number] ?? JACKPOT_IMAGES[3],
          number,
        },
        log: mixLog(prev.log, `${number}${number}${number} 大当たり / ${maxRounds}R`),
      }))
      splashTimerRef.current = window.setTimeout(() => {
        setGame((prev) => ({
          ...prev,
          jackpotSplash: null,
        }))
      }, 5000)
      roundTimerRef.current = window.setTimeout(() => {
        if (jackpotLogicRef.current.closeRound) {
            jackpotLogicRef.current.closeRound()
        }
      }, 9500)
    },
    [playTone, soundOn],
  )

  const startSpin = useCallback(
    (consumeHold = false) => {
      const current = gameRef.current
      if (current.spinning || current.jackpot.active) {
        if (!consumeHold) {
          setGame((prev) => ({
            ...prev,
            holds: Math.min(4, prev.holds + 1),
            effect: current.jackpot.active ? prev.effect : '保留 +1',
            log: mixLog(prev.log, '保留ランプ点灯'),
          }))
        }
        return
      }

      clearSpinTimers()

      if (soundOn) {
        if (spinAudioRef.current) {
          spinAudioRef.current.pause()
          spinAudioRef.current.currentTime = 0
        }
        spinAudioRef.current = new Audio('/spin_sound.m4a')
        spinAudioRef.current.loop = true
        spinAudioRef.current.play().catch(e => console.error("Spin audio play failed:", e))
      }

      const isFever = current.fever
      const jackpotChance = isFever ? 0.34 : 0.16
      const willWin = Math.random() < jackpotChance
      const winningNumber = randomNumber()
      const makeReach = willWin || Math.random() < 0.38
      let result

      if (willWin) {
        result = [winningNumber, winningNumber, winningNumber]
      } else if (makeReach) {
        const miss = ((winningNumber + Math.floor(Math.random() * 6)) % 7) + 1
        result = [winningNumber, winningNumber, miss === winningNumber ? ((miss % 7) + 1) : miss]
      } else {
        result = [randomNumber(), randomNumber(), randomNumber()]
        while (result[0] === result[1] && result[1] === result[2]) {
          result[2] = randomNumber()
        }
      }

      const locked = [null, null, null]
      const initialReels = [randomNumber(), randomNumber(), randomNumber()]
      const initialOverlay = {
        ...createSpinOverlay(),
        active: true,
        reels: initialReels,
        result,
        message: isFever ? 'フィーバー変動開始' : '図柄変動開始',
        accentIndex: Math.floor(Math.random() * SPIN_EFFECT_IMAGES.length),
      }
      setGame((prev) => ({
        ...prev,
        holds: consumeHold ? Math.max(0, prev.holds - 1) : prev.holds,
        spinning: true,
        reach: false,
        spins: prev.spins + 1,
        effect: isFever ? 'フィーバー変動開始' : '変動開始',
        reels: initialReels,
        spinOverlay: initialOverlay,
        log: mixLog(prev.log, 'スタートチャッカー入賞'),
      }))

      const interval = window.setInterval(() => {
        const nextReels = locked.map((value) => value ?? randomNumber())
        setGame((prev) => ({
          ...prev,
          reels: nextReels,
          spinOverlay: prev.spinOverlay.active
            ? {
                ...prev.spinOverlay,
                reels: nextReels,
                locked: locked.map((value) => value !== null),
              }
            : prev.spinOverlay,
        }))
      }, 78)
      pushTimer(interval, 'interval')

      pushTimer(
        window.setTimeout(() => {
          locked[0] = result[0]
          setGame((prev) => ({
            ...prev,
            spinOverlay: prev.spinOverlay.active
              ? {
                  ...prev.spinOverlay,
                  reels: [result[0], prev.spinOverlay.reels[1], prev.spinOverlay.reels[2]],
                  locked: [true, false, false],
                  message: '一図柄停止',
                }
              : prev.spinOverlay,
          }))
          playTone('start')
        }, 620),
      )
      pushTimer(
        window.setTimeout(() => {
          locked[1] = result[1]
          const isReachResult = result[0] === result[1]
          setGame((prev) => ({
            ...prev,
            reach: isReachResult,
            effect: isReachResult ? 'リーチ' : '次停止',
            spinOverlay: prev.spinOverlay.active
              ? {
                  ...prev.spinOverlay,
                  reels: [result[0], result[1], prev.spinOverlay.reels[2]],
                  locked: [true, true, false],
                  reach: isReachResult,
                  message: isReachResult ? 'リーチ発展' : '二図柄停止',
                }
              : prev.spinOverlay,
          }))
          if (isReachResult) playTone('win')
        }, 1240),
      )
      pushTimer(
        window.setTimeout(() => {
          locked[2] = result[2]
          clearSpinTimers()

          if (spinAudioRef.current) {
            spinAudioRef.current.pause()
            spinAudioRef.current.currentTime = 0
          }

          const won = result[0] === result[1] && result[1] === result[2]
          setGame((prev) => {
            const feverLeft = prev.fever && !won ? Math.max(0, prev.feverSpinsLeft - 1) : prev.feverSpinsLeft
            return {
              ...prev,
              spinning: false,
              reach: false,
              reels: result,
              fever: won ? prev.fever : feverLeft > 0,
              feverSpinsLeft: won ? prev.feverSpinsLeft : feverLeft,
              spinOverlay: prev.spinOverlay.active
                ? {
                    ...prev.spinOverlay,
                    reels: result,
                    locked: [true, true, true],
                    reach: false,
                    won,
                    final: true,
                    message: won ? `${result.join('')} 揃い` : `${result.join('')} 停止`,
                  }
                : prev.spinOverlay,
              effect: won ? '大当たり' : feverLeft > 0 ? `フィー버残り${feverLeft}` : 'ハズレ',
              log: mixLog(prev.log, won ? `${result.join('')} 揃い` : `${result.join('')} ハズレ`),
            }
          })

          if (won) {
            const jackpotTimer = window.setTimeout(() => {
                if (jackpotLogicRef.current.beginJackpot) {
                    jackpotLogicRef.current.beginJackpot(result[0])
                }
            }, 780)
            pushTimer(jackpotTimer)
          } else {
            playTone('miss')
            scheduleNextHeldSpin()
          }
          const hideOverlayTimer = window.setTimeout(() => {
            setGame((prev) => ({
              ...prev,
              spinOverlay: {
                ...prev.spinOverlay,
                active: false,
              },
            }))
          }, won ? 1000 : 820)
          pushTimer(hideOverlayTimer)
        }, 2300),
      )
    },
    [clearSpinTimers, playTone, pushTimer, scheduleNextHeldSpin, soundOn],
  )

  useEffect(() => {
    jackpotLogicRef.current = {
      beginJackpot,
      endJackpot,
      closeRound,
      startSpin
    }
  }, [beginJackpot, endJackpot, closeRound, startSpin])

  const onStartPocket = useCallback(() => {
    playTone('start')
    setGame((prev) => {
      const addedRevenue = prev.jackpot.active ? JACKPOT_NAVEL_VALUE_YEN : 0
      const newEarned = prev.jackpot.active ? prev.jackpot.earned + addedRevenue : 0
      return {
        ...prev,
        captured: prev.captured + 1,
        payout: prev.payout + 1,
        ammo: prev.ammo + 1,
        jackpotNavelRevenue: prev.jackpotNavelRevenue + addedRevenue,
        effect: prev.jackpot.active ? `へそ入賞 +¥${addedRevenue}` : prev.effect,
        jackpot: {
          ...prev.jackpot,
          earned: newEarned,
        },
        log: prev.jackpot.active
          ? mixLog(prev.log, `大当たり中 へそ入賞 +¥${addedRevenue}`)
          : prev.log,
      }
    })
    startSpin(false)
  }, [playTone, startSpin])

  const onBonusPocket = useCallback(
    (payout) => {
      playTone('start')
      setGame((prev) => ({
        ...prev,
        captured: prev.captured + 1,
        payout: prev.payout + payout,
        ammo: prev.ammo + payout,
        effect: `賞球 +${payout}`,
        log: mixLog(prev.log, `一般入賞 +${payout}`),
      }))
    },
    [playTone],
  )

  const onAttackerPocket = useCallback(() => {
    const current = gameRef.current
    if (!current.jackpot.open) return
    playTone('win')
    const nextHits = current.jackpot.hits + 1
    const payoutValue = 10 * BALL_VALUE_YEN
    setGame((prev) => ({
      ...prev,
      captured: prev.captured + 1,
      payout: prev.payout + 10,
      ammo: prev.ammo + 10,
      effect: `アタッカー +10`,
      jackpot: {
        ...prev.jackpot,
        hits: prev.jackpot.hits + 1,
        earned: prev.jackpot.earned + payoutValue,
      },
      log: mixLog(prev.log, `アタッカー入賞 +10`),
    }))
    if (nextHits >= 6) {
      if (jackpotLogicRef.current.closeRound) {
        jackpotLogicRef.current.closeRound()
      }
    }
  }, [playTone])

  useEffect(() => {
    if (game.jackpot.active && game.jackpot.shots >= 300) {
      if (jackpotLogicRef.current.endJackpot) {
        jackpotLogicRef.current.endJackpot()
      }
    }
  }, [game.jackpot.active, game.jackpot.shots])

  useEffect(() => {
    callbacksRef.current = {
      onStartPocket,
      onBonusPocket,
      onAttackerPocket,
    }
  }, [onAttackerPocket, onBonusPocket, onStartPocket])

  const fireBall = useCallback(() => {
    const now = performance.now()
    const current = gameRef.current
    if (now - lastShotRef.current < 125 || current.ammo <= 0 || ballsRef.current.length >= MAX_ACTIVE_BALLS) {
      return
    }
    lastShotRef.current = now
    const launchPower = power / 100
    const vx = 0.12 + launchPower * 0.18 + (Math.random() - 0.5) * 0.08
    const vy = -10.6 - launchPower * 5.9
    ballsRef.current.push({
      id: ballIdRef.current,
      x: 326,
      y: 566,
      vx,
      vy,
      r: BALL_R,
      born: now,
      stuck: 0,
      launchRail: true,
      startBias: Math.random() < 0.42,
    })
    ballIdRef.current += 1
    setGame((prev) => ({
      ...prev,
      ammo: prev.ammo - 1,
      shots: prev.shots + 1,
      jackpot: prev.jackpot.active ? { ...prev.jackpot, shots: prev.jackpot.shots + 1 } : prev.jackpot,
      effect: '발사',
    }))
    playTone('shoot')
  }, [playTone, power])

  const stopHoldFire = useCallback(() => {
    window.clearInterval(shotIntervalRef.current)
    shotIntervalRef.current = null
  }, [])

  const startHoldFire = useCallback(() => {
    fireBall()
    stopHoldFire()
    shotIntervalRef.current = window.setInterval(fireBall, 185)
  }, [fireBall, stopHoldFire])

  const resetGame = useCallback(() => {
    clearSpinTimers()
    window.clearTimeout(roundTimerRef.current)
    window.clearTimeout(splashTimerRef.current)
    stopHoldFire()
    ballsRef.current = []
    roundTransitionRef.current = false
    setAutoFire(false)
    setGame(createInitialGame())
  }, [clearSpinTimers, stopHoldFire])

  const addBalls = useCallback(() => {
    setGame((prev) => ({
      ...prev,
      ammo: prev.ammo + 50,
      effect: '貸玉 +50',
      log: mixLog(prev.log, '貸玉 +50'),
    }))
  }, [])

  useEffect(() => {
    if (!autoFire) {
      stopHoldFire()
      return undefined
    }
    shotIntervalRef.current = window.setInterval(fireBall, 230)
    return stopHoldFire
  }, [autoFire, fireBall, stopHoldFire])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let frame = 0
    let last = performance.now()

    const resizeCanvas = () => {
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
      canvas.width = BOARD_W * dpr
      canvas.height = BOARD_H * dpr
      canvas.style.aspectRatio = `${BOARD_W} / ${BOARD_H}`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const updateBalls = (dt, now) => {
      const balls = ballsRef.current
      const callbacks = callbacksRef.current
      const state = gameRef.current

      for (let index = balls.length - 1; index >= 0; index -= 1) {
        const ball = balls[index]
        ball.vy += 0.21 * dt
        ball.vx *= 0.999
        ball.vy *= 0.999
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt

        if (ball.launchRail && ball.vy < 0 && ball.y > 70) {
          const railX = 327 + Math.sin((now + ball.id * 97) / 120) * 1.2
          ball.x += (railX - ball.x) * 0.55
          ball.vx = clamp(ball.vx, -0.08, 0.42)
          ball.vy -= 0.035 * dt
        }
        if (ball.launchRail && ball.y <= 72) {
          ball.launchRail = false
          ball.x = 321
          ball.y = 72
          ball.vx = -2.65 - Math.random() * 0.55
          ball.vy = 1.05 + Math.random() * 0.65
        }

        if (ball.x > 310 && ball.y > 78 && ball.vy < 0) {
          ball.x = clamp(ball.x, 320, 331)
          ball.vx += 0.075 * dt
        }
        if (ball.x > 300 && ball.y <= 78) {
          ball.vx -= 0.78
          ball.vy = Math.max(ball.vy, 1.2)
        }

        const startDx = START_POCKET.x - ball.x
        const startDy = START_POCKET.y - ball.y
        const startDistance = Math.hypot(startDx, startDy)
        if (ball.startBias && ball.y > 170 && ball.y < START_POCKET.y + 16) {
          ball.vx += clamp(startDx * 0.0032, -0.36, 0.36) * dt
          ball.vy += 0.028 * dt
        }
        if (startDistance < 126 && ball.y > 292 && ball.y < 440) {
          ball.vx += (startDx / Math.max(1, startDistance)) * 0.095 * dt
          ball.vy += 0.06 * dt
        }

        for (const pocket of BONUS_POCKETS) {
          const bonusDx = pocket.x - ball.x
          const bonusDy = pocket.y - ball.y
          const bonusDistance = Math.hypot(bonusDx, bonusDy)
          if (bonusDistance < 54 && ball.y > 430) {
            ball.vx += (bonusDx / Math.max(1, bonusDistance)) * 0.035 * dt
            ball.vy += 0.03 * dt
          }
        }

        if (ball.x < 24 + ball.r) {
          ball.x = 24 + ball.r
          ball.vx = Math.abs(ball.vx) * 0.84
        }
        if (ball.x > 336 - ball.r) {
          ball.x = 336 - ball.r
          ball.vx = -Math.abs(ball.vx) * 0.82
        }
        if (ball.y < 24 + ball.r) {
          ball.y = 24 + ball.r
          ball.vy = Math.abs(ball.vy) * 0.76
        }

        for (const bumper of BUMPERS) {
          const dx = ball.x - bumper.x
          const dy = ball.y - bumper.y
          const dist = Math.hypot(dx, dy)
          const minDist = ball.r + bumper.r
          if (dist > 0 && dist < minDist) {
            const nx = dx / dist
            const ny = dy / dist
            ball.x = bumper.x + nx * minDist
            ball.y = bumper.y + ny * minDist
            const dot = ball.vx * nx + ball.vy * ny
            ball.vx -= 1.92 * dot * nx
            ball.vy -= 1.92 * dot * ny
            ball.vx += nx * 0.48
            ball.vy += ny * 0.48
          }
        }

        for (const pin of PINS) {
          const dx = ball.x - pin.x
          const dy = ball.y - pin.y
          const minDist = ball.r + pin.r
          const distSq = dx * dx + dy * dy
          if (distSq < minDist * minDist) {
            const dist = Math.max(0.001, Math.sqrt(distSq))
            const nx = dx / dist
            const ny = dy / dist
            ball.x = pin.x + nx * minDist
            ball.y = pin.y + ny * minDist
            const dot = ball.vx * nx + ball.vy * ny
            ball.vx -= 1.66 * dot * nx
            ball.vy -= 1.66 * dot * ny
            ball.vx += (Math.random() - 0.5) * 0.16
            ball.vy += 0.018
          }
        }

        const speed = Math.hypot(ball.vx, ball.vy)
        if (speed < 0.18 && ball.y < 575) {
          ball.stuck += 1
          if (ball.stuck > 24) {
            ball.vx += (Math.random() - 0.5) * 0.42
            ball.vy += 0.34
            ball.stuck = 0
          }
        } else {
          ball.stuck = 0
        }

        const inStart =
          Math.hypot(ball.x - START_POCKET.x, ball.y - START_POCKET.y) < START_POCKET.r - 2 ||
          (ball.y > START_POCKET.y - 18 && ball.y < START_POCKET.y + 38 && Math.abs(ball.x - START_POCKET.x) < 50)
        if (inStart && ball.vy > -1.6) {
          balls.splice(index, 1)
          callbacks.onStartPocket?.()
          continue
        }

        let enteredBonus = false
        for (const pocket of BONUS_POCKETS) {
          if (Math.hypot(ball.x - pocket.x, ball.y - pocket.y) < pocket.r - 2 && ball.vy > -1.3) {
            balls.splice(index, 1)
            callbacks.onBonusPocket?.(pocket.payout)
            enteredBonus = true
            break
          }
        }
        if (enteredBonus) continue

        const inAttacker =
          state.jackpot.open &&
          ball.x > ATTACKER.x &&
          ball.x < ATTACKER.x + ATTACKER.w &&
          ball.y > ATTACKER.y &&
          ball.y < ATTACKER.y + ATTACKER.h + 10 &&
          ball.vy > -1.2
        if (inAttacker) {
          balls.splice(index, 1)
          callbacks.onAttackerPocket?.()
          continue
        }

        const age = now - ball.born
        if (ball.y > BOARD_H + 20 || (age > 18000 && speed < 0.24)) {
          balls.splice(index, 1)
        }

        if (speed > 18.5) {
          const scale = 18.5 / speed
          ball.vx *= scale
          ball.vy *= scale
        }
      }
    }

    const loop = (now) => {
      const dt = clamp((now - last) / 16.67, 0.45, 2.2)
      last = now
      updateBalls(dt, now)
      drawBoard(ctx, ballsRef.current, gameRef.current, now)
      frame = window.requestAnimationFrame(loop)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    frame = window.requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    return () => {
      clearSpinTimers()
      stopHoldFire()
      window.clearTimeout(roundTimerRef.current)
      window.clearTimeout(splashTimerRef.current)
    }
  }, [clearSpinTimers, stopHoldFire])

  const machineClass = useMemo(() => {
    if (game.jackpot.active) return 'machine jackpotMode'
    if (game.reach) return 'machine reachMode'
    if (game.fever) return 'machine feverMode'
    return 'machine'
  }, [game.fever, game.jackpot.active, game.reach])

  const money = useMemo(() => {
    const investment = game.shots * BALL_VALUE_YEN
    const ballRevenue = game.payout * BALL_VALUE_YEN
    const jackpotRevenue = game.jackpots * JACKPOT_VALUE_YEN
    const navelRevenue = game.jackpotNavelRevenue
    const grossRevenue = ballRevenue + jackpotRevenue + navelRevenue
    const netProfit = grossRevenue - investment

    return {
      ballRevenue,
      grossRevenue,
      investment,
      jackpotRevenue,
      navelRevenue,
      netProfit,
    }
  }, [game.jackpotNavelRevenue, game.jackpots, game.payout, game.shots])

  return (
    <main className="appShell">
      <div className={machineClass}>
        <div className="lampRail lampRailLeft" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="lampRail lampRailRight" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <header className="topBar">
          <div className="brandBlock">
            <MikuMark />
            <div>
              <p>初音ミク風ウェブパチンコ</p>
              <h1>だいごみくパチンコ</h1>
            </div>
          </div>
          <button className="iconButton" type="button" aria-label="音量" onClick={() => setSoundOn((value) => !value)}>
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </header>

        <ReelPanel game={game} />

        <section className="playArea">
          <div className="canvasFrame">
            <canvas ref={canvasRef} width={BOARD_W} height={BOARD_H} aria-label="パチンコ盤面" />
            <BigEffect game={game} />
            <div className="effectBadge" aria-live="polite">
              {game.effect}
            </div>
          </div>

          <aside className="sidePanel">
            <div className={`profitPanel ${money.netProfit >= 0 ? 'positive' : 'negative'}`}>
              <div className="profitMain">
                <span>現在収支</span>
                <strong>{formatYen(money.netProfit)}</strong>
              </div>
              <div className="profitRows">
                <div>
                  <span>獲得</span>
                  <b>{formatYen(money.grossRevenue)}</b>
                </div>
                <div>
                  <span>投資</span>
                  <b>{formatYen(money.investment)}</b>
                </div>
                <div>
                  <span>出玉</span>
                  <b>{formatYen(money.ballRevenue)}</b>
                </div>
                <div>
                  <span>大当り</span>
                  <b>{formatYen(money.jackpotRevenue)}</b>
                </div>
                <div>
                  <span>へそ賞</span>
                  <b>{formatYen(money.navelRevenue)}</b>
                </div>
              </div>
              <p>1玉 4円 / 大当たり 16,000円 / 大当たり中へそ入賞 400円 / 400玉発射で終了 (39%継続)</p>
            </div>

            <div className="statsGrid">
              <Stat label="持玉" value={game.ammo} />
              <Stat label="出玉" value={game.payout} />
              <Stat label="回転" value={game.spins} />
              <Stat label="当り" value={game.jackpots} />
            </div>

            <div className="controlPanel">
              <label className="powerControl">
                <span>
                  <Zap size={15} />
                  発射強度 {power}
                </span>
                <input
                  type="range"
                  min="58"
                  max="100"
                  value={power}
                  onChange={(event) => setPower(Number(event.target.value))}
                />
              </label>

              <button
                className="fireButton"
                type="button"
                disabled={game.ammo <= 0}
                onPointerDown={startHoldFire}
                onPointerUp={stopHoldFire}
                onPointerCancel={stopHoldFire}
                onPointerLeave={stopHoldFire}
              >
                <span>発射</span>
              </button>

              <div className="smallControls">
                <button className={autoFire ? 'active' : ''} type="button" onClick={() => setAutoFire((value) => !value)}>
                  <Sparkles size={17} />
                  オート
                </button>
                <button type="button" onClick={addBalls}>
                  <Coins size={17} />
                  貸玉
                </button>
                <button type="button" onClick={resetGame}>
                  <RotateCcw size={17} />
                  リセット
                </button>
              </div>
            </div>

            <div className="modePanel">
              <div>
                <span>モード</span>
                <strong>{getModeLabel(game)}</strong>
              </div>
              <div>
                <span>盤面玉</span>
                <strong>{ballsRef.current.length}</strong>
              </div>
            </div>

            <ol className="eventLog" aria-label="履歴">
              {game.log.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ol>
          </aside>
        </section>
      </div>
      <SpinOverlay overlay={game.spinOverlay} />
      <JackpotSplash splash={game.jackpotSplash} />
    </main>
  )
}
