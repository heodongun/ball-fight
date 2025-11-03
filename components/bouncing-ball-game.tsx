"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, RotateCcw, Pause } from "lucide-react"

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  hp: number
  maxHp: number
  attack: number
  hasSpikes: boolean
  spikesEndTime: number
  hasShield: boolean
  shieldEndTime: number
  cannonEndTime: number
}

interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  damage: number
  owner: number
}

interface Item {
  x: number
  y: number
  radius: number
  type: "health" | "attack" | "speed" | "spikes" | "cannon" | "shield" | "freeze"
  color: string
}

export function BouncingBallGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [ball1Hp, setBall1Hp] = useState(100)
  const [ball2Hp, setBall2Hp] = useState(100)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<string>("")
  const animationFrameRef = useRef<number>()
  const ballsRef = useRef<Ball[]>([])
  const itemsRef = useRef<Item[]>([])
  const projectilesRef = useRef<Projectile[]>([])
  const lastItemSpawnRef = useRef<number>(0)
  const lastCannonShootRef = useRef<{ [key: number]: number }>({})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = Math.min(500, window.innerWidth - 40)
    canvas.width = size
    canvas.height = size

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const arenaRadius = canvas.width / 2 - 30

    if (ballsRef.current.length === 0) {
      ballsRef.current = [
        {
          x: centerX - 100,
          y: centerY,
          vx: 6,
          vy: -5,
          radius: 25,
          color: "#00ffff",
          hp: 100,
          maxHp: 100,
          attack: 5,
          hasSpikes: false,
          spikesEndTime: 0,
          hasShield: false,
          shieldEndTime: 0,
          cannonEndTime: 0,
        },
        {
          x: centerX + 100,
          y: centerY,
          vx: -6,
          vy: 5,
          radius: 25,
          color: "#ff00ff",
          hp: 100,
          maxHp: 100,
          attack: 5,
          hasSpikes: false,
          spikesEndTime: 0,
          hasShield: false,
          shieldEndTime: 0,
          cannonEndTime: 0,
        },
      ]
    }

    const gravity = 0.1
    const friction = 1.0
    const bounceDamping = 1.0

    const drawArena = () => {
      ctx.strokeStyle = "#333333"
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(centerX, centerY, arenaRadius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = "#00ffff33"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, centerY, arenaRadius + 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    const drawBall = (ball: Ball) => {
      // Draw shield if active
      if (ball.hasShield) {
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.radius + 10, 0, Math.PI * 2)
        ctx.strokeStyle = "#00ffff"
        ctx.lineWidth = 3
        ctx.stroke()

        ctx.shadowBlur = 15
        ctx.shadowColor = "#00ffff"
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Draw spikes if active
      if (ball.hasSpikes) {
        const spikeCount = 12
        const spikeLength = 15
        ctx.fillStyle = "#ff0000"

        for (let i = 0; i < spikeCount; i++) {
          const angle = (i / spikeCount) * Math.PI * 2
          const x1 = ball.x + Math.cos(angle) * ball.radius
          const y1 = ball.y + Math.sin(angle) * ball.radius
          const x2 = ball.x + Math.cos(angle) * (ball.radius + spikeLength)
          const y2 = ball.y + Math.sin(angle) * (ball.radius + spikeLength)

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.lineTo(ball.x + Math.cos(angle + 0.2) * ball.radius, ball.y + Math.sin(angle + 0.2) * ball.radius)
          ctx.closePath()
          ctx.fill()
        }
      }

      // Draw ball
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
      ctx.fillStyle = ball.color
      ctx.fill()

      ctx.shadowBlur = 20
      ctx.shadowColor = ball.color
      ctx.fill()
      ctx.shadowBlur = 0

      const barWidth = 50
      const barHeight = 6
      const barX = ball.x - barWidth / 2
      const barY = ball.y - ball.radius - 15

      ctx.fillStyle = "#333333"
      ctx.fillRect(barX, barY, barWidth, barHeight)

      const hpPercent = ball.hp / ball.maxHp
      ctx.fillStyle = hpPercent > 0.5 ? "#00ff00" : hpPercent > 0.25 ? "#ffff00" : "#ff0000"
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight)

      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1
      ctx.strokeRect(barX, barY, barWidth, barHeight)
    }

    const drawItem = (item: Item) => {
      ctx.beginPath()
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2)
      ctx.fillStyle = item.color
      ctx.fill()

      ctx.shadowBlur = 15
      ctx.shadowColor = item.color
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = "#000000"
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2

      // Draw intuitive icons based on item type
      if (item.type === "health") {
        // Red cross
        ctx.fillRect(item.x - 8, item.y - 2, 16, 4)
        ctx.fillRect(item.x - 2, item.y - 8, 4, 16)
      } else if (item.type === "attack") {
        // Sword
        ctx.beginPath()
        ctx.moveTo(item.x - 6, item.y + 6)
        ctx.lineTo(item.x + 6, item.y - 6)
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(item.x + 7, item.y - 7, 2, 0, Math.PI * 2)
        ctx.fill()
      } else if (item.type === "speed") {
        // Lightning bolt
        ctx.beginPath()
        ctx.moveTo(item.x, item.y - 8)
        ctx.lineTo(item.x - 4, item.y)
        ctx.lineTo(item.x + 2, item.y)
        ctx.lineTo(item.x - 2, item.y + 8)
        ctx.lineTo(item.x + 4, item.y)
        ctx.lineTo(item.x - 2, item.y)
        ctx.closePath()
        ctx.fill()
      } else if (item.type === "spikes") {
        // Star with spikes
        const spikes = 8
        for (let i = 0; i < spikes; i++) {
          const angle = (i / spikes) * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(item.x, item.y)
          ctx.lineTo(item.x + Math.cos(angle) * 8, item.y + Math.sin(angle) * 8)
          ctx.lineWidth = 2
          ctx.stroke()
        }
      } else if (item.type === "cannon") {
        // Cannon
        ctx.fillRect(item.x - 6, item.y - 3, 12, 6)
        ctx.beginPath()
        ctx.arc(item.x - 6, item.y, 4, 0, Math.PI * 2)
        ctx.fill()
      } else if (item.type === "shield") {
        // Shield
        ctx.beginPath()
        ctx.arc(item.x, item.y, 7, 0, Math.PI * 2)
        ctx.lineWidth = 3
        ctx.stroke()
      } else if (item.type === "freeze") {
        // Snowflake
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(item.x, item.y)
          ctx.lineTo(item.x + Math.cos(angle) * 7, item.y + Math.sin(angle) * 7)
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
    }

    const drawProjectile = (proj: Projectile) => {
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
      ctx.fillStyle = proj.color
      ctx.fill()

      ctx.shadowBlur = 10
      ctx.shadowColor = proj.color
      ctx.fill()
      ctx.shadowBlur = 0
    }

    const spawnItem = (timestamp: number) => {
      if (timestamp - lastItemSpawnRef.current > 3000) {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * (arenaRadius - 50)
        const types: Array<"health" | "attack" | "speed" | "spikes" | "cannon" | "shield" | "freeze"> = [
          "health",
          "attack",
          "speed",
          "spikes",
          "cannon",
          "shield",
          "freeze",
        ]
        const type = types[Math.floor(Math.random() * types.length)]

        const colors = {
          health: "#00ff00",
          attack: "#ff0000",
          speed: "#ffff00",
          spikes: "#ff6600",
          cannon: "#8800ff",
          shield: "#00ffff",
          freeze: "#00ccff",
        }

        itemsRef.current.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          radius: 12,
          type,
          color: colors[type],
        })

        lastItemSpawnRef.current = timestamp
      }
    }

    const checkItemCollection = (ball: Ball, ballIndex: number, timestamp: number) => {
      itemsRef.current = itemsRef.current.filter((item) => {
        const dx = item.x - ball.x
        const dy = item.y - ball.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < ball.radius + item.radius) {
          if (item.type === "health") {
            ball.hp = Math.min(ball.hp + 20, ball.maxHp)
          } else if (item.type === "attack") {
            ball.attack += 2
          } else if (item.type === "speed") {
            ball.vx *= 1.2
            ball.vy *= 1.2
          } else if (item.type === "spikes") {
            ball.hasSpikes = true
            ball.spikesEndTime = timestamp + 5000 // 5 seconds
          } else if (item.type === "cannon") {
            ball.cannonEndTime = timestamp + 5000 // 5 seconds
          } else if (item.type === "shield") {
            ball.hasShield = true
            ball.shieldEndTime = timestamp + 5000 // 5 seconds
          } else if (item.type === "freeze") {
            // Freeze the other ball
            const otherBall = ballsRef.current[1 - ballIndex]
            otherBall.vx *= 0.3
            otherBall.vy *= 0.3
          }

          if (ballIndex === 0) setBall1Hp(ball.hp)
          else setBall2Hp(ball.hp)

          return false
        }
        return true
      })
    }

    const shootCannon = (ball: Ball, ballIndex: number, timestamp: number) => {
      if (ball.cannonEndTime > timestamp) {
        if (!lastCannonShootRef.current[ballIndex] || timestamp - lastCannonShootRef.current[ballIndex] > 500) {
          // Target the opponent ball
          const targetBall = ballsRef.current[1 - ballIndex]
          const dx = targetBall.x - ball.x
          const dy = targetBall.y - ball.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          const speed = 8
          const vx = (dx / distance) * speed
          const vy = (dy / distance) * speed

          projectilesRef.current.push({
            x: ball.x,
            y: ball.y,
            vx: vx,
            vy: vy,
            radius: 6,
            color: ball.color,
            damage: 7,
            owner: ballIndex,
          })

          lastCannonShootRef.current[ballIndex] = timestamp
        }
      }
    }

    const updateProjectiles = () => {
      projectilesRef.current = projectilesRef.current.filter((proj) => {
        proj.x += proj.vx
        proj.y += proj.vy

        // Check circular boundary
        const dx = proj.x - centerX
        const dy = proj.y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance + proj.radius > arenaRadius) {
          return false // Remove projectile
        }

        // Check collision with balls
        ballsRef.current.forEach((ball, index) => {
          if (index !== proj.owner) {
            const bdx = proj.x - ball.x
            const bdy = proj.y - ball.y
            const bdist = Math.sqrt(bdx * bdx + bdy * bdy)

            if (bdist < proj.radius + ball.radius) {
              if (!ball.hasShield) {
                ball.hp -= proj.damage
                if (index === 0) setBall1Hp(Math.max(0, ball.hp))
                else setBall2Hp(Math.max(0, ball.hp))

                if (ball.hp <= 0) {
                  setGameOver(true)
                  setWinner(index === 0 ? "Magenta" : "Cyan")
                  setIsPlaying(false)
                }
              }
              projectilesRef.current = projectilesRef.current.filter((p) => p !== proj)
            }
          }
        })

        return true
      })
    }

    const checkCollision = (ball1: Ball, ball2: Ball) => {
      const dx = ball2.x - ball1.x
      const dy = ball2.y - ball1.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < ball1.radius + ball2.radius) {
        const angle = Math.atan2(dy, dx)
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)

        const vx1 = ball1.vx * cos + ball1.vy * sin
        const vy1 = ball1.vy * cos - ball1.vx * sin
        const vx2 = ball2.vx * cos + ball2.vy * sin
        const vy2 = ball2.vy * cos - ball2.vx * sin

        const temp = vx1
        ball1.vx = vx2 * cos - vy1 * sin
        ball1.vy = vy1 * cos + vx2 * sin
        ball2.vx = temp * cos - vy2 * sin
        ball2.vy = vy2 * cos + temp * sin

        const overlap = ball1.radius + ball2.radius - distance
        const separateX = (overlap * cos) / 2
        const separateY = (overlap * sin) / 2
        ball1.x -= separateX
        ball1.y -= separateY
        ball2.x += separateX
        ball2.y += separateY

        const speed1 = Math.sqrt(ball1.vx ** 2 + ball1.vy ** 2)
        const speed2 = Math.sqrt(ball2.vx ** 2 + ball2.vy ** 2)

        if (speed1 > speed2) {
          let damage = ball1.attack
          if (ball1.hasSpikes) damage += 15
          if (!ball2.hasShield) {
            ball2.hp -= damage
            setBall2Hp(Math.max(0, ball2.hp))
          }
        } else {
          let damage = ball2.attack
          if (ball2.hasSpikes) damage += 15
          if (!ball1.hasShield) {
            ball1.hp -= damage
            setBall1Hp(Math.max(0, ball1.hp))
          }
        }

        if (ball1.hp <= 0) {
          setGameOver(true)
          setWinner("Magenta")
          setIsPlaying(false)
        } else if (ball2.hp <= 0) {
          setGameOver(true)
          setWinner("Cyan")
          setIsPlaying(false)
        }
      }
    }

    const checkCircularBoundary = (ball: Ball) => {
      const dx = ball.x - centerX
      const dy = ball.y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance + ball.radius > arenaRadius) {
        const angle = Math.atan2(dy, dx)

        ball.x = centerX + Math.cos(angle) * (arenaRadius - ball.radius)
        ball.y = centerY + Math.sin(angle) * (arenaRadius - ball.radius)

        const normalX = dx / distance
        const normalY = dy / distance
        const dotProduct = ball.vx * normalX + ball.vy * normalY

        ball.vx = ball.vx - 2 * dotProduct * normalX
        ball.vy = ball.vy - 2 * dotProduct * normalY

        const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2)
        const minSpeed = 3
        if (speed < minSpeed) {
          const scale = minSpeed / speed
          ball.vx *= scale
          ball.vy *= scale
        }
      }
    }

    const animate = (timestamp: number) => {
      if (!isPlaying || gameOver) return

      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      drawArena()

      spawnItem(timestamp)

      itemsRef.current.forEach(drawItem)

      updateProjectiles()
      projectilesRef.current.forEach(drawProjectile)

      ballsRef.current.forEach((ball, index) => {
        if (ball.hasSpikes && timestamp > ball.spikesEndTime) {
          ball.hasSpikes = false
        }
        if (ball.hasShield && timestamp > ball.shieldEndTime) {
          ball.hasShield = false
        }
        if (timestamp > ball.cannonEndTime) {
          ball.cannonEndTime = 0
        }

        shootCannon(ball, index, timestamp)

        ball.vy += gravity

        ball.vx *= friction
        ball.vy *= friction

        ball.x += ball.vx
        ball.y += ball.vy

        checkCircularBoundary(ball)

        checkItemCollection(ball, index, timestamp)

        drawBall(ball)
      })

      if (ballsRef.current.length === 2) {
        checkCollision(ballsRef.current[0], ballsRef.current[1])
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, gameOver])

  const handleStart = () => {
    if (gameOver) return
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setGameOver(false)
    setWinner("")
    setBall1Hp(100)
    setBall2Hp(100)
    itemsRef.current = []
    projectilesRef.current = []
    lastItemSpawnRef.current = 0
    lastCannonShootRef.current = {}

    const canvas = canvasRef.current
    if (canvas) {
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      ballsRef.current = [
        {
          x: centerX - 100,
          y: centerY,
          vx: 6,
          vy: -5,
          radius: 25,
          color: "#00ffff",
          hp: 100,
          maxHp: 100,
          attack: 5,
          hasSpikes: false,
          spikesEndTime: 0,
          hasShield: false,
          shieldEndTime: 0,
          cannonEndTime: 0,
        },
        {
          x: centerX + 100,
          y: centerY,
          vx: -6,
          vy: 5,
          radius: 25,
          color: "#ff00ff",
          hp: 100,
          maxHp: 100,
          attack: 5,
          hasSpikes: false,
          spikesEndTime: 0,
          hasShield: false,
          shieldEndTime: 0,
          cannonEndTime: 0,
        },
      ]
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-8 mb-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: "#00ffff", boxShadow: "0 0 20px #00ffff" }}
            />
            <span className="text-3xl font-bold text-white">Cyan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl text-gray-400">HP:</span>
            <span className="text-2xl font-bold text-white">{ball1Hp}</span>
          </div>
        </div>

        <span className="text-3xl font-bold text-gray-500">VS</span>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-white">Magenta</span>
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: "#ff00ff", boxShadow: "0 0 20px #ff00ff" }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl text-gray-400">HP:</span>
            <span className="text-2xl font-bold text-white">{ball2Hp}</span>
          </div>
        </div>
      </div>

      {gameOver && (
        <div className="mb-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-2">Game Over!</h2>
          <p className="text-2xl" style={{ color: winner === "Cyan" ? "#00ffff" : "#ff00ff" }}>
            {winner} Wins!
          </p>
        </div>
      )}

      <canvas ref={canvasRef} className="rounded-lg" style={{ maxWidth: "100%", height: "auto" }} />

      <div className="flex gap-4 mt-6">
        {!isPlaying ? (
          <Button
            onClick={handleStart}
            size="lg"
            className="gap-2 bg-white text-black hover:bg-gray-200"
            disabled={gameOver}
          >
            <Play className="w-5 h-5" />
            {gameOver ? "Game Over" : "Start"}
          </Button>
        ) : (
          <Button onClick={handlePause} size="lg" className="gap-2 bg-white text-black hover:bg-gray-200">
            <Pause className="w-5 h-5" />
            Pause
          </Button>
        )}
        <Button
          onClick={handleReset}
          size="lg"
          variant="outline"
          className="gap-2 border-white text-white hover:bg-white hover:text-black bg-transparent"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </Button>
      </div>

      <div className="mt-6 text-center text-gray-400 text-sm max-w-md">
        <p>공들이 원형 경기장 안에서 튕기며 아이템을 수집합니다.</p>
        <p className="mt-1">충돌할 때마다 데미지를 입히고, HP가 0이 되면 게임이 끝납니다!</p>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <span className="text-green-400">+ 체력 회복</span>
          <span className="text-red-400">⚔ 공격력 증가</span>
          <span className="text-yellow-400">⚡ 속도 증가</span>
          <span className="text-orange-400">🔱 가시 (5초)</span>
          <span className="text-purple-400">💣 대포 (5초)</span>
          <span className="text-cyan-400">🛡 보호막 (5초)</span>
          <span className="text-blue-300">❄ 상대 감속</span>
        </div>
      </div>
    </div>
  )
}
