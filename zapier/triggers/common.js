module.exports = {
  performUnsubscribe: (z, bundle) => {
    const hookId = bundle.subscribeData.id;
    const promise = z.request({
      url: `${process.env.BASE_URL}/zapier/subscription/${hookId}`,
      headers: {'Content-Type': 'application/json'},
      method: 'DELETE',
    });
    return promise.then((response) => JSON.parse(response.content));
  },
};
