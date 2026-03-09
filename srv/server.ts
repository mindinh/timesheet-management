import cds from '@sap/cds';
import express from 'express';

cds.on('bootstrap', (app) => {
  // Increase limit for all body types, including text/raw which is default for our base64 string
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Sometimes CAP processes plain/raw text before JSON parser kicks in
  app.use(express.text({ limit: '50mb' }));
  app.use(express.raw({ limit: '50mb' }));
});

export default cds.server;
