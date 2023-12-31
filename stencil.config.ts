import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'beyim-xapi',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
    },
  ],
  testing: {
    browserHeadless: "new",
  },
  globalScript: "src/global/global.ts",
  extras: {
    enableImportInjection: true,
  }
};
