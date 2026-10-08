const cds = require('@sap/cds')
const { OrchestrationClient } = require('@sap-ai-sdk/orchestration');

const orchestrationClient = new OrchestrationClient({
  promptTemplating: {
    model: {
      name: 'mistralai--mistral-small'
    }
  }
});


class ProcessorService extends cds.ApplicationService {
  async init() {

    const { Incidents } = this.entities

    this.before ('UPDATE', Incidents, async req => {
      let closed = await SELECT.one(1) .from (req.subject) .where `status.code = 'C'`
      if (closed) req.reject `Can't modify a closed incident!`
    })

    this.before (['CREATE','UPDATE'], Incidents, req => {
      let urgent = req.data.title?.match(/urgent/i)
      if (urgent) req.data.urgency_code = 'H'
    })

    this.summarize()
    await this.schedule('summarize').every('10s')
    this.on('summarize', () => this.summarize())

    return super.init()
  }

  async summarize() {
    const { Incidents } = this.entities
    const incidents = await SELECT.from(Incidents)
      .columns `ID, title, modifiedAt, conversation { message }`
      .where `summarizedAt is null or modifiedAt > summarizedAt`
      .limit(10)
    console.log('summarize', incidents.length, 'incidents')

    for (const incident of incidents) {
      const { ID, title, conversation, modifiedAt } = incident
      const prompt = `
        Summarize the ticket briefly with a maximum of 2 sentences.
        Focus on the problem the customer faces.
      `
      const content = `
        Title: ${title}
        Messages: ${conversation.map(c => `${c.timestamp} - ${c.message}`).join('\n----\n')}
      `
      const response = await orchestrationClient.chatCompletion({
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content }
        ]
      });
      const summary = response.getContent()

      await UPDATE(Incidents, ID).with({ summarizedAt: modifiedAt, modifiedAt, summary })
      console.log('peristed summary:', summary)
    }
  }
}

module.exports = { ProcessorService }
