const common = require('./common');

function performSubscribe(z, bundle) {
  const data = {
    target_url: bundle.targetUrl,
    event: 'proposal_moved_to',
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
    title: bundle.cleanedRequest.title,
    status: bundle.cleanedRequest.status,
  }];
}

function performList(z, bundle) {
  const promise = z.request(`${process.env.BASE_URL}/zapier/polling/proposal_moved_to`, {});
  return promise.then((response) => JSON.parse(response.content));
}


module.exports = {
  key: 'proposal_moved_to',
  noun: 'Proposal',
  display: {
    label: 'Proposal Moved To',
    description: 'Trigger when you change the status of one of your proposals.'
  },
  operation: {
    type: 'hook',
    performSubscribe: performSubscribe,
    performUnsubscribe: common.performUnsubscribe,
    perform: perform,
    performList: performList,
  },
};
