var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process, Deno } = globalThis;
  const isNoColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : process !== void 0 ? (
    // eslint-disable-next-line no-unsafe-optional-chaining
    "NO_COLOR" in process?.env
  ) : false;
  return !isNoColor;
}
__name(getColorEnabled, "getColorEnabled");
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = "cloudflare:workers";
  const isNoColor = navigator !== void 0 && navigator.userAgent === "Cloudflare-Workers" ? await (async () => {
    try {
      return "NO_COLOR" in ((await import(cfWorkers)).env ?? {});
    } catch {
      return false;
    }
  })() : !getColorEnabled();
  return !isNoColor;
}
__name(getColorEnabledAsync, "getColorEnabledAsync");

// node_modules/hono/dist/middleware/logger/index.js
var humanize = /* @__PURE__ */ __name((times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
}, "humanize");
var time = /* @__PURE__ */ __name((start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
}, "time");
var colorStatus = /* @__PURE__ */ __name(async (status) => {
  const colorEnabled = await getColorEnabledAsync();
  if (colorEnabled) {
    switch (status / 100 | 0) {
      case 5:
        return `\x1B[31m${status}\x1B[0m`;
      case 4:
        return `\x1B[33m${status}\x1B[0m`;
      case 3:
        return `\x1B[36m${status}\x1B[0m`;
      case 2:
        return `\x1B[32m${status}\x1B[0m`;
    }
  }
  return `${status}`;
}, "colorStatus");
async function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `${prefix} ${method} ${path}` : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`;
  fn(out);
}
__name(log, "log");
var logger = /* @__PURE__ */ __name((fn = console.log) => {
  return /* @__PURE__ */ __name(async function logger2(c, next) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf("/", 8));
    await log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    await log(fn, "-->", method, path, c.res.status, time(start));
  }, "logger2");
}, "logger");

// node_modules/hono/dist/middleware/pretty-json/index.js
var prettyJSON = /* @__PURE__ */ __name((options) => {
  const targetQuery = options?.query ?? "pretty";
  return /* @__PURE__ */ __name(async function prettyJSON2(c, next) {
    const pretty = options?.force || c.req.query(targetQuery) || c.req.query(targetQuery) === "";
    await next();
    if (pretty && c.res.headers.get("Content-Type")?.startsWith("application/json")) {
      const obj = await c.res.json();
      c.res = new Response(JSON.stringify(obj, null, options?.space ?? 2), c.res);
    }
  }, "prettyJSON2");
}, "prettyJSON");

// src/services/database.ts
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
__name(generateUUID, "generateUUID");
function safeParseJSON(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
__name(safeParseJSON, "safeParseJSON");
var DatabaseService = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "DatabaseService");
  }
  // ============================================
  // TEMPLATES
  // ============================================
  /**
   * Get all templates (list view - minimal data)
   */
  async getTemplates() {
    const results = await this.db.prepare(`
        SELECT id, name, thumbnail, status, updated_at, created_at
        FROM templates
        ORDER BY updated_at DESC
        LIMIT 50
      `).all();
    return (results.results || []).map((t) => ({
      id: t.id,
      name: t.name,
      thumbnail: t.thumbnail,
      status: t.status,
      sections: {},
      sectionOrder: [],
      customSections: [],
      globalTheme: {
        id: "default",
        name: "Default",
        category: "modern",
        colors: {
          primary: "#000000",
          secondary: "#ffffff",
          accent: "#000000",
          background: "#ffffff",
          text: "#000000"
        },
        fontFamily: "Inter"
      },
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
  }
  /**
   * Get single template with full data (sections + elements)
   */
  async getTemplate(id) {
    const template = await this.db.prepare("SELECT * FROM templates WHERE id = ?").bind(id).first();
    if (!template) return null;
    const sectionsResult = await this.db.prepare("SELECT * FROM template_sections WHERE template_id = ?").bind(id).all();
    const sections = sectionsResult.results || [];
    const sectionIds = sections.map((s) => s.id);
    let allElements = [];
    if (sectionIds.length > 0) {
      const placeholders = sectionIds.map(() => "?").join(",");
      const elementsResult = await this.db.prepare(`SELECT * FROM template_elements WHERE section_id IN (${placeholders})`).bind(...sectionIds).all();
      allElements = elementsResult.results || [];
    }
    const elementsBySection = {};
    allElements.forEach((el) => {
      if (!elementsBySection[el.section_id]) {
        elementsBySection[el.section_id] = [];
      }
      elementsBySection[el.section_id].push(el);
    });
    const sectionOrder = safeParseJSON(template.section_order, []);
    const finalSections = {};
    sections.forEach((section) => {
      const sectionElements = elementsBySection[section.id] || [];
      let order = sectionOrder.indexOf(section.type);
      if (order === -1) order = 999;
      finalSections[section.type] = {
        id: section.id,
        isVisible: section.is_visible === 1,
        backgroundColor: section.background_color || void 0,
        backgroundUrl: section.background_url || void 0,
        overlayOpacity: section.overlay_opacity,
        animation: section.animation,
        pageTitle: section.page_title || void 0,
        title: section.page_title || void 0,
        order,
        openInvitationConfig: safeParseJSON(section.open_invitation_config, void 0),
        animationTrigger: section.animation_trigger || "scroll",
        transitionEffect: section.transition_effect || "none",
        transitionDuration: section.transition_duration || 1e3,
        transitionTrigger: section.transition_trigger || "scroll",
        particleType: section.particle_type || "none",
        kenBurnsEnabled: section.ken_burns_enabled === 1,
        zoomConfig: safeParseJSON(section.zoom_config, void 0),
        pageTransition: safeParseJSON(section.page_transition, void 0),
        elements: sectionElements.map((el) => this.mapElementToResponse(el))
      };
    });
    return {
      id: template.id,
      name: template.name,
      thumbnail: template.thumbnail,
      status: template.status,
      sections: finalSections,
      sectionOrder,
      customSections: safeParseJSON(template.custom_sections, []),
      globalTheme: safeParseJSON(template.global_theme, {
        id: "default",
        name: "Default",
        category: "modern",
        colors: {
          primary: "#000000",
          secondary: "#ffffff",
          accent: "#000000",
          background: "#ffffff",
          text: "#000000"
        },
        fontFamily: "Inter"
      }),
      eventDate: template.event_date || void 0,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    };
  }
  /**
   * Create new template
   */
  async createTemplate(data) {
    const id = generateUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO templates (id, name, thumbnail, status, section_order, custom_sections, global_theme, event_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      id,
      data.name || "Untitled Template",
      data.thumbnail || null,
      data.status || "draft",
      JSON.stringify(data.sectionOrder || []),
      JSON.stringify(data.customSections || []),
      JSON.stringify(data.globalTheme || {}),
      data.eventDate || null,
      now,
      now
    ).run();
    if (data.sections) {
      for (const [type, design] of Object.entries(data.sections)) {
        await this.upsertSection(id, type, design);
      }
    }
    return await this.getTemplate(id);
  }
  /**
   * Update template
   */
  async updateTemplate(id, updates) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const sets = ["updated_at = ?"];
    const values = [now];
    if (updates.name !== void 0) {
      sets.push("name = ?");
      values.push(updates.name);
    }
    if (updates.thumbnail !== void 0) {
      sets.push("thumbnail = ?");
      values.push(updates.thumbnail);
    }
    if (updates.status !== void 0) {
      sets.push("status = ?");
      values.push(updates.status);
    }
    if (updates.sectionOrder !== void 0) {
      sets.push("section_order = ?");
      values.push(JSON.stringify(updates.sectionOrder));
    }
    if (updates.customSections !== void 0) {
      sets.push("custom_sections = ?");
      values.push(JSON.stringify(updates.customSections));
    }
    if (updates.globalTheme !== void 0) {
      sets.push("global_theme = ?");
      values.push(JSON.stringify(updates.globalTheme));
    }
    if (updates.eventDate !== void 0) {
      sets.push("event_date = ?");
      values.push(updates.eventDate);
    }
    values.push(id);
    await this.db.prepare(`UPDATE templates SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
  }
  /**
   * Delete template (cascades to sections and elements)
   */
  async deleteTemplate(id) {
    await this.db.prepare("DELETE FROM templates WHERE id = ?").bind(id).run();
  }
  // ============================================
  // SECTIONS
  // ============================================
  /**
   * Upsert section (create or update)
   */
  async upsertSection(templateId, sectionType, updates) {
    const existing = await this.db.prepare("SELECT id FROM template_sections WHERE template_id = ? AND type = ?").bind(templateId, sectionType).first();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (existing) {
      const sets = ["updated_at = ?"];
      const values = [now];
      if (updates.isVisible !== void 0) {
        sets.push("is_visible = ?");
        values.push(updates.isVisible ? 1 : 0);
      }
      if (updates.backgroundColor !== void 0) {
        sets.push("background_color = ?");
        values.push(updates.backgroundColor || null);
      }
      if (updates.backgroundUrl !== void 0) {
        sets.push("background_url = ?");
        values.push(updates.backgroundUrl || null);
      }
      if (updates.overlayOpacity !== void 0) {
        sets.push("overlay_opacity = ?");
        values.push(updates.overlayOpacity);
      }
      if (updates.animation !== void 0) {
        sets.push("animation = ?");
        values.push(updates.animation);
      }
      if (updates.pageTitle !== void 0) {
        sets.push("page_title = ?");
        values.push(updates.pageTitle || null);
      }
      if (updates.animationTrigger !== void 0) {
        sets.push("animation_trigger = ?");
        values.push(updates.animationTrigger);
      }
      if (updates.openInvitationConfig !== void 0) {
        sets.push("open_invitation_config = ?");
        values.push(JSON.stringify(updates.openInvitationConfig));
      }
      if (updates.transitionEffect !== void 0) {
        sets.push("transition_effect = ?");
        values.push(updates.transitionEffect);
      }
      if (updates.transitionDuration !== void 0) {
        sets.push("transition_duration = ?");
        values.push(updates.transitionDuration);
      }
      if (updates.transitionTrigger !== void 0) {
        sets.push("transition_trigger = ?");
        values.push(updates.transitionTrigger);
      }
      if (updates.particleType !== void 0) {
        sets.push("particle_type = ?");
        values.push(updates.particleType);
      }
      if (updates.kenBurnsEnabled !== void 0) {
        sets.push("ken_burns_enabled = ?");
        values.push(updates.kenBurnsEnabled ? 1 : 0);
      }
      if (updates.zoomConfig !== void 0) {
        console.log(`[Database] Updating zoom_config for ${sectionType}:`, JSON.stringify(updates.zoomConfig));
        sets.push("zoom_config = ?");
        values.push(updates.zoomConfig ? JSON.stringify(updates.zoomConfig) : null);
      }
      if (updates.pageTransition !== void 0) {
        console.log(`[Database] Updating page_transition for ${sectionType}:`, JSON.stringify(updates.pageTransition));
        sets.push("page_transition = ?");
        values.push(updates.pageTransition ? JSON.stringify(updates.pageTransition) : null);
      }
      if (sets.length > 1) {
        const query = `UPDATE template_sections SET ${sets.join(", ")} WHERE id = ?`;
        console.log(`[Database] Executing UPDATE query for section ${existing.id}`);
        await this.db.prepare(query).bind(...values, existing.id).run();
        console.log(`[Database] UPDATE SUCCESS for section ${existing.id}`);
      } else {
        console.log(`[Database] No updates needed for section ${existing.id}`);
      }
      return existing.id;
    } else {
      const id = generateUUID();
      await this.db.prepare(`
          INSERT INTO template_sections (
            id, template_id, type, is_visible, background_color, background_url, 
            overlay_opacity, animation, page_title, animation_trigger, 
            open_invitation_config, transition_effect, transition_duration, transition_trigger,
            particle_type, ken_burns_enabled, zoom_config, page_transition,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
        id,
        templateId,
        sectionType,
        updates.isVisible !== void 0 ? updates.isVisible ? 1 : 0 : 1,
        updates.backgroundColor || null,
        updates.backgroundUrl || null,
        updates.overlayOpacity ?? 0,
        updates.animation || "fade-in",
        updates.pageTitle || null,
        updates.animationTrigger || "scroll",
        updates.openInvitationConfig ? JSON.stringify(updates.openInvitationConfig) : null,
        updates.transitionEffect || "none",
        updates.transitionDuration || 1e3,
        updates.transitionTrigger || "scroll",
        updates.particleType || "none",
        updates.kenBurnsEnabled ? 1 : 0,
        updates.zoomConfig ? JSON.stringify(updates.zoomConfig) : null,
        updates.pageTransition ? JSON.stringify(updates.pageTransition) : null,
        now,
        now
      ).run();
      return id;
    }
  }
  /**
   * Delete section
   */
  async deleteSection(templateId, sectionType) {
    await this.db.prepare("DELETE FROM template_sections WHERE template_id = ? AND type = ?").bind(templateId, sectionType).run();
  }
  /**
   * Get section ID by template and type
   */
  async getSectionId(templateId, sectionType) {
    const result = await this.db.prepare("SELECT id FROM template_sections WHERE template_id = ? AND type = ?").bind(templateId, sectionType).first();
    return result?.id || null;
  }
  // ============================================
  // ELEMENTS
  // ============================================
  /**
   * Create element
   */
  async createElement(sectionId, element) {
    const id = element.id?.startsWith("el-") ? generateUUID() : element.id || generateUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO template_elements (
          id, section_id, type, name, position_x, position_y, width, height, z_index,
          animation, loop_animation, animation_delay, animation_speed, animation_duration, animation_trigger, animation_loop,
          content, image_url, text_style, icon_style, countdown_config,
          rsvp_form_config, guest_wishes_config, open_invitation_config,
          rotation, flip_horizontal, flip_vertical, motion_path_config,
          can_edit_position, can_edit_content, is_content_protected, show_copy_button,
          lottie_config, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      id,
      sectionId,
      element.type || "text",
      element.name || "Element",
      element.position?.x ?? 0,
      element.position?.y ?? 0,
      element.size?.width ?? 100,
      element.size?.height ?? 100,
      element.zIndex ?? 0,
      element.animation || "fade-in",
      element.loopAnimation || null,
      element.animationDelay ?? 0,
      element.animationSpeed ?? 500,
      element.animationDuration ?? 1e3,
      element.animationTrigger || "scroll",
      element.animationLoop ? 1 : 0,
      element.content || null,
      element.imageUrl || null,
      element.textStyle ? JSON.stringify(element.textStyle) : null,
      element.iconStyle ? JSON.stringify(element.iconStyle) : null,
      element.countdownConfig ? JSON.stringify(element.countdownConfig) : null,
      element.rsvpFormConfig ? JSON.stringify(element.rsvpFormConfig) : null,
      element.guestWishesConfig ? JSON.stringify(element.guestWishesConfig) : null,
      element.openInvitationConfig ? JSON.stringify(element.openInvitationConfig) : null,
      element.rotation ?? 0,
      element.flipHorizontal ? 1 : 0,
      element.flipVertical ? 1 : 0,
      element.motionPathConfig ? JSON.stringify(element.motionPathConfig) : null,
      element.canEditPosition ? 1 : 0,
      element.canEditContent ? 1 : 0,
      element.isContentProtected ? 1 : 0,
      element.showCopyButton ? 1 : 0,
      element.lottieConfig ? JSON.stringify(element.lottieConfig) : null,
      now,
      now
    ).run();
    const created = await this.db.prepare("SELECT * FROM template_elements WHERE id = ?").bind(id).first();
    return this.mapElementToResponse(created);
  }
  /**
   * Update element
   */
  async updateElement(elementId, updates) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const sets = ["updated_at = ?"];
    const values = [now];
    if (updates.name !== void 0) {
      sets.push('"name" = ?');
      values.push(updates.name);
    }
    if (updates.position !== void 0) {
      sets.push('"position_x" = ?, "position_y" = ?');
      values.push(updates.position.x, updates.position.y);
    }
    if (updates.size !== void 0) {
      sets.push('"width" = ?, "height" = ?');
      values.push(updates.size.width, updates.size.height);
    }
    if (updates.zIndex !== void 0) {
      sets.push('"z_index" = ?');
      values.push(updates.zIndex);
    }
    if (updates.animation !== void 0) {
      sets.push('"animation" = ?');
      values.push(updates.animation);
    }
    if (updates.loopAnimation !== void 0) {
      sets.push('"loop_animation" = ?');
      values.push(updates.loopAnimation || null);
    }
    if (updates.animationDelay !== void 0) {
      sets.push('"animation_delay" = ?');
      values.push(updates.animationDelay);
    }
    if (updates.animationSpeed !== void 0) {
      sets.push('"animation_speed" = ?');
      values.push(updates.animationSpeed);
    }
    if (updates.animationDuration !== void 0) {
      sets.push('"animation_duration" = ?');
      values.push(updates.animationDuration);
    }
    if (updates.animationTrigger !== void 0) {
      sets.push('"animation_trigger" = ?');
      values.push(updates.animationTrigger);
    }
    if (updates.content !== void 0) {
      sets.push('"content" = ?');
      values.push(updates.content || null);
    }
    if (updates.imageUrl !== void 0) {
      sets.push('"image_url" = ?');
      values.push(updates.imageUrl || null);
    }
    if (updates.textStyle !== void 0) {
      sets.push('"text_style" = ?');
      values.push(JSON.stringify(updates.textStyle));
    }
    if (updates.iconStyle !== void 0) {
      sets.push('"icon_style" = ?');
      values.push(JSON.stringify(updates.iconStyle));
    }
    if (updates.countdownConfig !== void 0) {
      sets.push('"countdown_config" = ?');
      values.push(JSON.stringify(updates.countdownConfig));
    }
    if (updates.rsvpFormConfig !== void 0) {
      sets.push('"rsvp_form_config" = ?');
      values.push(JSON.stringify(updates.rsvpFormConfig));
    }
    if (updates.guestWishesConfig !== void 0) {
      sets.push('"guest_wishes_config" = ?');
      values.push(JSON.stringify(updates.guestWishesConfig));
    }
    if (updates.openInvitationConfig !== void 0) {
      sets.push('"open_invitation_config" = ?');
      values.push(JSON.stringify(updates.openInvitationConfig));
    }
    if (updates.rotation !== void 0) {
      sets.push('"rotation" = ?');
      values.push(updates.rotation);
    }
    if (updates.flipHorizontal !== void 0) {
      sets.push('"flip_horizontal" = ?');
      values.push(updates.flipHorizontal ? 1 : 0);
    }
    if (updates.flipVertical !== void 0) {
      sets.push('"flip_vertical" = ?');
      values.push(updates.flipVertical ? 1 : 0);
    }
    if (updates.motionPathConfig !== void 0) {
      sets.push('"motion_path_config" = ?');
      values.push(updates.motionPathConfig ? JSON.stringify(updates.motionPathConfig) : null);
    }
    if (updates.parallaxFactor !== void 0) {
      sets.push('"parallax_factor" = ?');
      values.push(updates.parallaxFactor);
    }
    if (updates.canEditPosition !== void 0) {
      sets.push('"can_edit_position" = ?');
      values.push(updates.canEditPosition ? 1 : 0);
    }
    if (updates.canEditContent !== void 0) {
      sets.push('"can_edit_content" = ?');
      values.push(updates.canEditContent ? 1 : 0);
    }
    if (updates.isContentProtected !== void 0) {
      sets.push('"is_content_protected" = ?');
      values.push(updates.isContentProtected ? 1 : 0);
    }
    if (updates.showCopyButton !== void 0) {
      sets.push('"show_copy_button" = ?');
      values.push(updates.showCopyButton ? 1 : 0);
    }
    if (updates.lottieConfig !== void 0) {
      sets.push('"lottie_config" = ?');
      values.push(updates.lottieConfig ? JSON.stringify(updates.lottieConfig) : null);
    }
    if (updates.animationLoop !== void 0) {
      sets.push('"animation_loop" = ?');
      values.push(updates.animationLoop ? 1 : 0);
    }
    if (sets.length === 1 && sets[0] === "updated_at = ?") return;
    values.push(elementId);
    const query = `UPDATE template_elements SET ${sets.join(", ")} WHERE id = ?`;
    console.log(`[DB SERVICE] Updating element ${elementId} with query:`, query);
    console.log(`[DB SERVICE] Values:`, values);
    await this.db.prepare(query).bind(...values).run();
  }
  /**
   * Get single element by ID
   * Used for cleanup operations
   */
  async getElement(elementId) {
    const result = await this.db.prepare("SELECT * FROM template_elements WHERE id = ?").bind(elementId).first();
    if (!result) return null;
    return this.mapElementToResponse(result);
  }
  /**
   * Delete element
   */
  async deleteElement(elementId) {
    await this.db.prepare("DELETE FROM template_elements WHERE id = ?").bind(elementId).run();
  }
  // ============================================
  // RSVP
  // ============================================
  /**
   * Submit RSVP response
   */
  async submitRSVP(templateId, data) {
    const id = generateUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO rsvp_responses (id, template_id, name, email, phone, message, attendance, is_public, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      id,
      templateId,
      data.name || "Guest",
      data.email || null,
      data.phone || null,
      data.message || null,
      data.attendance || null,
      data.isPublic !== false ? 1 : 0,
      now
    ).run();
    return {
      id,
      templateId,
      name: data.name || "Guest",
      email: data.email,
      phone: data.phone,
      message: data.message || "",
      attendance: data.attendance,
      isPublic: data.isPublic !== false,
      createdAt: now
    };
  }
  /**
   * Get RSVP responses for template
   */
  async getRSVPResponses(templateId) {
    const results = await this.db.prepare(`
        SELECT * FROM rsvp_responses
        WHERE template_id = ?
        ORDER BY created_at DESC
      `).bind(templateId).all();
    return (results.results || []).map((r) => ({
      id: r.id,
      templateId: r.template_id,
      name: r.name,
      email: r.email || void 0,
      phone: r.phone || void 0,
      message: r.message || "",
      attendance: r.attendance || void 0,
      isPublic: r.is_public === 1,
      createdAt: r.created_at
    }));
  }
  // ============================================
  // HELPERS
  // ============================================
  /**
   * Map DB element to API response
   */
  mapElementToResponse(el) {
    return {
      id: el.id,
      type: el.type,
      name: el.name,
      position: { x: el.position_x, y: el.position_y },
      size: { width: el.width, height: el.height },
      zIndex: el.z_index,
      animation: el.animation,
      loopAnimation: el.loop_animation || void 0,
      animationDelay: el.animation_delay,
      animationSpeed: el.animation_speed,
      animationDuration: el.animation_duration,
      animationTrigger: el.animation_trigger || "scroll",
      animationLoop: el.animation_loop === 1,
      content: el.content || void 0,
      imageUrl: el.image_url || void 0,
      textStyle: safeParseJSON(el.text_style, void 0),
      iconStyle: safeParseJSON(el.icon_style, void 0),
      countdownConfig: safeParseJSON(el.countdown_config, void 0),
      rsvpFormConfig: safeParseJSON(el.rsvp_form_config, void 0),
      guestWishesConfig: safeParseJSON(el.guest_wishes_config, void 0),
      openInvitationConfig: safeParseJSON(el.open_invitation_config, void 0),
      rotation: el.rotation,
      flipHorizontal: el.flip_horizontal === 1,
      flipVertical: el.flip_vertical === 1,
      motionPathConfig: safeParseJSON(el.motion_path_config, void 0),
      parallaxFactor: el.parallax_factor || 0,
      // Permissions
      canEditPosition: el.can_edit_position === 1,
      canEditContent: el.can_edit_content === 1,
      isContentProtected: el.is_content_protected === 1,
      showCopyButton: el.show_copy_button === 1,
      // Lottie Animation
      lottieConfig: safeParseJSON(el.lottie_config, void 0)
    };
  }
};

// src/services/cache.ts
var CACHE_TTL = {
  // Published templates - aggressive caching (rarely change after publish)
  TEMPLATE_PUBLISHED: 86400,
  // 24 hours
  // Draft templates - shorter for editor experience
  TEMPLATE_DRAFT: 60,
  // 1 minute
  // Templates list - medium
  TEMPLATES_LIST: 600,
  // 10 minutes
  // RSVP data - shorter for freshness
  RSVP: 120,
  // 2 minutes
  // Public invitation view - very aggressive (guests see cached version)
  PUBLIC_VIEW: 172800,
  // 48 hours
  // Stale time - how long to serve stale data while revalidating in background
  STALE_WHILE_REVALIDATE: 86400
  // 24 hours stale is acceptable
};
var CACHE_KEYS = {
  TEMPLATE: "template:",
  TEMPLATE_PUBLIC: "public:",
  TEMPLATES_LIST: "templates:list",
  RSVP: "rsvp:",
  STATS: "stats:"
};
var CacheService = class {
  constructor(kv) {
    this.kv = kv;
  }
  static {
    __name(this, "CacheService");
  }
  // ============================================
  // STALE-WHILE-REVALIDATE PATTERN
  // ============================================
  /**
   * Get with stale-while-revalidate support
   * Returns data immediately (even if stale), indicates if revalidation needed
   */
  async getWithSWR(key, freshTtl) {
    try {
      const { value, metadata } = await this.kv.getWithMetadata(key, "json");
      if (!value) {
        return { value: null, isStale: false, needsRevalidation: false };
      }
      const cachedAt = metadata?.cachedAt || 0;
      const age = (Date.now() - cachedAt) / 1e3;
      const isStale = age > freshTtl;
      const needsRevalidation = isStale && age < CACHE_TTL.STALE_WHILE_REVALIDATE;
      return { value, isStale, needsRevalidation };
    } catch {
      return { value: null, isStale: false, needsRevalidation: false };
    }
  }
  /**
   * Set with metadata for SWR tracking
   */
  async setWithMetadata(key, value, ttl, metadata = {}) {
    try {
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: ttl + CACHE_TTL.STALE_WHILE_REVALIDATE,
        // Total TTL includes stale period
        metadata: {
          cachedAt: Date.now(),
          ...metadata
        }
      });
    } catch (err) {
      console.error("Cache set failed:", err);
    }
  }
  // ============================================
  // TEMPLATE CACHING (OPTIMIZED WITH SWR)
  // ============================================
  /**
   * Get cached template with SWR support
   */
  async getTemplate(id) {
    const result = await this.getWithSWR(
      `${CACHE_KEYS.TEMPLATE}${id}`,
      CACHE_TTL.TEMPLATE_DRAFT
      // Use shorter TTL for freshness check
    );
    return {
      value: result.value,
      isStale: result.isStale,
      needsRevalidation: result.needsRevalidation
    };
  }
  /**
   * Cache template with status-aware TTL
   * Published templates get longer TTL (24h) vs draft (1 min)
   */
  async setTemplate(id, template) {
    const ttl = template.status === "published" ? CACHE_TTL.TEMPLATE_PUBLISHED : CACHE_TTL.TEMPLATE_DRAFT;
    await this.setWithMetadata(
      `${CACHE_KEYS.TEMPLATE}${id}`,
      template,
      ttl,
      { status: template.status }
    );
  }
  /**
   * Invalidate template cache
   * OPTIMIZED: No longer auto-invalidates templates list to save KV delete operations
   * Call invalidateTemplatesList() separately only when truly needed (create/delete template)
   */
  async invalidateTemplate(id) {
    try {
      await this.kv.delete(`${CACHE_KEYS.TEMPLATE}${id}`);
    } catch (err) {
      console.error("Failed to invalidate template cache:", err);
    }
  }
  // ============================================
  // PUBLIC VIEW CACHING (ULTRA AGGRESSIVE - 48 HOURS)
  // For guest access - they rarely need fresh data
  // ============================================
  /**
   * Get cached public invitation view
   * Used by guests - longest cache TTL
   */
  async getPublicView(templateId) {
    try {
      const cached = await this.kv.get(`${CACHE_KEYS.TEMPLATE_PUBLIC}${templateId}`, "json");
      return cached;
    } catch {
      return null;
    }
  }
  /**
   * Cache public view - 48 hours TTL
   */
  async setPublicView(templateId, template) {
    try {
      await this.kv.put(
        `${CACHE_KEYS.TEMPLATE_PUBLIC}${templateId}`,
        JSON.stringify(template),
        { expirationTtl: CACHE_TTL.PUBLIC_VIEW }
      );
    } catch (err) {
      console.error("Failed to cache public view:", err);
    }
  }
  /**
   * Invalidate public view when template is updated
   */
  async invalidatePublicView(templateId) {
    try {
      await this.kv.delete(`${CACHE_KEYS.TEMPLATE_PUBLIC}${templateId}`);
    } catch (err) {
      console.error("Failed to invalidate public view:", err);
    }
  }
  // ============================================
  // TEMPLATES LIST CACHING
  // ============================================
  /**
   * Get cached templates list
   */
  async getTemplatesList() {
    try {
      const cached = await this.kv.get(CACHE_KEYS.TEMPLATES_LIST, "json");
      return cached;
    } catch {
      return null;
    }
  }
  /**
   * Cache templates list
   */
  async setTemplatesList(templates) {
    try {
      await this.kv.put(
        CACHE_KEYS.TEMPLATES_LIST,
        JSON.stringify(templates),
        { expirationTtl: CACHE_TTL.TEMPLATES_LIST }
      );
    } catch (err) {
      console.error("Failed to cache templates list:", err);
    }
  }
  /**
   * Invalidate templates list cache
   */
  async invalidateTemplatesList() {
    try {
      await this.kv.delete(CACHE_KEYS.TEMPLATES_LIST);
    } catch (err) {
      console.error("Failed to invalidate templates list cache:", err);
    }
  }
  // ============================================
  // RSVP CACHING
  // ============================================
  /**
   * Get cached RSVP responses
   */
  async getRSVPResponses(templateId) {
    try {
      const cached = await this.kv.get(`${CACHE_KEYS.RSVP}${templateId}`, "json");
      return cached;
    } catch {
      return null;
    }
  }
  /**
   * Cache RSVP responses
   */
  async setRSVPResponses(templateId, responses) {
    try {
      await this.kv.put(
        `${CACHE_KEYS.RSVP}${templateId}`,
        JSON.stringify(responses),
        { expirationTtl: CACHE_TTL.RSVP }
      );
    } catch (err) {
      console.error("Failed to cache RSVP responses:", err);
    }
  }
  /**
   * Invalidate RSVP cache
   */
  async invalidateRSVP(templateId) {
    try {
      await this.kv.delete(`${CACHE_KEYS.RSVP}${templateId}`);
    } catch (err) {
      console.error("Failed to invalidate RSVP cache:", err);
    }
  }
  // ============================================
  // CACHE STATS & MONITORING
  // ============================================
  /**
   * Track cache hit/miss (fire and forget)
   */
  async trackCacheHit(hit) {
    const key = hit ? `${CACHE_KEYS.STATS}hits` : `${CACHE_KEYS.STATS}misses`;
    try {
      const current = await this.kv.get(key) || "0";
      await this.kv.put(key, String(parseInt(current) + 1), {
        expirationTtl: 86400
        // Reset daily
      });
    } catch {
    }
  }
  /**
   * Get cache hit rate
   */
  async getCacheHitRate() {
    try {
      const hits = parseInt(await this.kv.get(`${CACHE_KEYS.STATS}hits`) || "0");
      const misses = parseInt(await this.kv.get(`${CACHE_KEYS.STATS}misses`) || "0");
      const total = hits + misses;
      const rate = total > 0 ? hits / total * 100 : 0;
      return { hits, misses, rate: Math.round(rate) };
    } catch {
      return { hits: 0, misses: 0, rate: 0 };
    }
  }
  // ============================================
  // UTILITY METHODS
  // ============================================
  /**
   * Clear all caches (for development/debugging)
   * WARNING: DISABLED IN PRODUCTION - This can consume hundreds of delete operations!
   * Use individual invalidate methods instead.
   */
  async clearAll() {
    console.warn("clearAll() is disabled to prevent exceeding KV delete limits");
    return { skipped: true, reason: "Mass delete disabled for free tier optimization" };
  }
  /**
   * Get cache stats
   */
  async getStats() {
    try {
      const list = await this.kv.list();
      const prefixes = {};
      list.keys.forEach((key) => {
        const prefix = key.name.split(":")[0] + ":";
        prefixes[prefix] = (prefixes[prefix] || 0) + 1;
      });
      const { rate } = await this.getCacheHitRate();
      return {
        keys: list.keys.length,
        prefixes,
        hitRate: rate
      };
    } catch {
      return { keys: 0, prefixes: {}, hitRate: 0 };
    }
  }
};

// src/routes/templates.ts
var templatesRouter = new Hono2();
templatesRouter.get("/public/:id", async (c) => {
  const id = c.req.param("id");
  const cache = new CacheService(c.env.KV);
  const cached = await cache.getPublicView(id);
  if (cached) {
    c.executionCtx.waitUntil(cache.trackCacheHit(true));
    return c.json(cached, 200, {
      "Cache-Control": "public, max-age=7200, stale-while-revalidate=86400",
      "CDN-Cache-Control": "max-age=86400",
      "X-Cache-Status": "HIT"
    });
  }
  c.executionCtx.waitUntil(cache.trackCacheHit(false));
  const db = new DatabaseService(c.env.DB);
  const template = await db.getTemplate(id);
  if (!template) {
    return c.json({ error: "Invitation not found" }, 404);
  }
  if (template.status !== "published") {
    return c.json({ error: "Invitation not published" }, 404);
  }
  c.executionCtx.waitUntil(cache.setPublicView(id, template));
  return c.json(template, 200, {
    "Cache-Control": "public, max-age=7200, stale-while-revalidate=86400",
    "CDN-Cache-Control": "max-age=86400",
    "X-Cache-Status": "MISS"
  });
});
templatesRouter.get("/", async (c) => {
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  const cached = await cache.getTemplatesList();
  if (cached) {
    return c.json(cached, 200, {
      "Cache-Control": "private, max-age=60",
      "X-Cache-Status": "HIT"
    });
  }
  const templates = await db.getTemplates();
  await cache.setTemplatesList(templates);
  return c.json(templates, 200, {
    "Cache-Control": "private, max-age=60",
    "X-Cache-Status": "MISS"
  });
});
templatesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const freshParam = c.req.query("fresh");
  const skipCache = freshParam === "true";
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  if (!skipCache) {
    const { value: cached, isStale, needsRevalidation } = await cache.getTemplate(id);
    if (cached) {
      if (needsRevalidation) {
        console.log(`[TEMPLATES] Serving stale, revalidating ${id}...`);
        c.executionCtx.waitUntil(revalidateInBackground(id, db, cache));
      }
      return c.json(cached, 200, {
        "Cache-Control": "private, max-age=60",
        "X-Cache-Status": isStale ? "STALE" : "HIT"
      });
    }
  } else {
    console.log(`[TEMPLATES] Cache bypass requested for ${id}`);
  }
  console.log(`[TEMPLATES API] Fetching template ${id} from DB`);
  const template = await db.getTemplate(id);
  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }
  await cache.setTemplate(id, template);
  return c.json(template, 200, {
    "Cache-Control": "private, max-age=60",
    "X-Cache-Status": "MISS"
  });
});
async function revalidateInBackground(id, db, cache) {
  try {
    const template = await db.getTemplate(id);
    if (template) {
      await cache.setTemplate(id, template);
      console.log(`[REVALIDATE] Template ${id} refreshed in background`);
    }
  } catch (err) {
    console.error(`[REVALIDATE] Failed for ${id}:`, err);
  }
}
__name(revalidateInBackground, "revalidateInBackground");
templatesRouter.post("/", async (c) => {
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  const body = await c.req.json();
  if (!body.name) {
    return c.json({ error: "Template name is required" }, 400);
  }
  const template = await db.createTemplate(body);
  await cache.invalidateTemplatesList();
  return c.json(template, 201);
});
templatesRouter.put("/:id", async (c) => {
  const id = c.req.param("id");
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  const body = await c.req.json();
  await db.updateTemplate(id, body);
  await cache.invalidateTemplate(id);
  if (body.status === "published") {
    await cache.invalidatePublicView(id);
  }
  return c.json({ success: true });
});
templatesRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  await db.deleteTemplate(id);
  await cache.invalidateTemplate(id);
  await cache.invalidatePublicView(id);
  await cache.invalidateTemplatesList();
  return c.json({ success: true });
});

// src/routes/sections.ts
var sectionsRouter = new Hono2();
sectionsRouter.put("/:templateId/:type", async (c) => {
  const templateId = c.req.param("templateId");
  const sectionType = c.req.param("type");
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  const body = await c.req.json();
  console.log(`[SECTIONS API] PUT ${templateId}/${sectionType}`, JSON.stringify(body));
  const sectionId = await db.upsertSection(templateId, sectionType, body);
  console.log(`[SECTIONS API] Updated section ${sectionId} successfully`);
  await cache.invalidateTemplate(templateId);
  return c.json({ success: true, sectionId });
});
sectionsRouter.delete("/:templateId/:type", async (c) => {
  const templateId = c.req.param("templateId");
  const sectionType = c.req.param("type");
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  await db.deleteSection(templateId, sectionType);
  await cache.invalidateTemplate(templateId);
  return c.json({ success: true });
});

// src/routes/upload.ts
var uploadRouter = new Hono2();
var ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/ogg"
];
var MAX_FILE_SIZE = 50 * 1024 * 1024;
var getR2PublicUrl = /* @__PURE__ */ __name((env) => env.R2_PUBLIC_URL || "https://pub-1e0a9ae6152440268987d00a564a8da5.r2.dev", "getR2PublicUrl");
var getApiBaseUrl = /* @__PURE__ */ __name(() => "https://tamuu-api.shafania57.workers.dev", "getApiBaseUrl");
function extractR2Key(url) {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    if (url.includes("/api/upload/proxy")) {
      const originalUrl = parsedUrl.searchParams.get("url");
      if (originalUrl) {
        return extractR2Key(originalUrl);
      }
    }
    if (parsedUrl.hostname.includes("r2.dev") || parsedUrl.hostname.includes("r2.cloudflarestorage.com")) {
      return decodeURIComponent(parsedUrl.pathname.slice(1));
    }
  } catch {
    return null;
  }
  return null;
}
__name(extractR2Key, "extractR2Key");
uploadRouter.post("/", async (c) => {
  try {
    const contentType = c.req.header("Content-Type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      const file = formData.get("file");
      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return c.json({ error: "File type not allowed" }, 400);
      }
      if (file.size > MAX_FILE_SIZE) {
        return c.json({ error: "File too large" }, 400);
      }
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = file.name.split(".").pop() || "jpg";
      const filename = `${timestamp}-${randomString}.${extension}`;
      const date = /* @__PURE__ */ new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const key = `photos/${year}/${month}/${filename}`;
      const arrayBuffer = await file.arrayBuffer();
      await c.env.R2.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
          cacheControl: "public, max-age=31536000, immutable"
        },
        customMetadata: {
          originalName: file.name,
          uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
          size: String(file.size)
        }
      });
      const directUrl = `${getR2PublicUrl(c.env)}/${key}`;
      const proxyUrl = `${getApiBaseUrl()}/api/upload/proxy?url=${encodeURIComponent(directUrl)}`;
      return c.json({
        success: true,
        url: proxyUrl,
        // Optimized proxy URL (cached)
        directUrl,
        // Direct R2 URL (for backup)
        key,
        filename,
        size: file.size,
        type: file.type
      });
    }
    return c.json({ error: "Invalid content type" }, 400);
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({
      error: "Upload failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
uploadRouter.get("/r2/*", async (c) => {
  const fullPath = c.req.path;
  const r2Prefix = "/api/upload/r2/";
  const key = fullPath.startsWith(r2Prefix) ? fullPath.slice(r2Prefix.length) : c.req.param("*");
  console.log("[R2 Direct] Requested key:", key, "Full path:", fullPath);
  if (!key) {
    return c.json({ error: "Missing file key", path: fullPath }, 400);
  }
  try {
    const object = await c.env.R2.get(key);
    if (!object) {
      return c.json({ error: "File not found", key }, 404);
    }
    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("CDN-Cache-Control", "max-age=31536000");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("ETag", `"${object.etag}"`);
    headers.set("Content-Length", String(object.size));
    headers.set("X-Cache-Status", "DIRECT-R2");
    return new Response(object.body, { headers });
  } catch (error) {
    console.error("[R2 Direct] Error:", error);
    return c.json({
      error: "Failed to fetch file from R2",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
uploadRouter.get("/proxy", async (c) => {
  const imageUrl = c.req.query("url");
  if (!imageUrl) {
    return c.json({ error: "Missing url parameter" }, 400);
  }
  try {
    const parsedUrl = new URL(imageUrl);
    const allowedDomains = [
      "pub-1e0a9ae6152440268987d00a564a8da5.r2.dev",
      "r2.cloudflarestorage.com"
    ];
    const isAllowed = allowedDomains.some(
      (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith("." + domain)
    );
    if (!isAllowed) {
      return c.json({ error: "Domain not allowed" }, 403);
    }
    const key = decodeURIComponent(parsedUrl.pathname.slice(1));
    console.log(`[PROXY] Attempting to fetch key: ${key}`);
    let object = null;
    try {
      object = await c.env.R2.get(key);
    } catch (r2Error) {
      console.log(`[PROXY] Direct R2 access failed, falling back to HTTP: ${r2Error}`);
    }
    if (object) {
      const headers = new Headers();
      headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("CDN-Cache-Control", "max-age=31536000");
      headers.set("Vary", "Accept-Encoding");
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("X-Cache-Status", "HIT-R2");
      headers.set("ETag", `"${object.etag}"`);
      headers.set("Content-Length", String(object.size));
      return new Response(object.body, { headers });
    }
    console.log(`[PROXY] Fallback to HTTP fetch for: ${imageUrl}`);
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Tamuu-Proxy/1.0"
      }
    });
    if (!response.ok) {
      console.error(`[PROXY] HTTP fetch failed: ${response.status} ${response.statusText}`);
      return c.json({ error: `Failed to fetch image: ${response.status}` }, 500);
    }
    const fetchedContentType = response.headers.get("content-type") || "image/jpeg";
    const body = await response.arrayBuffer();
    return new Response(body, {
      headers: {
        "Content-Type": fetchedContentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "CDN-Cache-Control": "max-age=31536000",
        "Vary": "Accept-Encoding",
        "Access-Control-Allow-Origin": "*",
        "X-Cache-Status": "HIT-FETCH"
      }
    });
  } catch (error) {
    console.error("[PROXY] Error:", error);
    return c.json({
      error: "Proxy failed",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
uploadRouter.get("/info/*", async (c) => {
  const key = c.req.param("*");
  if (!key) {
    return c.json({ error: "Missing key" }, 400);
  }
  try {
    const object = await c.env.R2.head(key);
    if (!object) {
      return c.json({ error: "Image not found" }, 404);
    }
    return c.json({
      key,
      size: object.size,
      contentType: object.httpMetadata?.contentType,
      uploaded: object.uploaded,
      etag: object.etag,
      customMetadata: object.customMetadata
    });
  } catch (error) {
    console.error("Info error:", error);
    return c.json({ error: "Failed to get info" }, 500);
  }
});
uploadRouter.delete("/*", async (c) => {
  const key = c.req.param("*");
  if (!key) {
    return c.json({ error: "Missing key" }, 400);
  }
  try {
    const exists = await c.env.R2.head(key);
    if (!exists) {
      return c.json({
        success: true,
        deleted: key,
        message: "File not found (already deleted)"
      });
    }
    await c.env.R2.delete(key);
    console.log(`\u{1F5D1}\uFE0F Deleted from R2: ${key}`);
    return c.json({
      success: true,
      deleted: key,
      message: "File deleted successfully"
    });
  } catch (error) {
    console.error("Delete error:", error);
    return c.json({ error: "Delete failed" }, 500);
  }
});

// src/routes/elements.ts
var elementsRouter = new Hono2();
elementsRouter.post("/:templateId/:sectionType", async (c) => {
  const templateId = c.req.param("templateId");
  const sectionType = c.req.param("sectionType");
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  const body = await c.req.json();
  let sectionId = await db.getSectionId(templateId, sectionType);
  if (!sectionId) {
    sectionId = await db.upsertSection(templateId, sectionType, {});
  }
  const element = await db.createElement(sectionId, body);
  await cache.invalidateTemplate(templateId);
  return c.json(element, 201);
});
elementsRouter.put("/:id", async (c) => {
  const id = c.req.param("id");
  const db = new DatabaseService(c.env.DB);
  const cache = new CacheService(c.env.KV);
  const body = await c.req.json();
  console.log(`[ELEMENTS ROUTE] Updating element ${id}`);
  const { _templateId, ...updates } = body;
  const templateId = _templateId;
  if (updates.imageUrl !== void 0) {
    const oldElement = await db.getElement(id);
    if (oldElement?.imageUrl && oldElement.imageUrl !== updates.imageUrl) {
      const oldKey = extractR2Key(oldElement.imageUrl);
      if (oldKey) {
        try {
          await c.env.R2.delete(oldKey);
          console.log(`\u{1F5D1}\uFE0F Cleaned up old image: ${oldKey}`);
        } catch (err) {
          console.error(`Failed to cleanup old image: ${oldKey}`, err);
        }
      }
    }
  }
  await db.updateElement(id, updates);
  if (templateId) {
    await cache.invalidateTemplate(templateId);
  }
  return c.json({ success: true });
});
elementsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  const templateId = c.req.query("templateId");
  const element = await db.getElement(id);
  await db.deleteElement(id);
  if (element?.imageUrl) {
    const key = extractR2Key(element.imageUrl);
    if (key) {
      try {
        await c.env.R2.delete(key);
        console.log(`\u{1F5D1}\uFE0F Deleted image from R2: ${key}`);
      } catch (err) {
        console.error(`Failed to delete R2 image: ${key}`, err);
      }
    }
  }
  if (templateId) {
    await cache.invalidateTemplate(templateId);
  }
  return c.json({ success: true });
});

// src/routes/rsvp.ts
var rsvpRouter = new Hono2();
rsvpRouter.post("/:templateId", async (c) => {
  const templateId = c.req.param("templateId");
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  const body = await c.req.json();
  if (!body.name) {
    return c.json({ error: "Name is required" }, 400);
  }
  const response = await db.submitRSVP(templateId, body);
  await cache.invalidateRSVP(templateId);
  return c.json(response, 201);
});
rsvpRouter.get("/:templateId", async (c) => {
  const templateId = c.req.param("templateId");
  const cache = new CacheService(c.env.KV);
  const db = new DatabaseService(c.env.DB);
  const cached = await cache.getRSVPResponses(templateId);
  if (cached) {
    return c.json(cached);
  }
  const responses = await db.getRSVPResponses(templateId);
  await cache.setRSVPResponses(templateId, responses);
  return c.json(responses);
});

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = /* @__PURE__ */ __name((cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.trim().split(";");
  const parsedCookie = {};
  for (let pairStr of pairs) {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      continue;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = cookieValue.indexOf("%") !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue;
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
}, "parse");
var _serialize = /* @__PURE__ */ __name((name, value, opt = {}) => {
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) {
    throw new Error("__Secure- Cookie must have Secure attributes");
  }
  if (name.startsWith("__Host-")) {
    if (!opt.secure) {
      throw new Error("__Host- Cookie must have Secure attributes");
    }
    if (opt.path !== "/") {
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    }
    if (opt.domain) {
      throw new Error("__Host- Cookie must not have Domain attributes");
    }
  }
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 3456e4) {
      throw new Error(
        "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration."
      );
    }
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 3456e7) {
      throw new Error(
        "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
      );
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  }
  if (opt.priority) {
    cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
  }
  if (opt.partitioned) {
    if (!opt.secure) {
      throw new Error("Partitioned Cookie must have Secure attributes");
    }
    cookie += "; Partitioned";
  }
  return cookie;
}, "_serialize");
var serialize = /* @__PURE__ */ __name((name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
}, "serialize");

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = /* @__PURE__ */ __name((c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
}, "getCookie");
var generateCookie = /* @__PURE__ */ __name((name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = serialize("__Secure-" + name, value, { path: "/", ...opt, secure: true });
  } else if (opt?.prefix === "host") {
    cookie = serialize("__Host-" + name, value, {
      ...opt,
      path: "/",
      secure: true,
      domain: void 0
    });
  } else {
    cookie = serialize(name, value, { path: "/", ...opt });
  }
  return cookie;
}, "generateCookie");
var setCookie = /* @__PURE__ */ __name((c, name, value, opt) => {
  const cookie = generateCookie(name, value, opt);
  c.header("Set-Cookie", cookie, { append: true });
}, "setCookie");
var deleteCookie = /* @__PURE__ */ __name((c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", { ...opt, maxAge: 0 });
  return deletedCookie;
}, "deleteCookie");

// src/routes/auth.ts
var authRouter = new Hono2();
var JWT_SECRET = "tamuu-jwt-secret-2024";
var JWT_EXPIRY_DAYS = 7;
function generateUUID2() {
  const hex = /* @__PURE__ */ __name((n) => Math.floor(Math.random() * 16).toString(16), "hex");
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
__name(generateUUID2, "generateUUID");
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + JWT_SECRET);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, hash) {
  const computed = await hashPassword(password);
  return computed === hash;
}
__name(verifyPassword, "verifyPassword");
async function createJWT(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1e3) + JWT_EXPIRY_DAYS * 24 * 60 * 60;
  const fullPayload = { ...payload, exp };
  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(fullPayload));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${base64Header}.${base64Payload}`)
  );
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${base64Header}.${base64Payload}.${base64Signature}`;
}
__name(createJWT, "createJWT");
async function verifyJWT(token) {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signatureData = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureData,
      encoder.encode(`${header}.${payload}`)
    );
    if (!isValid) return null;
    const decoded = JSON.parse(atob(payload));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
__name(verifyJWT, "verifyJWT");
function mapUserToResponse(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    plan: user.plan,
    planExpiresAt: user.plan_expires_at,
    isVerified: user.is_verified === 1,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}
__name(mapUserToResponse, "mapUserToResponse");
authRouter.post("/register", async (c) => {
  const body = await c.req.json();
  const { email, password, name, phone } = body;
  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: "Invalid email format" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }
  const id = generateUUID2();
  const passwordHash = await hashPassword(password);
  const verificationToken = generateUUID2();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await c.env.DB.prepare(`
            INSERT INTO users (id, email, password_hash, name, phone, verification_token, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, email.toLowerCase(), passwordHash, name || null, phone || null, verificationToken, now, now).run();
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  if (!user) {
    return c.json({ error: "Failed to create user" }, 500);
  }
  const token = await createJWT({ userId: user.id, email: user.email });
  setCookie(c, "auth_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: JWT_EXPIRY_DAYS * 24 * 60 * 60,
    path: "/"
  });
  return c.json({
    user: mapUserToResponse(user),
    token,
    message: "Registration successful. Please verify your email."
  }, 201);
});
authRouter.post("/login", async (c) => {
  const body = await c.req.json();
  const { email, password } = body;
  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const token = await createJWT({ userId: user.id, email: user.email });
  setCookie(c, "auth_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: JWT_EXPIRY_DAYS * 24 * 60 * 60,
    path: "/"
  });
  return c.json({
    user: mapUserToResponse(user),
    token
  });
});
authRouter.post("/logout", async (c) => {
  deleteCookie(c, "auth_token", { path: "/" });
  return c.json({ success: true });
});
authRouter.get("/me", async (c) => {
  let token = getCookie(c, "auth_token");
  if (!token) {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  const payload = await verifyJWT(token);
  if (!payload) {
    deleteCookie(c, "auth_token", { path: "/" });
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload.userId).first();
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json({ user: mapUserToResponse(user) });
});
authRouter.put("/profile", async (c) => {
  let token = getCookie(c, "auth_token");
  if (!token) {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  const payload = await verifyJWT(token);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  const body = await c.req.json();
  const { name, phone, avatarUrl } = body;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await c.env.DB.prepare(`
            UPDATE users 
            SET name = COALESCE(?, name), 
                phone = COALESCE(?, phone), 
                avatar_url = COALESCE(?, avatar_url),
                updated_at = ?
            WHERE id = ?
        `).bind(name, phone, avatarUrl, now, payload.userId).run();
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload.userId).first();
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json({ user: mapUserToResponse(user) });
});
authRouter.post("/forgot-password", async (c) => {
  const body = await c.req.json();
  const { email } = body;
  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (!user) {
    return c.json({ message: "If email exists, reset link will be sent" });
  }
  const resetToken = generateUUID2();
  const resetExpires = new Date(Date.now() + 60 * 60 * 1e3).toISOString();
  await c.env.DB.prepare(`
            UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?
        `).bind(resetToken, resetExpires, user.id).run();
  console.log(`[AUTH] Password reset token for ${email}: ${resetToken}`);
  return c.json({ message: "If email exists, reset link will be sent" });
});
authRouter.post("/reset-password", async (c) => {
  const body = await c.req.json();
  const { token, newPassword } = body;
  if (!token || !newPassword) {
    return c.json({ error: "Token and new password are required" }, 400);
  }
  if (newPassword.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE reset_token = ?").bind(token).first();
  if (!user) {
    return c.json({ error: "Invalid or expired reset token" }, 400);
  }
  if (user.reset_token_expires && new Date(user.reset_token_expires) < /* @__PURE__ */ new Date()) {
    return c.json({ error: "Reset token has expired" }, 400);
  }
  const passwordHash = await hashPassword(newPassword);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await c.env.DB.prepare(`
            UPDATE users 
            SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ?
            WHERE id = ?
        `).bind(passwordHash, now, user.id).run();
  return c.json({ message: "Password reset successful" });
});
authRouter.get("/verify/:token", async (c) => {
  const token = c.req.param("token");
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE verification_token = ?").bind(token).first();
  if (!user) {
    return c.json({ error: "Invalid verification token" }, 400);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await c.env.DB.prepare(`
            UPDATE users 
            SET is_verified = 1, verification_token = NULL, updated_at = ?
            WHERE id = ?
        `).bind(now, user.id).run();
  return c.json({ message: "Email verified successfully" });
});

// src/routes/batch.ts
var batchRouter = new Hono2();
var MAX_SECTIONS_PER_BATCH = 50;
var MAX_ELEMENTS_PER_BATCH = 500;
batchRouter.post("/", async (c) => {
  const startTime = Date.now();
  const errors = [];
  let sectionsUpdated = 0;
  let elementsUpdated = 0;
  try {
    const body = await c.req.json();
    if (!body.templateId) {
      return c.json({
        success: false,
        updated: { sections: 0, elements: 0, total: 0 },
        errors: ["templateId is required"],
        duration: Date.now() - startTime
      }, 400);
    }
    const sections = body.sections || [];
    const elements = body.elements || [];
    if (sections.length > MAX_SECTIONS_PER_BATCH) {
      return c.json({
        success: false,
        updated: { sections: 0, elements: 0, total: 0 },
        errors: [`Maximum ${MAX_SECTIONS_PER_BATCH} sections per batch allowed`],
        duration: Date.now() - startTime
      }, 400);
    }
    if (elements.length > MAX_ELEMENTS_PER_BATCH) {
      return c.json({
        success: false,
        updated: { sections: 0, elements: 0, total: 0 },
        errors: [`Maximum ${MAX_ELEMENTS_PER_BATCH} elements per batch allowed`],
        duration: Date.now() - startTime
      }, 400);
    }
    if (sections.length === 0 && elements.length === 0) {
      return c.json({
        success: true,
        updated: { sections: 0, elements: 0, total: 0 },
        errors: [],
        duration: Date.now() - startTime
      }, 200);
    }
    const db = new DatabaseService(c.env.DB);
    const cache = new CacheService(c.env.KV);
    const templateExists = await db.getTemplate(body.templateId);
    if (!templateExists) {
      return c.json({
        success: false,
        updated: { sections: 0, elements: 0, total: 0 },
        errors: ["Template not found"],
        duration: Date.now() - startTime
      }, 404);
    }
    for (const sectionUpdate of sections) {
      try {
        if (!sectionUpdate.sectionType) {
          errors.push(`Section update missing sectionType`);
          continue;
        }
        await db.upsertSection(
          body.templateId,
          sectionUpdate.sectionType,
          sectionUpdate.updates
        );
        sectionsUpdated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Section ${sectionUpdate.sectionType}: ${msg}`);
        console.error(`[BATCH] Section update failed:`, error);
      }
    }
    for (const elementUpdate of elements) {
      try {
        if (!elementUpdate.elementId) {
          errors.push(`Element update missing elementId`);
          continue;
        }
        if (elementUpdate.elementId.startsWith("el-") || elementUpdate.elementId.startsWith("temp-")) {
          console.log(`[BATCH] Skipping temp element: ${elementUpdate.elementId}`);
          continue;
        }
        await db.updateElement(
          elementUpdate.elementId,
          elementUpdate.updates
        );
        elementsUpdated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Element ${elementUpdate.elementId}: ${msg}`);
        console.error(`[BATCH] Element update failed:`, error);
      }
    }
    if (sectionsUpdated > 0 || elementsUpdated > 0) {
      await cache.invalidateTemplate(body.templateId);
      console.log(`[BATCH] Cache invalidated for template ${body.templateId}`);
    }
    const totalUpdated = sectionsUpdated + elementsUpdated;
    const duration = Date.now() - startTime;
    console.log(`[BATCH] Completed: ${totalUpdated} updates in ${duration}ms (${errors.length} errors)`);
    return c.json({
      success: errors.length === 0,
      updated: {
        sections: sectionsUpdated,
        elements: elementsUpdated,
        total: totalUpdated
      },
      errors,
      duration
    }, errors.length === 0 ? 200 : 207);
  } catch (error) {
    console.error("[BATCH] Unexpected error:", error);
    return c.json({
      success: false,
      updated: {
        sections: sectionsUpdated,
        elements: elementsUpdated,
        total: sectionsUpdated + elementsUpdated
      },
      errors: [error instanceof Error ? error.message : "Unknown error"],
      duration: Date.now() - startTime
    }, 500);
  }
});

// src/index.ts
var app = new Hono2();
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  c.res.headers.set("X-Response-Time", `${duration}ms`);
});
app.use("*", cors({
  origin: /* @__PURE__ */ __name((origin) => {
    const allowedOrigins = [
      "https://tamuu.pages.dev",
      "http://localhost:5173",
      "http://localhost:4173"
    ];
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    if (origin && origin.endsWith(".tamuu.pages.dev")) {
      return origin;
    }
    return null;
  }, "origin"),
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposeHeaders: ["Content-Length", "X-Request-Id", "X-Response-Time", "X-Cache-Status"],
  maxAge: 86400,
  // 24 hours
  credentials: true
}));
app.use("*", logger());
app.use("*", prettyJSON());
app.use("/api/*", async (c, next) => {
  await next();
  if (c.res.headers.has("Cache-Control")) return;
  if (["POST", "PUT", "DELETE", "PATCH"].includes(c.req.method)) {
    c.res.headers.set("Cache-Control", "no-store");
    return;
  }
  c.res.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
});
app.get("/", (c) => {
  return c.json({
    status: "ok",
    message: "Tamuu API is running",
    version: "1.0.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/health", async (c) => {
  try {
    const dbCheck = await c.env.DB.prepare("SELECT 1 as check").first();
    await c.env.KV.put("health_check", "ok", { expirationTtl: 60 });
    const kvCheck = await c.env.KV.get("health_check");
    return c.json({
      status: "healthy",
      services: {
        d1: dbCheck ? "connected" : "error",
        kv: kvCheck === "ok" ? "connected" : "error",
        r2: "available"
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    return c.json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, 500);
  }
});
app.get("/api/debug/columns", async (c) => {
  try {
    const result = await c.env.DB.prepare("PRAGMA table_info(template_sections)").all();
    return c.json({
      table: "template_sections",
      columns: result.results.map((r) => ({
        name: r.name,
        type: r.type,
        dflt_value: r.dflt_value
      }))
    });
  } catch (error) {
    return c.json({ error: true, message: error instanceof Error ? error.message : String(error) }, 500);
  }
});
app.route("/api/templates", templatesRouter);
app.route("/api/sections", sectionsRouter);
app.route("/api/elements", elementsRouter);
app.route("/api/rsvp", rsvpRouter);
app.route("/api/upload", uploadRouter);
app.route("/api/auth", authRouter);
app.route("/api/batch-update", batchRouter);
app.onError((err, c) => {
  console.error("API Error:", err);
  return c.json({
    error: true,
    message: err.message || "Internal Server Error",
    ...c.env.ENVIRONMENT !== "production" && { stack: err.stack }
  }, 500);
});
app.notFound((c) => {
  return c.json({
    error: true,
    message: "Not Found",
    path: c.req.path
  }, 404);
});
var index_default = app;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
