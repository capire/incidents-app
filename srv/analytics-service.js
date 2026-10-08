const cds = require('@sap/cds')

// PCA: project N×D matrix to N×2 using the top 2 principal components
function pca2d(rows) {
  const N = rows.length
  const D = rows[0].length

  // center
  const mean = new Array(D).fill(0)
  for (const row of rows) for (let d = 0; d < D; d++) mean[d] += row[d] / N
  const centered = rows.map(row => row.map((v, d) => v - mean[d]))

  // power iteration for top 2 PCs
  function powerIter(vecs, initVec) {
    let v = initVec.slice()
    for (let iter = 0; iter < 100; iter++) {
      // v = (X^T X) v  = X^T (X v)
      const Xv = vecs.map(row => row.reduce((s, x, d) => s + x * v[d], 0))
      const newV = new Array(D).fill(0)
      for (let i = 0; i < N; i++) for (let d = 0; d < D; d++) newV[d] += vecs[i][d] * Xv[i]
      const norm = Math.sqrt(newV.reduce((s, x) => s + x * x, 0))
      for (let d = 0; d < D; d++) v[d] = newV[d] / norm
    }
    return v
  }

  // seeded init to keep projection deterministic
  const seed1 = new Array(D).fill(0).map((_, d) => Math.sin(d + 1))
  const norm1 = Math.sqrt(seed1.reduce((s, x) => s + x * x, 0))
  const pc1 = powerIter(centered, seed1.map(x => x / norm1))

  // deflate: remove pc1 component
  const deflated = centered.map(row => {
    const proj = row.reduce((s, x, d) => s + x * pc1[d], 0)
    return row.map((x, d) => x - proj * pc1[d])
  })

  const seed2 = new Array(D).fill(0).map((_, d) => Math.cos(d + 1))
  const norm2 = Math.sqrt(seed2.reduce((s, x) => s + x * x, 0))
  const pc2 = powerIter(deflated, seed2.map(x => x / norm2))

  const xs = centered.map(row => row.reduce((s, x, d) => s + x * pc1[d], 0))
  const ys = centered.map(row => row.reduce((s, x, d) => s + x * pc2[d], 0))
  return { xs, ys }
}

class AnalyticsService extends cds.ApplicationService {
  async init() {
    this.on('getEmbeddingProjection', async () => {
      const db = await cds.connect.to('db')
      const rows = await db.run(
        SELECT.from('sap_capire_incidents_Incidents')
          .columns('ID', 'title', 'status_code', 'urgency_code', 'summary', 'embedding')
          .where('embedding is not null')
      )
      if (!rows.length) return []

      const vectors = rows.map(r => JSON.parse(r.embedding))
      const { xs, ys } = pca2d(vectors)

      return rows.map((r, i) => ({
        ID: r.ID,
        title: r.title,
        status: r.status_code,
        urgency: r.urgency_code,
        summary: r.summary ?? '',
        x: xs[i],
        y: ys[i],
      }))
    })

    return super.init()
  }
}

module.exports = { AnalyticsService }
