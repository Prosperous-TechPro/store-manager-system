const clients = new Set()

const sendEvent = (res, event, data) => {
  try {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  } catch (err) {
    console.error('Failed to send SSE event', err)
  }
}

const broadcast = (event, data) => {
  for (const client of clients) {
    sendEvent(client, event, data)
  }
}

const createSseHandler = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  res.write('\n')
  sendEvent(res, 'connected', { ok: true })
  clients.add(res)

  req.on('close', () => {
    clients.delete(res)
  })
}

module.exports = { broadcast, createSseHandler }
