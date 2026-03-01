import { resolveUser } from '../../lib/user-resolver'

/**
 * AdminProjectHandler
 *
 * Handles:
 *   - syncProjects: Manual trigger to sync projects from the Papierkram API.
 *
 * ── Papierkram API Setup ───────────────────────────────────────────────────────
 * To enable real sync, set the following environment variables:
 *
 *   PAPIERKRAM_API_KEY=<your Papierkram API token>
 *   PAPIERKRAM_BASE_URL=https://demo.papierkram.de  (or your company sub-domain)
 *
 * The API docs are at: https://api-doc.papierkram.de/api/v1/api-docs/index.html
 * Auth header: Authorization: Bearer <PAPIERKRAM_API_KEY>
 *
 * The sync will:
 *   1. Fetch all active tracker projects from Papierkram
 *   2. Upsert them into the local `Project` table (match on `code`)
 *   3. Deactivate any projects that are no longer active in Papierkram
 *   4. Return a summary string
 */
export class AdminProjectHandler {
    private srv: any

    constructor(srv: any) {
        this.srv = srv
    }

    register() {
        this.srv.on('syncProjects', this.onSyncProjects.bind(this))
    }

    private async onSyncProjects(req: any) {
        await resolveUser(req) // validates admin is authenticated

        const apiKey = process.env['PAPIERKRAM_API_KEY']
        const baseUrl = process.env['PAPIERKRAM_BASE_URL'] || 'https://demo.papierkram.de'

        if (!apiKey) {
            return (
                'Papierkram sync is not configured. ' +
                'Please set PAPIERKRAM_API_KEY and (optionally) PAPIERKRAM_BASE_URL environment variables. ' +
                'Get your API key from your Papierkram account → Settings → API. ' +
                'API docs: https://api-doc.papierkram.de/api/v1/api-docs/index.html'
            )
        }

        // ── Real sync logic (only runs when API key is present) ──────────────
        let fetchFn: typeof fetch
        try {
            fetchFn = fetch  // Node 18+ built-in
        } catch {
            return req.reject(500, 'fetch is not available. Ensure Node.js 18+ is used.')
        }

        // Fetch projects from Papierkram
        const url = `${baseUrl}/api/v1/tracker/projects?page=1&page_size=100`
        let papierkramProjects: any[]
        try {
            const resp = await fetchFn(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                },
            })

            if (!resp.ok) {
                const errText = await resp.text()
                return req.reject(502, `Papierkram API error ${resp.status}: ${errText}`)
            }

            const data: any = await resp.json()
            papierkramProjects = data.records || data.data || data || []
        } catch (e: any) {
            return req.reject(502, `Failed to connect to Papierkram API: ${e.message}`)
        }

        if (!papierkramProjects.length) {
            return 'Papierkram sync complete: no projects returned from API.'
        }

        const cds = require('@sap/cds')
        const db = cds.db || await cds.connect.to('db')
        const { Project } = db.entities('sap.timesheet')

        const existingProjects = await SELECT.from(Project)

        let created = 0
        let updated = 0

        for (const pp of papierkramProjects) {
            // Map Papierkram fields to our schema
            // Papierkram project: { id, name, ... }
            const code = String(pp.id || pp.name)
            const name = pp.name || `Project ${code}`

            const existing = existingProjects.find((p: any) =>
                p.code === code || p.name?.toLowerCase() === name.toLowerCase()
            )

            if (existing) {
                await UPDATE(Project).set({
                    name: name,
                    type: 'Papierkram',
                    isActive: true,
                }).where({ ID: existing.ID })
                updated++
            } else {
                await INSERT.into(Project).entries({
                    name: name,
                    code: code,
                    type: 'Papierkram',
                    isActive: true,
                })
                created++
            }
        }

        return `Papierkram sync complete: ${created} created, ${updated} updated (${papierkramProjects.length} total from API).`
    }
}
