const proposalCreated = require('./triggers/proposal_created');
const proposalMovedTo = require('./triggers/proposal_moved_to');
const proposalPublished = require('./triggers/proposal_published');
const createProposal = require('./creates/create_proposal');

const testAuth = (z, bundle) => {
  const promise = z.request({
    url: `${process.env.BASE_URL}/zapier/polling/proposal_created`,
  });

  return promise.then((response) => {
    if (response.status === 400) {
      throw new Error('The Zapier request is invalid. Please contact team@proppy.io');
    }
    if (response.status === 403) {
      throw new Error('The API Key you supplied is invalid');
    }
    return response;
  });
};

const addApiKeyToHeader = (request, z, bundle) => {
  request.headers['AUTHORIZATION'] = `api_key=${bundle.authData.api_key}`;
  return request;
};

// We can roll up all our behaviors in an App.
const App = {
  // This is just shorthand to reference the installed dependencies you have. Zapier will
  // need to know these before we can upload
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  // beforeRequest & afterResponse are optional hooks into the provided HTTP client
  beforeRequest: [
    addApiKeyToHeader,
  ],

  afterResponse: [
  ],

  // If you want to define optional resources to simplify creation of triggers, searches, creates - do that here!
  resources: {
  },

  // If you want your trigger to show up, you better include it here!
  triggers: {
    [proposalCreated.key]: proposalCreated,
    [proposalMovedTo.key]: proposalMovedTo,
    [proposalPublished.key]: proposalPublished,
  },

  // If you want your searches to show up, you better include it here!
  searches: {
  },

  // If you want your creates to show up, you better include it here!
  creates: {
    [createProposal.key]: createProposal,
  },

  authentication: {
    type: 'custom',
    test: testAuth,
    fields: [
      {key: 'api_key', type: 'string', required: true}
    ],
  },
};

// Finally, export the app.
module.exports = App;
