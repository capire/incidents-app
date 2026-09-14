const cds = require('@sap/cds')

describe('Semantic search over incidents (@cap-js/ai embeddings)', () => {
  const { GET, POST, expect, axios } = cds.test(__dirname + '/..')
  axios.defaults.auth = { username: 'alice' }

  const Incidents = '/odata/v4/processor/Incidents'
  const search = phrase => GET(`/odata/v4/processor/searchIncidents(phrase='${encodeURIComponent(phrase)}')`)
  const active = 'IsActiveEntity=true', draft = 'IsActiveEntity=false'
  const relOf = (rows, title) => rows.find(r => r.title === title)?.relevance

  it('ranks relevant incidents highest, sorted by descending relevance', async () => {
    const { data } = await search('inverter problem')
    expect(data.value).to.have.length(4)
    // sorted descending
    const scores = data.value.map(r => r.relevance)
    expect(scores).to.eql([...scores].sort((a, b) => b - a))
    // an inverter incident is the top hit, clearly above the unrelated solar panel one
    expect(data.value[0].title).to.match(/inverter/i)
    expect(relOf(data.value, 'Inverter not functional'))
      .to.be.greaterThan(relOf(data.value, 'Solar panel broken'))
  })

  it('embeds conversation content, not just the title', async () => {
    // "connections" appears only in conversation messages, never in titles. The incident
    // whose message mentions "loose connections" must outrank one whose title/message don't.
    const { data } = await search('loose battery connections')
    expect(relOf(data.value, 'No current on a sunny day'))          // message: "any loose connections?"
      .to.be.greaterThan(relOf(data.value, 'Strange noise when switching off Inverter'))
  })

  it('does not expose summary or embedding over the API', async () => {
    const { data } = await GET(`${Incidents}?$top=1`)
    expect(data.value[0]).to.not.have.property('summary')
    expect(data.value[0]).to.not.have.property('embedding')
  })

  it('recomputes the embedding when a conversation message is added', async () => {
    const INC = '3a4ede72-244a-4f5f-8efa-b17e032d01ee' // No current on a sunny day
    const phrase = 'dead battery pack'

    const before = relOf((await search(phrase)).data.value, 'No current on a sunny day')

    await POST(`${Incidents}(ID=${INC},${active})/ProcessorService.draftEdit`, { PreserveChanges: true })
    await POST(`${Incidents}(ID=${INC},${draft})/conversation`, { message: 'The battery pack seems completely dead' })
    await POST(`${Incidents}(ID=${INC},${draft})/ProcessorService.draftActivate`, {})

    const { data } = await search(phrase)
    // the new message makes this incident the top match now
    expect(data.value[0].ID).to.eql(INC)
    expect(relOf(data.value, 'No current on a sunny day')).to.be.greaterThan(before)
  })

  it('gives a newly created incident a title-only summary (no null embedding)', async () => {
    const { data: inc } = await POST(Incidents, { title: 'Panel inverter overheating' })
    await POST(`${Incidents}(ID=${inc.ID},${draft})/ProcessorService.draftActivate`, {})
    // it participates in search right away, i.e. it got an embedding from its summary
    const { data } = await search('overheating inverter')
    expect(data.value.find(r => r.ID === inc.ID)).to.exist
  })
})
