import * as React from "react";
import * as ReactDom from "react-dom";
import { AppContainer } from "react-hot-loader";

declare var require: any;
declare var module: any;
declare var __PRODUCTION__: boolean;
declare var __SENTRY_DSN__: string;

// IE doesn't have Promise yet so we need to polyfill it
if (typeof window["Promise"] !== "function") {
  // tslint:disable-next-line
  require("es6-promise").polyfill();
}

import "./utils/polyfills";

import "../style/app.scss";
import Root from "./root";


if (__PRODUCTION__) {
  // tslint:disable-next-line
  const Raven = require("raven-js");
  Raven.config(__SENTRY_DSN__).install();
}

const rootEl = document.getElementById("react-container");
ReactDom.render(<AppContainer><Root /></AppContainer>, rootEl);

if (!__PRODUCTION__) {
  // Hot Module Replacement API
  if (module.hot) {
    module.hot.accept("./root", () => {
      ReactDom.render(<AppContainer><Root /></AppContainer>, rootEl);
    });
  }
}
