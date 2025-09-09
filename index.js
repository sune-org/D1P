async function fetch(request) {
  if (request.method === 'OPTIONS') {
    const headers = new Headers()
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    return new Response(null, { headers })
  }
  return new Response('OK')
}

export default { fetch }
