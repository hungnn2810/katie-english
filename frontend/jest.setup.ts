// React 18's act() checks this global to know it's running inside a
// test environment that understands async act() semantics. jest-environment-jsdom
// does not set it automatically, which produces spurious
// "not configured to support act(...)" warnings for every component test.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
