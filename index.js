import https from 'node:https'
import crypto from 'node:crypto'
import { COMPANIES } from './companies.js'

const COMPANY_RECORD = 'dsh-shopeemcp/company'
const SESSION_RECORD = 'dsh-shopeemcp/session-selection'

export const inject = ['webServer', 'credentials', 'agents', 'tools', 'mcpManager']

export function apply(ctx) {
  let selectedCompany = ''
  let platforms = []
  let configError = ''
  const selections = {}
  const serverDisposers = new Map()
  const restrictions = new Map()
  const applying = new Set()
  const liveAgents = new Map()

  const sameOrigin = (req) => {
    const origin = req.headers.origin
    if (!origin || origin === 'null') return true
    try {
      const expected = ctx.webServer.getOrigin()
      if (origin === expected) return true
      return origin.replace('://localhost', '://127.0.0.1') === expected.replace('://localhost', '://127.0.0.1')
    } catch { return false }
  }

  const sendJson = (res, status, value) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(value))
  }

  const readJson = (req) => new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 65536) { reject(new Error('body too large')); req.destroy() }
    })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) } catch { reject(new Error('invalid json')) }
    })
    req.on('error', reject)
  })

  const codeOf = (platformCode) =>
    String(platformCode).replace(/^shopee-/i, '').toUpperCase().replace(/[^A-Z0-9]/g, '_')

  const refsOf = (platformCode) => {
    const code = codeOf(platformCode)
    return {
      access: `SHOPEE_MCP_${code}_ACCESS_TOKEN`,
      refresh: `SHOPEE_MCP_${code}_REFRESH_TOKEN`,
    }
  }

  const readCompany = async () => {
    try {
      const record = await ctx.credentials.readRecord(COMPANY_RECORD)
      const value = record?.kind === 'grant' ? record.payload?.company : undefined
      if (typeof value === 'string' && COMPANIES[value]) selectedCompany = value
    } catch {}
  }

  const saveCompany = async () => {
    try {
      await ctx.credentials.modifyRecord(COMPANY_RECORD, async () => ({
        kind: 'grant',
        payload: { company: selectedCompany },
      }))
    } catch {}
  }

  const readSelections = async () => {
    try {
      const record = await ctx.credentials.readRecord(SESSION_RECORD)
      const value = record?.kind === 'grant' ? record.payload?.enabled : undefined
      if (value && typeof value === 'object') {
        for (const [sessionId, codes] of Object.entries(value)) {
          if (Array.isArray(codes)) selections[sessionId] = codes.filter((code) => typeof code === 'string')
        }
      }
    } catch {}
  }

  const saveSelections = async () => {
    try {
      await ctx.credentials.modifyRecord(SESSION_RECORD, async () => ({
        kind: 'grant',
        payload: { enabled: { ...selections } },
      }))
    } catch {}
  }

  const enabledFor = (sessionId) => new Set(selections[sessionId] || [])

  const fetchAdminConfig = (company) => new Promise((resolve, reject) => {
    const req = https.request({
      hostname: company.configHost,
      servername: company.configHost,
      port: 443,
      path: company.configPath,
      method: 'GET',
      timeout: 15000,
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Admin 配置返回 HTTP ${res.statusCode}`))
          return
        }
        try {
          const body = JSON.parse(data)
          if (body.code !== 200 || !body.data) throw new Error(body.message || 'Admin 配置为空')
          const payload = Buffer.from(body.data.payload, 'base64')
          const signature = Buffer.from(body.data.signature, 'base64')
          const verified = crypto.verify('sha256', payload, { key: company.publicKey, dsaEncoding: 'ieee-p1363' }, signature)
          if (!verified) throw new Error('Admin 配置签名校验失败')
          const config = JSON.parse(payload.toString('utf8'))
          if (config.companyCode !== company.code) throw new Error('Admin 配置公司不匹配')
          const allowedHosts = new Set((company.allowedHosts || []).map((host) => host.toLowerCase()))
          for (const platform of config.platforms || []) {
            for (const field of ['apiBaseUrl', 'mcpUrl']) {
              let parsed
              try { parsed = new URL(platform[field]) } catch { throw new Error(`平台 ${platform.platformCode} 的 ${field} 不是合法 URL`) }
              if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname.toLowerCase())) {
                throw new Error(`平台 ${platform.platformCode} 的 ${field} 不在 ${company.code} 域名白名单`)
              }
            }
          }
          resolve(config)
        } catch (error) {
          reject(error)
        }
      })
    })
    req.on('timeout', () => req.destroy(new Error('Admin 配置请求超时')))
    req.on('error', reject)
    req.end()
  })

  const unregisterAll = () => {
    for (const [name, dispose] of serverDisposers) {
      try { dispose() } catch {}
      serverDisposers.delete(name)
    }
  }

  const registerPlatforms = () => {
    for (const platform of platforms) {
      try {
        const refs = refsOf(platform.platformCode)
        const entry = {
          transport: 'streamable-http',
          url: platform.mcpUrl,
          headers: { Authorization: `Bearer \${credential:${refs.access}}` },
          expandTemplates: true,
          toolCallTimeoutMs: 120000,
          startupTimeoutMs: 15000,
          failOnStartupError: false,
        }
        const dispose = ctx.mcpManager.register(platform.serverName, entry)
        serverDisposers.set(platform.serverName, dispose)
      } catch (error) {
        configError = `注册 MCP ${platform.serverName} 失败：${error.message}`
      }
    }
  }

  const loadConfig = async () => {
    unregisterAll()
    clearRestrictions()
    platforms = []
    configError = ''
    if (!selectedCompany || !COMPANIES[selectedCompany]) return
    try {
      const config = await fetchAdminConfig(COMPANIES[selectedCompany])
      platforms = (config.platforms || [])
        .filter((platform) => platform && platform.isEnabled && platform.platformCode && platform.serverName && platform.mcpUrl)
        .map((platform) => ({
          platformCode: String(platform.platformCode),
          platformName: String(platform.platformName || platform.platformCode),
          apiBaseUrl: String(platform.apiBaseUrl || '').replace(/\/$/, ''),
          mcpUrl: String(platform.mcpUrl),
          serverName: String(platform.serverName),
          sort: Number(platform.sort || 0),
        }))
        .sort((a, b) => a.sort - b.sort || a.platformCode.localeCompare(b.platformCode))
      registerPlatforms()
    } catch (error) {
      configError = error.message
    }
    applyAllAgents()
  }

  const toolNamesFor = (serverName) => {
    try {
      const prefix = `mcp__${serverName}__`
      return ctx.tools.definitions()
        .map((tool) => tool.name)
        .filter((name) => name.startsWith(prefix))
        .sort()
    } catch { return [] }
  }

  const sameNames = (left, right) =>
    left.length === right.length && left.every((name, index) => name === right[index])

  const removeRestriction = (key) => {
    const existing = restrictions.get(key)
    if (!existing) return
    restrictions.delete(key)
    try { existing.dispose?.() } catch {}
  }

  const applyAgent = (agent) => {
    const sessionId = String(agent.id)
    const enabled = enabledFor(sessionId)
    for (const platform of platforms) {
      const key = `${sessionId}|${platform.serverName}`
      if (applying.has(key)) continue
      applying.add(key)
      try {
        if (enabled.has(platform.platformCode)) {
          removeRestriction(key)
          continue
        }
        const names = toolNamesFor(platform.serverName)
        if (names.length === 0) continue
        const existing = restrictions.get(key)
        if (existing && sameNames(existing.names, names)) continue
        removeRestriction(key)
        const entry = { dispose: null, names }
        restrictions.set(key, entry)
        try {
          entry.dispose = agent.ctx.tools.restrict({ deny: names })
        } catch {
          restrictions.delete(key)
        }
      } finally {
        applying.delete(key)
      }
    }
  }

  const applyAllAgents = () => {
    for (const agent of liveAgents.values()) applyAgent(agent)
  }

  const clearRestrictions = () => {
    for (const key of [...restrictions.keys()]) removeRestriction(key)
  }

  const statePayload = async () => {
    const platformState = []
    for (const platform of platforms) {
      let loggedIn = false
      try {
        const info = await ctx.credentials.describe(refsOf(platform.platformCode).access)
        loggedIn = !!info?.configured
      } catch {}
      platformState.push({ ...platform, loggedIn })
    }
    return {
      ok: true,
      company: selectedCompany,
      companies: Object.values(COMPANIES).map((company) => ({ code: company.code, label: company.label })),
      platforms: platformState,
      configError,
    }
  }

  const handleConfig = async (req, res) => {
    if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'forbidden' })
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' })
    await ready
    return sendJson(res, 200, await statePayload())
  }

  const handleCompany = async (req, res) => {
    if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'forbidden' })
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' })
    await ready
    let body
    try { body = await readJson(req) } catch { return sendJson(res, 400, { ok: false, error: 'invalid_request' }) }
    const company = String(body?.company || '')
    if (!COMPANIES[company]) return sendJson(res, 400, { ok: false, error: '不支持的公司' })
    selectedCompany = company
    await saveCompany()
    await loadConfig()
    return sendJson(res, 200, await statePayload())
  }

  const handleConfigRefresh = async (req, res) => {
    if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'forbidden' })
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' })
    await ready
    await loadConfig()
    return sendJson(res, 200, await statePayload())
  }

  const handleSession = async (req, res) => {
    if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'forbidden' })
    await ready
    if (req.method === 'GET') {
      let sessionId = ''
      try { sessionId = new URL(req.url, 'http://127.0.0.1').searchParams.get('sessionId') || '' } catch {}
      if (!sessionId) return sendJson(res, 400, { ok: false, error: 'sessionId_required' })
      return sendJson(res, 200, { ok: true, enabled: [...enabledFor(sessionId)], platforms: platforms.map((p) => p.platformCode) })
    }
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' })
    let body
    try { body = await readJson(req) } catch { return sendJson(res, 400, { ok: false, error: 'invalid_request' }) }
    const sessionId = String(body?.sessionId || '').trim()
    const platformCode = String(body?.platformCode || '').trim()
    if (!sessionId || !platforms.some((p) => p.platformCode === platformCode)) {
      return sendJson(res, 400, { ok: false, error: 'invalid_session_or_platform' })
    }
    const enabled = body?.enabled === true
    const current = new Set(selections[sessionId] || [])
    if (enabled) current.add(platformCode)
    else current.delete(platformCode)
    selections[sessionId] = [...current]
    await saveSelections()
    const agent = ctx.agents.get(sessionId)
    if (agent) applyAgent(agent)
    return sendJson(res, 200, { ok: true, enabled: [...current] })
  }

  const platformByCode = (code) => platforms.find((platform) => platform.platformCode === code)

  const handlePlatform = async (req, res) => {
    if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'forbidden' })
    await ready
    let parts = []
    try { parts = new URL(req.url, 'http://127.0.0.1').pathname.split('/').filter(Boolean) } catch {}
    if (parts.length !== 4 || parts[0] !== 'shopee' || parts[1] !== 'platform') {
      return sendJson(res, 404, { ok: false, error: 'not_found' })
    }
    const code = decodeURIComponent(parts[2])
    const action = parts[3]
    const platform = platformByCode(code)
    if (!platform) return sendJson(res, 404, { ok: false, error: 'platform_not_found' })
    const refs = refsOf(code)

    if (action === 'status') {
      if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' })
      try {
        const info = await ctx.credentials.describe(refs.access)
        return sendJson(res, 200, { ok: true, configured: !!info?.configured })
      } catch {
        return sendJson(res, 503, { ok: false, error: 'credentials_unavailable' })
      }
    }

    if (action === 'logout') {
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' })
      try {
        await ctx.credentials.unset(refs.access)
        await ctx.credentials.unset(refs.refresh)
        return sendJson(res, 200, { ok: true })
      } catch {
        return sendJson(res, 503, { ok: false, error: 'credentials_unavailable' })
      }
    }

    if (action === 'login') {
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' })
      let body
      try { body = await readJson(req) } catch { return sendJson(res, 400, { ok: false, error: 'invalid_request' }) }
      const username = String(body?.username || '').trim()
      const password = String(body?.password || '')
      if (!username || !password) return sendJson(res, 400, { ok: false, error: '用户名和密码不能为空' })
      try {
        const response = await fetch(platform.apiBaseUrl + '/api/Auth/Login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: username, password }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok || payload?.code !== 200 || !payload?.data?.accessToken || !payload?.data?.refreshToken) {
          return sendJson(res, 401, { ok: false, error: payload?.message || '登录失败，请检查用户名或密码' })
        }
        await ctx.credentials.set(refs.access, payload.data.accessToken)
        await ctx.credentials.set(refs.refresh, payload.data.refreshToken)
        return sendJson(res, 200, { ok: true, userName: payload.data.userName || username })
      } catch {
        return sendJson(res, 502, { ok: false, error: '认证服务不可用' })
      }
    }

    if (action === 'profile') {
      if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' })
      try {
        const current = await ctx.credentials.resolve(refs.access)
        if (!current?.value) return sendJson(res, 200, { ok: true, configured: false })
        const response = await fetch(platform.apiBaseUrl + '/api/Auth/Me/Profile', {
          headers: { Authorization: 'Bearer ' + current.value },
        })
        const payload = await response.json().catch(() => null)
        if (response.status === 401) {
          await ctx.credentials.unset(refs.access)
          await ctx.credentials.unset(refs.refresh)
          return sendJson(res, 200, { ok: true, configured: false })
        }
        if (!response.ok || payload?.code !== 200 || !payload?.data) {
          return sendJson(res, 502, { ok: false, error: '资料加载失败' })
        }
        return sendJson(res, 200, { ok: true, configured: true, profile: payload.data })
      } catch {
        return sendJson(res, 502, { ok: false, error: '资料加载失败' })
      }
    }

    return sendJson(res, 404, { ok: false, error: 'unknown_action' })
  }

  const refreshPlatform = async (platform) => {
    const refs = refsOf(platform.platformCode)
    const current = await ctx.credentials.resolve(refs.refresh).catch(() => undefined)
    if (!current?.value) return
    try {
      const response = await fetch(platform.apiBaseUrl + '/api/Auth/RefreshToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.value }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.code !== 200 || !payload?.data?.accessToken || !payload?.data?.refreshToken) {
        if (response.status === 401 || response.status === 403) {
          await ctx.credentials.unset(refs.access)
          await ctx.credentials.unset(refs.refresh)
        }
        return
      }
      await ctx.credentials.set(refs.access, payload.data.accessToken)
      await ctx.credentials.set(refs.refresh, payload.data.refreshToken)
    } catch {}
  }

  const disposers = [
    ctx.webServer.register({ kind: 'exact', path: '/shopee/config', handler: handleConfig }),
    ctx.webServer.register({ kind: 'exact', path: '/shopee/company', handler: handleCompany }),
    ctx.webServer.register({ kind: 'exact', path: '/shopee/config/refresh', handler: handleConfigRefresh }),
    ctx.webServer.register({ kind: 'exact', path: '/shopee/session', handler: handleSession }),
    ctx.webServer.register({ kind: 'prefix', path: '/shopee/platform', handler: handlePlatform }),
  ]

  const sessionEvents = [
    ctx.on('agent/created', (payload) => {
      const agent = payload?.agent
      if (!agent) return
      liveAgents.set(String(agent.id), agent)
      applyAgent(agent)
    }),
    ctx.on('agent/disposed', (payload) => {
      const agent = payload?.agent
      if (!agent) return
      const sessionId = String(agent.id)
      liveAgents.delete(sessionId)
      for (const key of [...restrictions.keys()]) {
        if (key.startsWith(sessionId + '|')) removeRestriction(key)
      }
    }),
    ctx.on('tools/change', () => applyAllAgents()),
  ]

  const timer = setInterval(() => {
    for (const platform of platforms) refreshPlatform(platform).catch(() => {})
  }, 20 * 60 * 1000)
  if (typeof timer.unref === 'function') timer.unref()

  const ready = (async () => {
    await readCompany()
    await readSelections()
    if (selectedCompany) await loadConfig()
    for (const agent of ctx.agents.list()) {
      liveAgents.set(String(agent.id), agent)
      applyAgent(agent)
    }
  })().catch((error) => { configError = error.message })

  ctx.effect(() => () => {
    for (const dispose of disposers) { try { dispose() } catch {} }
    for (const dispose of sessionEvents) { try { dispose() } catch {} }
    clearInterval(timer)
    clearRestrictions()
    unregisterAll()
  })
}
