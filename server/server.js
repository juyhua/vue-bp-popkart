import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Resolve current file dir to serve static reliably in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Serve static assets so both frontend and backend can use the same URLs
// Place images under server/public/, access via /static/<path>
const publicDir = path.resolve(__dirname, 'public')
app.use('/static', express.static(publicDir))

// Sample route for health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() })
})

// Example API route
app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from Node backend!' })
})

// Create HTTP server and attach Socket.IO (ESM)
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// In-memory room state (simple)
// rooms[code] = {
//   rounds: {
//     1: { selected: string[], used: string[], timeline: Array<{url:string, action:'ban'|'pick'}> },
//     2: { selected: string[], used: string[], timeline: Array<{url:string, action:'ban'|'pick'}> },
//   },
//   readyA: boolean, readyB: boolean, started: boolean,
//   members: { blue: boolean, red: boolean, referee: boolean }
// }
const rooms = Object.create(null)

function ensureRoom(code) {
  if (!rooms[code]) {
    rooms[code] = {
      rounds: {
        1: { selected: [], used: [], timeline: [] },
        2: { selected: [], used: [], timeline: [] },
      },
      readyA: false,
      readyB: false,
      started: false,
      members: { blue: false, red: false, referee: false },
    }
  }
  return rooms[code]
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id)
  let joinedRoom = null
  let joinedTeam = null

  // client requests to join a room by code
  socket.on('joinRoom', ({ code, team, meta }) => {
    if (!code) return
    joinedRoom = String(code)
    socket.join(joinedRoom)
    console.log(`socket ${socket.id} joined room ${joinedRoom} as ${team}`)
    // init room state
    const st = ensureRoom(joinedRoom)
    // mark presence
    if (team === 'blue' || team === 'red' || team === 'referee') {
      st.members[team] = true
      joinedTeam = team
    }
    // notify others in the room
    socket.to(joinedRoom).emit('presence', { type: 'join', id: socket.id, team, meta, time: Date.now() })
    // acknowledge to self
    socket.emit('joined', { room: joinedRoom, id: socket.id })
    // send current room state snapshot
    socket.emit('stateSync', st)
  })

  // Broadcast state updates within a room
  socket.on('roomEvent', (arg) => {
    try {
      let room = joinedRoom
      let payload = arg
      if (arg && typeof arg === 'object' && 'code' in arg && 'payload' in arg) {
        room = arg.code
        payload = arg.payload
      }
      if (!room) return
      const st = ensureRoom(room)
      if (payload && payload.type) {
        switch (payload.type) {
          case 'select': {
            const url = String(payload.url || '')
            const action = payload.action || 'pick'
            const round = Number(payload.round || 1) === 2 ? 2 : 1
            const rs = st.rounds[round]
            // global uniqueness across both rounds
            const usedAll = new Set([...(st.rounds[1]?.used || []), ...(st.rounds[2]?.used || [])])
            if (url && !usedAll.has(url) && !rs.used.includes(url)) {
              if (action === 'ban') {
                rs.used.push(url)
              } else {
                rs.selected.push(url)
                rs.used.push(url)
              }
              rs.timeline.push({ url, action: action === 'ban' ? 'ban' : 'pick' })
            }
            break
          }
          case 'rollback': {
            const round = Number(payload.round || 1) === 2 ? 2 : 1
            const rs = st.rounds[round]
            const lastEntry = rs.timeline.pop()
            if (lastEntry) {
              const idxUsed = rs.used.lastIndexOf(lastEntry.url)
              if (idxUsed >= 0) rs.used.splice(idxUsed, 1)
              if (lastEntry.action === 'pick') {
                const idxSel = rs.selected.lastIndexOf(lastEntry.url)
                if (idxSel >= 0) rs.selected.splice(idxSel, 1)
              }
            }
            break
          }
          case 'reset': {
            const round = Number(payload.round || 1) === 2 ? 2 : 1
            const rs = st.rounds[round]
            rs.selected = []
            rs.used = []
            rs.timeline = []
            break
          }
          case 'ready': {
            if (payload.team === 'blue') st.readyA = !!payload.value
            if (payload.team === 'red') st.readyB = !!payload.value
            if (st.readyA && st.readyB && !st.started) {
              st.started = true
              io.to(room).emit('roomEvent', { type: 'start', auto: true })
            }
            break
          }
          case 'start': {
            st.started = true
            break
          }
          case 'countdownStart': {
            // optional: could store last countdown value if needed
            break
          }
          default:
            break
        }
      }

      // forward to other clients (exclude sender to avoid duplicate optimistic updates)
      socket.to(room).emit('roomEvent', payload)
    } catch (e) {
      console.error('roomEvent error', e)
    }
  })

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id)
    if (joinedRoom) {
      const st = ensureRoom(joinedRoom)
      if (joinedTeam && (joinedTeam === 'blue' || joinedTeam === 'red' || joinedTeam === 'referee')) {
        st.members[joinedTeam] = false
      }
      socket.to(joinedRoom).emit('presence', { type: 'leave', id: socket.id, team: joinedTeam, time: Date.now() })
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
  console.log('Static files served at /static from', publicDir)
})


