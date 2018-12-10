function perform(z, bundle) {
  data = {
    title: bundle.inputData.title,
  };
  const promise = z.request({
    url: `${process.env.BASE_URL}/zapier/action/create_proposal`,
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  });
  return promise.then((response) => JSON.parse(response.content));
}

module.exports = {
  key: 'proposal_created',
  noun: 'Proposal',
  display: {
    label: 'Create a New Proposal',
    description: 'Use this action to create a new proposal in Proppy.'
  },
  operation: {
    inputFields: [
      {key: 'title', required: true, label: 'Proposal title'},
    ],
    perform: perform,
  },
};
