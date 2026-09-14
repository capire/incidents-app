const cds = require('@sap/cds')

// The model name is ignored on SQLite (the locally configured @cap-js/ai model is used)
// and honored on SAP HANA, so the same queries run unchanged on both.
const MODEL = 'SAP_GXY.20250407'

// Base (database) entity, where the summary/embedding elements live. Used for the
// cds.db reads/writes below — the ProcessorService.Incidents projection is not a table.
const DB_INCIDENTS = 'sap.capire.incidents.Incidents'

class ProcessorService extends cds.ApplicationService {
  init() {

    const { Incidents } = this.entities

    this.before ('UPDATE', Incidents, async req => {
      let closed = await SELECT.one(1) .from (req.subject) .where `status.code = 'C'`
      if (closed) req.reject `Can't modify a closed incident!`
    })

    this.before (['CREATE','UPDATE'], Incidents, req => {
      let urgent = req.data.title?.match(/urgent/i)
      if (urgent) req.data.urgency_code = 'H'
    })

    // Keep the summary (and thus the embedding) in sync after every incident write.
    // The affected ID comes from the result rows (CREATE, where it may be generated) or
    // from req.data (UPDATE / draft activate, where the result carries no rows).
    this.after (['CREATE','UPDATE'], Incidents, async (data, req) => {
      const rows = Array.isArray(data) ? data : data ? [data] : []
      const ids = new Set(rows.map(row => row?.ID).filter(Boolean))
      if (req.data?.ID) ids.add(req.data.ID)
      for (const ID of ids) await this.summarize(ID)
    })

    // Semantic search: rank incidents by cosine similarity between the phrase and
    // each incident's stored embedding (title + conversation).
    this.on ('searchIncidents', req => {
      const { phrase } = req.data
      return SELECT.from(Incidents)
        .columns `ID, title, cosine_similarity(
          embedding, vector_embedding(${phrase}, 'QUERY', ${MODEL})
        ) as relevance`
        .orderBy `relevance desc`
        .limit(10)
    })

    return super.init()
  }

  // Rebuild `summary` (title + all conversation messages) for one incident in a single
  // statement: the child messages are rolled up in the database via string_agg and
  // concatenated onto the title. coalesce keeps title-only incidents from becoming null.
  // The stored calculated `embedding` element is recomputed automatically by the database
  // when `summary` changes. Written via cds.db to bypass this service's handlers (no recursion).
  async summarize(ID) {
    const messages = SELECT.from(`${DB_INCIDENTS}.conversation`)
      .columns `string_agg(message, char(10) order by timestamp) as agg`
      .where({ up__ID: ID })
    await cds.db.run(UPDATE(DB_INCIDENTS, ID).with({ summary: { xpr: [
      { ref: ['title'] }, '||',
      { func: 'coalesce', args: [ { xpr: [ { val: '\n' }, '||', messages ] }, { val: '' } ] }
    ] } }))
  }
}

module.exports = { ProcessorService }
