window.__ModuleLoader__.load({
  id: 'dsh-yejia-mcp-hub',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const inputStyle = {
      width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
      border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)', fontSize: 13, outline: 'none',
    }
    const buttonStyle = {
      padding: '7px 12px', borderRadius: 8, border: '1px solid transparent',
      background: 'var(--dsw-alias-brand-primary)', color: '#fff', cursor: 'pointer', fontSize: 12,
    }
    const secondaryStyle = {
      ...buttonStyle, background: 'transparent', color: 'var(--dsw-alias-label-primary)',
      border: '1px solid var(--dsw-alias-border-l1)',
    }
    const cardStyle = {
      border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 10, padding: 14,
      display: 'grid', gap: 10, background: 'var(--dsw-alias-bg-layer-1)',
    }
    const labelStyle = { color: 'var(--dsw-alias-label-secondary)', fontSize: 11, minWidth: 56 }
    const valueStyle = { color: 'var(--dsw-alias-label-primary)', fontSize: 12, wordBreak: 'break-all' }

    const api = async (path, options) => {
      const response = await fetch(path, {
        ...options,
        headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), ...(options?.headers || {}) },
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body.ok === false) throw new Error(body.error || body.message || ('HTTP ' + response.status))
      return body
    }

    async function loadConfig() {
      return await api('/shopee/config', { cache: 'no-store' })
    }

    function InfoRow({ label, value }) {
      return h('div', { style: { display: 'flex', gap: 8, alignItems: 'baseline' } },
        h('span', { style: labelStyle }, label),
        h('span', { style: valueStyle }, value || '—'),
      )
    }

    function PlatformCard({ platform, onChanged }) {
      const [configured, setConfigured] = React.useState(!!platform.loggedIn)
      const [profile, setProfile] = React.useState(null)
      const [loading, setLoading] = React.useState(false)
      const [error, setError] = React.useState('')
      const [username, setUsername] = React.useState('')
      const [password, setPassword] = React.useState('')
      const base = '/shopee/platform/' + encodeURIComponent(platform.platformCode)

      const loadProfile = async () => {
        setLoading(true); setError('')
        try {
          const body = await api(base + '/profile', { cache: 'no-store' })
          setConfigured(!!body.configured)
          setProfile(body.profile || null)
        } catch (e) { setError(e.message); setProfile(null) }
        finally { setLoading(false) }
      }

      const loadStatus = async () => {
        try {
          const body = await api(base + '/status', { cache: 'no-store' })
          setConfigured(!!body.configured)
          if (body.configured) await loadProfile()
        } catch (e) { setError(e.message) }
      }

      React.useEffect(() => { loadStatus() }, [platform.platformCode])

      const login = async (event) => {
        event.preventDefault()
        if (loading) return
        setLoading(true); setError('')
        try {
          await api(base + '/login', { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) })
          setPassword('')
          await loadProfile()
          onChanged?.()
        } catch (e) { setError(e.message) }
        finally { setLoading(false) }
      }

      const logout = async () => {
        setLoading(true); setError('')
        try {
          await api(base + '/logout', { method: 'POST' })
          setConfigured(false); setProfile(null); onChanged?.()
        } catch (e) { setError(e.message) }
        finally { setLoading(false) }
      }

      const groups = Array.isArray(profile?.groups) ? profile.groups : []
      const shops = Array.isArray(profile?.shops) ? profile.shops : []

      return h('div', { style: cardStyle },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('div', { style: { fontWeight: 600, fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, platform.platformName),
          h('span', { style: { marginLeft: 'auto', fontSize: 11, color: configured ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-secondary)' } }, configured ? '已登录' : '未登录'),
          configured ? h('button', { type: 'button', style: secondaryStyle, onClick: logout, disabled: loading }, '退出') : null,
        ),
        configured
          ? (loading && !profile
              ? h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, '加载个人资料…')
              : h('div', { style: { display: 'grid', gap: 6 } },
                  h(InfoRow, { label: '用户名', value: profile?.userName }),
                  h(InfoRow, { label: '姓名', value: profile?.realName }),
                  h(InfoRow, { label: '角色', value: (profile?.roleName || profile?.roleCode || '') + (profile?.roleCode && profile?.roleName ? '（' + profile.roleCode + '）' : '') }),
                  h(InfoRow, { label: '用户组', value: groups.length ? groups.map((g) => g.groupName + (g.memberRole === 1 ? '（组长）' : '（成员）')).join('、') : '未加入用户组' }),
                  h(InfoRow, { label: '可见店铺', value: String(profile?.shopCount ?? shops.length) + ' 家' }),
                  shops.length ? h('div', { style: { maxHeight: 110, overflow: 'auto', display: 'grid', gap: 3, marginTop: 2 } },
                    shops.slice(0, 30).map((shop) => h('div', { key: shop.accountId, style: { display: 'flex', gap: 8, fontSize: 11, padding: '3px 6px', borderRadius: 5, background: 'var(--dsw-alias-bg-layer-2)' } },
                      h('span', { style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'var(--dsw-alias-label-primary)' } }, shop.accountId),
                      h('span', { style: { color: 'var(--dsw-alias-label-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, shop.accountName || ''),
                      shop.siteCode ? h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, shop.siteCode) : null,
                    ))) : null,
                ))
          : h('form', { onSubmit: login, style: { display: 'grid', gap: 8, maxWidth: 360 } },
              h('input', { style: inputStyle, placeholder: 'ShopeePlatform 用户名', value: username, autoComplete: 'username', onChange: (e) => setUsername(e.target.value) }),
              h('input', { style: inputStyle, placeholder: '密码', type: 'password', value: password, autoComplete: 'current-password', onChange: (e) => setPassword(e.target.value) }),
              h('button', { type: 'submit', style: buttonStyle, disabled: loading }, loading ? '登录中…' : '登录'),
            ),
        error ? h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-state-error-primary)' } }, error) : null,
      )
    }

    function SettingsPage() {
      const [config, setConfig] = React.useState(null)
      const [error, setError] = React.useState('')
      const [busy, setBusy] = React.useState(false)

      const reload = async () => {
        setBusy(true); setError('')
        try { setConfig(await loadConfig()) }
        catch (e) { setError(e.message) }
        finally { setBusy(false) }
      }

      React.useEffect(() => { reload() }, [])

      const selectCompany = async (company) => {
        setBusy(true); setError('')
        try { setConfig(await api('/shopee/company', { method: 'POST', body: JSON.stringify({ company }) })) }
        catch (e) { setError(e.message) }
        finally { setBusy(false) }
      }

      if (!config) {
        return h('div', { style: { padding: 20, fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, error || '加载 MCP 配置…')
      }

      return h('div', { style: { padding: 20, display: 'grid', gap: 14, maxWidth: 680 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h('div', { style: { fontSize: 18, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, 'Yejia MCP Hub'),
          config.company ? h('span', { style: { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)' } }, config.companies.find((c) => c.code === config.company)?.label || config.company) : null,
          config.company ? h('button', {
            type: 'button',
            style: secondaryStyle,
            onClick: () => {
              const other = config.companies.find((company) => company.code !== config.company)
              if (other) selectCompany(other.code)
            },
            disabled: busy,
          }, '切换公司') : null,
          h('button', { type: 'button', style: { ...secondaryStyle, marginLeft: 'auto' }, onClick: reload, disabled: busy }, '刷新配置'),
        ),
        h('div', { style: { fontSize: 12, lineHeight: 1.7, color: 'var(--dsw-alias-label-secondary)' } },
          'Yejia 出品的多平台 MCP 平台中心。选择公司后，插件从该公司的独立 MCP Admin 拉取平台与 MCP 地址；普通用户只需登录各平台账号。'),
        !config.company
          ? h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              config.companies.map((company) => h('button', { key: company.code, type: 'button', style: buttonStyle, onClick: () => selectCompany(company.code), disabled: busy }, '选择 ' + company.label)))
          : h('div', { style: { display: 'grid', gap: 10 } },
              config.configError ? h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, config.configError) : null,
              config.platforms.length === 0
                ? h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, '后台还没有启用的平台。')
                : config.platforms.map((platform) => h(PlatformCard, { key: platform.platformCode, platform, onChanged: reload })),
            ),
        h('div', { style: { fontSize: 11, lineHeight: 1.7, color: 'var(--dsw-alias-label-secondary)', borderTop: '1px solid var(--dsw-alias-border-l1)', paddingTop: 10 } },
          '当前会话要使用哪个平台，请在输入框下方“MCP 数据源”菜单里打开；默认全部关闭。'),
        error ? h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, error) : null,
      )
    }

    function MCPMenu({ sessionId }) {
      const [config, setConfig] = React.useState(null)
      const [enabled, setEnabled] = React.useState([])
      const [open, setOpen] = React.useState(false)
      const [error, setError] = React.useState('')

      const load = async () => {
        try {
          const next = await loadConfig()
          setConfig(next)
          if (next.company && sessionId) {
            const session = await api('/shopee/session?sessionId=' + encodeURIComponent(sessionId), { cache: 'no-store' })
            setEnabled(session.enabled || [])
          } else {
            setEnabled([])
          }
        } catch (e) { setError(e.message) }
      }

      React.useEffect(() => { load() }, [sessionId])

      const toggle = async (platform) => {
        if (!platform.loggedIn || !sessionId) return
        const next = !enabled.includes(platform.platformCode)
        try {
          const body = await api('/shopee/session', {
            method: 'POST',
            body: JSON.stringify({ sessionId, platformCode: platform.platformCode, enabled: next }),
          })
          setEnabled(body.enabled || [])
        } catch (e) { setError(e.message) }
      }

      const platforms = config?.platforms || []
      const activeCount = enabled.length
      const label = !config?.company ? 'MCP 数据源：未配置' : ('MCP 数据源' + (activeCount ? ' · ' + activeCount : ''))

      return h('div', { style: { position: 'relative', display: 'flex', justifyContent: 'flex-end' } },
        h('button', {
          type: 'button',
          onClick: (event) => { event.stopPropagation(); setOpen(!open); if (!open) load() },
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
            border: '1px solid var(--dsw-alias-border-l1)',
            background: activeCount ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
            color: activeCount ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
            fontSize: 12, cursor: 'pointer',
          },
        },
          h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: activeCount ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-idle-primary)' } }),
          label,
          h('span', { style: { fontSize: 9, color: 'var(--dsw-alias-label-secondary)' } }, '▾'),
        ),
        open ? h('div', {
          onClick: (event) => event.stopPropagation(),
          style: {
            position: 'absolute', right: 0, bottom: 34, width: 330, zIndex: 30, padding: 12,
            borderRadius: 14, border: '1px solid var(--dsw-alias-border-l1)',
            background: 'var(--dsw-alias-bg-overlay)', boxShadow: '0 18px 45px rgba(15,23,42,.2)',
            display: 'grid', gap: 8,
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--dsw-alias-border-l1)' } },
            h('b', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, 'MCP 数据源'),
            h('span', { style: { marginLeft: 'auto', fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } }, '仅当前会话'),
          ),
          !config?.company
            ? h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.7 } }, '先在 设置 → Shopee MCP 选择公司。')
            : platforms.length === 0
              ? h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, config.configError || '后台没有启用的平台。')
              : platforms.map((platform) => {
                  const on = enabled.includes(platform.platformCode)
                  return h('div', { key: platform.platformCode, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 2px' } },
                    h('div', { style: { flex: 1, display: 'grid', gap: 2 } },
                      h('b', { style: { fontSize: 12, color: 'var(--dsw-alias-label-primary)' } }, platform.platformName),
                      h('span', { style: { fontSize: 11, color: platform.loggedIn ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-secondary)' } }, platform.loggedIn ? '已登录' : '未登录 · 先在设置登录'),
                    ),
                    h('button', {
                      type: 'button', disabled: !platform.loggedIn, onClick: () => toggle(platform),
                      style: { width: 34, height: 20, borderRadius: 999, border: 0, cursor: platform.loggedIn ? 'pointer' : 'default', background: on ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-border-l2)', position: 'relative', opacity: platform.loggedIn ? 1 : .5 },
                    },
                      h('span', { style: { position: 'absolute', top: 3, left: on ? 17 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: '.15s' } }),
                    ),
                  )
                }),
          error ? h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-state-error-primary)' } }, error) : null,
          h('div', { style: { paddingTop: 8, borderTop: '1px solid var(--dsw-alias-border-l1)', fontSize: 11, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.6 } },
            '打开哪个平台，仅当前会话暴露该平台的 MCP 工具；关闭时模型看不到。'),
        ) : null,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section', id: 'shopee-mcp', order: 25, label: 'Yejia MCP',
        }, SettingsPage))
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock', id: 'shopee-mcp-menu', order: 20,
        }, MCPMenu))
      },
    }
  },
})
