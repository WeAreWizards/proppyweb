const common = require('./common');

function performSubscribe(z, bundle) {
  const data = {
    target_url: bundle.targetUrl,
    event: 'proposal_published',
  };
  const promise = z.request({
    url: `${process.env.BASE_URL}/zapier/subscription`,
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  });
  return promise.then((response) => JSON.parse(response.content));
}

function perform(z, bundle) {
  return [{
    id: bundle.cleanedRequest.id,
    link: bundle.cleanedRequest.link,
    title: bundle.cleanedRequest.title,
  }];
}

function performList(z, bundle) {
  const promise = z.request(`${process.env.BASE_URL}/zapier/polling/proposal_published`);
  return promise.then((response) => JSON.parse(response.content));
}

module.exports = {
  key: 'proposal_published',
  noun: 'Proposal',
  display: {
    label: 'Proposal Published',
    description: 'Trigger when you publish a proposal.'
  },
  operation: {
    type: 'hook',
    performSubscribe: performSubscribe,
    performUnsubscribe: common.performUnsubscribe,
    perform: perform,
    performList: performList,
  },
};
