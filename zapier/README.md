# Zapier integration

[zapier-cli](https://github.com/zapier/zapier-platform-cli) allows us
to define triggers and actions in code. This is the code.

## Development

Run `yarn` to install the dependencies.

Run `yarn zapier validate` to detect any issues and `yarn zapier build` to
build the project.

`zapier build` does't give great error messages, but you can always do
a quick syntax check with:

```
$ nodejs index.js
```

## Staging VS Live

I created an app for Proppy for staging: https://zapier.com/developer/builder/cli-app/767/build
The process is the following:

- link to the right app (prod or staging) by running `yarn zapier link`
- update the app by running `yarn deploy:staging` or `yarn deploy:prod` depending on the one
you want

This process might have to change once the integration is out of beta but that's in the future.
